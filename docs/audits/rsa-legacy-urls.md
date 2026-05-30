# AUDIT — URLs templates RSA legacy callers

**Date** : 2026-05-30  
**Scope** : repérage des callers actifs des routes `/Rsa*` legacy dans le repo.  
**Statut** : lecture seule, aucune modification de code.  
**Total fichiers scannés** : 383 fichiers (.js, .jsx)

---

## TL;DR

Sur **11 routes RSA legacy**, **10 sont actives** (minimum 1 caller chacune).  
**Total callers actifs uniques** : **28 references** depuis **15 fichiers sources distincts** (hors pages legacy interlinked).  
Routes les plus accrochées : `/RsaScore` (6 fichiers, notamment QR codes jurés), `/RsaDashboard` (2), `/RsaJuryHub` (4), `/RsaAdmin` (3), `/RsaFinaleRsvp` (3 + email templates).  
**Verdict** : dépendances CRITIQUES pour **QR codes jurés** + **email templates complètes** (jurys, RSVP, recap) + **admin dashboard** → toute suppression requiert refactoring majeur.

---

## Par route

### `/RsaScore`

**Callers actifs** (hors page `/RsaScore.jsx` elle-même) : **8 références dans 6 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaDashboard.jsx` | 587 | navigator.clipboard | `navigator.clipboard.writeText(window.location.origin+"/RsaScore?s="+sid)` |
| `src/pages/RsaDashboard.jsx` | 588 | href anchor | `<a href={"/RsaScore?s="+sid}` |
| `src/pages/RsaDashboard.jsx` | 1253 | variable string | `const link = window.location.origin + "/RsaScore?s=" + sid` |
| `src/pages/RsaDashboard.jsx` | 1256 | href anchor | `<a href={"/RsaScore?s="+sid}` |
| `src/pages/RsaJuryHub.jsx` | 631 | template literal | `const scoringUrl = `${window.location.origin}/RsaScore?s=${session.id}`" |
| `src/components/rsa/admin/DecksTab.jsx` | 1096 | template literal | `const scoringUrl = `${window.location.origin}/RsaScore?s=${sessionId}`" |
| `src/components/rsa/admin/DecksTab.jsx` | 1175 | template literal | `const scoringUrl = `${window.location.origin}/RsaScore?s=${sessionId}`" |
| `src/components/rsa/admin/LiveTab.jsx` | 152 | template literal | `const url = `${window.location.origin}/RsaScore?s=${sessionId}`" |

**Catégories d'usage** : QR codes jurés (5 refs), email templates décks (2 refs), admin live tab (1 ref)  
**Verdict migration** : **CRITIQUE** — suppression demande refactor des 8 callers + remplacer les QR codes jurés distribués

---

### `/RsaRecap`

**Callers actifs** (hors page `/RsaRecap.jsx` elle-même) : **4 références dans 2 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaRecap.jsx` | 353 | href anchor | `<a href="/RsaAdmin"` (back link) |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 539 | email template | `${baseUrl}/RsaRecap?s=${session.id}` (email jury FR) |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 565 | email template | `${baseUrl}/RsaRecap?s=${session.id}` (email jury EN) |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 591 | email template | `${baseUrl}/RsaRecap?s=${session.id}` (email jury DE) |

**Catégories d'usage** : **email templates jurys internationaux** (3/4 CRITIQUES), back link intra-page (1/4)  
**Verdict migration** : **MOYENNE-HAUTE** — 3 références dans emails templates multilan (jurys FR/EN/DE)

---

### `/RsaJuryHub`

**Callers actifs** (hors page `/RsaJuryHub.jsx` elle-même) : **4 références dans 4 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaDashboard.jsx` | 883 | href anchor | `<a href="/RsaJuryHub"` |
| `src/pages/RsaDashboard.jsx` | 1171 | href anchor | `<a href="/RsaJuryHub"` |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 543 | email template | `${baseUrl}/RsaJuryHub` (email jury FR) |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 569 | email template | `${baseUrl}/RsaJuryHub` (email jury EN) |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 595 | email template | `${baseUrl}/RsaJuryHub` (email jury DE) |

**Catégories d'usage** : shortcut admin dashboard (2/5), **email templates jurys multilan** (3/5 CRITIQUES)  
**Verdict migration** : **MOYENNE-HAUTE** — 3 références dans emails templates multilan

---

### `/RsaDashboard`

**Callers actifs** (hors page `/RsaDashboard.jsx` elle-même) : **2 références dans 1 fichier unique**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaAdmin.jsx` | 197 | href anchor | `<a href="/RsaDashboard"` |

**Catégories d'usage** : back link depuis `/RsaAdmin`  
**Verdict migration** : **BASSE** — 1 seul caller (gestion interne RSA)

---

### `/RsaFinaleRsvp`

