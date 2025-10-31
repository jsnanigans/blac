import { Link } from './router';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <span className="home-kicker">Neon Architecture Field Guide</span>
        <h1>Blac Control Center</h1>
        <p className="home-subtitle">
          Plug into a suite of high-voltage demos that show how Blac slices
          through complex state. Watch dependency tracking, lifecycle control,
          and instance orchestration react instantly as you interact.
        </p>
      </header>

      <div className="examples-grid">
        <Link to="/counter" className="example-card">
          <span className="example-card-index">01</span>
          <h2 className="example-card-title">Counter Pulse</h2>
          <p>
            Calibrate your instincts with the essentials—observe Blac&apos;s
            reactive core as counts surge across shared and isolated channels.
          </p>
          <ul className="features-list">
            <li>Shared vs isolated Cubit instances</li>
            <li>Lifecycle hooks logging mount / unmount</li>
            <li>Render tracing via console logs</li>
            <li>Automatic dependency tracking</li>
          </ul>
        </Link>

        <Link to="/todos" className="example-card">
          <span className="example-card-index">02</span>
          <h2 className="example-card-title">Todo Switchboard</h2>
          <p>
            Route signals through multiple named instances and watch selective
            reactivity keep every widget razor-focused.
          </p>
          <ul className="features-list">
            <li>Fine-grained update propagation</li>
            <li>Named instances for parallel lists</li>
            <li>Computed statistics with zero memo hooks</li>
            <li>LocalStorage sync via lifecycle events</li>
          </ul>
        </Link>

        <Link to="/shopping" className="example-card">
          <span className="example-card-index">03</span>
          <h2 className="example-card-title">Cart Vertex Array</h2>
          <p>
            Immerse in event-driven flow where complex nested state morphs in
            sync with precise dispatch choreography.
          </p>
          <ul className="features-list">
            <li>Vertex event pipeline with typed handlers</li>
            <li>Deep proxy tracking on nested objects</li>
            <li>Async checkout and error lanes</li>
            <li>Modular Bloc coordination</li>
          </ul>
        </Link>

        <Link to="/dashboard" className="example-card">
          <span className="example-card-index">04</span>
          <h2 className="example-card-title">Telemetry Deck</h2>
          <p>
            Watch render counters pulse only where metrics change. This is
            Blac&apos;s laser-cut dependency tracking on full display.
          </p>
          <ul className="features-list">
            <li>Render counters with live instrumentation</li>
            <li>Selective widget re-rendering</li>
            <li>No memoization boilerplate required</li>
            <li>Auto / manual update control panel</li>
          </ul>
        </Link>
      </div>
    </div>
  );
}
