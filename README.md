# SpiceLife · QR members club pilot

An end-to-end local test of a restaurant or café welcome offer: scan a table sign, join the club, receive a one-use reward, and have staff redeem it. The original restaurant site is available at `/`; the new club lives at `/club/`.

## Run it

Requires Node.js 22.13+ (Node 24+ recommended).

```sh
npm install
npm run dev
```

- Guest experience: http://localhost:4173/club/
- Staff desk: http://localhost:4173/club/staff
- Printable QR table sign: http://localhost:4173/club/poster
- The terminal prints a randomly generated staff password. To use a stable password, copy `.env.example` to `.env` and set `STAFF_PASSWORD` to a private passphrase of at least 12 characters.
- Use fictional details. No email, SMS, or other messages are sent. This is not an authorized live restaurant promotion.

Production build, still for pilot testing:

```sh
npm run build
npm start
```

For a phone on the same trusted Wi-Fi, set `HOST=0.0.0.0` in `.env`, restart the server, and use the computer's LAN address (for example `http://192.168.1.10:4173`) in the QR sign's website field. `localhost` on a phone refers to the phone, not the computer. Set `PUBLIC_URL` to persist that address. HTTPS and appropriate deployment protections are needed before real customer use.

## Try the full flow

1. Open the staff desk and sign in with the startup password.
2. Choose a welcome offer: free vegetable samosa, free masala chai, or 10% off food (maximum $10). Terms are visible on the guest page and sign.
3. Open **QR & table sign**, choose table/counter/receipt, and print or test its link.
4. Join with a fictional name and email. Phone and birthday month/day are optional. Email and text consent are separate, unchecked, and optional; declining both still earns the reward.
5. Show the issued code to staff. Enter it in the staff desk to redeem. A second redemption is rejected. Rewards expire seven days after issuance.
6. Refresh the guest's reward status. Change or withdraw message preferences in the reward screen; delete the test membership if desired.
7. In **Offer preview**, compare opted-in email/text audiences and birthday-month segments. These are previews only; no send endpoint exists.

Members and consent records persist in `data/club.sqlite`. The database and environment files are ignored by Git and not exposed through static file serving. The private reward key is kept in that guest browser's local storage; staff sessions use an HttpOnly, SameSite cookie, expire after eight hours, and end when the server restarts. Avoid sharing a browser containing an active reward key. Lost reward recovery and contact verification are not implemented.

## What this tests

The hypothesis: a small, immediate thank-you converts dine-in guests into reachable, returning regulars. The value is in permission to build a relationship and measurable repeat visits, not merely collecting contact details.

Start with one location, one offer, and a two-week enrollment period. Then allow a further 30 days to observe return visits. Prefer a low ingredient-cost appetizer with an entrée purchase; a percentage discount can give away margin on orders the guest would have placed anyway. The seven-day redemption window can test a return visit, but the welcome reward is also usable immediately; **welcome redemption by itself is not evidence of a repeat visit**.

Track landing visits, sign-ups, independent email/text opt-in rates, rewards issued/redeemed, reward cost, and separately verified return purchases. This prototype counts landing visits once per browser session and source; it does not measure unique people, physical QR scans, purchase revenue, or repeat visits. Test traffic is included. Repeat visits and contribution margin need manual tracking or a later POS integration.

Illustrative planning assumptions, not business results: if 100 rewards cost $2 each to fulfill, the reward cost is $200. If a genuinely incremental return visit contributes $12 after food and other variable costs, around 17 incremental visits cover that $200, before messaging and operating costs. Replace these figures with the restaurant's numbers before deciding success.

## US messaging decisions

- Required email identifies a membership; providing it alone does not activate marketing. Phone and birthday are optional. Year of birth is intentionally not collected.
- Separate unchecked choices describe SpiceLife email and automated promotional text messages. Welcome membership and its reward are available without either choice.
- Every initial choice and subsequent preference change records timestamp, consent wording/version, channel choices, and source. Opt-out updates audience eligibility immediately on the server; refresh the staff view to see changes.
- Before sending: publish approved restaurant privacy/offer/messaging terms and its real contact details; connect providers; verify ownership of contact details; complete applicable sender registration; implement delivery, suppression and unsubscribe/STOP/HELP handling; include email postal address and working unsubscribe; set retention/deletion rules; configure HTTPS, access controls, backups, and operational rate limits. A single-machine demo is not a reviewed production compliance solution.
- Duplicate normalized email or US phone blocks an extra welcome reward. This is basic duplicate protection, **not identity verification**: aliases and different contacts can still be used. A verification step is needed before issuing real-value rewards.

Primary references reviewed October 2, 2026:

- [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy): promotional-message consent and opt-out requirements for use of Twilio.
- [Twilio A2P onboarding guide](https://help.twilio.com/articles/11847054539547): US sender onboarding, disclosures, and voluntary opt-in.
- [FTC CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business): commercial email identity, postal-address, and opt-out obligations.

## Verification and structure

```sh
npm test
npm run build
```

- `loyalty/`: React guest, staff, and printable poster interfaces, shared offer/consent copy.
- `server/club.mjs`: SQLite membership, consent, reward, and staff API.
- `server/index.mjs`: local server, Vite development integration, and restricted original-site static serving.
- `tests/club.test.mjs`: signup validation, duplicate prevention, staff access, single redemption, expiry, offer changes, consent withdrawal, deletion, persistence, origin checks, and login rate limits.

Scope remaining for a real launch: verified contacts and recovery, per-person abuse controls, real provider integration and opt-out webhooks, restaurant-approved policies, deployment hardening, and attribution of repeat purchases. The existing restaurant menu/cart/sign-in remain legacy static prototypes.