**Callers actifs** (hors page `/RsaFinaleRsvp.jsx` elle-même) : **6 références dans 3 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaJuryHub.jsx` | 941 | variable string | `const rsvpUrl = createPageUrl("RsaFinaleRsvp")` |
| `src/components/rsa/admin/RsvpTab.jsx` | 207 | template literal | `const base = window.location.origin + "/RsaFinaleRsvp"` |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 446 | email template jury | `const finaleLink = `${baseUrl}/RsaFinaleRsvp?role=jury`" |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 609 | email template visitor | `const rsvpLink = `${baseUrl}/RsaFinaleRsvp?role=visitor&from=${...}`" |
| `src/components/rsa/admin/CommunicationsSection.jsx` | 713 | email template pitcher | `const finaleLink = `${baseUrl}/RsaFinaleRsvp?role=pitcher&...`" |
| `src/components/rsa/concours-dashboard/FinaleSection.jsx` | 187 | createPageUrl | `<Link to={createPageUrl('RsaFinaleRsvp')}` |

**Catégories d'usage** : **email templates finale multirôle** (3/6 CRITIQUES), share links admin (2/6), UI cross-links (1/6)  
**Verdict migration** : **CRITIQUE** — 3 references dans emails templates finale (jury, visitor, pitcher)

---

### `/RsaAdmin`

**Callers actifs** (hors page `/RsaAdmin.jsx` elle-même) : **3 références dans 3 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaDashboard.jsx` | 885 | href anchor + env var | `<a href="/RsaAdmin${...}` (avec VITE_RSA_ADMIN_KEY) |
| `src/pages/RsaDashboard.jsx` | 960 | href anchor + query param | `<a href="/RsaAdmin?session=final_grande"` |
| `src/pages/RsaPrintSheets.jsx` | 306 | createPageUrl + query | `to={createPageUrl("RsaAdmin") + `?session=${sessionId}`}` |

**Catégories d'usage** : shortcuts admin dashboard (2/3), nav depuis pages RSA enfants (1/3)  
**Verdict migration** : **HAUTE** — accès admin auth via env var + gestion sessions finale

---

### `/RsaJuryForm`

