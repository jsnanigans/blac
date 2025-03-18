import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Cubit } from 'blac-next';
import { useBloc } from '@blac/react';

export const Route = createFileRoute('/demo/counter')({
  component: RouteComponent,
});

// Simple counter cubit for shared state (default behavior)
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state is 0
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

// Isolated counter cubit - each consumer gets its own instance
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // This makes each consumer get its own state instance
  
  constructor() {
    super(0);
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

// Keep-alive counter cubit - state persists even when unmounted
class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true; // State persists even when there are no consumers
  
  constructor() {
    super(0);
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

// Simple shared counter component
function SharedCounter() {
  const [count, counterCubit] = useBloc(CounterCubit);
  
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="text-xl font-semibold mb-2">{count}</div>
      <div className="flex space-x-2">
        <button 
          onClick={() => counterCubit.decrement()}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Isolated counter component
function IsolatedCounter() {
  const [count, counterCubit] = useBloc(IsolatedCounterCubit);
  
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
      <div className="text-xl font-semibold mb-2">{count}</div>
      <div className="flex space-x-2">
        <button 
          onClick={() => counterCubit.decrement()}
          className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Keep-alive counter component
function KeepAliveCounter() {
  const [count, counterCubit] = useBloc(KeepAliveCounterCubit);
  
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800">
      <div className="text-xl font-semibold mb-2">{count}</div>
      <div className="flex space-x-2">
        <button 
          onClick={() => counterCubit.decrement()}
          className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Custom ID counter component
function CustomIdCounter({ id }: { id: string }) {
  const [count, counterCubit] = useBloc(CounterCubit, { id });
  
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800">
      <div className="text-sm text-blue-500 dark:text-blue-300 mb-1">ID: {id}</div>
      <div className="text-xl font-semibold mb-2">{count}</div>
      <div className="flex space-x-2">
        <button 
          onClick={() => counterCubit.decrement()}
          className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function RouteComponent() {
  const [showKeepAlive, setShowKeepAlive] = useState(true);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">Instance Management in Blac</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This demo showcases how blac provides flexible instance management to accommodate different state sharing patterns
          in your application. Understanding these patterns will help you design cleaner component architectures.
        </p>
        
        <div className="flex justify-between items-center mb-4">
          <a 
            href="https://github.com/jsnanigans/blac/tree/v1/apps/demo-react/src/components/Counter.tsx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            View Source
          </a>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-gray-100">1. Shared State (Default)</h2>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            By default, all components using the same Cubit/Bloc class will share the same instance and state.
            This is perfect for global application state that needs to be synchronized across components.
          </p>
          <pre className="mt-3 p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
{`class CounterCubit extends Cubit<number> {
  // No static flags needed for shared state - it's the default!
  constructor() {
    super(0);
  }
}`}
          </pre>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          These counters share the same state. Clicking any of them will update all of them simultaneously.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center py-4">
          <SharedCounter />
          <SharedCounter />
          <SharedCounter />
          <SharedCounter />
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-gray-100">2. Isolated State</h2>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            When you need component-specific state, use the <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">isolated</code> flag.
            Each component will receive its own instance, perfect for independent UI controls.
          </p>
          <pre className="mt-3 p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
{`class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Each consumer gets its own instance
  
  constructor() {
    super(0);
  }
}`}
          </pre>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          These counters maintain isolated state. Each counter works independently of the others.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center py-4">
          <IsolatedCounter />
          <IsolatedCounter />
          <IsolatedCounter />
          <IsolatedCounter />
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground dark:text-gray-100">3. Keep-Alive State</h2>
          <button
            className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 rounded-md border border-purple-200 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
            onClick={() => setShowKeepAlive((prev) => !prev)}
          >
            {showKeepAlive ? 'Hide Counters' : 'Show Counters'}
          </button>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md border border-purple-200 dark:border-purple-800 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Use <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">keepAlive</code> when you need state to persist even when components unmount.
            This is ideal for preserving state during navigation or conditional rendering.
          </p>
          <pre className="mt-3 p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
{`class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true; // State persists even without active consumers
  
  constructor() {
    super(0);
  }
}`}
          </pre>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Try toggling the visibility of these counters. Their state will be preserved even when they're hidden.
        </p>
        
        {showKeepAlive && (
          <div className="flex flex-wrap gap-4 justify-center py-4">
            <KeepAliveCounter />
            <KeepAliveCounter />
          </div>
        )}
        
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Pro tip:</strong> The counter value persists even when the components are hidden because the <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">keepAlive</code> flag prevents the bloc from being disposed when there are no active consumers.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-gray-100">4. Custom ID Sharing</h2>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Using custom IDs lets you create multiple independent shared instances of the same bloc class.
            Components with the same ID will share state, while different IDs maintain separate state.
          </p>
          <pre className="mt-3 p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
{`// In your component:
const [state, bloc] = useBloc(CounterCubit, { 
  id: 'group-a' // Components with the same ID share state
});`}
          </pre>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          These counters demonstrate custom ID sharing. Counters with the same ID share state, while different IDs maintain separate state.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-medium mb-3 text-blue-800 dark:text-blue-200">Group A</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              <CustomIdCounter id="group-a" />
              <CustomIdCounter id="group-a" />
            </div>
          </div>
          
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h3 className="text-lg font-medium mb-3 text-indigo-800 dark:text-indigo-200">Group B</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              <CustomIdCounter id="group-b" />
              <CustomIdCounter id="group-b" />
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Real-world example:</strong> Custom IDs are perfect for scenarios like a chat application with multiple chat rooms.
            Each room can have its own state instance while using the same bloc class.
          </p>
        </div>
      </section>
    </div>
  );
}
