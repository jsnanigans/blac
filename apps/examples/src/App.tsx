import { RouterBloc, Link, Route } from './router';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';

const Logo = () => {
  return <div className="nav-brand">BlaC Examples</div>;
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
