import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  Gift,
  Heart,
  ForkKnife,
  EnvelopeSimple,
  DeviceMobile,
  Cake,
  QrCode,
  Printer,
  Users,
  Ticket,
  SignOut,
  LockSimple,
  X,
  DownloadSimple,
  Megaphone,
  CaretDown,
} from "@phosphor-icons/react";
import QRCode from "qrcode";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-serif-display/400.css";
import "./styles.css";

const source = new URLSearchParams(location.search).get("source") || "website";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const date = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
function savedToken() {
  try {
    return localStorage.getItem("spicelife-reward");
  } catch {
    return null;
  }
}
function storeToken(value) {
  try {
    value
      ? localStorage.setItem("spicelife-reward", value)
      : localStorage.removeItem("spicelife-reward");
  } catch {
    /* The receipt remains visible when browser storage is unavailable. */
  }
}
async function api(route, { method = "GET", body, token } = {}) {
  const response = await fetch("/api/club" + route, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error || "Please try again."), {
      status: response.status,
      fields: result.fields,
    });
  return result;
}
function Logo() {
  return (
    <a className="brand" href="/club/" aria-label="SpiceLife Club home">
      <span className="brand-mark">
        <ForkKnife size={24} weight="light" />
      </span>
      <span>
        spicelife<span className="brand-dot">.</span>
        <small>THE MEMBERS CLUB</small>
      </span>
    </a>
  );
}
function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
function Notice({ children, error = false }) {
  return (
    children && (
      <div
        role={error ? "alert" : "status"}
        className={`notice ${error ? "error" : ""}`}
      >
        {children}
      </div>
    )
  );
}
function Modal({ title, children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="flex items-center justify-between gap-6">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Policy({ kind, config, close }) {
  return (
    <Modal
      title={
        kind === "privacy"
          ? "Your details, your choice."
          : "A few little details."
      }
      close={close}
    >
      {kind === "privacy" ? (
        <div className="policy-copy">
          <p>
            This is a local SpiceLife test experience. Please use fictional
            details. No emails or text messages are sent.
          </p>
          <p>
            We save your name, email, optional phone, optional birthday month
            and day, message choices, sign-up source, and reward activity in the
            pilot database. We also record the consent wording and when your
            choices change.
          </p>
          <p>
            Contact details are used to manage membership. Optional message
            choices would be used for SpiceLife promotions after messaging is
            connected. Mobile information and messaging consent are not shared
            with third parties or affiliates for their marketing.
          </p>
          <p>
            Your browser saves a private reward key so you can return to your
            reward. Anyone using this browser may see that reward. Staff can
            view the member list after signing in.
          </p>
          <p>
            You can change message choices or delete your test membership from
            your reward screen. If you lose access, ask the pilot operator to
            help. Before a public launch, the restaurant must publish its final
            privacy notice, contact details, retention policy, and messaging
            terms.
          </p>
        </div>
      ) : (
        <div className="policy-copy">
          <h3>{config.offer.reward}</h3>
          <p>
            {config.offer.terms} Expires seven days after joining. Show the code
            to staff before paying; staff must validate and redeem it.
          </p>
          <p>
            The sample offer is for testing and is not a commitment by the
            restaurant to honor a real promotion. No cash value. Subject to
            availability.
          </p>
          <h3>Messages are your choice</h3>
          <p>{config.emailConsent}</p>
          <p>{config.smsConsent}</p>
          <p>
            Birthday month and day are optional. A birthday treat is a proposed
            future club benefit, not an additional issued reward in this pilot.
          </p>
        </div>
      )}
    </Modal>
  );
}
function Footer({ config }) {
  const [policy, setPolicy] = useState(null);
  return (
    <>
      <footer className="footer shell">
        <span>A little more flavor. A little more belonging.</span>
        <div>
          <button onClick={() => setPolicy("privacy")}>Privacy</button>
          <button onClick={() => setPolicy("terms")}>Club terms</button>
          <a href="/club/staff">
            Staff desk <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
      <div className="pilot-note">
        LOCAL PILOT <span>Use test details. No emails or texts are sent.</span>
      </div>
      {policy && (
        <Policy config={config} kind={policy} close={() => setPolicy(null)} />
      )}
    </>
  );
}
function Field({ label, optional, error, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {optional && <span>Optional</span>}
      </label>
      {children}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
function JoinForm({ config, onJoined }) {
  const [birthday, setBirthday] = useState(false),
    [policy, setPolicy] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState({});
  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api("/join", {
        method: "POST",
        body: {
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          birthMonth: data.get("birthMonth"),
          birthDay: data.get("birthDay"),
          emailConsent: data.get("emailConsent") === "on",
          smsConsent: data.get("smsConsent") === "on",
          website: data.get("website"),
          source,
          offerId: config.offer.id,
        },
      });
      storeToken(result.token);
      onJoined(result);
    } catch (e) {
      setError(e.message);
      setFields(e.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="join-card" id="join" aria-labelledby="join-heading">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">YOUR SEAT AT THE TABLE</span>
        <Gift size={23} weight="light" />
      </div>
      <h2 id="join-heading">Good food. Better perks.</h2>
      <p className="muted">Join the club. Your welcome treat is ready.</p>
      <form noValidate onSubmit={submit} className="join-form">
        <Field label="First name" htmlFor="name" error={fields.name}>
          <input
            id="name"
            name="name"
            autoComplete="given-name"
            placeholder="What should we call you?"
            maxLength={80}
            required
            aria-invalid={Boolean(fields.name)}
          />
        </Field>
        <Field label="Email address" htmlFor="email" error={fields.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            required
            aria-invalid={Boolean(fields.email)}
          />
        </Field>
        <Field
          label="Mobile number"
          optional
          htmlFor="phone"
          error={fields.phone}
        >
          <div className="phone-input">
            <span>US +1</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel-national"
              placeholder="(240) 555-0186"
              aria-invalid={Boolean(fields.phone)}
            />
          </div>
        </Field>
        <div className="birthday-section">
          <button
            type="button"
            className="birthday-toggle"
            onClick={() => setBirthday(!birthday)}
            aria-expanded={birthday}
          >
            <span>
              <Cake size={19} /> Add your birthday for a little extra love
            </span>
            <CaretDown size={16} className={birthday ? "rotate-180" : ""} />
          </button>
          {birthday && (
            <div className="birthday-fields">
              <Field label="Month" htmlFor="birthMonth">
                <select id="birthMonth" name="birthMonth" defaultValue="">
                  <option value="">Month</option>
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day" htmlFor="birthDay">
                <select id="birthDay" name="birthDay" defaultValue="">
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="tiny col-span-2">
                Just the month and day. We don’t need the year.
              </p>
            </div>
          )}
          {fields.birthday && <p className="field-error">{fields.birthday}</p>}
        </div>
        <div className="preferences">
          <p className="label">
            Keep in touch <span>Your choice</span>
          </p>
          <label className="check-row">
            <input name="emailConsent" type="checkbox" />
            <span>{config.emailConsent}</span>
          </label>
          <label className="check-row">
            <input name="smsConsent" type="checkbox" />
            <span>{config.smsConsent}</span>
          </label>
        </div>
        <div className="honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <Notice error>{error}</Notice>
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? "Getting your reward ready…" : "Join & claim my treat"}
          {!busy && <ArrowRight size={19} />}
        </Button>
        <p className="form-fine">
          Free to join. No password. Marketing is optional.
          <br />
          By joining, you accept the{" "}
          <button type="button" onClick={() => setPolicy("terms")}>
            club terms
          </button>
          . Read our{" "}
          <button type="button" onClick={() => setPolicy("privacy")}>
            privacy notice
          </button>
          .
        </p>
      </form>
      {policy && (
        <Policy config={config} kind={policy} close={() => setPolicy(null)} />
      )}
    </section>
  );
}
function Receipt({ initial, accessToken, config, leave }) {
  const [reward, setReward] = useState(initial),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [emailConsent, setEmailConsent] = useState(initial.emailConsent),
    [smsConsent, setSmsConsent] = useState(initial.smsConsent);
  async function refresh() {
    try {
      setReward(await api("/reward", { token: accessToken }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      setReward(
        await api("/preferences", {
          method: "POST",
          token: accessToken,
          body: { emailConsent, smsConsent },
        }),
      );
      setMessage("Your message preferences are saved.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api("/membership", { method: "DELETE", token: accessToken });
      storeToken(null);
      leave();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(reward.code);
      setMessage("Reward code copied.");
    } catch {
      setMessage("Select the reward code to copy it.");
    }
  }
  return (
    <section className="join-card receipt">
      <div className="success-icon">
        <Check size={27} />
      </div>
      <span className="eyebrow">YOU’RE IN, {reward.name.toUpperCase()}.</span>
      <h2>
        {reward.status === "redeemed"
          ? "That was a tasty hello."
          : reward.status === "expired"
            ? "Until the next little treat."
            : "A little treat, all yours."}
      </h2>
      <p className="muted">
        {reward.status === "ready"
          ? "Show this screen to your server before paying."
          : reward.status === "redeemed"
            ? "Your welcome reward has been redeemed."
            : "Your welcome reward has expired. Ask staff about current offers."}
      </p>
      <div className="reward-ticket">
        <Gift size={30} weight="light" />
        <h3>{reward.offer.reward}</h3>
        <div className="ticket-rule" />
        <span className="eyebrow">YOUR REWARD CODE</span>
        <button
          className="reward-code"
          onClick={copy}
          aria-label="Copy reward code"
        >
          {reward.code}
          <Copy size={17} />
        </button>
        <span className={`status ${reward.status}`}>
          {reward.status === "ready" ? "Ready to redeem" : reward.status}
        </span>
        <p className="tiny">
          {reward.status === "redeemed"
            ? `Redeemed ${date(reward.redeemedAt)}`
            : `Valid through ${date(reward.expiresAt)}`}
        </p>
      </div>
      <p className="tiny">{reward.offer.terms}</p>
      <button className="text-button mt-4" onClick={refresh}>
        Refresh reward status <ArrowRight size={15} />
      </button>
      <details className="manage">
        <summary>Manage my message preferences</summary>
        <form onSubmit={save}>
          <label className="check-row">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
            />
            <span>{config.emailConsent}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={smsConsent}
              disabled={!reward.hasPhone}
              onChange={(e) => setSmsConsent(e.target.checked)}
            />
            <span>
              {config.smsConsent}
              {!reward.hasPhone && (
                <strong className="block mt-2">
                  No phone number was added to this membership.
                </strong>
              )}
            </span>
          </label>
          <Button className="secondary w-full" disabled={busy}>
            Save preferences
          </Button>
        </form>
      </details>
      <Notice>{message}</Notice>
      <Notice error>{error}</Notice>
      <div className="receipt-actions">
        <button
          onClick={() => {
            storeToken(null);
            leave();
          }}
        >
          Use a different test member
        </button>
        <button onClick={() => setConfirmDelete(true)}>
          Delete my test membership
        </button>
      </div>
      {confirmDelete && (
        <div className="delete-confirm">
          <p>
            This removes your details, consent records, and reward from this
            pilot. This cannot be undone.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button disabled={busy} onClick={remove}>
              Delete membership
            </Button>
            <Button
              className="secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Keep it
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
function Guest({ config }) {
  const [member, setMember] = useState(null),
    [loading, setLoading] = useState(Boolean(savedToken())),
    [rewardError, setRewardError] = useState("");
  async function loadSaved() {
    const key = savedToken();
    if (!key) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setRewardError("");
    try {
      setMember({ token: key, reward: await api("/reward", { token: key }) });
    } catch (e) {
      if (e.status === 401) storeToken(null);
      else
        setRewardError(
          "Your saved reward could not be loaded. Please try again; your reward key is still saved.",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadSaved();
    try {
      const key = "spicelife-visit-" + source;
      if (!sessionStorage.getItem(key))
        api("/visits", { method: "POST", body: { source } })
          .then(() => sessionStorage.setItem(key, "1"))
          .catch(() => {});
    } catch {
      /* Visit counting is best effort. */
    }
  }, []);
  return (
    <>
      <header className="header shell">
        <Logo />
        <nav>
          <a href="#perks">The little perks</a>
          <a href="#how-it-works">How it works</a>
          <a className="restaurant-link" href="/">
            Visit the restaurant <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main className="shell">
        <div className="hero-grid">
          <section className="hero-story">
            <div className="eyebrow hero-eyebrow">
              <span className="small-line" /> GOOD COMPANY. GREAT FOOD.
            </div>
            <h1>
              A little spice.
              <br />
              <em>On the house.</em>
            </h1>
            <p className="hero-copy">
              Some things taste better when you’re part of the club. Join our
              table for a welcome treat and more reasons to come back.
            </p>
            <div className="hero-perks">
              <span>
                <CheckCircle size={17} /> Free to join
              </span>
              <span>
                <CheckCircle size={17} /> A treat today
              </span>
              <span>
                <CheckCircle size={17} /> More to look forward to
              </span>
            </div>
            <div className="food-feature">
              <img
                src="/Images/Food/Samosa/samosa.jpg"
                alt="Golden vegetable samosas with chutney, served at SpiceLife"
              />
              <span className="photo-caption">
                A WARM WELCOME, SPICELIFE STYLE.
              </span>
              <div className="round-stamp">
                <span>MADE WITH</span>
                <Heart size={23} weight="light" />
                <span>A LITTLE SPICE</span>
              </div>
            </div>
            <div className="offer-strip">
              <div className="offer-icon">
                <Gift size={27} weight="light" />
              </div>
              <div>
                <span className="eyebrow">YOUR FIRST CLUB PERK</span>
                <h3>{config.offer.title}</h3>
                <p>{config.offer.terms}</p>
              </div>
              <span className="offer-badge">ON US</span>
            </div>
          </section>
          {loading ? (
            <div
              className="join-card skeleton"
              aria-label="Loading your reward"
            />
          ) : rewardError ? (
            <section className="join-card">
              <Notice error>{rewardError}</Notice>
              <Button onClick={loadSaved}>Try again</Button>
            </section>
          ) : member ? (
            <Receipt
              initial={member.reward}
              accessToken={member.token}
              config={config}
              leave={() => setMember(null)}
            />
          ) : (
            <JoinForm config={config} onJoined={setMember} />
          )}
        </div>
        <section className="perks-section" id="perks">
          <div className="perks-intro">
            <span className="eyebrow">A REGULAR HAS ITS REWARDS</span>
            <h2>
              Good things
              <br />
              come to the table.
            </h2>
          </div>
          <div className="perk">
            <Gift size={27} weight="light" />
            <h3>A first-visit thank-you</h3>
            <p>
              Your welcome treat is ready as soon as you join. A small bite of
              what’s to come.
            </p>
          </div>
          <div className="perk">
            <Cake size={27} weight="light" />
            <h3>A birthday, remembered</h3>
            <p>
              Share your month and day if you’d like us to celebrate with you
              when birthday offers launch.
            </p>
          </div>
          <div className="perk">
            <EnvelopeSimple size={27} weight="light" />
            <h3>Only the good stuff</h3>
            <p>
              Choose to hear about new dishes and member offers. Change your
              mind anytime.
            </p>
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <span className="eyebrow">FROM SCAN TO SAMOSA</span>
          <div>
            <p>
              <span>01</span> Scan & join
            </p>
            <ArrowRight size={18} />
            <p>
              <span>02</span> Get your reward
            </p>
            <ArrowRight size={18} />
            <p>
              <span>03</span> Show your server
            </p>
          </div>
          <span className="tiny">
            No app to download. Just a little appetite.
          </span>
        </section>
      </main>
      <Footer config={config} />
    </>
  );
}
function Staff({ config, reloadConfig }) {
  const [data, setData] = useState(null),
    [authorized, setAuthorized] = useState(null),
    [tab, setTab] = useState("members"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  async function load() {
    try {
      setData(await api("/staff/members"));
      setAuthorized(true);
      setError("");
    } catch (e) {
      if (e.status === 401) setAuthorized(false);
      else setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/staff/login", {
        method: "POST",
        body: { password: new FormData(event.currentTarget).get("password") },
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function redeem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await api("/staff/redeem", {
        method: "POST",
        body: { code: new FormData(form).get("code") },
      });
      await load();
      setMessage(
        `${result.reward.offer.reward} redeemed for ${result.reward.name}.`,
      );
      form.reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function updateOffer(id) {
    setBusy(true);
    try {
      await api("/staff/offer", { method: "POST", body: { offerId: id } });
      await reloadConfig();
      setMessage(
        "Welcome offer updated for new members. Existing rewards keep their original terms.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const cell = (value) =>
      '"' +
      String(value ?? "")
        .replace(/^[=+@\-\t\r]/, (match) => "'" + match)
        .replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Name",
        "Email",
        "Phone",
        "Birthday (MM-DD)",
        "Email opt-in",
        "SMS opt-in",
        "Source",
        "Joined",
        "Reward status",
      ],
      ...data.members.map((m) => [
        m.name,
        m.email,
        m.phone,
        m.birthday,
        m.emailConsent,
        m.smsConsent,
        m.source,
        m.joinedAt,
        m.status,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "spicelife-test-members.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="staff-page">
      <header className="header shell">
        <Logo />
        <div className="flex gap-5 items-center">
          <a href="/club/" className="text-button">
            Guest experience <ArrowUpRight size={16} />
          </a>
          {authorized && (
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                await api("/staff/logout", { method: "POST", body: {} });
                setAuthorized(false);
                setData(null);
              }}
            >
              <SignOut size={21} />
            </button>
          )}
        </div>
      </header>
      <main className="shell staff-main">
        {authorized === false ? (
          <section className="login-card">
            <span className="success-icon">
              <LockSimple size={26} />
            </span>
            <span className="eyebrow">SPICELIFE STAFF DESK</span>
            <h1>A little behind the scenes.</h1>
            <p className="muted">
              Sign in to see members and redeem their welcome treats.
            </p>
            <form onSubmit={login}>
              <Field label="Staff password" htmlFor="password">
                <input
                  name="password"
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Notice error>{error}</Notice>
              <Button disabled={busy} className="w-full mt-5">
                {busy ? "Signing in…" : "Open the staff desk"}
                <ArrowRight size={18} />
              </Button>
            </form>
            <p className="tiny mt-5">
              For this local pilot, use the password shown when the app starts,
              or the one set by the pilot operator.
            </p>
          </section>
        ) : !data ? (
          <>
            <div className="skeleton h-64" />
            <Notice error>{error}</Notice>
            {error && <Button onClick={load}>Try again</Button>}
          </>
        ) : (
          <>
            <div className="staff-heading">
              <div>
                <span className="eyebrow">THE REGULARS START HERE</span>
                <h1>Your club, at a glance.</h1>
                <p className="muted">Small gestures. More familiar faces.</p>
              </div>
              <a className="button secondary" href="/club/poster">
                <QrCode size={18} /> QR & table sign <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="metrics">
              {[
                [Users, data.members.length, "Club members"],
                [
                  EnvelopeSimple,
                  data.members.filter((m) => m.emailConsent).length,
                  "Email opt-ins",
                ],
                [
                  DeviceMobile,
                  data.members.filter((m) => m.smsConsent).length,
                  "Text opt-ins",
                ],
                [
                  Ticket,
                  data.members.filter((m) => m.status === "redeemed").length,
                  "Rewards redeemed",
                ],
              ].map(([Icon, value, label]) => (
                <div key={label}>
                  <Icon size={23} weight="light" />
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="staff-tabs">
              <div>
                {[
                  ["members", Users, "Members"],
                  ["campaigns", Megaphone, "Offer preview"],
                  ["settings", Gift, "Welcome offer"],
                ].map(([id, Icon, name]) => (
                  <button
                    key={id}
                    className={tab === id ? "active" : ""}
                    onClick={() => {
                      setTab(id);
                      setError("");
                      setMessage("");
                    }}
                  >
                    <Icon size={17} />
                    {name}
                  </button>
                ))}
              </div>
              <button className="text-button" onClick={load}>
                Refresh
              </button>
            </div>
            <Notice error>{error}</Notice>
            <Notice>{message}</Notice>
            {tab === "members" && (
              <>
                <section className="redeem-bar">
                  <div>
                    <Ticket size={25} />
                    <div>
                      <h2>Make someone’s day.</h2>
                      <p>Enter the code on your guest’s reward screen.</p>
                    </div>
                  </div>
                  <form onSubmit={redeem}>
                    <label className="sr-only" htmlFor="redeem-code">
                      Reward code
                    </label>
                    <input
                      id="redeem-code"
                      name="code"
                      placeholder="SL-XXXXXXXXXX"
                      required
                    />
                    <Button disabled={busy}>
                      Redeem reward <Check size={17} />
                    </Button>
                  </form>
                </section>
                <section className="members-section">
                  <div className="table-toolbar">
                    <h2>
                      The guest list <span>{data.members.length}</span>
                    </h2>
                    <div>
                      <label className="sr-only" htmlFor="search">
                        Search members
                      </label>
                      <input
                        id="search"
                        type="search"
                        placeholder="Search name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button
                        className="icon-button"
                        onClick={exportCsv}
                        aria-label="Export members as CSV"
                        disabled={!data.members.length}
                      >
                        <DownloadSimple size={22} />
                      </button>
                    </div>
                  </div>
                  {!data.members.length ? (
                    <div className="empty-state">
                      <Users size={40} weight="light" />
                      <h3>Your first regular is one scan away.</h3>
                      <p>
                        Open the guest experience to try a sign-up, or print a
                        QR table sign.
                      </p>
                      <a href="/club/" className="text-button">
                        Try the guest experience <ArrowRight size={16} />
                      </a>
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Contact</th>
                            <th>Message choices</th>
                            <th>Welcome reward</th>
                            <th>Joined from</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.members
                            .filter((m) =>
                              `${m.name} ${m.email}`
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )
                            .map((m) => (
                              <tr key={m.id}>
                                <td>
                                  <strong>{m.name}</strong>
                                  <small>
                                    {m.birthday
                                      ? `Birthday ${m.birthday}`
                                      : "Birthday not added"}
                                  </small>
                                </td>
                                <td>
                                  {m.email}
                                  <small>{m.phone || "No phone added"}</small>
                                </td>
                                <td>
                                  <div className="flex flex-wrap gap-2">
                                    {m.emailConsent && (
                                      <span className="tag">Email</span>
                                    )}
                                    {m.smsConsent && (
                                      <span className="tag">SMS</span>
                                    )}
                                    {!m.emailConsent && !m.smsConsent && (
                                      <span className="tiny">No marketing</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={`status ${m.status}`}>
                                    {m.status}
                                  </span>
                                  <small>{m.code}</small>
                                </td>
                                <td className="capitalize">
                                  {m.source}
                                  <small>{date(m.joinedAt)}</small>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {!data.members.some((m) =>
                        `${m.name} ${m.email}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      ) && (
                        <p className="empty-state">
                          No members match that search.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="tiny mt-5">
                    {data.visits} tracked landing visits · Counts are from this
                    pilot, exclude no test traffic, and are not unique people.
                    Contacts are unverified.
                  </p>
                </section>
              </>
            )}
            {tab === "campaigns" && <Campaign members={data.members} />}
            {tab === "settings" && (
              <section className="settings-section">
                <div>
                  <span className="eyebrow">THE FIRST LITTLE THANK-YOU</span>
                  <h2>Choose your welcome offer.</h2>
                  <p className="muted">
                    Try a small appetizer, a café favorite, or a discount. Every
                    new reward expires after seven days.
                  </p>
                </div>
                <div className="offer-options">
                  {config.offers.map((item) => (
                    <button
                      key={item.id}
                      disabled={busy}
                      onClick={() => updateOffer(item.id)}
                      className={config.offer.id === item.id ? "selected" : ""}
                    >
                      <span className="flex justify-between items-center gap-4">
                        <strong>{item.reward}</strong>
                        {config.offer.id === item.id ? (
                          <CheckCircle size={24} weight="fill" />
                        ) : (
                          <span className="radio-circle" />
                        )}
                      </span>
                      <p>{item.terms}</p>
                    </button>
                  ))}
                </div>
                <p className="tiny mt-6">
                  Applies to new sign-ups. Reprint signs after changing the
                  offer; already issued rewards retain their original offer and
                  expiry.
                </p>
              </section>
            )}
          </>
        )}
      </main>
      <Footer config={config} />
    </div>
  );
}
function Campaign({ members }) {
  const [draft] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("spicelife-draft")) || {};
    } catch {
      return {};
    }
  });
  const [channel, setChannel] = useState(
      draft.channel === "sms" ? "sms" : "email",
    ),
    [segment, setSegment] = useState(
      draft.segment === "birthday" ? "birthday" : "all",
    ),
    [content, setContent] = useState(
      typeof draft.content === "string"
        ? draft.content
        : "Something delicious is waiting. Stop by SpiceLife this week and make a little time for your favorite flavors.",
    ),
    [saved, setSaved] = useState(false);
  const thisMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const audience = members.filter(
    (m) =>
      (channel === "email" ? m.emailConsent : m.smsConsent) &&
      (segment === "all" || m.birthday?.startsWith(thisMonth)),
  );
  return (
    <section className="campaign-grid">
      <div>
        <span className="eyebrow">GIVE THEM A REASON TO RETURN</span>
        <h2>A little hello, from your kitchen.</h2>
        <p className="muted">
          Preview an offer for members who chose to hear from you.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-7">
          <Field label="Channel" htmlFor="channel">
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="sms">Text message</option>
            </select>
          </Field>
          <Field label="Audience" htmlFor="audience">
            <select
              id="audience"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              <option value="all">All opted-in members</option>
              <option value="birthday">Birthdays this month</option>
            </select>
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Your message" htmlFor="message">
            <textarea
              id="message"
              rows={6}
              value={content}
              maxLength={1000}
              onChange={(e) => {
                setContent(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between mt-5 gap-4">
          <span className="tiny">
            {audience.length} eligible{" "}
            {audience.length === 1 ? "member" : "members"} · {content.length}{" "}
            characters
          </span>
          <Button
            className="secondary"
            onClick={() => {
              try {
                sessionStorage.setItem(
                  "spicelife-draft",
                  JSON.stringify({ channel, segment, content }),
                );
                setSaved(true);
              } catch {
                setSaved(false);
              }
            }}
          >
            Save draft
          </Button>
        </div>
        {saved && (
          <Notice>
            Draft saved for this browser session. No messages sent.
          </Notice>
        )}
        <Notice>
          Preview only. Connect a messaging provider and complete sender setup
          before sending. Contact ownership has not been verified.
        </Notice>
      </div>
      <div className="message-preview">
        <span className="eyebrow">
          {channel === "email" ? "EMAIL PREVIEW" : "TEXT MESSAGE PREVIEW"}
        </span>
        <div className="preview-message">
          <div className="flex gap-3 items-center">
            <span className="brand-mark">
              <ForkKnife size={23} />
            </span>
            <strong>SpiceLife</strong>
          </div>
          <h3>A little more SpiceLife.</h3>
          <p>{content || "Your message will appear here."}</p>
          <div className="message-signoff">
            {channel === "sms"
              ? "SpiceLife: Reply STOP to opt out, HELP for help. Message and data rates may apply."
              : "SpiceLife · [Restaurant mailing address required before sending]\n[Working unsubscribe link required before sending]"}
          </div>
        </div>
        <p className="tiny mt-5">
          Only {channel === "email" ? "email" : "text"} opt-ins are included.
          Deleting or opting out a member removes them from future audience
          counts after refreshing.
        </p>
      </div>
    </section>
  );
}
function Poster({ config }) {
  const [origin, setOrigin] = useState(config.publicUrl || location.origin),
    [placement, setPlacement] = useState("table"),
    [qr, setQr] = useState(""),
    [link, setLink] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const parsed = new URL(origin);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
      const url = `${parsed.origin}/club/?source=${placement}`;
      QRCode.toDataURL(url, {
        width: 600,
        margin: 4,
        errorCorrectionLevel: "M",
        color: { dark: "#392e28", light: "#ffffff" },
      }).then((value) => {
        if (active) {
          setQr(value);
          setLink(url);
          setError("");
        }
      });
    } catch {
      setQr("");
      setLink("");
      setError(
        "Enter a complete website address, starting with http:// or https://.",
      );
    }
    return () => {
      active = false;
    };
  }, [origin, placement]);
  return (
    <>
      <header className="header shell no-print">
        <Logo />
        <a href="/club/staff" className="text-button">
          <ArrowLeft size={16} /> Staff desk
        </a>
      </header>
      <main className="poster-layout shell">
        <section className="poster-controls no-print">
          <span className="eyebrow">ONE SCAN. A NEW REGULAR.</span>
          <h1>Put a little welcome on the table.</h1>
          <p className="muted">
            Print this sign for your counter or tables. The QR opens the sign-up
            page with your current offer.
          </p>
          <div className="mt-8">
            <Field label="Website address" htmlFor="origin">
              <input
                id="origin"
                type="url"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Where will this QR go?" htmlFor="placement">
              <select
                id="placement"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
              >
                <option value="table">Table</option>
                <option value="counter">Counter</option>
                <option value="receipt">Receipt</option>
              </select>
            </Field>
          </div>
          <Notice error>{error}</Notice>
          {/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin) && (
            <Notice>
              This address works on this computer only. For phone testing, run
              the app on your local network and enter this computer’s Wi-Fi
              address. Both devices must be on the same network.
            </Notice>
          )}
          <Button
            className="mt-6 w-full"
            disabled={!qr}
            onClick={() => window.print()}
          >
            <Printer size={20} /> Print table sign
          </Button>
          {link && (
            <a href={link} className="text-button mt-5">
              Test the sign-up link <ArrowUpRight size={16} />
            </a>
          )}
          <p className="tiny mt-6">
            The QR contains only the sign-up address and placement. No customer
            details are encoded. Reprint the sign when you change the offer.
          </p>
        </section>
        <section className="table-sign">
          <Logo />
          <span className="eyebrow">YOUR NEXT LITTLE HAPPY MOMENT</span>
          <h2>
            {config.offer.id === "samosa" ? (
              <>
                Samosa?
                <br />
                <em>On the house.</em>
              </>
            ) : config.offer.id === "chai" ? (
              <>
                Chai?
                <br />
                <em>On the house.</em>
              </>
            ) : (
              <>
                A little spice.
                <br />
                <em>10% off.</em>
              </>
            )}
          </h2>
          <p>
            Join the SpiceLife Club
            <br />
            and enjoy {config.offer.reward.toLowerCase()}.
          </p>
          {qr ? (
            <img
              src={qr}
              alt={`QR code to join the SpiceLife Club: ${link}`}
              className="qr-image"
            />
          ) : (
            <div className="qr-placeholder">Enter a valid address</div>
          )}
          <strong className="scan-label">SCAN. JOIN. ENJOY.</strong>
          <span className="tiny">No app. No password. Just good food.</span>
          <p className="sign-terms">
            {config.offer.terms} Redeem within seven days of joining.
            Promotional messages are optional.
          </p>
          <div className="sign-bottom">
            A LITTLE MORE FLAVOR. A LITTLE MORE BELONGING.
          </div>
          <p className="tiny">Test offer · local pilot</p>
        </section>
      </main>
    </>
  );
}
function App() {
  const [config, setConfig] = useState(null),
    [error, setError] = useState("");
  async function load() {
    try {
      setConfig(await api("/config"));
      setError("");
    } catch {
      setError(
        "We couldn’t load the club. Check your connection and try again.",
      );
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (!config)
    return (
      <div className="shell pt-12">
        <Logo />
        {error ? (
          <div className="mt-12">
            <Notice error>{error}</Notice>
            <Button onClick={load}>Try again</Button>
          </div>
        ) : (
          <div className="hero-grid mt-12">
            <div className="skeleton h-96" />
            <div className="skeleton h-96" />
          </div>
        )}
      </div>
    );
  if (location.pathname === "/club/staff")
    return <Staff config={config} reloadConfig={load} />;
  if (location.pathname === "/club/poster") return <Poster config={config} />;
  return <Guest config={config} />;
}
createRoot(document.getElementById("root")).render(<App />);
