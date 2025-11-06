import { Link } from './router';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <span className="text-xs text-muted">BLAC EXAMPLES</span>
        <h1>BlaC State Management</h1>
        <p>
          Interactive examples demonstrating BlaC's state management
          capabilities. Each example showcases different patterns and features,
          from simple counters to complex event-driven architectures.
        </p>
      </header>

      <div className="examples-grid">
        <Link to="/counter" className="example-card">
          <div className="stack-xs">
            <span className="badge">01</span>
            <h3>Counter</h3>
          </div>
          <p className="text-small text-muted">
            Basic state management with Cubit. Demonstrates shared vs isolated
            instances and automatic dependency tracking.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Shared and isolated instances</li>
            <li>• Lifecycle hooks</li>
            <li>• Render tracking</li>
            <li>• Dependency tracking</li>
          </ul>
        </Link>
      </div>
    </div>
  );
}
