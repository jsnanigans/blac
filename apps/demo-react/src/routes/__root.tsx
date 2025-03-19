import { createRootRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';
import ThemeToggle from '../components/ThemeToggle';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-mesh-gradient relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-[10%] w-64 h-64 rounded-full bg-cyan-500/10 blur-[100px]"></div>
        <div className="absolute bottom-0 right-[20%] w-96 h-96 rounded-full bg-fuchsia-500/20 blur-[100px]"></div>
        <div className="absolute top-[40%] right-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-[100px]"></div>
        <div className="absolute top-[30%] left-[5%] w-80 h-80 rounded-full bg-pink-500/10 blur-[100px]"></div>
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-full h-40 bg-gradient-to-t from-cyan-500/10 to-transparent blur-[50px]"></div>
      </div>
      
      <header className="sticky top-0 z-50 dark:bg-gray-900/60 dark:backdrop-blur-xl dark:border-b dark:border-fuchsia-500/20 dark:shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-white/60 backdrop-blur-xl border-b border-sky-200/50 shadow-sm transition-all duration-300">
        <div className="container mx-auto py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-xl font-bold text-gradient-multi mr-4 animate-text-shimmer">blac Demo</div>
              <PrettyLink to="/" variant="cyan">Home</PrettyLink>
              <PrettyLink to="/demo" variant="fuchsia">Demo</PrettyLink>
              <PrettyLink to="/docs" variant="blue">Docs</PrettyLink>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="https://github.com/jsnanigans/blac" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-neon-cyan hover-scale inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                GitHub
              </a>
            </div>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto py-8 relative z-10">
        <Outlet />
      </main>
      
      <footer className="dark:bg-gray-900/60 dark:backdrop-blur-xl dark:py-6 dark:border-t dark:border-cyan-500/20 dark:shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-white/60 backdrop-blur-xl py-6 border-t border-sky-200/50 shadow-sm mt-auto relative z-10 transition-all duration-300">
        <div className="container mx-auto text-center">
          <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 mx-auto mb-6 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
          <p className="dark:text-cyan-300/50 text-blue-500/70 text-sm">
            © {new Date().getFullYear()} blac Framework Demo
          </p>
        </div>
      </footer>
    </div>
  ),
});
