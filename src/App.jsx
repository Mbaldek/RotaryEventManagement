import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LanguageProvider } from '@/lib/platform/i18n';
import { PlatformAuthProvider } from '@/lib/platform/auth';
import ErrorBoundary from '@/lib/ErrorBoundary';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Sur le domaine de la plateforme RSA (app.rotary-startup.org), la racine "/" ET toutes
// les pages de l'app déjeuners sont masquées (-> /Login). L'app déjeuners reste servie
// sur ses autres hôtes (dev local, URL Vercel héritée) jusqu'à son extraction dédiée.
// Option A du deepsolve docs/deepsolve/deploy-and-lunch-app-isolation.md.
const isPlatformHost = () =>
  typeof window !== 'undefined' && window.location.hostname.startsWith('app.rotary-startup');

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
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
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};


function App() {

  return (
    <AuthProvider>
      <LanguageProvider>
        <PlatformAuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            <Toaster />
            <SonnerToaster />
          </QueryClientProvider>
        </PlatformAuthProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
