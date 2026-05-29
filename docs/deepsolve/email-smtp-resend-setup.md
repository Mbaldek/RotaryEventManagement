# DEEPSOLVE — Custom SMTP for Supabase Auth (Resend)

**Author:** EMAIL-BRANDING agent
**Date:** 2026-05-28
**Status:** propositions — **no action executed** (read-only research). Mathieu decides and executes the dashboard steps.
**Scope:** switch Supabase Auth's outgoing email from the built-in sender to **Resend** SMTP, on the verified domain `rotary-startup.org`.

---

## 0. TL;DR

- **Why now:** Supabase's built-in email sender is **rate-limited to ~3–4 emails per hour** (officially "for testing only", confirmed in Supabase docs). During candidate registration windows or jury onboarding, we will burst dozens of magic-link emails in minutes — built-in will drop them silently or queue them past the moment they are useful.
- **Recommended provider:** **Resend** — simplest setup, native SMTP relay, generous free tier (3,000 emails/month, 100/day), excellent React/Node ergonomics if we ever want a transactional API later. One small DNS-verification step, then a 5-field form in Supabase.
- **Domain:** `rotary-startup.org` (apex), DNS managed at **Elementor Hosting** (per [`deploy-and-lunch-app-isolation.md`](./deploy-and-lunch-app-isolation.md) — Mathieu confirmed DNS lives there).
- **Sender address:** `contact@rotary-startup.org`, sender name **Rotary Startup Award**. We do not need an inbox for `noreply@` — Resend only requires the domain to be verified.
- **Risk:** zero permanent risk — switching back to built-in is a one-click toggle in Supabase Authentication → SMTP Settings → "Enable custom SMTP" off.
- **Cost:** 0 € for the foreseeable future. Resend's free tier covers ~3k mails/month; we currently send <100/month and the jury bursts stay well under 100/day.

---

## 1. Why custom SMTP is needed

### 1.1 The built-in limit, in plain terms

Supabase's built-in email service is explicitly documented as a **development convenience**, not a production transport:

- Hard rate limit: **~3–4 emails per hour** per project (current Supabase published number; treat as "a handful per hour").
- No deliverability guarantees: the `From:` is a generic Supabase address, not our domain — high spam-folder risk.
- No DKIM/SPF tied to `rotary-startup.org` — recipients' clients cannot authenticate the sender, which hurts the institutional credibility we are otherwise carefully building.
- Bursts (campaign opens, jury onboarding day, "send sign-in link to 25 jurés in 10 minutes") will be silently throttled — magic links arrive late, become stale, and we get phone calls.

### 1.2 The risk if we don't switch before candidate windows

- Candidates retry "send me a sign-in link" → first one succeeds, the next three get throttled → user sees "we sent it" UI but no email arrives → tickets to `prixstartuprotary@proton.me`.
- Jury onboarding email (when admin imports 12+ jurés and triggers magic-link invites) cannot complete in one sitting.
- Magic links expire in **1 hour** by default — if Supabase queues them past that window, the link is dead on arrival.

### 1.3 What we get with Resend SMTP

- Sender `contact@rotary-startup.org` (verified, SPF + DKIM signed).
- Throughput: 100/day on the free tier, 50 emails/sec burst — well above any plausible RSA spike.
- Resend dashboard: per-email delivery status, opens, bounces, complaints — useful for diagnosing "I didn't get the link" tickets.
- Reversible toggle in Supabase.

---

## 2. Resend signup

1. Go to <https://resend.com> → **Sign up** (use `mathieubal@gmail.com` or a Rotary-owned address; the account email is just the operator's, not the sender).
2. Create the organisation/workspace **Rotary Startup Award** (or join an existing one — verify with Mathieu).
3. No payment method needed — stay on the **Free** plan (3k emails/month, 100/day, 1 verified domain). Upgrade later only if the August window of candidate signups blows past 3k.

---

## 3. Domain verification — add DNS records at Elementor Hosting

Resend's domain verification uses **SPF** + **DKIM** + optional **return-path (custom)**. All three are simple TXT (or CNAME) records added at the DNS zone of `rotary-startup.org`.

### 3.1 In Resend dashboard

