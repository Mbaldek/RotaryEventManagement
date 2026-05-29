# Onboarding — Candidat (startup)

> Guide pour les startups qui candidatent au Rotary Startup Award.
> Sections **FR** puis **EN**. PDF-ready (Markdown propre).
> Captures : voir `docs/onboarding/screenshots/candidat-*.png` (placeholders).

---

## Table of contents

- [FR — Candidater en 5 étapes](#fr--candidater-en-5-étapes)
- [EN — Apply in 5 steps](#en--apply-in-5-steps)
- [FAQ](#faq)

---

## FR — Candidater en 5 étapes

**1. Choisir la compétition.** Va sur **app.rotary-startup.org/Candidater**.
Tu vois la liste des éditions ouvertes (ex : *RSA 2027 · Paris Étoile*). Clique
celle qui te concerne.
*Capture : `screenshots/candidat-01-choose-edition.png`*

**2. Renseigner ton email.** Saisis l'email du fondateur principal. Tu recevras un
*magic link* (lien unique sans mot de passe). Clique-le depuis la même machine.
*Capture : `screenshots/candidat-02-email.png`*

**3. Remplir le dossier.** Tu atterris sur **/MonDossier**. Le funnel guidé te demande :
- Identité startup (nom, SIRET, date création, site, pitch 1-phrase)
- Équipe (fondateurs, rôles)
- Marché & solution (problème, traction, business model)
- Levée (montant levé, runway)
- Documents : **pitch deck PDF**, **executive summary PDF**, **logo PNG/SVG**

L'autosave tourne en arrière-plan — pas besoin de cliquer "Enregistrer".
*Capture : `screenshots/candidat-03-funnel.png`*

**4. Soumettre.** Quand tous les champs requis sont verts, le bouton **Soumettre mon
dossier** s'active. Une fois soumis, le dossier est verrouillé en édition.
*Capture : `screenshots/candidat-04-submit.png`*

**5. Suivre le statut.** Reviens sur **/MonDossier** à tout moment pour voir où en est
ton dossier : *Soumis → En review comité → Sélectionné/Non sélectionné → Pitch jury
prévu le ... → Résultat publié*. Tu reçois aussi un email à chaque étape.

### Éligibilité

Société créée >2020, CA <500K€, levée totale <800K€, siège FR ou DE. Tout dossier
hors critères est marqué *non éligible* automatiquement (mais reste visible pour toi).

---

## EN — Apply in 5 steps

**1. Pick the competition.** Visit **app.rotary-startup.org/Candidater**. Browse open
editions (ex : *RSA 2027 · Paris Étoile*). Click yours.

**2. Enter your email.** Use the lead founder email. You'll receive a *magic link* (no
password). Click it from the same device.

**3. Fill the dossier.** You land on **/MonDossier**. The guided funnel asks :
- Startup identity (name, registration number, founding date, website, 1-line pitch)
- Team
- Market & solution
- Fundraising
- Documents : **pitch deck PDF**, **executive summary PDF**, **logo**

Autosave runs in the background.

**4. Submit.** When all required fields are green, the **Submit dossier** button
activates. Once submitted, edits are locked.

**5. Track status.** Come back to **/MonDossier** anytime to see your status :
*Submitted → Under committee review → Selected/Rejected → Jury pitch scheduled →
Results published*. Email notifications at every step.

### Eligibility

Company founded >2020, revenue <500K€, total raised <800K€, HQ in FR or DE. Out-of-
criteria dossiers are flagged as *not eligible* automatically.

---

## FAQ

**Q. J'ai perdu mon magic-link, comment je récupère mon dossier ?**
Retourne sur `/Login`, saisis le même email — un nouveau lien arrive.

**Q. Je peux modifier après soumission ?**
Non. Contacte ton organisateur club (`docs/onboarding/club_admin.md`) si correction
urgente.

**Q. Quel format pour le pitch deck ?**
PDF, max 10 Mo, max 20 slides. EN ou FR. Captures écran lisibles imprimées (jury
print).

**Q. Mes documents sont-ils privés ?**
Oui. Stockage chiffré bucket `dossiers` privé Supabase, accès via signed URLs 1h.
Seuls toi, ton comité et ton jury (post-sélection) y accèdent.

---

Référence ops : [docs/USER-ACTIONS-V3.md § B.1](../USER-ACTIONS-V3.md#b1--supabase-auth--redirect-urls-allow-list) si les magic-links bouncent.
