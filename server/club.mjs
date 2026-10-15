import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import {
  OFFERS,
  CONSENT_VERSION,
  EMAIL_CONSENT,
  SMS_CONSENT,
} from "../loyalty/shared.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
const fail = (status, message, fields) =>
  Object.assign(new Error(message), { status, fields });
const clean = (value, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const sourceOf = (value) =>
  ["table", "counter", "receipt", "website"].includes(value)
    ? value
    : "website";

export function createClub({
  database = ":memory:",
  password,
  publicUrl = "",
  secureCookie = false,
  now = () => Date.now(),
}) {
  if (!password || password.length < 12)
    throw new Error("Staff password must contain at least 12 characters.");
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO settings VALUES ('offer', 'samosa');
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT UNIQUE, birthday TEXT, email_consent INTEGER NOT NULL, sms_consent INTEGER NOT NULL,
      source TEXT NOT NULL, joined_at TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE, offer_json TEXT NOT NULL, expires_at TEXT NOT NULL, redeemed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS consent_events (
      id INTEGER PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      recorded_at TEXT NOT NULL, version TEXT NOT NULL, email_consent INTEGER NOT NULL,
      sms_consent INTEGER NOT NULL, email_text TEXT NOT NULL, sms_text TEXT NOT NULL, source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, source TEXT NOT NULL, visited_at TEXT NOT NULL);`);
  const sessions = new Map();
  const attempts = new Map();
  const iso = () => new Date(now()).toISOString();
  const offer = () =>
    OFFERS[
      db.prepare("SELECT value FROM settings WHERE key='offer'").get().value
    ];
  const reward = (member) => ({
    name: member.name,
    code: member.code,
    offer: JSON.parse(member.offer_json),
    expiresAt: member.expires_at,
    redeemedAt: member.redeemed_at,
    status: member.redeemed_at
      ? "redeemed"
      : member.expires_at <= iso()
        ? "expired"
        : "ready",
    emailConsent: Boolean(member.email_consent),
    smsConsent: Boolean(member.sms_consent),
    hasPhone: Boolean(member.phone),
  });
  const recordConsent = (member) =>
    db
      .prepare(
        `INSERT INTO consent_events (member_id, recorded_at, version, email_consent, sms_consent, email_text, sms_text, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        member.id,
        iso(),
        CONSENT_VERSION,
        member.email_consent,
        member.sms_consent,
        EMAIL_CONSENT,
        SMS_CONSENT,
        member.source,
      );
  function limit(req, key, max) {
    for (const [k, v] of attempts) if (v.until <= now()) attempts.delete(k);
    const id = `${req.socket.remoteAddress}:${key}`;
    const value = attempts.get(id) || { count: 0, until: now() + 10 * 60_000 };
    attempts.set(id, value);
    if (++value.count > max)
      throw fail(429, "Too many attempts. Please try again in 10 minutes.");
  }
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw fail(415, "Please send JSON.");
    let bytes = 0,
      chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 12_000) throw fail(413, "Request is too large.");
      chunks.push(chunk);
    }
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      return parsed;
    } catch {
      throw fail(400, "Please check the submitted information.");
    }
  }
  function memberFor(req) {
    const bearer = req.headers.authorization?.replace(/^Bearer /, "") || "";
    const member = db
      .prepare("SELECT * FROM members WHERE token_hash=?")
      .get(hash(bearer));
    if (!member)
      throw fail(
        401,
        "This saved reward is unavailable. Please ask a team member for help.",
      );
    return member;
  }
  function staff(req) {
    const session = /(?:^|;\s*)spicelife_staff=([a-f0-9]+)/.exec(
      req.headers.cookie || "",
    )?.[1];
    if (!session || (sessions.get(session) || 0) < now())
      throw fail(401, "Please sign in to the staff desk.");
    return session;
  }
  const cookie = (value, age) =>
    `spicelife_staff=${value}; HttpOnly; SameSite=Strict; Path=/api/club; Max-Age=${age}${secureCookie ? "; Secure" : ""}`;
  function validate(input) {
    const fields = {};
    const name = clean(input.name, 80);
    const email = clean(input.email, 254).toLowerCase();
    let phone = clean(input.phone, 32).replace(/[\s().+-]/g, "");
    if (phone.length === 10) phone = "1" + phone;
    if (!name) fields.name = "Tell us your first name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fields.email = "Enter a valid email address.";
    if (phone && !/^1[2-9]\d{2}[2-9]\d{6}$/.test(phone))
      fields.phone = "Enter a valid US phone number.";
    const month = Number(input.birthMonth),
      day = Number(input.birthDay);
    let birthday = null;
    if (month || day) {
      const date = new Date(Date.UTC(2000, month - 1, day));
      if (
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      )
        fields.birthday = "Choose a valid month and day.";
      else
        birthday = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (
      typeof input.emailConsent !== "boolean" ||
      typeof input.smsConsent !== "boolean"
    )
      fields.consent = "Please review your message preferences.";
    if (input.smsConsent && !phone)
      fields.phone = "Add a US phone number to receive texts.";
    if (Object.keys(fields).length)
      throw fail(422, "A couple of details need a second look.", fields);
    return {
      name,
      email,
      phone: phone ? "+" + phone : null,
      birthday,
      emailConsent: Number(input.emailConsent),
      smsConsent: Number(input.smsConsent),
    };
  }
  async function handler(req, res) {
    if (!req.url.startsWith("/api/club/")) return false;
    const json = (value, status = 200, headers = {}) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      const route = url.pathname.replace("/api/club", "");
      if (
        !["GET", "HEAD"].includes(req.method) &&
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        throw fail(403, "This request must come from the SpiceLife site.");
      if (route === "/config" && req.method === "GET") {
        json({
          offer: offer(),
          offers: Object.values(OFFERS),
          publicUrl,
          consentVersion: CONSENT_VERSION,
          emailConsent: EMAIL_CONSENT,
          smsConsent: SMS_CONSENT,
        });
      } else if (route === "/visits" && req.method === "POST") {
        limit(req, "visits", 80);
        const input = await body(req);
        db.prepare("INSERT INTO visits (source, visited_at) VALUES (?, ?)").run(
          sourceOf(input.source),
          iso(),
        );
        json({ ok: true }, 201);
      } else if (route === "/join" && req.method === "POST") {
        limit(req, "join", 20);
        const input = await body(req);
        if (input.website) throw fail(422, "Please try again.");
        const details = validate(input);
        if (input.offerId !== offer().id)
          throw fail(
            409,
            "The welcome offer has changed. Refresh this page to see the new offer.",
          );
        if (
          db
            .prepare(
              "SELECT id FROM members WHERE email=? OR (phone IS NOT NULL AND phone=?)",
            )
            .get(details.email, details.phone)
        )
          throw fail(
            409,
            "A membership already uses these details. Ask staff for help with your existing reward.",
          );
        const accessToken = token(),
          id = token(),
          code = "SL-" + randomBytes(5).toString("hex").toUpperCase();
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare(
            `INSERT INTO members VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          ).run(
            id,
            details.name,
            details.email,
            details.phone,
            details.birthday,
            details.emailConsent,
            details.smsConsent,
            sourceOf(input.source),
            iso(),
            hash(accessToken),
            code,
            JSON.stringify(offer()),
            new Date(now() + 7 * 86400000).toISOString(),
          );
          recordConsent(db.prepare("SELECT * FROM members WHERE id=?").get(id));
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        json(
          {
            token: accessToken,
            reward: reward(
              db.prepare("SELECT * FROM members WHERE id=?").get(id),
            ),
          },
          201,
        );
      } else if (route === "/reward" && req.method === "GET") {
        json(reward(memberFor(req)));
      } else if (route === "/preferences" && req.method === "POST") {
        const member = memberFor(req),
          input = await body(req);
        if (
          typeof input.emailConsent !== "boolean" ||
          typeof input.smsConsent !== "boolean"
        )
          throw fail(422, "Choose email and text preferences.");
        if (input.smsConsent && !member.phone)
          throw fail(422, "This membership does not have a phone number.");
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare(
            "UPDATE members SET email_consent=?, sms_consent=? WHERE id=?",
          ).run(
            Number(input.emailConsent),
            Number(input.smsConsent),
            member.id,
          );
          recordConsent({
            ...member,
            email_consent: Number(input.emailConsent),
            sms_consent: Number(input.smsConsent),
            source: "member-preferences",
          });
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        json(
          reward(db.prepare("SELECT * FROM members WHERE id=?").get(member.id)),
        );
      } else if (route === "/membership" && req.method === "DELETE") {
        const member = memberFor(req);
        db.prepare("DELETE FROM members WHERE id=?").run(member.id);
        json({ ok: true });
      } else if (route === "/staff/login" && req.method === "POST") {
        limit(req, "login", 10);
        const input = await body(req);
        if (
          !timingSafeEqual(
            Buffer.from(hash(clean(input.password, 1024))),
            Buffer.from(hash(password)),
          )
        )
          throw fail(401, "That staff password is not correct.");
        for (const [key, expiry] of sessions)
          if (expiry < now()) sessions.delete(key);
        const session = token();
        sessions.set(session, now() + 8 * 3600000);
        json({ ok: true }, 200, { "Set-Cookie": cookie(session, 8 * 3600) });
      } else if (route.startsWith("/staff/")) {
        const session = staff(req);
        if (route === "/staff/logout" && req.method === "POST") {
          sessions.delete(session);
          json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
        } else if (route === "/staff/members" && req.method === "GET") {
          const members = db
            .prepare("SELECT * FROM members ORDER BY joined_at DESC")
            .all()
            .map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              phone: m.phone,
              birthday: m.birthday,
              emailConsent: Boolean(m.email_consent),
              smsConsent: Boolean(m.sms_consent),
              source: m.source,
              joinedAt: m.joined_at,
              ...reward(m),
            }));
          json({
            members,
            visits: db.prepare("SELECT COUNT(*) AS total FROM visits").get()
              .total,
          });
        } else if (route === "/staff/offer" && req.method === "POST") {
          const input = await body(req);
          if (!Object.hasOwn(OFFERS, input.offerId))
            throw fail(422, "Choose one of the available offers.");
          db.prepare("UPDATE settings SET value=? WHERE key='offer'").run(
            input.offerId,
          );
          json({ offer: offer() });
        } else if (route === "/staff/redeem" && req.method === "POST") {
          const input = await body(req),
            code = clean(input.code, 30).toUpperCase();
          const member = db
            .prepare("SELECT * FROM members WHERE code=?")
            .get(code);
          if (!member)
            throw fail(
              404,
              "That reward code was not found. Check it and try again.",
            );
          const result = db
            .prepare(
              "UPDATE members SET redeemed_at=? WHERE code=? AND redeemed_at IS NULL AND expires_at>?",
            )
            .run(iso(), code, iso());
          if (!result.changes)
            throw fail(
              409,
              member.redeemed_at
                ? "This reward has already been redeemed."
                : "This reward has expired.",
            );
          json({
            reward: reward(
              db.prepare("SELECT * FROM members WHERE code=?").get(code),
            ),
          });
        } else throw fail(404, "This action is not available.");
      } else throw fail(404, "This action is not available.");
    } catch (error) {
      if (!error.status) console.error("Club request failed:", error.message);
      json(
        {
          error: error.status
            ? error.message
            : "Something went wrong. Please try again.",
          fields: error.fields,
        },
        error.status || 500,
      );
    }
    return true;
  }
  return { handler, close: () => db.close() };
}