1. **Domains** → **Add Domain** → enter `rotary-startup.org` (apex; *not* `app.rotary-startup.org`, because the App runs on the subdomain but emails go from the apex).
2. Pick **region** = `eu-west-1` (Ireland) — keeps mail processing inside the EU for GDPR alignment. (US region works too, but EU is preferable for our recipients.)
3. Resend displays a list of DNS records to add — typically:
   - 1× **MX** record on a subdomain like `send.rotary-startup.org` (return-path).
   - 1× **TXT** SPF record on `send.rotary-startup.org` with `v=spf1 include:amazonses.com ~all`.
   - 1× **TXT** DKIM record on `resend._domainkey.rotary-startup.org` with a long public-key value.
   - 1× **TXT** DMARC record (recommended, not required) on `_dmarc.rotary-startup.org` with `v=DMARC1; p=none;` to start.

> The exact host names and values shown in the Resend UI are the ones to trust — copy them verbatim. The above is the standard template; Resend's UI is authoritative.

### 3.2 In Elementor Hosting DNS panel

1. Log in to **my.elementor.com** (or the hosting back-office Mathieu uses for `rotary-startup.org`) → **Domains** → `rotary-startup.org` → **DNS** / **DNS records**.
2. For each row Resend gave you, click **Add record**:
   - **Type:** TXT (or MX where indicated).
   - **Name / Host:** copy exactly (e.g. `resend._domainkey`, `send`, `_dmarc`). Elementor's UI usually auto-appends `.rotary-startup.org`; do not double it.
   - **Value / Content:** paste the exact string from Resend (quotes are part of TXT values for some panels — copy as displayed in the Resend UI).
   - **TTL:** leave default (3600s / 1h is fine).
3. Save each record.

### 3.3 Trigger verification

1. Back in Resend dashboard → **Domains** → `rotary-startup.org` → **Verify DNS records**.
2. Initial check may fail (DNS propagation takes a few minutes; sometimes up to an hour at Elementor). Retry after ~10 min.
3. When all rows turn green ✓ → status becomes **Verified** → the domain is ready to send.

### 3.4 Send a test from Resend (before touching Supabase)

1. Resend dashboard → **Emails** → **Send Test** → from `contact@rotary-startup.org`, to `mathieubal@gmail.com`.
2. Confirm receipt + check Gmail headers ("show original") for `dkim=pass` and `spf=pass`. If either fails, the DNS record value is wrong (most often a copy-paste artefact in the long DKIM key) — fix and re-verify.

---

## 4. Generate the SMTP credential

> **Important:** Supabase uses Resend's **SMTP** relay (host / port / user / password) — *not* the Resend API. The "password" is a Resend API key, but it is consumed as an SMTP password. One key, two uses.

1. Resend dashboard → **API Keys** → **Create API Key**.
2. Name: `supabase-smtp-prod`.
3. Permission: **Sending access** (the minimum scope — never give "Full access").
4. Domain: restrict to `rotary-startup.org` (sender domain).
5. Click **Create** → copy the key **once** (starts with `re_…`) — Resend will never show it again. Store in a password manager (1Password / Bitwarden / Apple Keychain).

---

## 5. Configure Supabase Auth → SMTP Settings

> **Where:** Supabase dashboard → project `uaoucznptxmvhhytapso` → **Authentication** → **SMTP Settings** (sometimes called "Email" or "Custom SMTP").

1. Toggle **Enable Custom SMTP** to **ON**.
2. Fill the form:

   | Field | Value |
   | --- | --- |
   | **Sender email** | `contact@rotary-startup.org` |
   | **Sender name** | `Rotary Startup Award` |
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` (SSL/TLS implicit) — alternate `587` (STARTTLS) if 465 blocked |
   | **Minimum interval** | leave default |
   | **Username** | `resend` |
   | **Password** | the `re_…` API key from §4 |

3. Click **Save**.
4. Supabase reloads its email worker — no Edge Function redeploy needed, no DNS change on the Supabase side.

### Port choice

- **465 (SSL/TLS implicit)** is recommended — fewer firewall edge cases, and Supabase's worker handles it cleanly.
- **587 (STARTTLS)** is the fallback if your Supabase region or some intermediate network blocks 465 outbound. Functionally identical.
- Never use **25** (plain, deprecated for submission).

---

## 6. Send a test from Supabase + verify deliverability

1. Supabase dashboard → **Authentication** → **Users** → click an existing user (or invite a fresh address you control) → **Send Magic Link**.
2. Open the receiving inbox (Gmail web is the best diagnostic — it shows full headers easily).
3. Verify:
   - **From:** displays as `Rotary Startup Award <contact@rotary-startup.org>`.
   - **Subject:** the trilingual subject line from [`docs/design/email-templates/magic-link.md`](../design/email-templates/magic-link.md) (assuming the branded template is pasted in).
   - **Body:** renders with the navy header, the gold rule, the three FR/EN/DE blocks, the NAVY CTA pill.
   - **Headers** (Gmail → ⋮ → "Show original") → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
4. Click the **Se connecter / Sign in / Anmelden** button → should land on `https://app.rotary-startup.org/<redirectPath>` with a valid session (this also validates the `VITE_APP_URL` env var on Vercel).
5. Cross-check in three more clients: Apple Mail (macOS or iOS), Outlook web, ProtonMail. If any client renders the email broken, see the compatibility table in [`magic-link.md`](../design/email-templates/magic-link.md) §6 — but the bulletproof `<table>` layout is designed to survive all four.

