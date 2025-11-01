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

        <Link to="/todos" className="example-card">
          <div className="stack-xs">
            <span className="badge">02</span>
            <h3>Todo List</h3>
          </div>
          <p className="text-small text-muted">
            Array state management with filtering. Shows fine-grained updates
            and localStorage persistence.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Array updates</li>
            <li>• Named instances</li>
            <li>• Computed properties</li>
            <li>• LocalStorage sync</li>
          </ul>
        </Link>

        <Link to="/shopping" className="example-card">
          <div className="stack-xs">
            <span className="badge">03</span>
            <h3>Shopping Cart</h3>
          </div>
          <p className="text-small text-muted">
            Event-driven architecture with Vertex. Handles complex nested state
            and async operations.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Event-driven pattern</li>
            <li>• Nested state tracking</li>
            <li>• Async operations</li>
            <li>• Error handling</li>
          </ul>
        </Link>

        <Link to="/dashboard" className="example-card">
          <div className="stack-xs">
            <span className="badge">04</span>
            <h3>Dashboard</h3>
          </div>
          <p className="text-small text-muted">
            Performance showcase with selective re-rendering. Watch how only
            changed widgets update.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Selective re-renders</li>
            <li>• Render counters</li>
            <li>• No memo needed</li>
            <li>• Manual controls</li>
          </ul>
        </Link>

        <Link to="/theme-switcher" className="example-card">
          <div className="stack-xs">
            <span className="badge">05</span>
            <h3>Theme Switcher</h3>
          </div>
          <p className="text-small text-muted">
            Practical state management with CSS integration. Customize theme
            settings with automatic localStorage persistence.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Light/Dark mode</li>
            <li>• CSS variable integration</li>
            <li>• LocalStorage persistence</li>
            <li>• System theme detection</li>
          </ul>
        </Link>

        <Link to="/live-search" className="example-card">
          <div className="stack-xs">
            <span className="badge">06</span>
            <h3>Live Search</h3>
          </div>
          <p className="text-small text-muted">
            Real-time search with debouncing and computed properties. No useMemo
            needed - getters provide automatic optimization.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Debounced search (300ms)</li>
            <li>• Getters vs useMemo comparison</li>
            <li>• Category filtering with facets</li>
            <li>• Search history tracking</li>
          </ul>
        </Link>

        <Link to="/form-builder" className="example-card">
          <div className="stack-xs">
            <span className="badge">07</span>
            <h3>Form Builder</h3>
          </div>
          <p className="text-small text-muted">
            Complex nested state management with undo/redo, validation, and
            preview modes. Demonstrates enterprise-level form building patterns.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Nested state updates</li>
            <li>• Undo/redo with history stack</li>
            <li>• Live validation via getters</li>
            <li>• Edit and preview modes</li>
          </ul>
        </Link>

        <Link to="/wizard" className="example-card">
          <div className="stack-xs">
            <span className="badge">09</span>
            <h3>Multi-Step Wizard</h3>
          </div>
          <p className="text-small text-muted">
            Event-driven state machine with conditional branching and
            validation. Perfect for complex flow logic and multi-step forms.
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• Vertex pattern (state machine)</li>
            <li>• Conditional steps</li>
            <li>• Per-step validation</li>
            <li>• Auto-save draft functionality</li>
          </ul>
        </Link>

        <Link to="/performance-benchmark" className="example-card">
          <div className="stack-xs">
            <span className="badge primary">⭐ 08</span>
            <h3>Performance Benchmark</h3>
          </div>
          <p className="text-small text-muted">
            Side-by-side comparison: BlaC vs Optimized React vs Unoptimized
            React. 500 items - see the dramatic performance difference!
          </p>
          <ul className="stack-xs text-xs text-muted">
            <li>• 3-way comparison (500 items)</li>
            <li>• Visual proof of performance</li>
            <li>• Unoptimized React lags badly</li>
            <li>• BlaC matches optimized performance</li>
          </ul>
        </Link>
      </div>
    </div>
  );
}