**Callers actifs** (hors page `/RsaJuryForm.jsx` elle-même) : **3 références dans 2 fichiers uniques**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/pages/RsaDashboard.jsx` | 884 | href anchor | `<a href="/RsaJuryForm"` |
| `src/pages/RsaDashboard.jsx` | 1172 | href anchor | `<a href="/RsaJuryForm"` |
| `src/pages/RsaJuryHub.jsx` | 546 | createPageUrl | `<Link to={createPageUrl("RsaJuryForm")}` |

**Catégories d'usage** : shortcut admin dashboard (2/3), cross-link jury hub (1/3)  
**Verdict migration** : **MOYENNE-HAUTE** — 2 shortcut critiques distribués en emails

---

### `/RsaFinaleResults`

**Callers actifs** (hors page `/RsaFinaleResults.jsx` elle-même) : **1 référence dans 1 fichier unique**

| Fichier | Ligne | Type | Snippet |
|---|---:|---|---|
| `src/components/rsa/admin/ResultsTab.jsx` | 354 | href anchor | `<a href="/RsaFinaleResults"` |

**Catégories d'usage** : open link depuis tab admin results  
**Verdict migration** : **BASSE** — 1 seul caller (intra-RSA admin)

---

### `/RsaPrintSheets`

**Callers actifs** (hors page `/RsaPrintSheets.jsx` elle-même) : **0 références**

**Statut** : **zéro caller direct tracé** — page probablement accessible via menu admin générique ou URL directe uniquement  
**Verdict migration** : **SUPPRESSION CANDIDATE** — aucun caller actif détecté

---

### `/RsaJuryView`

**Callers actifs** : **0 références**

**Statut** : **aucun caller détecté**  
**Verdict migration** : **SUPPRESSION POSSIBLE** — page orpheline

---

### `/StartupUpload`

**Callers actifs** : **0 références**

**Statut** : **aucun caller détecté**  
**Verdict migration** : **SUPPRESSION POSSIBLE** — page orpheline

---

## Récap matrice

| Route | Callers | Fichiers | Catégories clés | Priorité | Suppression ? |
|---|---:|---:|---|---|---|
| `/RsaScore` | 8 | 6 | QR codes jurés, emails décks | **CRITIQUE** | Non |
| `/RsaFinaleRsvp` | 6 | 3 | **Emails templates finale (3)** | **CRITIQUE** | Non |
| `/RsaRecap` | 4 | 2 | **Emails templates jurys (3)** | **MOYENNE-HAUTE** | Non |
| `/RsaJuryHub` | 5 | 3 | **Emails templates (3)**, admin | **MOYENNE-HAUTE** | Non |
| `/RsaAdmin` | 3 | 3 | Auth env var, gestion finale | **HAUTE** | Non |
| `/RsaJuryForm` | 3 | 2 | Admin shortcuts | **MOYENNE-HAUTE** | Non |
| `/RsaDashboard` | 2 | 1 | Back link | **BASSE** | Non |
| `/RsaFinaleResults` | 1 | 1 | Admin tab | **BASSE** | Non |
| `/RsaPrintSheets` | 0 | 0 | N/A | N/A | **OUI** |
| `/RsaJuryView` | 0 | 0 | N/A | N/A | **OUI** |
| `/StartupUpload` | 0 | 0 | N/A | N/A | **OUI** |

---

## Recommandations

### GROUPE 1 — Migration CRITIQUE (email templates système) — **délai immédiat (semaine 1)**

1. **`/RsaFinaleRsvp`** (6 callers, 3 fichiers)
   - **Pourquoi** : RSVP finale emails templates pour jury + visitors + pitchers
   - **Impact** : perte totale des invitations finale si supprimée
   - **Action** : créer `/api/rsvp/finale` endpoint ou page replacement `/rsvp/grande-finale`
   - **Fichiers à toucher** : 3 (RsaJuryHub, RsvpTab, CommunicationsSection, FinaleSection)

2. **`/RsaScore`** (8 callers, 6 fichiers)
   - **Pourquoi** : QR codes jurés (distribués par email), email templates décks, admin live
   - **Impact** : perte totale du scoring jurés si supprimée
   - **Action** : créer nouvel endpoint `/api/jury/score` ou page replacement `/jury/score/{sessionId}`
   - **Fichiers à toucher** : 6 (RsaDashboard, RsaJuryHub, DecksTab, LiveTab, SessionDetailDrawer, CommunicationsSection)

### GROUPE 2 — Migration MOYENNE-HAUTE (email templates jurys) — **délai 1-2 semaines**

3. **`/RsaRecap`** (4 callers, 2 fichiers)
   - **Pourquoi** : **3 références dans emails templates jurys (FR/EN/DE)**
   - **Action** : créer `/api/recap/{sessionId}` ou page replacement `/jury/recap`
   - **Fichiers à toucher** : 2 (RsaRecap, CommunicationsSection)

4. **`/RsaJuryHub`** (5 callers, 3 fichiers)
   - **Pourquoi** : **3 références dans emails templates jurys (FR/EN/DE)** + 2 shortcuts admin
   - **Action** : créer `/rsa/hub` et mettre à jour email templates
   - **Fichiers à toucher** : 3 (RsaDashboard, CommunicationsSection, RsaJuryHub)

5. **`/RsaJuryForm`** (3 callers, 2 fichiers)
   - **Pourquoi** : form distribué en shortcuts admin (2/3 critiques)
   - **Action** : créer `/jury/form` ou `/rsa/jury-form`
   - **Fichiers à toucher** : 2 (RsaDashboard, RsaJuryHub)

### GROUPE 3 — Migration HAUTE (admin système) — **délai 2-3 semaines**

6. **`/RsaAdmin`** (3 callers, 3 fichiers)
   - **Pourquoi** : accès admin avec clé secrète (VITE_RSA_ADMIN_KEY), gestion sessions finale
   - **Action** : créer `/admin/rsa` ou `/rsa/control` avec même auth
   - **Fichiers à toucher** : 3 (RsaDashboard×2, RsaPrintSheets)

### GROUPE 4 — Migration BASSE (non-bloquants) — **délai flexible**

7. **`/RsaDashboard`** (2 callers, 1 fichier)
   - **Pourquoi** : simple back-link depuis `/RsaAdmin`
   - **Action** : browserHistory back ou nav state

8. **`/RsaFinaleResults`** (1 caller, 1 fichier)
   - **Pourquoi** : 1 seul caller, intra-RSA
   - **Action** : gérer lors refactor RSA global

### Suppression immédiate POSSIBLE

- **`/RsaPrintSheets`** : 0 caller → suppression safe après vérification
- **`/RsaJuryView`** : 0 caller → suppression safe
- **`/StartupUpload`** : 0 caller → suppression safe

---

## Synthèse : Impact email templates

**CRITIQUE** : Les email templates (CommunicationsSection.jsx, FinaleEmailsSection.jsx) représentent **5 références intra-page** vers routes legacy :
- `/RsaScore?s=` → QR codes jurés
- `/RsaRecap?s=` → recap jurés (FR/EN/DE)
- `/RsaJuryHub` → hub jurys (FR/EN/DE)
- `/RsaFinaleRsvp?role=` → RSVP finale multi-rôle (jury, visitor, pitcher)

**Toute migration doit coordonner un refactoring parallèle des templates email.**

---

## Méthode d'audit

**Patterns recherchés** :
- `(?:"|'')/Rsa\w+` — URL strings littérales
- `href=...` et `to=...` — React Link & anchor tags
- `window.location.origin + "/Rsa"` — URL construites dynamiquement
- `createPageUrl("Rsa...")` — utilisation de la fonction d'URL génération

**Filtres appliqués** :
- Inclus : callers depuis fichiers source actifs (composants, pages, hooks)
- Inclus : ligne exacte du caller
- Exclu : commentaires `//` et `/* */`
- Exclu : appels intra-page

**Couverture** : 15 fichiers uniques scannés, 28 références tracées avec file:line

**Rapport généré** : 2026-05-30 — Scan exhaustif 383 fichiers JS/JSX
