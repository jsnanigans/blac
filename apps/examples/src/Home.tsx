import { Link } from './router';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <span className="badge primary">BlaC Examples</span>
        <h1>State Management Reimagined</h1>
        <p>
          Explore the power of BlaC through these interactive examples. From
          simple counters to complex event-driven architectures, see how BlaC
          makes state management predictable and type-safe.
        </p>
      </header>

      <div className="examples-grid">
        <Link to="/counter" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">01</span>
            <h3>Counter</h3>
          </div>
          <p className="text-small text-muted">
            The classic counter example, reimagined. Demonstrates the basics of
            Cubit, state streams, and automatic dependency tracking.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Cubit</span>
              <span className="tag">useBloc</span>
              <span className="tag">emit / patch</span>
              <span className="tag">Auto-Tracking</span>
              <span className="tag">Shared vs Isolated</span>
            </div>
          </div>
        </Link>

        <Link to="/messenger" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">02</span>
            <h3>Messenger</h3>
          </div>
          <p className="text-small text-muted">
            A complex chat application featuring multiple users, real-time-like
            updates, and cross-component communication.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">instanceKey</span>
              <span className="tag">acquire / borrow</span>
              <span className="tag">depend()</span>
              <span className="tag">Persistence</span>
              <span className="tag">Real-Time Events</span>
            </div>
          </div>
        </Link>

        <Link to="/todo" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">03</span>
            <h3>Todo List</h3>
          </div>
          <p className="text-small text-muted">
            A full-featured todo app with localStorage persistence via watch(),
            lifecycle hooks, and manual dependency optimization.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">watch()</span>
              <span className="tag">onMount / onUnmount</span>
              <span className="tag">Manual Dependencies</span>
              <span className="tag">Action-Only</span>
              <span className="tag">localStorage</span>
            </div>
          </div>
        </Link>

        <Link to="/form" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">04</span>
            <h3>Form Validation</h3>
          </div>
          <p className="text-small text-muted">
            Two independent forms side by side, each with its own state via
            instanceId. Getter-based tracking for computed validation.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Getter Tracking</span>
              <span className="tag">instanceId</span>
              <span className="tag">Computed State</span>
              <span className="tag">Validation</span>
            </div>
          </div>
        </Link>

        <Link to="/dashboard" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">05</span>
            <h3>Dashboard</h3>
          </div>
          <p className="text-small text-muted">
            A widget-based dashboard with a custom plugin for analytics,
            cross-bloc dependencies, and state that persists across navigations.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Custom Plugin</span>
              <span className="tag">depend()</span>
              <span className="tag">blac({'{ keepAlive }'})</span>
              <span className="tag">Cross-Bloc Deps</span>
            </div>
          </div>
        </Link>

        <Link to="/db-persist" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">06</span>
            <h3>DB Persist</h3>
          </div>
          <p className="text-small text-muted">
            A basic IndexedDB persistence plugin example with async hydration,
            debounced saves, and custom state parsing.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">IndexedDB</span>
              <span className="tag">BlacPlugin</span>
              <span className="tag">Hydration</span>
              <span className="tag">stateToDb</span>
              <span className="tag">dbToState</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
