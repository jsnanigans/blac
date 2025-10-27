import { RouterBloc, Link, Route } from './router';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';
import { TodoDemo } from './examples/02-todos/TodoDemo';
import { ShoppingDemo } from './examples/03-shopping-cart/ShoppingDemo';
import { DashboardDemo } from './examples/04-dashboard/DashboardDemo';

/**
 * Main app component with custom Blac-based routing.
 * This demonstrates using Blac for general application state,
 * not just component state.
 */
export function App() {
  // Initialize the router - it will be shared across the app
  RouterBloc.getOrCreate('app-router');

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="nav-content">
          <Link to="/" className="nav-brand">
            Blac
          </Link>
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/counter">Counter</Link>
            </li>
            <li>
              <Link to="/todos">Todos</Link>
            </li>
            <li>
              <Link to="/shopping">Shopping</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </div>
      </nav>

      <Route path="/">
        <Home />
      </Route>
      <Route path="/counter">
        <CounterDemo />
      </Route>
      <Route path="/todos">
        <TodoDemo />
      </Route>
      <Route path="/shopping">
        <ShoppingDemo />
      </Route>
      <Route path="/dashboard">
        <DashboardDemo />
      </Route>
    </div>
  );
}
