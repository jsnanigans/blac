import { createRootRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-card dark:bg-gray-800 shadow-sm sticky top-0 z-10 border-b border-border dark:border-gray-700 transition-colors duration-200">
        <div className="container mx-auto py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-xl font-bold text-accent mr-4">blac Demo</div>
              <PrettyLink to="/">Home</PrettyLink>
              <PrettyLink to="/demo">Demo</PrettyLink>
            </div>
            <a 
              href="https://github.com/jsnanigans/blac" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              GitHub
            </a>
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
