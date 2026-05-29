// ErrorBoundary — garde-fou contre les render errors qui font sauter toute la racine
// React (et créent une boucle re-mount → onAuthStateChange → loadIdentity en cluster).
//
// Sans ErrorBoundary, une exception jetée dans n'importe quel composant fils provoque
// l'unmount complet de la root, puis un re-mount immédiat — d'où les CLUSTERS de
// /profiles + /app_user_roles toutes les quelques secondes et le spinner perpétuel
// (observé sur /Admin Vercel preview, cf. mission DEBUG du 2026-05-28).
//
// L'ErrorBoundary capture l'erreur, l'affiche en clair (au lieu du spinner-of-death),
// expose un bouton « Réessayer » qui réinitialise l'état local et laisse la racine
// intacte. console.error pousse aussi l'erreur dans les Vercel runtime logs.

import React from 'react';
import { captureException } from '@/lib/observability/sentry';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error, info: null };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught render error:', error, info);
    // Sentry : capture explicite avec le componentStack pour reconstituer
    // l'arborescence React au moment du crash. No-op si Sentry pas init.
    captureException(error, {
      source: 'ErrorBoundary',
      componentStack: info?.componentStack ?? null,
    });
    this.setState({ error, info });
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }

    const NAVY = '#0f1f3d';
    const GOLD = '#c9a84c';
    const INK = '#3a3a52';
    const CREAM = '#faf7f2';
    const CREAM2 = '#e8e3d9';

    return (
      <div
        className="min-h-screen flex items-center justify-center px-5"
        style={{ background: CREAM, color: NAVY }}
      >
        <div
          className="max-w-[560px] w-full rounded-[4px] p-6"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.18em] font-medium"
              style={{ color: GOLD }}
            >
              Erreur d’affichage
            </span>
          </div>
          <h1 className="text-[20px] mb-2" style={{ color: NAVY, fontWeight: 500 }}>
            La page n’a pas pu s’afficher.
          </h1>
          <p className="text-[13.5px] mb-4" style={{ color: INK }}>
            Une erreur inattendue a interrompu le rendu. Le détail technique se trouve
            ci-dessous (utile pour signaler le problème à l’équipe).
          </p>
          <pre
            className="text-[11.5px] rounded-[4px] p-3 overflow-auto max-h-[240px] whitespace-pre-wrap"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: INK }}
          >
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY, color: 'white' }}
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
              className="inline-flex items-center px-4 py-2 rounded-[4px] text-[13px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
