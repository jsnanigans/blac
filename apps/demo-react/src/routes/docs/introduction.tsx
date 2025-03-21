import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature, CyberpunkStyles } from '../../components/docs/DocComponents';

export const Route = createFileRoute('/docs/introduction')({
  component: IntroductionPage,
});

function IntroductionPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <CyberpunkStyles />
      
      <DocSection title="Introduction to Blac" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          Blac is a lightweight yet powerful state management library that makes it easy to build React applications with predictable state. Think of it as your app's memory center - simple to use but capable of handling complex needs as your app grows.
        </p>
      </DocSection>

      <DocSection title="What is Blac?">
        <p>
          Blac is a state management library inspired by the BLoC (Business Logic Component) pattern. In simple terms, it helps you organize how data flows through your app, keeping your UI components clean and focused on presentation.
        </p>
        
        <DocFeatureGrid>
          <DocFeature 
            title="Easy to Start"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="blue"
          >
            <p>
              Create a state container with just a few lines of code. No complex setup, no overwhelming boilerplate.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Powerful When Needed"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="purple"
          >
            <p>
              As your app grows, Blac scales with you, offering advanced patterns for complex state management without adding complexity to your code.
            </p>
          </DocFeature>
        </DocFeatureGrid>
        
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">Key Benefits</h3>
          <ul className="space-y-2 mt-3">
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>Performance optimization</strong> - Components only re-render when their specific data changes</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>No provider hell</strong> - Access state from anywhere without nested providers</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>Simple but powerful API</strong> - Easy to learn, with room to grow</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>TypeScript support</strong> - Full type safety for your state and actions</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>Separation of concerns</strong> - Keep business logic out of components for cleaner code</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 dark:text-blue-400 mr-2">✓</span>
              <span><strong>Framework independence</strong> - Business logic is portable across different platforms and UI frameworks</span>
            </li>
          </ul>
        </div>

        <DocNote title="When should you use Blac?">
          <p>
            Blac is perfect for:
          </p>
          <ul className="mb-0 space-y-1">
            <li>Teams tired of excessive boilerplate in other state solutions</li>
            <li>Apps with complex UI state that needs to be shared between components</li>
            <li>Projects where performance matters</li>
            <li>Developers who want clean, testable code</li>
          </ul>
        </DocNote>
      </DocSection>

      <DocSection title="How Does Blac Compare?">
        <p>
          Let's see how Blac compares to other popular state management solutions:
        </p>
        
        <div className="overflow-x-auto my-6 rounded-lg">
          <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Blac</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Redux</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Context API</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MobX</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Zustand</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Learning Curve</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Low</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">High</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Low</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Boilerplate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Minimal</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Heavy</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Minimal</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Performance</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Excellent</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Good</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Poor</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Excellent</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Good</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Scalability</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">High</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">High</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Low</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Medium</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Dependency Tracking</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Automatic</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Manual</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">None</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Automatic</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Selector-based</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DocNote>
          <p>
            <strong>Why Blac stands out:</strong> Blac combines the best aspects of other libraries - the simplicity of Zustand, the performance of MobX, and the scalability of Redux - but with a cleaner, more intuitive API.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Solving Common State Management Problems">
        <p>
          Let's look at how Blac addresses common challenges in state management:
        </p>
        
        <div className="space-y-6 mt-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 p-5 rounded-lg border border-purple-100 dark:border-purple-800/40">
            <h3 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2">The "Prop Drilling" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Passing props through multiple component layers can make your code messy and hard to maintain.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-purple-100 dark:border-purple-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                Access state directly from any component without passing props or wrapping in providers. Components can connect to exactly the state they need, call methods on the Bloc/Cubit directly, and emit events—all without prop drilling.
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 p-5 rounded-lg border border-blue-100 dark:border-blue-800/40">
            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">The "Re-render Cascade" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              When state changes, too many components re-render unnecessarily, causing performance issues.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-blue-100 dark:border-blue-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                Components only re-render when their specific dependencies change. While not optimized for deeply nested state changes, Blac works perfectly with computed values through getters, giving you fine-grained control over component updates.
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-5 rounded-lg border border-green-100 dark:border-green-800/40">
            <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">The "Business Logic Everywhere" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Logic scattered across components makes code hard to test, reuse, and maintain.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-green-100 dark:border-green-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                Blac encourages moving logic into dedicated containers (Cubits and Blocs), making components simpler and logic more testable. This clear separation of concerns means your UI is focused solely on presentation.
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 p-5 rounded-lg border border-amber-100 dark:border-amber-800/40">
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">The "Scaling Complexity" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              State management that works for small apps often breaks down as apps grow larger.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-amber-100 dark:border-amber-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                Start with simple Cubits for basic state needs, then scale up to event-driven Blocs for complex workflows without changing your architecture.
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10 p-5 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
            <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-2">The "Testing Nightmare" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Testing business logic mixed with UI components is difficult and often requires complex mocking.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-indigo-100 dark:border-indigo-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                State is managed independently of React and can be tested in isolation. You can create, manipulate, and verify your Blocs/Cubits without any UI components, making unit tests simpler and more reliable.
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10 p-5 rounded-lg border border-rose-100 dark:border-rose-800/40">
            <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300 mb-2">The "Framework Lock-in" Problem</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Business logic tightly coupled to a specific framework is hard to reuse or migrate.
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-rose-100 dark:border-rose-800/40">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Blac Solution:</p>
              <p className="text-gray-600 dark:text-gray-400">
                Your business logic is completely decoupled from React, allowing you to reuse the same Blocs across different libraries or platforms. You can even share state between multiple applications or consume Blac state from outside React.
              </p>
            </div>
          </div>
        </div>
      </DocSection>

      <DocSection title="Core Principles">
        <p>
          Blac is built on three simple but powerful ideas:
        </p>

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
              State changes flow in one direction: from state containers to UI components. This makes your application's behavior predictable and easier to debug.
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
              Business logic lives in dedicated classes (Blocs and Cubits), keeping your UI components clean and focused on presentation. This leads to more maintainable code.
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
              Components only re-render when their specific dependencies change, which means better performance with less code.
            </p>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Scaling with Blac">
        <p>
          Blac is designed to grow with your application, offering different patterns for different complexities:
        </p>
        
        <div className="mt-4 space-y-4">
          <div className="relative pl-10 pb-8 border-l-2 border-blue-300 dark:border-blue-700">
            <div className="absolute -left-2 top-0 w-5 h-5 rounded-full bg-blue-400 dark:bg-blue-600 border-4 border-white dark:border-gray-900"></div>
            <h3 className="mt-0 text-blue-700 dark:text-blue-400 text-lg font-bold">Simple State: Cubits</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Start with Cubits for basic state management - perfect for counters, toggles, forms, and similar cases.
              Cubits are simple and straightforward with minimal boilerplate.
            </p>
          </div>
          
          <div className="relative pl-10 pb-8 border-l-2 border-purple-300 dark:border-purple-700">
            <div className="absolute -left-2 top-0 w-5 h-5 rounded-full bg-purple-400 dark:bg-purple-600 border-4 border-white dark:border-gray-900"></div>
            <h3 className="mt-0 text-purple-700 dark:text-purple-400 text-lg font-bold">Complex State: Blocs</h3>
            <p className="text-gray-700 dark:text-gray-300">
              As your app grows, use Blocs for complex workflows like authentication, multi-step forms, and data-intensive features.
              Blocs add event-driven architecture for better traceability and control.
            </p>
          </div>
          
          <div className="relative pl-10 pb-8 border-l-2 border-green-300 dark:border-green-700">
            <div className="absolute -left-2 top-0 w-5 h-5 rounded-full bg-green-400 dark:bg-green-600 border-4 border-white dark:border-gray-900"></div>
            <h3 className="mt-0 text-green-700 dark:text-green-400 text-lg font-bold">App-wide State: BlocProvider</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For global state that needs to persist across the app, use BlocProvider to share instances efficiently.
              Perfect for user settings, authentication state, and app-wide preferences.
            </p>
          </div>
          
          <div className="relative pl-10">
            <div className="absolute -left-2 top-0 w-5 h-5 rounded-full bg-amber-400 dark:bg-amber-600 border-4 border-white dark:border-gray-900"></div>
            <h3 className="mt-0 text-amber-700 dark:text-amber-400 text-lg font-bold">Enterprise Scale: Bloc Architecture</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For large applications, implement a full Bloc architecture with repositories, services, and domain-driven design.
              This pattern scales to enterprise applications while maintaining clean code organization.
            </p>
          </div>
        </div>
      </DocSection>

      <DocSection title="Quick Example">
        <p>
          Let's see a simple counter example with Blac:
        </p>

        <DocCode title="Creating a Counter with Blac">
{`// 1. Create a state container (Cubit)
import { Cubit } from '@blac/next';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state is 0
  }

  // Methods to update state
  increment = () => {
    this.emit(this.state + 1);
  }

  decrement = () => {
    this.emit(Math.max(0, this.state - 1));
  }
  
  reset = () => {
    this.emit(0);
  }
}

// 2. Use it in a React component
import { useBloc } from '@blac/react';

function Counter() {
  // Get current state and cubit instance
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center mb-4">Count: {count}</h2>
      <div className="flex justify-center space-x-2">
        <button 
          onClick={counterCubit.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -
        </button>
        <button 
          onClick={counterCubit.reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
        <button 
          onClick={counterCubit.increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          +
        </button>
      </div>
    </div>
  );
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            That's it! No providers, no complex setup, and component re-renders are automatically optimized.
            As your app grows, Blac grows with you, giving you more advanced patterns when you need them.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Next Steps">
        <p className="mb-6">
          Ready to try Blac in your project? Here's where to go next:
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Get Blac set up in your React project in just a few minutes</p>
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Learn the fundamental building blocks of Blac</p>
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Start with Cubits - the simplest way to manage state</p>
          </Link>
          
          <Link to="/docs/blac-react/use-bloc" className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-md mr-3">
                <svg className="w-5 h-5 text-amber-500 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mt-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">React Integration</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Learn to connect React components to Blac state containers</p>
          </Link>
        </div>
      </DocSection>
    </div>
  );
}
