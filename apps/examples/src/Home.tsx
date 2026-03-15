import { Link } from './router';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <span className="badge primary">BlaC Examples</span>
        <h1>State Management Reimagined</h1>
        <p>
          Explore the power of BlaC through these interactive examples. From
          simple counters to complex real-world apps, each example is focused on
          a specific set of patterns.
        </p>
      </header>

      <div className="examples-grid">
        <Link to="/counter" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">01</span>
            <h3>Counter</h3>
          </div>
          <p className="text-small text-muted">
            The classic counter, reimagined. Start here to understand Cubits,
            auto-tracking, and how shared vs named instances work.
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

        <Link to="/async" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">02</span>
            <h3>Async Data</h3>
          </div>
          <p className="text-small text-muted">
            Loading, error, and retry patterns for async operations. Three
            components share one Cubit but re-render independently based on
            what each one reads.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Async Methods</span>
              <span className="tag">Loading State</span>
              <span className="tag">Error + Retry</span>
              <span className="tag">Request Cancellation</span>
              <span className="tag">autoTrack: false</span>
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
            lifecycle hooks, and the action-only pattern.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">watch()</span>
              <span className="tag">onMount / onUnmount</span>
              <span className="tag">Manual Dependencies</span>
              <span className="tag">Action-Only Pattern</span>
            </div>
          </div>
        </Link>

        <Link to="/form" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">04</span>
            <h3>Form Validation</h3>
          </div>
          <p className="text-small text-muted">
            Two independent forms using instanceId, with getter-based tracking
            for computed validation so components only re-render when computed
            values change.
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
            cross-bloc dependencies via depend(), and keepAlive state that
            persists across navigations.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Custom Plugin</span>
              <span className="tag">depend()</span>
              <span className="tag">keepAlive</span>
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
            IndexedDB persistence plugin with async hydration, debounced saves,
            and stateToDb / dbToState transforms for custom record shapes.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">IndexedDB</span>
              <span className="tag">BlacPlugin</span>
              <span className="tag">Hydration</span>
              <span className="tag">stateToDb / dbToState</span>
            </div>
          </div>
        </Link>

        <Link to="/registry" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">07</span>
            <h3>Instance Registry</h3>
          </div>
          <p className="text-small text-muted">
            Instance lifecycle management. See per-component vs shared instances in
            action, with a live registry inspector powered by getStats() and a
            plugin event log.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">instanceId</span>
              <span className="tag">getStats()</span>
              <span className="tag">Lifecycle Events</span>
            </div>
          </div>
        </Link>

        <Link to="/messenger" className="example-card">
          <div className="stack-xs">
            <span className="badge">Advanced</span>
            <h3>Messenger</h3>
          </div>
          <p className="text-small text-muted">
            A full chat application showcasing advanced patterns: named
            instances per channel, cross-bloc dependencies, on-demand instance
            creation, and persistence on dispose.
          </p>
          <div className="stack-xs text-xs text-muted">
            <div className="row-xs">
              <span className="text-bold">Key Concepts:</span>
            </div>
            <div className="row-xs flex-wrap">
              <span className="tag">Named Instances</span>
              <span className="tag">acquire / borrow</span>
              <span className="tag">depend()</span>
              <span className="tag">onSystemEvent</span>
              <span className="tag">Persistence</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
