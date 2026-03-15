import { Link, Route } from './router';
import { RouterBloc } from './router/RouterBloc';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';
import { FeedDemo } from './examples/02-async/FeedDemo';
import { MessengerApp } from './messenger';
import { TodoDemo } from './examples/03-todo/TodoDemo';
import { FormDemo } from './examples/04-form/FormDemo';
import { DashboardDemo } from './examples/05-dashboard/DashboardDemo';
import { DbPersistDemo } from './examples/06-db-persist/DbPersistDemo';
import { RegistryDemo } from './examples/07-registry/RegistryDemo';
import { useState } from 'react';
import { BlacDevtoolsUi } from '@blac/devtools-ui';
import { useBloc } from '@blac/react';
import { PerformanceOverlay } from './shared/components';
import './messenger/messenger.css';

const Logo = () => {
  return (
    <div className="nav-brand">
      BlaC <span style={{ fontWeight: 400, opacity: 0.8 }}>Examples</span>
    </div>
  );
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
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>🛠️</span>
        <div>
          <div style={{ fontWeight: 600 }}>BlaC DevTools Ready</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Press{' '}
            <kbd
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Alt+D
            </kbd>{' '}
            to toggle overlay
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={openDevTools}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            fontWeight: 500,
            transition: 'all 0.2s',
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
            fontSize: '18px',
            padding: '4px',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export function App() {
  const [showPerf, setShowPerf] = useState(false);

  // Initialize the router - the hook manages lifecycle (acquire on mount, release on unmount)
  useBloc(RouterBloc);

  return (
    <>
      <BlacDevtoolsUi />
      {showPerf && <PerformanceOverlay position="bottom-right" detailed />}
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
              <li>
                <Link to="/async">Async</Link>
              </li>
              <li>
                <Link to="/todo">Todo</Link>
              </li>
              <li>
                <Link to="/form">Form</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/db-persist">DB Persist</Link>
              </li>
              <li>
                <Link to="/registry">Registry</Link>
              </li>
              <li>
                <Link to="/messenger">Messenger</Link>
              </li>
              <li>
                <button
                  className="ghost"
                  onClick={() => setShowPerf((p) => !p)}
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
                  title="Toggle Performance Overlay"
                >
                  {showPerf ? 'Perf: ON' : 'Perf: OFF'}
                </button>
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
            <Route path="/async">
              <FeedDemo />
            </Route>
            <Route path="/todo">
              <TodoDemo />
            </Route>
            <Route path="/form">
              <FormDemo />
            </Route>
            <Route path="/dashboard">
              <DashboardDemo />
            </Route>
            <Route path="/db-persist">
              <DbPersistDemo />
            </Route>
            <Route path="/registry">
              <RegistryDemo />
            </Route>
            <Route path="/messenger">
              <MessengerApp />
            </Route>
          </div>
        </main>
      </div>
    </>
  );
}
