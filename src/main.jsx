import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initSentry } from '@/lib/observability/sentry'

// Init Sentry AVANT le premier render pour qu'il capture aussi les erreurs
// d'init des providers (AuthProvider, PlatformAuthProvider). No-op silencieux
// si VITE_SENTRY_DSN n'est pas configuré (cf. src/lib/observability/sentry.js).
initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
