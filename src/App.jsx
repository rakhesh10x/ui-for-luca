import React from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';

function App() {
  return (
    <>
      <header className="app-header" style={{ padding: '2rem' }}>
        <button className="btn-secondary" style={{ padding: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <button className="btn-secondary" style={{ padding: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
          </svg>
        </button>
      </header>

      <main className="app-main">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          
          {/* Glowing Star Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            background: 'conic-gradient(from 180deg at 50% 50%, #FF3B30 0deg, #FFCC00 90deg, #34C759 180deg, #007AFF 270deg, #FF3B30 360deg)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: 'drop-shadow(0 0 10px rgba(0, 122, 255, 0.5))'
          }} />

          <h1 style={{ fontSize: '2.5rem', fontWeight: '300', letterSpacing: '-0.03em' }}>
            Let's jump in, Mani
          </h1>
          
        </div>
      </main>

      {/* Bottom Actions */}
      <footer style={{ padding: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
        <button className="btn-primary" style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>
        </button>
        <button className="btn-primary" style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
        
        {/* Center Pill */}
        <div style={{
          width: '120px',
          height: '48px',
          borderRadius: '24px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'inset 0 -10px 20px rgba(0, 122, 255, 0.3)'
        }} />

        <button className="btn-primary" style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
        </button>
        <button className="btn-primary" style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </footer>

      <PWABadge />
    </>
  );
}

export default App;
