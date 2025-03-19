import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/docs/')({
  component: DocsIndexPage,
});

function DocsIndexPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent inline-block text-5xl font-bold mb-6">
          Blac Documentation
        </h1>
        
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
          Welcome to the Blac documentation. Blac is a lightweight state management library for JavaScript applications, with special focus on React integration.
        </p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <Link 
            to="/docs/installation" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-all hover:shadow-md"
          >
            Get Started →
          </Link>
          <Link 
            to="/docs/core-concepts" 
            className="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white font-medium py-2 px-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
          >
            Learn Core Concepts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
          <h3 className="text-blue-800 dark:text-blue-300 mt-0 font-bold">Getting Started</h3>
          <ul className="mb-0 list-none pl-0">
            <li className="mb-2">
              <Link to="/docs/introduction" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                Introduction
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/docs/installation" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                Installation
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/docs/core-concepts" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                Core Concepts
              </Link>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-lg border border-green-100 dark:border-green-800 shadow-sm">
          <h3 className="text-green-800 dark:text-green-300 mt-0 font-bold">Blac Core (@blac/next)</h3>
          <ul className="mb-0 list-none pl-0">
            <li className="mb-2">
              <Link to="/docs/blac-next/cubit" className="text-green-600 dark:text-green-400 hover:underline flex items-center">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                Cubit
              </Link>
            </li>
            <li className="mb-2 text-green-600 dark:text-green-400 opacity-50 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              Bloc
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full px-2 py-0.5">Coming soon</span>
            </li>
            <li className="mb-2 text-green-600 dark:text-green-400 opacity-50 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              BlacObserver
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full px-2 py-0.5">Coming soon</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 p-6 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm">
          <h3 className="text-purple-800 dark:text-purple-300 mt-0 font-bold">React Integration (@blac/react)</h3>
          <ul className="mb-0 list-none pl-0">
            <li className="mb-2">
              <Link to="/docs/blac-react/use-bloc" className="text-purple-600 dark:text-purple-400 hover:underline flex items-center">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                useBloc Hook
              </Link>
            </li>
            <li className="mb-2 text-purple-600 dark:text-purple-400 opacity-50 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              BlocStore
              <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full px-2 py-0.5">Coming soon</span>
            </li>
            <li className="mb-2 text-purple-600 dark:text-purple-400 opacity-50 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              BlocProvider
              <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full px-2 py-0.5">Coming soon</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-6 border-b pb-2 border-gray-200 dark:border-gray-700">Core Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-start">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full mr-4">
              <svg className="w-6 h-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mt-0">Fine-grained Reactivity</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Blac provides automatic dependency tracking, ensuring components only re-render when the specific state they use changes.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full mr-4">
              <svg className="w-6 h-6 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mt-0">Simple Integration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Seamlessly integrates with React applications through the <code>useBloc</code> hook and component APIs.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full mr-4">
              <svg className="w-6 h-6 text-purple-500 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mt-0">Predictable State Changes</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Follow a clear unidirectional flow for state changes, making your application easier to debug and reason about.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-full mr-4">
              <svg className="w-6 h-6 text-amber-500 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mt-0">Performance Focused</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Optimized for performance with minimal overhead and smart re-rendering strategies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-6 border-b pb-2 border-gray-200 dark:border-gray-700">Example</h2>
        
        <p className="mb-4">Here's a quick example of Blac in action:</p>

        <div className="relative">
          <div className="absolute top-0 right-0 bg-gray-800 rounded-bl-md rounded-tr-md px-3 py-1 text-xs font-medium text-gray-200">
            React + TypeScript
          </div>
          <div className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto">
            <pre className="mb-0">
              <code>
{`// 1. Define your state container
import { Cubit } from '@blac/next';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment() {
    this.emit(this.state + 1);
  }

  decrement() {
    this.emit(this.state - 1);
  }

  reset() {
    this.emit(0);
  }
}

// 2. Use it in your React component
function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => counterCubit.increment()}>+</button>
      <button onClick={() => counterCubit.decrement()}>-</button>
      <button onClick={() => counterCubit.reset()}>Reset</button>
    </div>
  );
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-6 border-b pb-2 border-gray-200 dark:border-gray-700">Popular Guides</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/docs/installation" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700">
            <div className="flex items-center mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-4-4m4 4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Getting Started with Blac</h3>
            </div>
            <p className="mb-0 text-sm text-gray-600 dark:text-gray-400">Learn how to install and set up Blac in your project</p>
          </Link>
          
          <Link to="/docs/core-concepts" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-green-300 dark:hover:border-green-700">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Understanding Core Concepts</h3>
            </div>
            <p className="mb-0 text-sm text-gray-600 dark:text-gray-400">Explore the fundamental concepts behind Blac</p>
          </Link>
          
          <Link to="/docs/blac-next/cubit" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-purple-300 dark:hover:border-purple-700">
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Working with Cubits</h3>
            </div>
            <p className="mb-0 text-sm text-gray-600 dark:text-gray-400">Master the simplest form of state containers</p>
          </Link>
          
          <Link to="/docs/blac-react/use-bloc" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center mb-2">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-amber-500 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">React Integration</h3>
            </div>
            <p className="mb-0 text-sm text-gray-600 dark:text-gray-400">Connect your React components to Blac state containers</p>
          </Link>
        </div>
      </div>
    </div>
  );
}