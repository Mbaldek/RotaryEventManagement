# Onboarding — Juré (jury)

> Guide for jurors of the Rotary Startup Award.
> **EN priority** (international jury), French section below.
> Screenshots : `docs/onboarding/screenshots/jure-*.png` (placeholders).

---

## Table of contents

- [EN — From invite to score in 4 steps](#en--from-invite-to-score-in-4-steps)
- [Scoring criteria](#scoring-criteria)
- [FR — De l'invitation au score en 4 étapes](#fr--de-linvitation-au-score-en-4-étapes)
- [FAQ](#faq)

---

## EN — From invite to score in 4 steps

**1. Apply or get invited.** Either fill the public form at
**app.rotary-startup.org/DevenirJury** (master_admin reviews within 48h) **or** receive
a direct invitation email from a club_admin / master_admin.
*Screenshot : `screenshots/jure-01-apply.png`*

**2. Click the magic link.** Email title : *"Welcome to RSA — your jury access"*. The
link signs you in and lands you on **/Welcome?role=jury**, then **/Jury** (your hub).
*Screenshot : `screenshots/jure-02-magic.png`*

**3. Prepare your session.** On **/Jury** you see your assigned sessions (date, time,
location), and for each session : the list of startups + their **pitch decks**, **exec
summaries** and 1-line **briefs**. Read everything **before** the session — sessions are
20 min / startup (10-12 min pitch + 8-10 min Q&A), no time to discover content live.
*Screenshot : `screenshots/jure-03-prep.png`*

**4. Score live.** During the session, open **/Jury → session → startup → Score**. Use
the slider per criterion (see below). Auto-save per criterion. When all jurors finalize,
the session is closed by club_admin and weighted averages are computed.
*Screenshot : `screenshots/jure-04-score.png`*

---

## Scoring criteria

Five criteria, each scored **0 to 10** with a 0.5 step. Weighted equally by default
(can be tweaked per edition by master_admin).

| Criterion | What you grade |
|-----------|----------------|
| **Team** | Cohesion, complementarity, execution track record |
| **Problem & Market** | Problem clarity, market size, timing |
| **Solution & Differentiation** | Unique value, defensibility, IP |
| **Traction** | Revenue, users, partnerships, growth rate |
| **Pitch quality** | Clarity, energy, Q&A handling |

A free **comment field** per startup is optional but strongly encouraged — it's the
input for the deliberation if any tie-breaking is needed.

---

## FR — De l'invitation au score en 4 étapes

**1. Candidate ou reçois une invitation.** Soit le form public
**app.rotary-startup.org/DevenirJury**, soit invitation directe d'un club_admin /
master_admin.

**2. Clique le magic link.** Email titré *"Bienvenue dans RSA — ton accès juré"*. Tu
atterris sur **/Welcome?role=jury** puis **/Jury**.

**3. Prépare ta session.** Sur **/Jury** tu vois tes sessions assignées avec la liste
des startups, leurs **pitch decks**, **exec summaries** et **briefs 1 ligne**. À lire
**avant** la session — 20 min par startup (10-12 min pitch + 8-10 min Q&A), pas le
temps de découvrir en live.

**4. Note en live.** Pendant la session : **/Jury → session → startup → Notation**.
Slider par critère, auto-save. Quand tous les jurés ont finalisé, le club_admin clôture
et les moyennes pondérées sont calculées.

---

## FAQ

**Q. I'm late on a score, can I edit after session close ?**
No. Once `rsa_finalize_session` runs, scores are locked. Ping the club_admin if you
were unable to score live.

**Q. Confidentiality ?**
Every dossier is confidential. NDA signed at sign-up (form `/DevenirJury` step 4).
Decks are served via signed URLs, expire 1h after access.

**Q. Tie-breaking ?**
If two startups are within 0.2 average, master_admin runs a deliberation call. The
comment fields are read aloud (anonymized).

**Q. I can't make a session I'm assigned to, how do I cancel ?**
From **/Jury → session card → "Cancel assignment"**. Club_admin gets notified and
re-assigns. Do this >48h ahead minimum.

---

Ops ref : [docs/USER-ACTIONS-V3.md § C.1](../USER-ACTIONS-V3.md#c1--supabase-edge-function-secrets--resend_api_key)
if jury invitation emails do not arrive.
