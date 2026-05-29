# Onboarding — Se connecter

> Guide transverse (candidat, juré, comité, admin) pour se connecter à la
> plateforme **app.rotary-startup.org**.
> Sections **FR** puis **EN**. PDF-ready (Markdown propre).
> Captures : voir `docs/onboarding/screenshots/login-*.png` (placeholders).

---

## Table of contents

- [FR — 3 façons de se connecter](#fr--3-façons-de-se-connecter)
- [FR — Aide : je ne reçois pas l'email magic-link](#fr--aide--magic-link)
- [FR — Aide : ma session est bloquée](#fr--aide--session-bloquée)
- [EN — 3 ways to sign in](#en--3-ways-to-sign-in)
- [EN — Help: my magic-link email never arrives](#en--help-magic-link)
- [EN — Help: my session is stuck](#en--help-session-stuck)

---

## FR — 3 façons de se connecter

La plateforme RSA propose **3 portes d'entrée**, toutes équivalentes — choisis
celle qui te convient le mieux. Quel que soit ton mode de connexion, ton rôle
(candidat / juré / comité / admin) est résolu automatiquement après le sign-in.

### 1. Magic-link (par email) — recommandé pour particuliers

C'est la méthode par défaut, sans mot de passe.

1. Va sur **app.rotary-startup.org/Login**.
2. Saisis ton email (le même que celui que tu as utilisé pour candidater ou
   celui auquel le comité a envoyé l'invitation).
3. Clique **"Recevoir mon lien de connexion"**.
4. Ouvre l'email reçu (souvent en moins de 30 secondes, expéditeur `noreply@rotary-startup.org`).
5. Clique le bouton **"Se connecter"** dans l'email. Le lien est valable 1 heure
   et utilisable **une seule fois**.

*Capture : `screenshots/login-01-magiclink.png`*

**Bon à savoir :**
- Si tu cliques depuis une autre machine que celle où tu as fait la demande, ça
  marche quand même (tu seras juste connecté sur l'appareil où tu as cliqué).
- Si l'email est trop long à arriver (> 2 min), passe en SSO Google ou Microsoft (cf. ci-dessous).

### 2. Google — recommandé pour les comptes Gmail / Google Workspace

Plus rapide, sans email à attendre.

1. Va sur **app.rotary-startup.org/Login**.
2. Clique **"Continuer avec Google"**.
3. Choisis ton compte Google dans la popup.
4. Accepte les permissions demandées (email + profil de base).
5. Tu es connecté immédiatement.

*Capture : `screenshots/login-02-google.png`*

**Quand l'utiliser :**
- Tu as un compte Gmail perso ou pro (`@gmail.com`, `@google-workspace-de-ta-boite.com`).
- Ton entreprise utilise un DLP qui ralentit ou bloque les emails magic-link.

### 3. Microsoft — recommandé pour les comptes Outlook / Microsoft 365 / Azure AD

Idem Google, pour l'écosystème Microsoft.

1. Va sur **app.rotary-startup.org/Login**.
2. Clique **"Continuer avec Microsoft"**.
3. Si tu es déjà loggué sur Outlook ou Teams, c'est automatique. Sinon entre tes credentials.
4. Accepte les permissions (email + profil).
5. Tu es connecté immédiatement.

*Capture : `screenshots/login-03-microsoft.png`*

**Quand l'utiliser :**
- Tu es sur un PC pro avec Outlook desktop, Teams ou Microsoft 365.
- Ton entreprise utilise Microsoft ATP "safe links" qui invalide les magic-links email.

---

## FR — Aide : Magic-link

### "Je ne reçois pas l'email"

Avant de paniquer, vérifie dans l'ordre :

1. **Spam / Promotions / Quarantaine.** Cherche `rotary-startup.org` dans tous
   les onglets. Ajoute `noreply@rotary-startup.org` à tes contacts pour les
   prochaines fois.
2. **Délai.** Sur des inboxes pro (Gmail Workspace, Outlook for Business), le
   DLP peut retarder l'email de 30 s à 2 min. Patiente, puis demande "Renvoyer".
3. **Email mal saisi.** Clique "Renvoyer / changer d'email" → vérifie qu'il n'y
   a pas de typo (`gnail.com`, espace en fin de champ, etc.).
4. **Rate-limit Supabase.** Si tu fais plusieurs essais en moins d'1 min, tu
   verras le message *"For security purposes, you can only request this after
   60 seconds."* — attends, puis réessaie.
5. **Filtrage DLP / antivirus entreprise.** Si rien n'arrive après 5 min,
   passe en **SSO Google ou Microsoft** (cf. ci-dessus) — c'est la méthode
   qui marche dans 100 % des cas, indépendamment du filtrage email.

### "L'email arrive mais le clic ne marche pas (erreur ou page blanche)"

Plusieurs causes possibles :

- **Lien expiré (> 1h).** Demande un nouveau lien sur `/Login`.
- **Lien déjà utilisé.** Les magic-links sont à usage unique. Si Outlook ATP
  "safe links" ou un antivirus a "scanné" le lien avant ton clic, il est
  considéré consommé. **Solution :** utilise plutôt **SSO Microsoft**.
- **Erreur "Invalid redirect URL".** Bug de config côté admin RSA. Envoie un
  email à `mathieubal@gmail.com` avec une capture d'écran de l'URL de la
  barre d'adresse.

---

## FR — Aide : Session bloquée

### "Je suis connecté mais l'app charge à l'infini" / "Spinner perpétuel"

C'est un bug rare qui devrait avoir disparu en V4 (watchdog 4s côté code,
cf. `docs/hardening/login-audit-v4.md` friction F1). Si ça t'arrive :

1. **Recharge la page (Ctrl+F5 / Cmd+Shift+R).** Dans 80 % des cas, ça suffit.
2. **Réinitialise ta session.** Sur `/Login` ou `/MonDossier`, cherche le bouton
   **"Réinitialiser ma session"** (ajouté V4). Il vide le cache local + déconnecte
   proprement. Reconnecte-toi ensuite normalement.
3. **Vide manuellement le localStorage** (si le bouton n'apparaît pas) :
   - Chrome / Edge : F12 → onglet Application → Storage → Clear site data.
   - Safari : Develop → Empty Caches.
   - Firefox : F12 → Storage → clic droit sur le domaine → Delete All.

### "J'arrive sur /MonDossier mais je devrais être sur /Admin (ou inverse)"

Le routing après login est basé sur tes rôles en base. Si tu atterris au mauvais
endroit :

1. **Attends 1 seconde puis recharge.** Le résolveur de rôles a une fenêtre de
   600 ms ; si ton internet est lent, il peut "rater" la première décision.
2. Si ça persiste, contacte `mathieubal@gmail.com` avec ton email de login —
   il y a probablement un rôle manquant dans `app_user_roles`.

### "Je ne reçois plus mes droits admin après avoir cliqué un magic-link"

Cas observé pré-V4, censé être fixé (friction F2). Si tu le revois :

1. Vérifie sur `/MonDossier` ou en haut à droite de l'écran : ton email est-il bien le bon ?
2. Si oui, demande à Mathieu de relancer la fonction `rsa_my_roles()` pour ton compte.
3. Workaround temporaire : déconnecte-toi (menu top-right → "Se déconnecter")
   puis reconnecte-toi.

---

## EN — 3 ways to sign in

The RSA platform offers **3 sign-in doors**, all equivalent — pick the one you
prefer. Whichever method you use, your role (applicant / jury / committee /
admin) is resolved automatically after sign-in.

### 1. Magic-link (by email) — recommended for individuals

The default password-less method.

1. Go to **app.rotary-startup.org/Login**.
2. Enter your email (the same one you used to apply, or the one the committee
   sent your invitation to).
3. Click **"Send me a sign-in link"**.
4. Open the email (usually within 30 seconds, sender `noreply@rotary-startup.org`).
5. Click the **"Sign in"** button. The link is valid for 1 hour and can only be
   used **once**.

*Screenshot: `screenshots/login-01-magiclink.png`*

**Good to know:**
- You can click from a different device than the one where you submitted —
  you'll just be signed in on the device you clicked from.
- If the email takes > 2 minutes, switch to Google or Microsoft SSO (see below).

### 2. Google — recommended for Gmail / Google Workspace accounts

Faster, no email needed.

1. Go to **app.rotary-startup.org/Login**.
2. Click **"Continue with Google"**.
3. Pick your Google account in the popup.
4. Accept the requested permissions (email + basic profile).
5. You're signed in immediately.

*Screenshot: `screenshots/login-02-google.png`*

**When to use it:**
- You have a personal or work Gmail account (`@gmail.com`, `@your-workspace.com`).
- Your company DLP slows down or blocks magic-link emails.

### 3. Microsoft — recommended for Outlook / Microsoft 365 / Azure AD accounts

Same as Google, for the Microsoft ecosystem.

1. Go to **app.rotary-startup.org/Login**.
2. Click **"Continue with Microsoft"**.
3. If you're already logged into Outlook or Teams, it's automatic. Otherwise
   enter your credentials.
4. Accept the permissions (email + profile).
5. You're signed in immediately.

*Screenshot: `screenshots/login-03-microsoft.png`*

**When to use it:**
- You're on a work PC with Outlook desktop, Teams, or Microsoft 365.
- Your company uses Microsoft ATP "safe links" which invalidate magic-link emails.

---

## EN — Help: Magic-link

### "I don't receive the email"

Check in this order before panicking:

1. **Spam / Promotions / Quarantine.** Search for `rotary-startup.org` in every
   tab. Add `noreply@rotary-startup.org` to your contacts for next time.
2. **Delay.** On corporate inboxes (Gmail Workspace, Outlook for Business), the
   DLP can hold the email 30 s – 2 min. Wait, then click "Resend".
3. **Typo in email.** Click "Resend / change email" → make sure there's no typo
   (`gnail.com`, trailing space, etc.).
4. **Supabase rate-limit.** If you try several times within 1 min, you'll see
   *"For security purposes, you can only request this after 60 seconds."* —
   wait and retry.
5. **Corporate DLP / antivirus filtering.** If nothing arrives after 5 min,
   switch to **Google or Microsoft SSO** (see above) — it works 100 % of the
   time, independently of email filtering.

### "The email arrives but clicking doesn't work (error or blank page)"

A few possible causes:

- **Link expired (> 1 h).** Request a new one on `/Login`.
- **Link already used.** Magic-links are single-use. If Outlook ATP "safe links"
  or an antivirus scanned it before you clicked, it's considered consumed.
  **Fix:** use **Microsoft SSO** instead.
- **"Invalid redirect URL" error.** Config bug on the RSA admin side. Email
  `mathieubal@gmail.com` with a screenshot of the address bar URL.

---

## EN — Help: Session stuck

### "I'm signed in but the app loads forever" / "Endless spinner"

A rare bug that should be gone in V4 (4s watchdog in code, see
`docs/hardening/login-audit-v4.md` friction F1). If you still hit it:

1. **Hard reload (Ctrl+F5 / Cmd+Shift+R).** Fixes 80 % of cases.
2. **Reset your session.** On `/Login` or `/MonDossier`, look for the
   **"Reset my session"** button (added in V4). It clears the local cache and
   signs you out cleanly. Then sign in again normally.
3. **Manually clear localStorage** (if the button isn't there):
   - Chrome / Edge: F12 → Application tab → Storage → Clear site data.
   - Safari: Develop → Empty Caches.
   - Firefox: F12 → Storage → right-click the domain → Delete All.

### "I land on /MonDossier but should be on /Admin (or vice-versa)"

Post-login routing is based on your DB roles. If you end up in the wrong place:

1. **Wait 1 second then reload.** The role resolver has a 600 ms window; on slow
   networks it can "miss" the first decision.
2. If it persists, contact `mathieubal@gmail.com` with your login email — a role
   is probably missing in `app_user_roles`.

### "I lost my admin privileges after clicking a magic-link"

Bug observed pre-V4, supposed to be fixed (friction F2). If you see it again:

1. Check on `/MonDossier` or the top-right of the screen: is your email correct?
2. If yes, ask Mathieu to re-run the `rsa_my_roles()` function for your account.
3. Temporary workaround: sign out (top-right menu → "Sign out") then sign in again.

---

## Notes (admin / dev)

- Cette doc est référencée par le bouton **"Aide : je ne reçois pas l'email"**
  ajouté dans `src/components/design/auth/MagicLinkLogin.jsx` post-V4
  (friction F10).
- Captures : à produire avant publication publique (placeholders `screenshots/login-*.png`).
- Version DE : reportée V4.1 — la cible jury allemande est trilingue mais en
  pratique les emails Rotary DE acceptent l'EN sans friction.
