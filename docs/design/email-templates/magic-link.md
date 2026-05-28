# Email template — Magic Link (Supabase Auth)

> **Status:** ready to paste into Supabase. No code changes required.
> **Brand:** Élysée (NAVY / GOLD / CREAM, Playfair + Inter). Single source of truth: [`docs/design/elysee-designbook.md`](../elysee-designbook.md) + [`src/components/design/tokens.js`](../../../src/components/design/tokens.js).
> **Audience:** every magic-link recipient — startups, jurés, comité, admin — on `app.rotary-startup.org`.
> **Auth flow:** trilingual single-door login (`MagicLinkLogin.jsx`). The email's voice mirrors the form's defaults: institutional, courteous, no marketing fluff.

---

## 1. Subject line (Supabase: "Subject heading")

```
Votre lien de connexion · Sign-in link · Anmeldelink — Rotary Startup Award
```

Why trilingual in the subject: Supabase's Magic Link template does not interpolate user-language variables in the subject, so we stack all three short labels separated by `·` (the editorial middot already used everywhere in the design system). The brand name closes the line for inbox recognition.

Length: 71 characters — fits Gmail / Apple Mail desktop preview without truncation; mild truncation on narrow mobile (still readable through "Sign-in link — Rotary…").

---

## 2. Preheader (hidden inbox preview)

```
Cliquez pour vous connecter · Click to sign in · Klicken zum Anmelden — lien valable une heure.
```

The preheader sits hidden inside the email body (see HTML below). It must repeat enough of the language stack so the recipient sees their tongue in the inbox preview, and adds the practical fact that the link expires (Supabase default magic-link TTL is 1 hour).

---

## 3. Design decisions (audit trail)

| Decision | Choice | Why |
| --- | --- | --- |
| Language labels | Plain text `FR / EN / DE` (uppercase, tracked) | Designbook §1.3 forbids emoji in app chrome. Unicode regional-indicator flags (🇫🇷 🇬🇧 🇩🇪) render inconsistently on Outlook desktop and some Android clients; plain tracked labels are universally legible and on-brand. |
| Layout primitive | `<table>` + inline styles | Email-client safety: Outlook (Word renderer), Gmail, Apple Mail, ProtonMail. No flex/grid, no external CSS files, no `<link rel="stylesheet">`, no JS. |
| Webfonts | `@import` Playfair + Inter via Google Fonts, **with serif/sans fallbacks** | Designbook §3. Many clients (Outlook desktop, Gmail app, ProtonMail) strip `@import`; we fall back gracefully to `Georgia, 'Times New Roman', serif` (≈ Playfair) and `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif` (≈ Inter). The visual identity holds even without webfonts. |
| Colours | Inline hex from `tokens.js` (NAVY `#0f1f3d`, GOLD `#c9a84c`, CREAM `#faf7f2`, CREAM2 `#e8e3d9`, INK `#3a3a52`, MUTED `#9090a8`) | Source of truth — never re-declare. |
| CTA button | Bulletproof `<table>` button (NAVY fill, white text, 4px radius) — single per language | Designbook §5.4. Three buttons would clutter; one centered button with a trilingual label keeps the "one door, one action" promise of the login UI. |
| Visual signature | Navy header strip + a single **gold hairline rule** under the wordmark | The brand's signature gold-line motif (designbook §4.5). No drop shadow, no gradient fill (§4.3, §4.4). |
| Wordmark | Serif text `Rotary Startup Award` — no PNG / no data-image | Supabase Magic Link template strips images in some processing paths; text is robust and accessible. |
| Footer | Hairline-separated muted line: contact `prixstartuprotary@proton.me` + trilingual "if you didn't request this, ignore" | Designbook §5.2 Footer pattern (`CREAM2` top border, `MUTED` text). |
| Supabase variable | `{{ .ConfirmationURL }}` | Official Supabase template variable for Magic Link / Confirmation flows. Wrapped in both the CTA `<a href>` and a fallback `<a>` link below for clients that strip styled buttons. |

