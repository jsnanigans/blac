import { RouterBloc, Link, Route } from './router';
import { Home } from './Home';
import { CounterDemo } from './examples/01-counter/CounterDemo';
import { TodoDemo } from './examples/02-todos/TodoDemo';
import { ShoppingDemo } from './examples/03-shopping-cart/ShoppingDemo';
import { DashboardDemo } from './examples/04-dashboard/DashboardDemo';
import { ThemeDemo } from './examples/05-theme-switcher/ThemeDemo';
import { SearchDemo } from './examples/06-live-search/SearchDemo';
import { FormBuilderDemo } from './examples/07-form-builder/FormBuilderDemo';
import { PerformanceBenchmarkDemo } from './examples/08-performance-benchmark/PerformanceBenchmarkDemo';
import { WizardDemo } from './examples/09-multi-step-wizard/WizardDemo';

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
  RouterBloc.getOrCreate('app-router');

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
            <li>
              <Link to="/todos">Todos</Link>
            </li>
            <li>
              <Link to="/shopping">Shopping</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/theme-switcher">Theme</Link>
            </li>
            <li>
              <Link to="/live-search">Search</Link>
            </li>
            <li>
              <Link to="/form-builder">Form Builder</Link>
            </li>
            <li>
              <Link to="/wizard">Wizard</Link>
            </li>
            <li>
              <Link to="/performance-benchmark">⭐ Benchmark</Link>
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
          <Route path="/todos">
            <TodoDemo />
          </Route>
          <Route path="/shopping">
            <ShoppingDemo />
          </Route>
          <Route path="/dashboard">
            <DashboardDemo />
          </Route>
          <Route path="/theme-switcher">
            <ThemeDemo />
          </Route>
          <Route path="/live-search">
            <SearchDemo />
          </Route>
          <Route path="/form-builder">
            <FormBuilderDemo />
          </Route>
          <Route path="/wizard">
            <WizardDemo />
          </Route>
          <Route path="/performance-benchmark">
            <PerformanceBenchmarkDemo />
          </Route>
        </div>
      </main>
    </div>
  );
}
