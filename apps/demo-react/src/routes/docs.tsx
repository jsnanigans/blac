import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { useMatchRoute } from '@tanstack/react-router';
import { TableOfContents } from '../components/TableOfContents';

export const Route = createFileRoute('/docs')({
  component: DocsLayout
});

interface DocLinkProps {
  to: string;
  children: React.ReactNode;
  isDisabled?: boolean;
}

function DocLink({ to, children, isDisabled = false }: DocLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = to !== '' && matchRoute({ to });
  
  const baseClasses = "block py-0.5 px-2 rounded transition-colors text-sm";
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
        <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">Soon</span>
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
    <div className="flex flex-col md:flex-row w-full px-4 lg:px-8 py-4 gap-6 mx-auto max-w-[1800px]">
      {/* Left Sidebar Navigation - Sticky */}
      <aside className="w-full md:w-64 lg:w-72 xl:w-80 flex-shrink-0 order-2 md:order-1 md:self-start">
        <div className="md:sticky md:top-[5.5rem] overflow-y-auto md:max-h-[calc(100vh-8rem)] py-4 pr-4">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">Documentation</h2>
          
          <div className="space-y-6">
            {/* Getting Started */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white uppercase tracking-wider">
                Getting Started
              </h3>
              <ul className="space-y-2">
                <li><DocLink to="/docs/introduction">Introduction</DocLink></li>
                <li><DocLink to="/docs/installation">Installation</DocLink></li>
                <li><DocLink to="/docs/core-concepts">Core Concepts</DocLink></li>
              </ul>
            </div>
            
            {/* Blac Next Library */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white uppercase tracking-wider">
                Blac Next
              </h3>
              <ul className="space-y-2">
                <li><DocLink to="/docs/blac-next/cubit">Cubit</DocLink></li>
                <li><DocLink to="/docs/blac-next/bloc">Bloc</DocLink></li>
                <li><DocLink isDisabled={true} to="">BlocBase</DocLink></li>
                <li><DocLink isDisabled={true} to="">BlacObserver</DocLink></li>
                <li><DocLink isDisabled={true} to="">Plugins</DocLink></li>
              </ul>
            </div>
            
            {/* Blac React */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white uppercase tracking-wider">
                Blac React
              </h3>
              <ul className="space-y-2">
                <li><DocLink to="/docs/blac-react/use-bloc">useBloc Hook</DocLink></li>
                <li><DocLink isDisabled={true} to="">BlocStore</DocLink></li>
                <li><DocLink isDisabled={true} to="">Dependency Tracking</DocLink></li>
              </ul>
            </div>
            
            {/* Advanced Topics */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white uppercase tracking-wider">
                Advanced Topics
              </h3>
              <ul className="space-y-2">
                <li><DocLink isDisabled={true} to="">Performance</DocLink></li>
                <li><DocLink isDisabled={true} to="">Testing</DocLink></li>
                <li><DocLink isDisabled={true} to="">Migration Guide</DocLink></li>
              </ul>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-grow order-1 md:order-2 min-w-0 w-full">
        <div className="bg-white/90 dark:bg-gray-900/90 p-6 sm:p-8 lg:p-10 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm w-full">
          <div className="max-w-[90ch] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
      
      {/* Right Sidebar - On this page (only visible on larger screens) */}
      <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 order-3 lg:self-start">
        <div className="lg:sticky lg:top-[5.5rem] overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
          <TableOfContents />
        </div>
      </aside>
    </div>
  );
}