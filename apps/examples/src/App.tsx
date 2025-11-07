import { RouterBloc, Link, Route } from './router';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';
import { useState } from 'react';
import './overlay/overlay';

const Logo = () => {
  return <div className="nav-brand">BlaC Examples</div>;
};

const DevToolsBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const openDevTools = () => {
    // Dispatch custom event to toggle overlay
    window.dispatchEvent(new Event('blac-devtools-toggle'));
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🔧</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
            BlaC DevTools Active
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Press <kbd style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
            }}>Alt+D</kbd> to toggle in-app overlay, or open Chrome DevTools
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={openDevTools}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '4px',
            fontWeight: 500,
          }}
          title="Open BlaC DevTools Overlay"
        >
          Open DevTools
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
            opacity: 0.8,
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/**
 * Main app component with custom Blac-based routing.
 * This demonstrates using Blac for general application state,
 * not just component state.
 */
export function App() {
  // Initialize the router - it will be shared across the app
  // Using .resolve() to claim ownership and increment ref count
  RouterBloc.resolve();

  return (
    <div className="app-container">
      <DevToolsBanner />

      <nav className="nav">
        <div className="nav-content">
          <Logo />
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/counter">Counter</Link>
            </li>
          </ul>
        </div>
      </nav>

      <main className="view-wrapper">
        <div className="view-stack">
          <Route path="/">
            <Home />
          </Route>
          <Route path="/counter">
            <CounterDemo />
          </Route>
        </div>
      </main>
    </div>
  );
}