### Optional staging: Mailtrap

If you want to inspect raw emails before they go to real users:

- Sign up at <https://mailtrap.io> → create an **Inbox** → grab its SMTP credentials → temporarily plug those into Supabase's SMTP Settings.
- Trigger magic links → they land in Mailtrap's inbox UI (never reach real users), with HTML preview + spam-score analysis.
- Once satisfied, switch the Supabase SMTP form back to Resend's credentials.

---

## 7. Fallback plan (if Resend delivery breaks)

- **Symptom:** magic links suddenly stop arriving / show up as spam after working previously.
- **Step 1 — diagnose:** Resend dashboard → **Logs** → filter on the recipient → look for `bounced`, `complained`, `delivered`. Common causes: recipient's mail server temporarily greylisting, DKIM key rotated by mistake, free-tier daily cap (100/day) hit during a burst.
- **Step 2 — temporary revert:** Supabase dashboard → Authentication → SMTP Settings → toggle **Enable Custom SMTP** to **OFF**. Save. Supabase reverts to its built-in sender within seconds. The rate limit returns (~3–4/h), but at least *some* emails get through while we diagnose.
- **Step 3 — fix root cause:**
  - DKIM/SPF failed? → re-check the DNS records at Elementor (often a copy-paste truncation on the long DKIM value).
  - Daily cap hit? → upgrade Resend to the next tier (10€/mo for 50k emails) or wait until midnight UTC.
  - Resend itself down? → check <https://status.resend.com>. Switch to **Brevo** or **Postmark** as a contingency (same SMTP-relay pattern — substitute host/user/password in Supabase).
- **Step 4 — return to custom SMTP** once green: toggle **Enable Custom SMTP** back ON, fields are remembered.

---

## 8. Alternatives — one-line trade-offs

| Provider | Free tier | Pros | Cons | Recommended? |
| --- | --- | --- | --- | --- |
| **Resend** | 3k/mo, 100/day | Cleanest UX, EU region, modern dashboard, simplest DKIM | Young (founded 2023) | **Yes — primary** |
| Postmark | 100/mo trial | Excellent deliverability reputation, beautiful dashboards | Free tier too small for us; paid plan starts at 15$/mo | Alternative if Resend disappoints |
| Brevo (ex-Sendinblue) | 300/day | Generous free tier, EU-based (France), DPA-ready | UI dated, support slower | Decent backup, more "marketing email" oriented |
| AWS SES | 62k/mo from EC2 | Cheap at scale, very reliable | Painful DKIM + bounce handling setup, requires AWS account, sandbox approval process for new senders | Overkill for our volume |
| Sendgrid | 100/day | Industry-standard | Twilio acquisition hurt UX; deliverability has slipped recently | Skip |

**Verdict:** Resend's free tier is sufficient (~3k/month vs. our actual <100/month even during peaks), the EU region is GDPR-friendly, and the DNS-verification UX is the gentlest on the market. Postmark is the cleanest paid alternative if we ever need 50k+/month or need extra-strict deliverability SLAs.

---

## 9. Rate limits and monitoring

### 9.1 Resend free-tier limits to keep in mind

- **3,000 emails / month** rolling window.
- **100 emails / day** (UTC reset).
- **2 emails / second** sustained, 50 emails / second burst (well above any plausible RSA spike — magic-link bursts cap at ~30 in one go).

If we ever foresee a single-day burst above 100 (e.g. inviting all 200+ alumni jurés at once), upgrade temporarily to the Pro plan (€20/mo, 50k/mo, 10k/day) — or batch the imports across two consecutive days.

### 9.2 What to watch in the Resend dashboard

