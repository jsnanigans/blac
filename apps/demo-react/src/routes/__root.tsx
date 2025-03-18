import { createRootRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-card dark:bg-gray-800 shadow-sm sticky top-0 z-10 border-b border-border dark:border-gray-700 transition-colors duration-200">
        <div className="container mx-auto py-4">
          <nav className="flex items-center gap-4">
            <div className="text-xl font-bold text-accent mr-4">blac Demo</div>
            <PrettyLink to="/">Home</PrettyLink>
            <PrettyLink to="/demo">Demo</PrettyLink>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-8">
        <Outlet />
      </main>
      <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t border-border dark:border-gray-700 mt-auto transition-colors duration-200">
        <div className="container mx-auto text-center text-gray-500 dark:text-gray-400 text-sm">
          © {new Date().getFullYear()} blac Framework Demo
        </div>
      </footer>
      {/* <TanStackRouterDevtools /> */}
    </div>
  ),
});
