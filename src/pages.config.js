/**
 * pages.config.js - Page routing configuration
 *
 * Route-level code splitting via React.lazy — chaque page = chunk Rollup séparé.
 * Le wrapper <Suspense> est défini dans App.jsx (fallback Loader2 doré).
 *
 * Convention pour ajouter une page :
 *   1. Crée src/pages/MaPage.jsx
 *   2. Ajoute une ligne dans le bloc ci-dessous :
 *        "MaPage": lazy(() => import('./pages/MaPage')),
 *
 * 2026-05-30 — Post-R1 : les 11 pages lunch (Index, Dashboard, Reservations,
 * EventPlanning, FloorPlan, TableView, Archives, AdminControl, ReservationRequest,
 * UserManagement, Features) ont été extraites vers ../rotary-event-lunch/.
 * 2026-05-30 — Post-µ6 : 10 pages RSA legacy URL-active rangées dans pages/legacy/.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Admin = lazy(() => import('./pages/Admin'));
const Allocation = lazy(() => import('./pages/Allocation'));
const Candidater = lazy(() => import('./pages/Candidater'));
const Concours = lazy(() => import('./pages/Concours'));
const DevenirJury = lazy(() => import('./pages/DevenirJury'));
const GuidesAdmin = lazy(() => import('./pages/GuidesAdmin'));
const Jury = lazy(() => import('./pages/Jury'));
const JuryCandidate = lazy(() => import('./pages/JuryCandidate'));
const Login = lazy(() => import('./pages/Login'));
const MonDossier = lazy(() => import('./pages/MonDossier'));
const Resultats = lazy(() => import('./pages/Resultats'));
const RsaAdmin = lazy(() => import('./pages/RsaAdmin'));
const Score = lazy(() => import('./pages/Score'));
const Selection = lazy(() => import('./pages/Selection'));
const Welcome = lazy(() => import('./pages/Welcome'));

// RSA legacy URL-active (cf. docs/audits/rsa-legacy-urls.md) — endpoints réels
// pour QR codes jurés, emails finale, deep links admin.
const RsaDashboard = lazy(() => import('./pages/legacy/RsaDashboard'));
const RsaFinaleResults = lazy(() => import('./pages/legacy/RsaFinaleResults'));
const RsaFinaleRsvp = lazy(() => import('./pages/legacy/RsaFinaleRsvp'));
const RsaJuryForm = lazy(() => import('./pages/legacy/RsaJuryForm'));
const RsaJuryHub = lazy(() => import('./pages/legacy/RsaJuryHub'));
const RsaJuryView = lazy(() => import('./pages/legacy/RsaJuryView'));
const RsaPrintSheets = lazy(() => import('./pages/legacy/RsaPrintSheets'));
const RsaRecap = lazy(() => import('./pages/legacy/RsaRecap'));
const RsaScore = lazy(() => import('./pages/legacy/RsaScore'));
const StartupUpload = lazy(() => import('./pages/legacy/StartupUpload'));


export const PAGES = {
    "Admin": Admin,
    "Allocation": Allocation,
    "Candidater": Candidater,
    "Concours": Concours,
    "DevenirJury": DevenirJury,
    "GuidesAdmin": GuidesAdmin,
    "Jury": Jury,
    "JuryCandidate": JuryCandidate,
    "Login": Login,
    "MonDossier": MonDossier,
    "Resultats": Resultats,
    "RsaAdmin": RsaAdmin,
    "Score": Score,
    "RsaDashboard": RsaDashboard,
    "RsaFinaleResults": RsaFinaleResults,
    "RsaFinaleRsvp": RsaFinaleRsvp,
    "RsaJuryForm": RsaJuryForm,
    "RsaJuryHub": RsaJuryHub,
    "RsaJuryView": RsaJuryView,
    "RsaPrintSheets": RsaPrintSheets,
    "RsaRecap": RsaRecap,
    "RsaScore": RsaScore,
    "Selection": Selection,
    "StartupUpload": StartupUpload,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Login",
    Pages: PAGES,
    Layout: __Layout,
};
