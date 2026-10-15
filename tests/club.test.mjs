import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClub } from "../server/club.mjs";

const password = "spicelife-test-password";
const member = (overrides) => ({
  name: "Amira",
  email: "amira@example.com",
  phone: "",
  birthMonth: "",
  birthDay: "",
  emailConsent: false,
  smsConsent: false,
  source: "table",
  offerId: "samosa",
  ...overrides,
});
async function setup(t, options = {}) {
  const club = createClub({ password, ...options });
  const server = http.createServer((req, res) => club.handler(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let closed = false;
  const close = async () => {
    if (!closed) {
      closed = true;
      await new Promise((resolve) => server.close(resolve));
      club.close();
    }
  };
  t.after(close);
  const call = async (
    route,
    body,
    { method = body ? "POST" : "GET", token, cookie, origin } = {},
  ) => {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}/api/club${route}`,
      {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return {
      status: res.status,
      body: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const login = async () => (await call("/staff/login", { password })).cookie;
  return { call, login, close };
}
test("joining does not require marketing, phone, or birthday; private receipt survives reads", async (t) => {
  const { call } = await setup(t);
  const joined = await call("/join", member());
  assert.equal(joined.status, 201);
  assert.equal(joined.body.reward.emailConsent, false);
  assert.equal(joined.body.reward.status, "ready");
  const receipt = await call("/reward", null, { token: joined.body.token });
  assert.equal(receipt.body.code, joined.body.reward.code);
  assert.equal(receipt.body.email, undefined);
  assert.equal((await call("/reward")).status, 401);
});
test("validation rejects missing details, invalid birthday, non-US phone and SMS without a phone", async (t) => {
  const { call } = await setup(t);
  for (const values of [
    { name: "" },
    { email: "bad" },
    { birthMonth: 2, birthDay: 30 },
    { birthMonth: 1, birthDay: -1 },
    { phone: "234" },
    { smsConsent: true },
    { emailConsent: "true" },
  ])
    assert.equal((await call("/join", member(values))).status, 422);
  assert.equal(
    (await call("/join", member({ birthMonth: 2, birthDay: 29 }))).status,
    201,
  );
});
test("email case and formatted phone duplicates cannot mint additional rewards", async (t) => {
  const { call } = await setup(t);
  assert.equal(
    (await call("/join", member({ phone: "(240) 555-0186" }))).status,
    201,
  );
  assert.equal(
    (await call("/join", member({ email: "AMIRA@EXAMPLE.COM" }))).status,
    409,
  );
  assert.equal(
    (
      await call(
        "/join",
        member({ email: "second@example.com", phone: "+1 240 555 0186" }),
      )
    ).status,
    409,
  );
});
test("only staff can see members or redeem; concurrent redemption succeeds exactly once", async (t) => {
  const { call, login } = await setup(t);
  const joined = await call("/join", member());
  const code = joined.body.reward.code;
  assert.equal((await call("/staff/members")).status, 401);
  assert.equal((await call("/staff/redeem", { code })).status, 401);
  assert.equal((await call("/staff/login", { password: "bad" })).status, 401);
  const cookie = await login();
  const attempts = await Promise.all([
    call("/staff/redeem", { code }, { cookie }),
    call("/staff/redeem", { code }, { cookie }),
  ]);
  assert.deepEqual(attempts.map((x) => x.status).sort(), [200, 409]);
  assert.equal(
    (await call("/reward", null, { token: joined.body.token })).body.status,
    "redeemed",
  );
  await call("/staff/logout", {}, { cookie });
  assert.equal((await call("/staff/members", null, { cookie })).status, 401);
});
test("expired rewards cannot be redeemed, even with a valid staff session", async (t) => {
  let time = Date.now();
  const { call, login } = await setup(t, { now: () => time });
  const joined = await call("/join", member());
  time += 8 * 86400000;
  const cookie = await login();
  assert.equal(
    (await call("/staff/redeem", { code: joined.body.reward.code }, { cookie }))
      .status,
    409,
  );
  assert.equal(
    (await call("/reward", null, { token: joined.body.token })).body.status,
    "expired",
  );
});
test("new offer keeps old reward terms and rejects a stale signup", async (t) => {
  const { call, login } = await setup(t);
  const cookie = await login();
  const first = await call("/join", member());
  await call("/staff/offer", { offerId: "chai" }, { cookie });
  assert.equal(
    (await call("/join", member({ email: "second@example.com" }))).status,
    409,
  );
  const second = await call(
    "/join",
    member({ email: "second@example.com", offerId: "chai" }),
  );
  assert.equal(second.body.reward.offer.id, "chai");
  assert.equal(
    (await call("/reward", null, { token: first.body.token })).body.offer.id,
    "samosa",
  );
});
test("preferences withdraw consent and membership deletion removes contact data", async (t) => {
  const { call, login } = await setup(t);
  const cookie = await login();
  const joined = await call(
    "/join",
    member({ phone: "2405550186", emailConsent: true, smsConsent: true }),
  );
  const token = joined.body.token;
  await call(
    "/preferences",
    { emailConsent: false, smsConsent: false },
    { token },
  );
  const listed = (await call("/staff/members", null, { cookie })).body.members;
  assert.equal(listed[0].smsConsent, false);
  assert.equal(listed[0].emailConsent, false);
  assert.equal(listed[0].token_hash, undefined);
  await call("/membership", null, { token, method: "DELETE" });
  assert.equal(
    (await call("/staff/members", null, { cookie })).body.members.length,
    0,
  );
  assert.equal((await call("/reward", null, { token })).status, 401);
});
test("cross-origin writes are blocked and login attempts are rate limited", async (t) => {
  const { call } = await setup(t);
  assert.equal(
    (await call("/join", member(), { origin: "https://unrelated.example" }))
      .status,
    403,
  );
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await call("/staff/login", { password: "wrong" })).status,
      401,
    );
  assert.equal((await call("/staff/login", { password })).status, 429);
});
test("member data and consent choices persist across database restarts", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spicelife-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const database = path.join(directory, "club.sqlite");
  const first = await setup(t, { database });
  const joined = await first.call("/join", member({ emailConsent: true }));
  await first.close();
  const second = await setup(t, { database });
  const cookie = await second.login();
  const members = await second.call("/staff/members", null, { cookie });
  assert.equal(members.body.members[0].emailConsent, true);
  assert.equal(
    (await second.call("/reward", null, { token: joined.body.token })).body
      .code,
    joined.body.reward.code,
  );
});
