import { createFileRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';

export const Route = createFileRoute('/demo')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="card-neon-fuchsia p-8 mb-10">
        <h1 className="text-3xl font-bold mb-4 text-gradient-multi animate-text-shimmer">Demo Components</h1>
        <p className="text-cyan-100/90 mb-6">Explore the different demo components to see blac in action.</p>
        <div className="flex flex-wrap gap-3">
          <PrettyLink to="/demo/counter" variant="cyan">Counter</PrettyLink>
          <PrettyLink to="/demo/dependency-tracking" variant="blue">Dependency Tracking</PrettyLink>
          <PrettyLink to="/demo/taskboard" variant="pink">Task Board</PrettyLink>
          <PrettyLink to="/demo/blac-features" variant="pink">Features</PrettyLink>
          <PrettyLink 
            to="/demo/petfinder" 
            variant="fuchsia" 
            className="flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text--100/90" viewBox="0 0 20 20" fill="currentColor" >
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            Petfinder
          </PrettyLink>
        </div>
      </div>
      
      <div className="card-neon-cyan p-8 relative">
        {/* Decorative corner glows */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-fuchsia-500/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2"></div>
        
        <Outlet />
      </div>
    </div>
  );
}
