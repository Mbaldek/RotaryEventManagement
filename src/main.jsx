import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

const path = window.location.pathname;

async function mount() {
  if (path.startsWith('/RsaDashboard') || path.startsWith('/RsaScore')) {
    const [
      { default: RsaDashboard },
      { default: RsaScore },
    ] = await Promise.all([
      import('./pages/RsaDashboard.jsx'),
      import('./pages/RsaScore.jsx'),
    ]);
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <Router>
          <Routes>
            <Route path="/RsaDashboard" element={<RsaDashboard />} />
            <Route path="/RsaScore" element={<RsaScore />} />
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
