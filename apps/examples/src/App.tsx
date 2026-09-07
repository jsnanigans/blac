import { Link, Route } from './router';
import { RouterBloc } from './router/RouterBloc';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';
import { FeedDemo } from './examples/02-async/FeedDemo';
import { TrackingDemo } from './examples/03-tracking/TrackingDemo';
import { FormDemo } from './examples/04-form/FormDemo';
import { InputPatternDemo } from './examples/05-inputs/InputPatternDemo';
import { CrossBlocDemo } from './examples/06-cross-bloc/CrossBlocDemo';
import { DbPersistDemo } from './examples/07-db-persist/DbPersistDemo';
import { RegistryDemo } from './examples/08-registry/RegistryDemo';
import { TodoDemo } from './examples/09-lifecycle/TodoDemo';
import { DashboardDemo } from './examples/10-dashboard/DashboardDemo';
import { MessengerApp } from './examples/11-messenger';
import { EncapsulationDemo } from './examples/12-encapsulation/EncapsulationDemo';
import { TestingDemo } from './examples/13-testing/TestingDemo';
import { useState } from 'react';
import { useBloc } from '@blac/react';
import { PerformanceOverlay } from './shared/components';
import { exampleCatalog, getRouteMeta } from './exampleCatalog';
import './examples/11-messenger/messenger.css';

export function App() {
  const [showPerf, setShowPerf] = useState(false);

  // Initialize the router - the hook manages lifecycle (acquire on mount, release on unmount)
  const [routerState] = useBloc(RouterBloc);
  const activeRoute = getRouteMeta(routerState.path);
  const isMessengerRoute = routerState.path === '/messenger';

  return (
    <>
      {showPerf && <PerformanceOverlay position="bottom-right" detailed />}
      <div className="app-container">
        <div className="app-ornaments" aria-hidden="true">
          <span className="app-orb app-orb-primary" />
          <span className="app-orb app-orb-secondary" />
          <span className="app-grid" />
        </div>

        <header className="site-header">
          <div className="site-header__inner">
            <div className="site-header__topline">
              <div className="site-mark">
                <span className="site-mark__word">BlaC</span>
                <span className="site-mark__label">Examples Atlas</span>
              </div>
              <div className="site-status">
                <span>{exampleCatalog.length} demos</span>
                <span>React + BlaC</span>
                <span>Live state patterns</span>
              </div>
            </div>

            <div className="site-header__hero">
              <div className="site-header__copy">
                <span className="site-eyebrow">
                  Interactive pattern library
                </span>
                <h1>
                  Examples that feel like working software, not toy demos.
                </h1>
                <p>
                  Move from single Cubits to a multi-panel messenger workspace.
                  Every route isolates one architectural idea while keeping the
                  UI tactile enough to inspect how state really behaves.
                </p>
              </div>

              <aside className="site-header__focus">
                <div className="site-focus__eyebrow">
                  <span className="badge primary">{activeRoute.category}</span>
                  <span className="site-focus__route">{activeRoute.path}</span>
                </div>

                <div className="stack-sm">
                  <span className="site-focus__label">Current stop</span>
                  <h2>{activeRoute.title}</h2>
                  <p>{activeRoute.blurb}</p>
                </div>

                <div className="site-focus__stats">
                  <div>
                    <strong>{activeRoute.id}</strong>
                    <span>route marker</span>
                  </div>
                  <div>
                    <strong>{activeRoute.badge}</strong>
                    <span>difficulty</span>
                  </div>
                  <div>
                    <strong>{showPerf ? 'ON' : 'OFF'}</strong>
                    <span>perf overlay</span>
                  </div>
                </div>

                <button
                  className="ghost site-focus__button"
                  onClick={() => setShowPerf((current) => !current)}
                  title="Toggle Performance Overlay"
                >
                  <span>
                    {showPerf
                      ? 'Hide performance overlay'
                      : 'Show performance overlay'}
                  </span>
                  <span aria-hidden="true">{showPerf ? '−' : '+'}</span>
                </button>
              </aside>
            </div>

            <nav className="example-nav" aria-label="Examples navigation">
              <div className="example-nav__scroll">
                <Link to="/" className="nav-pill">
                  <span className="nav-pill__index">00</span>
                  <span>Overview</span>
                </Link>
                {exampleCatalog.map((route) => (
                  <Link key={route.path} to={route.path} className="nav-pill">
                    <span className="nav-pill__index">{route.id}</span>
                    <span>{route.navLabel}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </header>

        <main
          className={`view-wrapper ${isMessengerRoute ? 'view-wrapper--messenger' : ''}`}
        >
          <div
            className={`view-frame ${isMessengerRoute ? 'view-frame--messenger' : ''}`}
          >
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
              <Route path="/tracking-lab">
                <TrackingDemo />
              </Route>
              <Route path="/form">
                <FormDemo />
              </Route>
              <Route path="/inputs">
                <InputPatternDemo />
              </Route>
              <Route path="/cross-bloc">
                <CrossBlocDemo />
              </Route>
              <Route path="/db-persist">
                <DbPersistDemo />
              </Route>
              <Route path="/registry">
                <RegistryDemo />
              </Route>
              <Route path="/lifecycle">
                <TodoDemo />
              </Route>
              <Route path="/dashboard">
                <DashboardDemo />
              </Route>
              <Route path="/messenger">
                <MessengerApp />
              </Route>
              <Route path="/encapsulation">
                <EncapsulationDemo />
              </Route>
              <Route path="/testing">
                <TestingDemo />
              </Route>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
