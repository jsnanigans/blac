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
              <span className="tag">Dependency Tracking</span>
            </div>
          </div>
        </Link>

        <Link to="/messenger" className="example-card">
          <div className="stack-xs">
            <span className="badge secondary">02</span>
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
              <span className="tag">Complex State</span>
              <span className="tag">Event Driven</span>
              <span className="tag">Optimistic UI</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
