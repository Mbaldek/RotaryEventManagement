import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

const path = window.location.pathname;

async function mount() {
  if (path.startsWith('/RsaDashboard') || path.startsWith('/RsaScore') || path.startsWith('/RsaJuryForm')) {
    const [
      { default: RsaDashboard },
      { default: RsaScore },
      { default: RsaJuryForm },
    ] = await Promise.all([
      import('./pages/RsaDashboard.jsx'),
      import('./pages/RsaScore.jsx'),
      import('./pages/RsaJuryForm.jsx'),
    ]);
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <Router>
          <Routes>
            <Route path="/RsaDashboard" element={<RsaDashboard />} />
            <Route path="/RsaScore" element={<RsaScore />} />
            <Route path="/RsaJuryForm" element={<RsaJuryForm />} />
          </Routes>
        </Router>
      </React.StrictMode>
    );
  } else {
    const { default: App } = await import('./App.jsx');
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

mount();
