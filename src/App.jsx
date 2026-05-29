import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, MotionConfig } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuthOrNull } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LanguageProvider } from '@/lib/platform/i18n';
import { PlatformAuthProvider } from '@/lib/platform/auth';
import ErrorBoundary from '@/lib/ErrorBoundary';
import { CREAM2, INK, GOLD } from '@/components/design/tokens';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Sur le domaine de la plateforme RSA (app.rotary-startup.org), la racine "/" ET toutes
// les pages de l'app déjeuners sont masquées (-> /Login). L'app déjeuners reste servie
// sur ses autres hôtes (dev local, URL Vercel héritée) jusqu'à son extraction dédiée.
// Option A du deepsolve docs/deepsolve/deploy-and-lunch-app-isolation.md.
const isPlatformHost = () =>
  typeof window !== 'undefined' && window.location.hostname.startsWith('app.rotary-startup');

// F3 — Gate d'instanciation de l'AuthProvider hérité (déjeuners).
// Avant : l'AuthProvider était monté inconditionnellement, ce qui déclenchait
// `checkAppState` (getSession + loadProfile) systématiquement, MÊME sur le
// domaine plateforme où on n'utilise pas l'AuthContext déjeuners. Résultat :
// double getSession() + double onAuthStateChange (un pour PlatformAuthProvider,
// un pour AuthProvider) — deux appels réseau Supabase inutiles à chaque mount.
// Après : sur isPlatformHost(), on ne monte PAS l'AuthProvider. Les consommateurs
// (AuthenticatedApp) utilisent useAuthOrNull() qui retourne null + fallback.
const AuthProviderGate = ({ children }) => {
  if (isPlatformHost()) return <>{children}</>;
  return <AuthProvider>{children}</AuthProvider>;
};

// Valeurs par défaut quand l'AuthProvider hérité n'est PAS monté (cas plateforme RSA).
// Calquées sur l'API de AuthContext mais "non-loading + non-auth" — l'AuthenticatedApp
// rend le shell normalement, et la plateforme RSA gère son propre auth via PlatformAuthProvider.
const LEGACY_AUTH_FALLBACK = {
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  navigateToLogin: () => { window.location.href = '/Login'; },
};

// Pages appartenant à l'app déjeuners (legacy). Sur le domaine plateforme, elles
// redirigent vers /Login. Les pages plateforme (Login, MonDossier, Selection, Jury…)
// + les pages RSA héritées (RsaScore, RsaJuryHub…) ne sont PAS dans cette liste.
const LUNCH_PAGES = new Set([
  'AdminControl', 'Archives', 'Dashboard', 'EventPlanning', 'Features',
  'FloorPlan', 'Index', 'ReservationRequest', 'Reservations',
  'TableView', 'TableViewMockup', 'UserManagement',
]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// V3 Vague 4 — Loader doré centré pendant le download d'un chunk lazy.
// Couleur GOLD (#c9a84c) cohérente avec le design system Élysée.
// On centre verticalement avec fixed inset-0 pour qu'on voie quelque chose
// même quand la page lazy est lourde (Admin, Selection, RsaDashboard).
const RouteFallback = () => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    role="status"
    aria-label="Chargement de la page"
  >
    <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
  </div>
);

