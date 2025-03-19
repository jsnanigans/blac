import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { useMatchRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
});

interface DocLinkProps {
  to: string;
  children: React.ReactNode;
  isDisabled?: boolean;
}

function DocLink({ to, children, isDisabled = false }: DocLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = to !== '' && matchRoute({ to });
  
  const baseClasses = "block py-1 px-2 rounded transition-colors";
  const activeClasses = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  const inactiveClasses = "hover:bg-gray-100 dark:hover:bg-gray-800";
  const disabledClasses = "opacity-50 cursor-not-allowed";
  
  const className = `${baseClasses} ${
    isActive 
      ? activeClasses 
      : isDisabled 
        ? disabledClasses 
        : inactiveClasses
  }`;
  
  if (isDisabled) {
    return (
      <span className={className}>
        {children}
        <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">Coming soon</span>
      </span>
    );
  }
  
  return (
    <Link
      to={to}
      className={className}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

function DocsLayout() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar Navigation */}
      <aside className="lg:col-span-3 xl:col-span-2 bg-white/80 dark:bg-gray-900/80 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm sticky top-24 self-start h-[calc(100vh-12rem)] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">Documentation</h2>
        
        <div className="space-y-6">
          {/* Getting Started */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white group flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
              Getting Started
            </h3>
            <ul className="space-y-1 pl-3.5">
              <li><DocLink to="/docs/introduction">Introduction</DocLink></li>
              <li><DocLink to="/docs/installation">Installation</DocLink></li>
              <li><DocLink to="/docs/core-concepts">Core Concepts</DocLink></li>
            </ul>
          </div>
          
          {/* Blac Next Library */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white group flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
              Blac Next
            </h3>
            <ul className="space-y-1 pl-3.5">
              <li><DocLink to="/docs/blac-next/cubit">Cubit</DocLink></li>
              <li><DocLink isDisabled={true} to="">Bloc</DocLink></li>
              <li><DocLink isDisabled={true} to="">BlocBase</DocLink></li>
              <li><DocLink isDisabled={true} to="">BlacObserver</DocLink></li>
              <li><DocLink isDisabled={true} to="">Plugins</DocLink></li>
            </ul>
          </div>
          
          {/* Blac React */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white group flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></span>
              Blac React
            </h3>
            <ul className="space-y-1 pl-3.5">
              <li><DocLink to="/docs/blac-react/use-bloc">useBloc Hook</DocLink></li>
              <li><DocLink isDisabled={true} to="">BlocStore</DocLink></li>
              <li><DocLink isDisabled={true} to="">Dependency Tracking</DocLink></li>
            </ul>
          </div>
          
          {/* Advanced Topics */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white group flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
              Advanced Topics
            </h3>
            <ul className="space-y-1 pl-3.5">
              <li><DocLink isDisabled={true} to="">Performance</DocLink></li>
              <li><DocLink isDisabled={true} to="">Testing</DocLink></li>
              <li><DocLink isDisabled={true} to="">Migration Guide</DocLink></li>
            </ul>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="lg:col-span-9 xl:col-span-10 bg-white/80 dark:bg-gray-900/80 p-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
        <Outlet />
      </main>
    </div>
  );
}