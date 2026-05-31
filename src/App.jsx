import { Suspense } from 'react';
import RotaryWheel from '@/components/design/RotaryWheel';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, MotionConfig } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { LanguageProvider } from '@/lib/platform/i18n';
import { PlatformAuthProvider } from '@/lib/platform/auth';
import ErrorBoundary from '@/lib/ErrorBoundary';
import { CREAM2, INK } from '@/components/design/tokens';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout
  ? <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// V3 Vague 4 — Loader centré pendant le download d'un chunk lazy.
// La roue Rotary remplace le spinner générique : même marque que le header et le
// Login, qui tourne un peu plus vite ici pour lire comme un loader.
const RouteFallback = () => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    role="status"
    aria-label="Chargement de la page"
  >
    <RotaryWheel size={56} spin duration={2.4} decorative />
  </div>
);

// PageTransition — fade-up subtil sur chaque changement de route.
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

// Post-R1 (2026-05-30) — Lunch app extracted vers ../rotary-event-lunch/.
// L'App principale ne sert plus que la plateforme RSA (app.rotary-startup.org).
// Plus de double provider auth, plus de host-gate, plus de LUNCH_PAGES set.
// Route "/" → /Login direct.
const AuthenticatedApp = () => (
  <ErrorBoundary>
    <AnimatedRoutes>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/Login" replace />} />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <ErrorBoundary>
                    <Page />
                  </ErrorBoundary>
                </LayoutWrapper>
              }
            />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </AnimatedRoutes>
  </ErrorBoundary>
);

function App() {
  return (
    <LanguageProvider>
      <PlatformAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
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
  )
}

export default App
