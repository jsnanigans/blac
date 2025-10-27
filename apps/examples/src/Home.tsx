import { Link } from './router';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>Blac Examples</h1>
        <p>
          Explore modern state management with Blac through interactive examples
          showcasing automatic dependency tracking, lifecycle management, and
          flexible instance control.
        </p>
      </header>

      <div className="examples-grid">
        <Link to="/counter" className="example-card">
          <h2>1. Counter</h2>
          <p>Simple introduction to Blac's core concepts</p>
          <ul className="features-list">
            <li>Basic Cubit state container</li>
            <li>Lifecycle hooks (onMount/onUnmount)</li>
            <li>Instance management (shared vs isolated)</li>
            <li>Automatic dependency tracking</li>
          </ul>
        </Link>

        <Link to="/todos" className="example-card">
          <h2>2. Todo List</h2>
          <p>Intermediate patterns with granular updates</p>
          <ul className="features-list">
            <li>Fine-grained dependency tracking</li>
            <li>Named instances for multiple lists</li>
            <li>Computed properties pattern</li>
            <li>LocalStorage persistence via lifecycle</li>
          </ul>
        </Link>

        <Link to="/shopping" className="example-card">
          <h2>3. Shopping Cart</h2>
          <p>Advanced event-driven architecture</p>
          <ul className="features-list">
            <li>Event-driven Vertex pattern</li>
            <li>Complex nested state management</li>
            <li>Multiple coordinated Blocs</li>
            <li>Async operations and loading states</li>
          </ul>
        </Link>

        <Link to="/dashboard" className="example-card">
          <h2>4. Real-time Dashboard</h2>
          <p>The power of automatic dependency tracking</p>
          <ul className="features-list">
            <li>Multiple widgets with independent re-renders</li>
            <li>Visual render counters show optimization</li>
            <li>Zero manual optimization needed</li>
            <li>Beats React.memo + useMemo + useCallback</li>
          </ul>
        </Link>
      </div>
    </div>
  );
}
