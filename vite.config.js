import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// V3 Vague 4 — Performance optimization + Bundle splitting
// ────────────────────────────────────────────────────────────────────────────
// Baseline avant V3 Vague 4 : 1 monolithic bundle ~2 764 KB / ~763 KB gzip.
// Cible  : Lighthouse Performance > 90 sur les routes principales.
//
// Stratégie :
//   1. `manualChunks(id)` éclate les libs lourdes en vendor chunks séparés
//      (react/supabase/query/motion/sentry/charts/ui) afin que le navigateur
//      mette en cache indépendamment ces dépendances entre déploiements.
//   2. Le code applicatif est SPLITTÉ PAR FEATURE AREA (rsa-master, rsa-club,
//      rsa-comms, rsa-analytics, rsa-jury, rsa-selection, rsa-candidature,
//      rsa-extensions, rsa-results) — modifier la Selection ne re-télécharge
//      plus le Master Cockpit.
//   3. Le code applicatif est en plus lazy-loadé route par route depuis
//      pages.config.js (React.lazy + Suspense dans App.jsx).
//
// Cf. docs/hardening/performance-budget-v4.md pour le détail des chunks
// ciblés et les seuils Lighthouse par route.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendors
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('@sentry')) return 'sentry';
            // NB: recharts/d3 NOT split — recharts has internal circular deps
            // that break with manualChunks (TDZ: "Cannot access 'T' before
            // initialization"). Let Vite auto-chunk it alongside its importers
            // (rsa-analytics). Cf. recharts issues #4823, #3615.
            if (
              id.includes('react-router') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('scheduler')
            ) return 'react';
            if (
              id.includes('@radix-ui') ||
              id.includes('lucide-react') ||
              id.includes('sonner') ||
              id.includes('cmdk')
            ) return 'ui';
            return undefined;
          }
          // App code: NO manual chunks. Routes are already lazy-loaded via
          // React.lazy (pages.config.js + App.jsx Suspense). Splitting by
          // feature area (rsa-master/club/jury/...) caused cross-chunk
          // circular deps and TDZ errors ("Cannot access 'ye' before
          // initialization") since these features share internal modules.
          // Vite auto-chunks shared code into common chunks without cycles.
          return undefined;
        },
      },
    },
    // V3 : on accepte des chunks jusqu'à 1.2MB (Sentry seul ≈ 800KB minifié).
    chunkSizeWarningLimit: 1200,
  },
})
