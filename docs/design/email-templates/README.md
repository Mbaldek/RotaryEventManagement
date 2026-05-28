# Email templates — index

This folder holds the Élysée-branded HTML templates used by **Supabase Auth** for `app.rotary-startup.org`. Each template is paste-ready: open Supabase dashboard → **Authentication** → **Email Templates** → pick the matching tab → replace the default template with the HTML from the corresponding file here.

Brand source of truth: [`docs/design/elysee-designbook.md`](../elysee-designbook.md) + [`src/components/design/tokens.js`](../../../src/components/design/tokens.js).
SMTP setup (production-volume delivery via Resend): [`docs/deepsolve/email-smtp-resend-setup.md`](../../deepsolve/email-smtp-resend-setup.md).

---

## Templates

| # | Supabase template | File | Status | Notes |
| - | --- | --- | --- | --- |
| 1 | **Magic Link** | [`magic-link.md`](./magic-link.md) | Ready to paste | Single-door login email (startups / jurés / comité / admin all use the same link). Variable: `{{ .ConfirmationURL }}`. |
| 2 | **Confirm signup** | _(planned)_ | Not yet needed | Supabase only sends this when **email confirmation** is enabled at signup. Our flow is magic-link only, no password — so this template is dormant. Brand it when/if we ever switch on email confirmation. |
| 3 | **Invite user** | _(planned)_ | To do | Used when an admin invites a juré or comité member from the dashboard. Variable: `{{ .ConfirmationURL }}`. Will reuse the Magic Link layout with a different lead sentence ("Vous êtes invité(e) à rejoindre…"). |
| 4 | **Change email address** | _(planned)_ | To do | Sent to both the old and new address when a user changes their email. Variables: `{{ .ConfirmationURL }}` and `{{ .NewEmail }}` / `{{ .Email }}`. Lower priority — magic-link flow rarely triggers this. |
| 5 | **Reset password** | _Not applicable_ | N/A | We do not use passwords. This Supabase template stays at its default and is never sent. |
| 6 | **Reauthentication** | _Not applicable today_ | N/A | Only used when sensitive operations require re-confirmation; not part of the current platform flows. |

> Each Supabase template lives at: Dashboard → **Authentication** → **Email Templates** → respective tab. Subject heading and HTML body are edited independently per template.

---

## Conventions used in every template

- **Layout:** `<table>` + inline styles only. No `<link>`, no `<script>`, no external CSS file.
- **Webfonts:** `@import` Playfair Display + Inter (Google Fonts) **with serif / sans system fallbacks** so clients that strip `@import` (Outlook desktop, ProtonMail, Gmail mobile apps in part) still render on-brand.
- **Palette:** inline hex matching `tokens.js` (NAVY `#0f1f3d`, GOLD `#c9a84c`, CREAM `#faf7f2`, CREAM2 `#e8e3d9`, INK `#3a3a52`, MUTED `#9090a8`).
- **Buttons:** bulletproof `<table>` pattern — `<td bgcolor>` + inline-styled `<a>` — so Outlook desktop renders a solid NAVY pill (no `border-radius` on Outlook is the accepted trade-off).
- **Trilingual:** FR / EN / DE stacked in short blocks, in that order, mirroring the design system's chrome convention. Plain `FR / EN / DE` text labels — no emoji per designbook §1.3 (flags omitted; tracked uppercase letters are the editorial equivalent).
- **Tone:** institutional, courteous, measured — same voice as `MagicLinkLogin.jsx`. No marketing fluff, no exclamation marks.
- **Footer:** hairline `CREAM2` top border, muted contact line with `prixstartuprotary@proton.me` and the trilingual "if you didn't request this, ignore" disclaimer.
- **Variables:** stick to Supabase's standard set (`{{ .ConfirmationURL }}`, optionally `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`). Avoid custom Go-template logic — Supabase rejects unknown helpers.
- **No images / no data-URIs.** The wordmark is pure type. Tracking pixels are unnecessary — Resend's dashboard provides delivery metrics.
- **Dark-mode safety:** `<meta name="color-scheme" content="light only">` + explicit `bgcolor` attributes on every coloured cell to suppress aggressive auto-inversion in Outlook / Gmail dark modes.

---

## Workflow when adding a new template

1. Duplicate `magic-link.md` to `<template-name>.md` in this folder.
2. Adapt only the body copy (FR/EN/DE) and the subject — keep the header, CTA, and footer identical so the family reads as one.
3. Document the Supabase variable(s) used and the subject line at the top of the new file.
4. Add the row to the table above (move from _planned_ to _ready_).
5. Paste into Supabase and send a real test from the dashboard to confirm in Gmail, Apple Mail, Outlook web, and ProtonMail.