---

## 4. HTML — paste this into Supabase

> **Where:** Supabase Dashboard → **Authentication** → **Email Templates** → **Magic Link** → paste into the **Message body (HTML)** field. Save.
> **Subject:** paste the subject line from §1 into the **Subject heading** field.

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>Rotary Startup Award — Lien de connexion</title>
    <!--
      Webfonts: Playfair Display (titles) + Inter (body). Some clients (Outlook
      desktop, Gmail app, ProtonMail) strip @import — the inline font stacks below
      fall back to system serif / sans so the brand still reads correctly.
    -->
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap');
      /* Outlook ignores <style>; the rules below are progressive enhancement only. */
      a { text-decoration: none; }
      @media only screen and (max-width: 480px) {
        .rsa-container { width: 100% !important; }
        .rsa-px { padding-left: 24px !important; padding-right: 24px !important; }
        .rsa-cta a { display: block !important; width: auto !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#faf7f2; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
    <!-- Preheader (hidden in body, shown in inbox preview) -->
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#faf7f2;">
      Cliquez pour vous connecter &middot; Click to sign in &middot; Klicken zum Anmelden &mdash; lien valable une heure.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf7f2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="rsa-container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background-color:#ffffff; border:1px solid #e8e3d9;">

            <!-- Header: NAVY strip with serif wordmark + gold rule -->
            <tr>
              <td align="center" bgcolor="#0f1f3d" style="background-color:#0f1f3d; padding:36px 24px 28px 24px;">
                <div style="font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:500; font-size:22px; line-height:1.2; color:#ffffff; letter-spacing:0.01em;">
                  Rotary Startup Award
                </div>
                <!-- Signature gold rule (28x1.5px in app; widened slightly for email) -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0 auto;">
                  <tr>
                    <td height="2" bgcolor="#c9a84c" style="background-color:#c9a84c; line-height:2px; font-size:0; width:40px;">&nbsp;</td>
                  </tr>
                </table>
                <div style="margin-top:10px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:#c9a84c; letter-spacing:0.18em; text-transform:uppercase;">
                  FR &nbsp;&middot;&nbsp; EN &nbsp;&middot;&nbsp; DE
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:40px 48px 16px 48px;">

                <!-- FR block -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:#9090a8; letter-spacing:0.18em; text-transform:uppercase; padding-bottom:6px;">
                      FR
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.6; color:#3a3a52; padding-bottom:24px;">
                      Voici votre lien de connexion personnel pour la plateforme Rotary Startup Award. Il reste valable une heure.
                    </td>
                  </tr>
                </table>

                <!-- EN block -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:#9090a8; letter-spacing:0.18em; text-transform:uppercase; padding-bottom:6px;">
                      EN
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.6; color:#3a3a52; padding-bottom:24px;">
                      Here is your personal sign-in link for the Rotary Startup Award platform. It is valid for one hour.
                    </td>
                  </tr>
                </table>

                <!-- DE block -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:#9090a8; letter-spacing:0.18em; text-transform:uppercase; padding-bottom:6px;">
                      DE
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.6; color:#3a3a52; padding-bottom:32px;">
                      Hier ist Ihr persönlicher Anmeldelink für die Plattform Rotary Startup Award. Er ist eine Stunde lang gültig.
                    </td>
                  </tr>
                </table>

                <!-- CTA: bulletproof button -->
                <table role="presentation" class="rsa-cta" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" bgcolor="#0f1f3d" style="background-color:#0f1f3d; border:1px solid #0f1f3d; border-radius:4px;">
                      <a href="{{ .ConfirmationURL }}"
                         target="_blank"
                         style="display:inline-block; padding:14px 28px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:14px; font-weight:500; line-height:1.2; color:#ffffff; text-decoration:none; border-radius:4px;">
                        Se connecter &nbsp;&middot;&nbsp; Sign in &nbsp;&middot;&nbsp; Anmelden
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Plain-link fallback for clients that strip styled buttons -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-top:20px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:12px; line-height:1.6; color:#9090a8;">
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                      If the button does not work, copy this link into your browser:<br />
                      Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:8px 0 32px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:12px; line-height:1.4; word-break:break-all;">
                      <a href="{{ .ConfirmationURL }}" target="_blank" style="color:#0f1f3d; text-decoration:underline;">
                        {{ .ConfirmationURL }}
                      </a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer hairline + meta -->
            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:0 48px 32px 48px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-top:1px solid #e8e3d9; padding-top:20px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; line-height:1.6; color:#9090a8; text-align:center;">
                      Si vous n'avez pas demandé ce lien, ignorez simplement cet email.<br />
                      If you did not request this link, please ignore this email.<br />
                      Falls Sie diesen Link nicht angefordert haben, ignorieren Sie diese E-Mail.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; line-height:1.6; color:#9090a8; text-align:center;">
                      Rotary Startup Award &middot; Rotary Club de Paris<br />
                      Contact :
                      <a href="mailto:prixstartuprotary@proton.me" style="color:#0f1f3d; text-decoration:underline;">prixstartuprotary@proton.me</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 5. Copy-paste instructions (Supabase dashboard)

1. Open **Supabase dashboard** → project `uaoucznptxmvhhytapso` → **Authentication** → **Email Templates** → **Magic Link** tab.
2. **Subject heading** field → paste the subject from §1.
3. **Message body (HTML)** field → paste the full HTML from §4 (replaces the default Supabase template).
4. Click **Save**.
5. Test from the dashboard: **Authentication** → **Users** → invite/send-magic-link to a personal address, open in Gmail (web + iOS app), Apple Mail (macOS + iOS), Outlook (web + Windows desktop if available), ProtonMail.

### Asset reminder

- **No images.** Supabase strips some asset URLs and our wordmark is pure type — keep it that way. If a logo is wanted later, host as a small PNG on the domain and use absolute HTTPS URL (no `data:` URIs — Outlook drops them and Gmail clips them above 102 KB).
- **No tracking pixels.** None needed; Resend's dashboard (see [`docs/deepsolve/email-smtp-resend-setup.md`](../../deepsolve/email-smtp-resend-setup.md)) already exposes delivery stats once SMTP is switched.
- **`{{ .ConfirmationURL }}`** is the only Supabase variable used; do not add `{{ .Email }}` etc. — keep the template minimal so it survives every template-rendering edge case.

---

## 6. Email-client compatibility — quick checklist

| Client | Expected behaviour | Notes |
| --- | --- | --- |
| Gmail web / Android / iOS | Renders Playfair + Inter (Gmail honours `@import` on web; mobile apps fall back to system serif/sans). | OK. |
| Apple Mail (macOS / iOS) | Full webfont support via `@import`. | OK. |
| Outlook desktop (Windows, Word engine) | Strips `@import`; falls back to `Georgia` (serif) + `Segoe UI`/`Arial` (sans). Bulletproof `<table>` button renders as solid NAVY pill via the `bgcolor` attribute. | OK. |
| Outlook.com / Outlook web | Better CSS support than desktop; webfonts may load. | OK. |
| ProtonMail | Strips `@import` and external resources by default; falls back to system stacks. | OK. |
| Yahoo Mail | OK, similar to Gmail web. | OK. |
| Dark mode | `meta name="color-scheme" content="light only"` forces light rendering — preserves the cream/navy palette. Outlook/Gmail dark-mode aggressive inversion is suppressed by the explicit `bgcolor` + inline `background-color` pair on every coloured cell. | OK. |

### Known caveats

- Outlook desktop does not render `border-radius` on the button itself; the `<td bgcolor="#0f1f3d">` still shows as a solid NAVY rectangle. Acceptable trade-off (industry standard for bulletproof buttons).
- A handful of clients (e.g. very old Lotus Notes) may not honour the hairline `1px solid #e8e3d9` borders. Visual is degraded but copy remains fully legible.
