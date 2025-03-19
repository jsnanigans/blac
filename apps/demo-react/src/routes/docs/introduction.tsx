import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature } from '../../components/docs/DocComponents';

export const Route = createFileRoute('/docs/introduction')({
  component: IntroductionPage,
});

function IntroductionPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <DocSection title="Introduction to Blac" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          Blac is a lightweight yet powerful state management library designed to simplify how you manage state in JavaScript applications, with special emphasis on React integration.
        </p>
      </DocSection>

      <DocSection title="What is Blac?">
        <p>
          Blac is a state management library inspired by the BLoC (Business Logic Component) pattern. It aims to separate business logic from presentation while providing a predictable way to manage state changes. Unlike other state management solutions, Blac offers:
        </p>
        
        <ul className="space-y-2">
          <li className="flex items-center">
            <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
            <span><strong>Fine-grained reactivity</strong> - Only re-render components when the specific state they use changes</span>
          </li>
          <li className="flex items-center">
            <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
            <span><strong>No provider hell</strong> - Access state from any component without wrapping in providers</span>
          </li>
          <li className="flex items-center">
            <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
            <span><strong>Minimal boilerplate</strong> - Create state containers with minimal code</span>
          </li>
          <li className="flex items-center">
            <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
            <span><strong>Automatic dependency tracking</strong> - Components only re-render when their dependencies change</span>
          </li>
          <li className="flex items-center">
            <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
            <span><strong>TypeScript support</strong> - Full type safety for your state and actions</span>
          </li>
        </ul>

        <DocNote title="Why use Blac?">
          <p>
            The Blac library is designed to simplify the complexities of state management while providing powerful features for optimizing application performance. It's particularly well-suited for:
          </p>
          <ul className="mb-0 space-y-1">
            <li>Medium to large React applications</li>
            <li>Apps with complex UI state that needs to be shared across components</li>
            <li>Projects where performance optimization is important</li>
            <li>Teams that want a structured and predictable state management pattern</li>
          </ul>
        </DocNote>
      </DocSection>

      <DocSection title="Core Principles">
        <DocFeatureGrid>
          <DocFeature 
            title="1. Unidirectional Data Flow"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            }
            color="blue"
          >
            <p>
              Blac implements a unidirectional data flow where state changes flow in one direction: from state containers to UI components. This makes your application's state changes predictable and easier to debug.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="2. Separation of Concerns"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            }
            color="green"
          >
            <p>
              Business logic is isolated in dedicated classes (Blocs and Cubits), keeping your UI components clean and focused on presentation. This leads to more maintainable and testable code.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="3. Fine-grained Reactivity"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="purple"
          >
            <p>
              Components only re-render when their specific dependencies change, leading to better performance and fewer unnecessary renders.
            </p>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="How It Works">
        <p>
          Blac divides your application's state management into two main components:
        </p>
        
        <DocFeatureGrid>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-blue-800 dark:text-blue-300 text-lg font-bold">Blac Core (blac-next)</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              The core library provides the foundational state management capabilities:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>BlocBase - The abstract base class for state containers</li>
              <li>Cubit - A simple state container that emits new states</li>
              <li>Bloc - A more powerful container that follows a reducer pattern with actions</li>
              <li>BlacObserver - For observing state changes and lifecycle events</li>
              <li>Plugin system - For extending functionality</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 p-6 rounded-lg border border-purple-100 dark:border-purple-800">
            <h3 className="text-purple-800 dark:text-purple-300 text-lg font-bold">React Integration (@blac/react)</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              The React integration package provides:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>useBloc hook - Connect React components to Blac state containers</li>
              <li>Automatic dependency tracking - Only re-render when dependencies change</li>
              <li>External Bloc store - Manage Bloc instances globally</li>
            </ul>
          </div>
        </DocFeatureGrid>

        <DocCode title="Example: Counter with Blac">
{`// Define a simple counter state container
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
}

// Use it in a React component
function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterCubit.increment()}>+</button>
      <button onClick={() => counterCubit.decrement()}>-</button>
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Next Steps">
        <p>
          Now that you have a basic understanding of Blac, you can:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
          <Link to="/docs/installation" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-4-4m4 4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Installation</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Learn how to install and set up Blac in your project</p>
          </Link>
          
          <Link to="/docs/core-concepts" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-green-300 dark:hover:border-green-700">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Core Concepts</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Explore the fundamental building blocks of Blac in depth</p>
          </Link>
          
          <Link to="/docs/blac-next/cubit" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-purple-300 dark:hover:border-purple-700">
            <div className="flex items-center">
              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Cubit Documentation</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Learn how to create and use Cubits for simple state management</p>
          </Link>
          
          <Link to="/docs/blac-react/use-bloc" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-amber-500 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">useBloc Hook</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Master React integration with the useBloc hook and dependency tracking</p>
          </Link>
        </div>
      </DocSection>
    </div>
  );
}