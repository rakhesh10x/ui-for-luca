import React from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';
import './App.css'; // Will create for specific animations

function App() {
  return (
    <>
      <main className="app-main fade-in">
        {/* Center Content */}
        <div className="center-content">
          <div className="sparkle-logo pulse">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285f4" />
                  <stop offset="33%" stopColor="#9b72cb" />
                  <stop offset="66%" stopColor="#d96570" />
                  <stop offset="100%" stopColor="#f4b400" />
                </linearGradient>
              </defs>
              <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" fill="url(#sparkleGrad)" />
            </svg>
          </div>
          <h1 className="welcome-text">Where should we start?</h1>
        </div>

        {/* Bottom Search Bar */}
        <div className="bottom-bar-container slide-up">
          <div className="search-bar" onClick={() => console.log('Open chat screen')}>
            <button className="icon-btn plus-btn" aria-label="Add attachment">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <span className="placeholder-text">Ask LUCA</span>
            <button className="icon-btn mic-btn" aria-label="Voice input" onClick={(e) => { e.stopPropagation(); console.log('Start voice input'); }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <PWABadge />
    </>
  );
}

export default App;
