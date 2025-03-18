import { createFileRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';

export const Route = createFileRoute('/demo')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-8">
        <h1 className="text-3xl font-bold mb-4 text-foreground dark:text-gray-100">Demo Components</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Explore the different demo components to see blac in action.</p>
        <div className="flex flex-wrap gap-2">
          <PrettyLink to="/demo/counter">Counter</PrettyLink>
          <PrettyLink to="/demo/form">Form</PrettyLink>
          <PrettyLink to="/demo/taskboard">Task Board</PrettyLink>
          <PrettyLink to="/petfinder" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Petfinder
            </span>
          </PrettyLink>
        </div>
      </div>
      <div className="card">
        <Outlet />
      </div>
    </div>
  );
}