// PageTransition — fade-up subtil sur chaque changement de route.
// Respecte prefers-reduced-motion via useReducedMotion() (framer-motion).
const PageTransition = ({ children, locationKey }) => {
  const reduce = useReducedMotion();
  const initial = reduce ? { opacity: 0 } : { opacity: 0, y: 6 };
  const animate = reduce ? { opacity: 1 } : { opacity: 1, y: 0 };
  return (
    <motion.div
      key={locationKey}
      initial={initial}
      animate={animate}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
};

// AnimatedRoutesWrapper — fait remonter `location` à <Routes> pour permettre à
// AnimatePresence de tracker correctement la sortie de la route précédente.
// L'enfant attendu est une factory `(location) => <Routes location={location}>…`
// (ou simplement <Routes>...</Routes>, auquel cas React Router v6 utilisera la
// location courante de toute façon, mais alors l'exit ne montrera pas la page
// précédente). Notre AuthenticatedApp passe le `Routes` directement — c'est OK
// pour un fade d'entrée subtil (la page précédente disparaît instantanément),
// et reste correct pour le sentiment "premium".
const AnimatedRoutes = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location.pathname} locationKey={location.pathname}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  // F3 — useAuthOrNull() au lieu de useAuth() : retourne null quand l'AuthProvider
  // hérité n'est PAS monté (cas plateforme RSA, gated par AuthProviderGate). On
  // fallback sur LEGACY_AUTH_FALLBACK pour préserver l'API du composant.
  const legacy = useAuthOrNull() || LEGACY_AUTH_FALLBACK;
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = legacy;

  // Sur le domaine plateforme RSA (app.rotary-startup.org), l'AuthProvider hérité
  // (déjeuners) ne doit PAS gater le rendu : les pages plateforme ont leur propre
  // auth (PlatformAuthProvider) et l'AuthContext legacy peut rester loading si la
  // session déjeuners ne répond pas — d'où le spinner perpétuel observé en prod
  // 2026-05-28. Sur les autres hôtes (déjeuners legacy), on garde le comportement
  // historique pour ne rien casser tant que l'extraction Option C n'est pas faite.
  const onPlatform = isPlatformHost();
  if (!onPlatform && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (déjeuners legacy seulement — la plateforme RSA gère
  // ses erreurs auth dans ses propres pages via PlatformAuthProvider).
  if (!onPlatform && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app. ErrorBoundary autour des Routes : une exception jetée dans
  // n'importe quel composant fils ne fait plus sauter toute la racine React (qui re-mount
  // immédiatement et redéclenche onAuthStateChange → loadIdentity en cluster — voir
  // src/lib/ErrorBoundary.jsx pour le contexte du diagnostic /Admin).
  //
  // AnimatedRoutes wrapper : fade-up subtil sur chaque changement de route (Élysée),
  // respecte prefers-reduced-motion. Pattern useLocation().pathname comme key (requis
  // par AnimatePresence + react-router-dom v6).
  // V3 Vague 4 — <Suspense> wrappe les routes lazy-loaded. Toutes les pages
  // sont désormais des React.lazy() chunks (cf. src/pages.config.js), donc on
  // a besoin d'un fallback pendant le download du chunk JS de la page cible.
  // Le Suspense est placé À L'INTÉRIEUR d'AnimatedRoutes pour que la page
  // précédente ne disparaisse pas instantanément (AnimatePresence garde son
  // exit animation côté ancienne route).
  return (
    <ErrorBoundary>
      <AnimatedRoutes>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={
              isPlatformHost()
                ? <Navigate to="/Login" replace />
                : (
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                  </LayoutWrapper>
                )
            } />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  // Host-gate (Option A) : sur app.rotary-startup.org, les pages déjeuners
                  // redirigent vers /Login pour ne plus "fuiter" sur le domaine plateforme.
                  isPlatformHost() && LUNCH_PAGES.has(path)
                    ? <Navigate to="/Login" replace />
                    : (
                      <LayoutWrapper currentPageName={path}>
                        <ErrorBoundary>
                          <Page />
                        </ErrorBoundary>
                      </LayoutWrapper>
                    )
                }
              />
            ))}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </AnimatedRoutes>
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProviderGate>
      <LanguageProvider>
        <PlatformAuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            {/* MotionConfig reducedMotion="user" — WCAG 2.3.3 : Framer-Motion respects */}
            {/* prefers-reduced-motion globally (page transitions, modal exits, …) when */}
            {/* the OS / browser sets the preference. Components keep their motion */}
            {/* definitions as-is — the runtime just zero-duration the values. */}
            <MotionConfig reducedMotion="user">
              <Router>
                <NavigationTracker />
                <AuthenticatedApp />
              </Router>
              <Toaster />
              <SonnerToaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'white',
                  border: `1px solid ${CREAM2}`,
                  color: INK,
                  fontFamily: 'Inter, sans-serif',
                  borderRadius: 4,
                },
                classNames: {
                  success: 'border-l-2 border-l-[#0f1f3d]',
                  error: 'border-l-2 border-l-[#a23b2d]',
                  info: 'border-l-2 border-l-[#c9a84c]',
                },
              }}
            />
            </MotionConfig>
          </QueryClientProvider>
        </PlatformAuthProvider>
      </LanguageProvider>
    </AuthProviderGate>
  )
}

export default App
