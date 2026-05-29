/**
 * pages.config.js - Page routing configuration
 *
 * ⚠️ V3 Vague 4 (perf-lighthouse) : ce fichier a été ré-écrit avec
 * React.lazy() pour faire du **route-level code splitting**. Chaque page
 * devient un chunk Rollup séparé chargé à la demande quand l'URL match.
 *
 * Avant V3 Vague 4 : 36 imports statiques → 1 bundle monolithique ~2.76 MB.
 * Après V3 Vague 4 : 36 lazy chunks ; le bundle initial ne paye plus les
 * pages /Admin, /Selection, /RsaDashboard, /JuryCandidate, etc.
 *
 * Le wrapper <Suspense> est défini dans App.jsx (fallback Loader2 doré).
 *
 * --- Convention historique (conservée pour info) ---
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Pour ajouter une page :
 *   1. Crée src/pages/MaPage.jsx
 *   2. Ajoute une ligne dans le bloc PAGES ci-dessous :
 *        "MaPage": lazy(() => import('./pages/MaPage')),
 *
 * Le mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Route-level code splitting — chaque page = chunk séparé chargé à la demande.
// React Router (v6) déclenche le fetch dès qu'une route match ; <Suspense>
// dans App.jsx affiche un loader doré le temps du download.
const Admin = lazy(() => import('./pages/Admin'));
const AdminControl = lazy(() => import('./pages/AdminControl'));
const Archives = lazy(() => import('./pages/Archives'));
const Candidater = lazy(() => import('./pages/Candidater'));
const Concours = lazy(() => import('./pages/Concours'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DevenirJury = lazy(() => import('./pages/DevenirJury'));
const EventPlanning = lazy(() => import('./pages/EventPlanning'));
const Features = lazy(() => import('./pages/Features'));
const FloorPlan = lazy(() => import('./pages/FloorPlan'));
const Index = lazy(() => import('./pages/Index'));
const Jury = lazy(() => import('./pages/Jury'));
const JuryCandidate = lazy(() => import('./pages/JuryCandidate'));
const Login = lazy(() => import('./pages/Login'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const MonDossier = lazy(() => import('./pages/MonDossier'));
const ReservationRequest = lazy(() => import('./pages/ReservationRequest'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Resultats = lazy(() => import('./pages/Resultats'));
const RsaAdmin = lazy(() => import('./pages/RsaAdmin'));
const RsaDashboard = lazy(() => import('./pages/RsaDashboard'));
const RsaFinaleResults = lazy(() => import('./pages/RsaFinaleResults'));
const RsaFinaleRsvp = lazy(() => import('./pages/RsaFinaleRsvp'));
const RsaJuryForm = lazy(() => import('./pages/RsaJuryForm'));
const RsaJuryHub = lazy(() => import('./pages/RsaJuryHub'));
const RsaJuryView = lazy(() => import('./pages/RsaJuryView'));
const RsaPrintSheets = lazy(() => import('./pages/RsaPrintSheets'));
const RsaRecap = lazy(() => import('./pages/RsaRecap'));
const RsaScore = lazy(() => import('./pages/RsaScore'));
const Selection = lazy(() => import('./pages/Selection'));
const StartupUpload = lazy(() => import('./pages/StartupUpload'));
const TableView = lazy(() => import('./pages/TableView'));
const TableViewMockup = lazy(() => import('./pages/TableViewMockup'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Welcome = lazy(() => import('./pages/Welcome'));


export const PAGES = {
    "Admin": Admin,
    "AdminControl": AdminControl,
    "Archives": Archives,
    "Candidater": Candidater,
    "Concours": Concours,
    "Dashboard": Dashboard,
    "DevenirJury": DevenirJury,
    "EventPlanning": EventPlanning,
    "Features": Features,
    "FloorPlan": FloorPlan,
    "Index": Index,
    "Jury": Jury,
    "JuryCandidate": JuryCandidate,
    "Login": Login,
    "Marketplace": Marketplace,
    "MonDossier": MonDossier,
    "ReservationRequest": ReservationRequest,
    "Reservations": Reservations,
    "Resultats": Resultats,
    "RsaAdmin": RsaAdmin,
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
    "TableView": TableView,
    "TableViewMockup": TableViewMockup,
    "UserManagement": UserManagement,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Index",
    Pages: PAGES,
    Layout: __Layout,
};