- **Domains tab** → verify status stays **Verified** (DNS records shouldn't change, but if Elementor renews the zone the values can sometimes be re-quoted).
- **Logs tab** → check weekly for `bounced` or `complained` rates. Healthy: <2% bounce, <0.1% complaint. Above that, recipients' providers will start flagging us.
- **Emails tab** → for any specific magic-link ticket, search by recipient address → see the exact send/delivery timestamp.

### 9.3 What to watch in Supabase

- **Authentication → Logs** → look for SMTP errors (auth failed, timeout) — would mean the API key was revoked or the host/port misconfigured.
- **Project → Reports → Auth** → spike in "Magic link sent" without matching "User signed in" suggests delivery issues (link not arriving or not being clicked).

### 9.4 Suggested cadence

- Week 1 after switch-over: check Resend logs daily.
- Month 1: weekly.
- After: only when a user reports a missing email.

---

## 10. Open questions / decisions for Mathieu

1. **Resend organisation owner.** Is the Resend account opened under Mathieu personally (`mathieubal@gmail.com`) or under a Rotary-owned address (e.g. `prixstartuprotary@proton.me` if that proton inbox can receive verification mails)? Recommend Rotary-owned for continuity beyond Mathieu's mandate.
2. **Region choice.** EU (`eu-west-1`) is recommended for GDPR; confirm acceptable (US region performs identically for our recipients, but EU is the safer institutional default).
3. **Inbox for `contact@rotary-startup.org`.** Not strictly needed — Resend sends without requiring an actual mailbox. But if replies are expected, either (a) set up forwarding from `noreply@` to `prixstartuprotary@proton.me`, or (b) use a friendlier sender like `contact@rotary-startup.org` that already has an inbox. Recommend (a) plus an explicit "do not reply, contact prixstartuprotary@proton.me" line — already present in the branded footer.
4. **DMARC policy.** Start at `p=none` (monitoring only). Move to `p=quarantine` after 30 days of clean Resend logs, then `p=reject` after another 30. Out of scope for this immediate switch, but worth scheduling.
5. **Edge Function emails** (e.g. cron `backup-rsa` notifications, jury-ready announcements). If we ever send transactional emails from Edge Functions or `api/cron/*`, they should also use Resend — but via the **Resend HTTP API** (`POST https://api.resend.com/emails` with the `re_…` key as Bearer) rather than SMTP. Same domain, same DNS records, separate API key recommended (`supabase-edge-prod`) for clean rotation.

---

## 11. Checklist (execute in order)

- [ ] Resend account created, free plan, EU region.
- [ ] Domain `rotary-startup.org` added in Resend → DNS records displayed.
- [ ] DNS records pasted into Elementor Hosting → propagation verified.
- [ ] Resend domain status = **Verified** (all rows green).
- [ ] Test email sent from Resend dashboard to `mathieubal@gmail.com` → received, DKIM/SPF pass.
- [ ] Resend API key created (`supabase-smtp-prod`, sending-access only, restricted to `rotary-startup.org`) → stored in password manager.
- [ ] Branded Magic Link template pasted in Supabase (subject + HTML body from [`docs/design/email-templates/magic-link.md`](../design/email-templates/magic-link.md)).
- [ ] Supabase Authentication → SMTP Settings filled (host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender `contact@rotary-startup.org`, name `Rotary Startup Award`).
- [ ] **Save** in Supabase.
- [ ] Test magic link sent from Supabase → received in Gmail, Apple Mail, Outlook web, ProtonMail → renders correctly → CTA lands on `app.rotary-startup.org`.
- [ ] Decision log: note the switch-over date and Resend account owner in the team's shared notes for future operators.

---

## 12. Reference links

- Supabase docs — Custom SMTP: <https://supabase.com/docs/guides/auth/auth-smtp>
- Supabase docs — Email Templates: <https://supabase.com/docs/guides/auth/auth-email-templates>
- Resend docs — Supabase integration: <https://resend.com/docs/send-with-supabase-smtp>
- Resend docs — DNS for custom domains: <https://resend.com/docs/dashboard/domains/introduction>
- Élysée designbook (brand source of truth): [`docs/design/elysee-designbook.md`](../design/elysee-designbook.md)
- Magic-link template (paste-ready): [`docs/design/email-templates/magic-link.md`](../design/email-templates/magic-link.md)
- Deployment + host separation context (where DNS lives): [`docs/deepsolve/deploy-and-lunch-app-isolation.md`](./deploy-and-lunch-app-isolation.md)
