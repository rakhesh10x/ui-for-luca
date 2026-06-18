import React from 'react';
import { PWABadge } from './components/PWABadge';
import './index.css';

function App() {
  return (
    <>
      <main className="app-main" style={{ minHeight: '100vh' }}>
        {/* The background gradient is handled by index.css on the body/html tags */}
      </main>

      <PWABadge />
    </>
  );
}

export default App;
