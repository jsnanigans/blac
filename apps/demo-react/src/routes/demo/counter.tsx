import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Cubit } from 'blac-next';
import { useBloc } from '@blac/react';
import CodeHighlighter from '../../components/CodeHighlighter';

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
    <div className="card-neon-cyan flex flex-col items-center p-6 rounded-xl shadow-lg shadow-cyan-500/20 hover-scale">
      <div className="text-3xl font-bold mb-4 text-gradient-cyan animate-text-shimmer">{count}</div>
      <div className="flex space-x-4">
        <button 
          onClick={() => counterCubit.decrement()}
          className="btn-neon-cyan px-6 py-2 text-lg font-medium rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all shadow-sm shadow-cyan-500/20"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="btn-neon-cyan px-6 py-2 text-lg font-medium rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all shadow-sm shadow-cyan-500/20"
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
    <div className="card-neon-green flex flex-col items-center p-6 rounded-xl shadow-lg shadow-green-500/20 hover-scale">
      <div className="text-3xl font-bold mb-4 text-gradient-green animate-text-shimmer">{count}</div>
      <div className="flex space-x-4">
        <button 
          onClick={() => counterCubit.decrement()}
          className="btn-neon-green px-6 py-2 text-lg font-medium rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-all shadow-sm shadow-green-500/20"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="btn-neon-green px-6 py-2 text-lg font-medium rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-all shadow-sm shadow-green-500/20"
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
    <div className="card-neon-fuchsia flex flex-col items-center p-6 rounded-xl shadow-lg shadow-fuchsia-500/20 hover-scale">
      <div className="text-3xl font-bold mb-4 text-gradient-fuchsia animate-text-shimmer">{count}</div>
      <div className="flex space-x-4">
        <button 
          onClick={() => counterCubit.decrement()}
          className="btn-neon-fuchsia px-6 py-2 text-lg font-medium rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition-all shadow-sm shadow-fuchsia-500/20"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="btn-neon-fuchsia px-6 py-2 text-lg font-medium rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition-all shadow-sm shadow-fuchsia-500/20"
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
    <div className="card-neon-blue flex flex-col items-center p-6 rounded-xl shadow-lg shadow-blue-500/20 hover-scale">
      <div className="text-sm text-gradient-blue mb-2 font-medium">ID: {id}</div>
      <div className="text-3xl font-bold mb-4 text-gradient-blue animate-text-shimmer">{count}</div>
      <div className="flex space-x-4">
        <button 
          onClick={() => counterCubit.decrement()}
          className="btn-neon-blue px-6 py-2 text-lg font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-sm shadow-blue-500/20"
        >
          -
        </button>
        <button 
          onClick={() => counterCubit.increment()}
          className="btn-neon-blue px-6 py-2 text-lg font-medium rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-sm shadow-blue-500/20"
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
        <h1 className="text-5xl font-bold mb-6 text-gradient-multi animate-text-shimmer text-center">Instance Management in Blac</h1>
        <p className="text-xl dark:text-cyan-100/90 text-slate-700 mb-8 text-center max-w-3xl mx-auto">
          This demo showcases how blac provides flexible instance management to accommodate different state sharing patterns
          in your application. Understanding these patterns will help you design cleaner component architectures.
        </p>
        
        <div className="flex justify-center items-center mb-8">
          <a 
            href="https://github.com/jsnanigans/blac/tree/v1/apps/demo-react/src/components/Counter.tsx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-neon-cyan hover-scale inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all shadow-sm shadow-cyan-500/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            View Source
          </a>
        </div>
      </section>

      <section className="card-neon-cyan p-8 rounded-xl shadow-lg shadow-cyan-500/20">
        <h2 className="text-2xl font-bold mb-6 text-gradient-cyan text-center">1. Shared State (Default)</h2>
        
        <div className="bg-cyan-500/5 dark:bg-cyan-500/10 p-6 rounded-xl border border-cyan-300/20 dark:border-cyan-700/30 mb-6 shadow-inner shadow-cyan-500/10">
          <p className="text-gray-700 dark:text-gray-300">
            By default, all components using the same Cubit/Bloc class will share the same instance and state.
            This is perfect for global application state that needs to be synchronized across components.
          </p>
          <CodeHighlighter 
            code={`class CounterCubit extends Cubit<number> {
  // No static flags needed for shared state - it's the default!
  constructor() {
    super(0);
  }
}`}
            theme="cyan"
          />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          These counters share the same state. Clicking any of them will update all of them simultaneously.
        </p>
        
        <div className="flex flex-wrap gap-6 justify-center py-4">
          <SharedCounter />
          <SharedCounter />
          <SharedCounter />
          <SharedCounter />
        </div>
      </section>

      <section className="card-neon-green p-8 rounded-xl shadow-lg shadow-green-500/20">
        <h2 className="text-2xl font-bold mb-6 text-gradient-green text-center">2. Isolated State</h2>
        
        <div className="bg-green-500/5 dark:bg-green-500/10 p-6 rounded-xl border border-green-300/20 dark:border-green-700/30 mb-6 shadow-inner shadow-green-500/10">
          <p className="text-gray-700 dark:text-gray-300">
            When you need component-specific state, use the <code className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-green-400">isolated</code> flag.
            Each component will receive its own instance, perfect for independent UI controls.
          </p>
          <CodeHighlighter 
            code={`class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Each consumer gets its own instance
  
  constructor() {
    super(0);
  }
}`}
            theme="green"
          />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          These counters maintain isolated state. Each counter works independently of the others.
        </p>
        
        <div className="flex flex-wrap gap-6 justify-center py-4">
          <IsolatedCounter />
          <IsolatedCounter />
          <IsolatedCounter />
          <IsolatedCounter />
        </div>
      </section>

      <section className="card-neon-fuchsia p-8 rounded-xl shadow-lg shadow-fuchsia-500/20">
        <h2 className="text-2xl font-bold mb-6 text-gradient-fuchsia text-center">3. Keep-Alive State</h2>
        
        <div className="bg-fuchsia-500/5 dark:bg-fuchsia-500/10 p-6 rounded-xl border border-fuchsia-300/20 dark:border-fuchsia-700/30 mb-6 shadow-inner shadow-fuchsia-500/10">
          <p className="text-gray-700 dark:text-gray-300">
            When you need state to persist even when there are no consumers, use the <code className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-fuchsia-400">keepAlive</code> flag.
            This is useful for caching or preserving user input between component mounts.
          </p>
          <CodeHighlighter 
            code={`class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true; // State persists even when there are no consumers
  
  constructor() {
    super(0);
  }
}`}
            theme="fuchsia"
          />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          Toggle these counters to see how their state persists even when unmounted.
        </p>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <button 
            onClick={() => setShowKeepAlive(prev => !prev)}
            className="btn-neon-fuchsia px-6 py-2 text-lg font-medium rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition-all shadow-sm shadow-fuchsia-500/20"
          >
            {showKeepAlive ? 'Hide' : 'Show'} Counters
          </button>
          
          {showKeepAlive && (
            <div className="flex flex-wrap gap-6 justify-center">
              <KeepAliveCounter />
              <KeepAliveCounter />
              <KeepAliveCounter />
              <KeepAliveCounter />
            </div>
          )}
        </div>
      </section>

      <section className="card-neon-blue p-8 rounded-xl shadow-lg shadow-blue-500/20">
        <h2 className="text-2xl font-bold mb-6 text-gradient-blue text-center">4. Custom ID Instances</h2>
        
        <div className="bg-blue-500/5 dark:bg-blue-500/10 p-6 rounded-xl border border-blue-300/20 dark:border-blue-700/30 mb-6 shadow-inner shadow-blue-500/10">
          <p className="text-gray-700 dark:text-gray-300">
            For more control, you can provide a custom instance ID. Components using the same ID will share state, regardless of class.
            This is useful for coordinating state between different parts of your UI.
          </p>
          <CodeHighlighter 
            code={`// In component A
const [count, counterCubit] = useBloc(CounterCubit, { id: 'shared-counter' });

// In component B (even in a different part of the app)
const [count, counterCubit] = useBloc(CounterCubit, { id: 'shared-counter' });
// Both components will share the same state instance`}
            theme="blue"
          />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          These counters show how custom IDs create multiple shared state instances.
          Counters with the same ID share state, while different IDs maintain separate state.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card-neon-blue p-6 rounded-xl shadow-md shadow-blue-500/20">
            <h3 className="text-xl font-bold mb-4 text-gradient-blue text-center">Group A</h3>
            <div className="flex flex-wrap gap-6 justify-center">
              <CustomIdCounter id="counter-A" />
              <CustomIdCounter id="counter-A" /> {/* Shares state with the first counter */}
            </div>
            <p className="text-sm text-center mt-4 text-blue-700 dark:text-blue-300">
              Both counters share state via ID: "counter-A"
            </p>
          </div>
          
          <div className="card-neon-blue p-6 rounded-xl shadow-md shadow-blue-500/20">
            <h3 className="text-xl font-bold mb-4 text-gradient-blue text-center">Group B</h3>
            <div className="flex flex-wrap gap-6 justify-center">
              <CustomIdCounter id="counter-B" />
              <CustomIdCounter id="counter-B" /> {/* Shares state with the third counter */}
            </div>
            <p className="text-sm text-center mt-4 text-blue-700 dark:text-blue-300">
              Both counters share state via ID: "counter-B"
            </p>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-300/20 dark:border-yellow-700/30 shadow-inner shadow-yellow-500/10">
          <h3 className="text-lg font-bold mb-3 text-gradient-yellow">Real-World Applications</h3>
          <ul className="space-y-4 list-disc pl-5">
            <li>
              <strong>Chat Application:</strong> Create a separate bloc instance for each conversation thread 
              using the conversation ID, allowing different parts of the UI (message list, input area, typing 
              indicators) to share the same state for that conversation.
              <CodeHighlighter 
                code={`// In the conversation header
const [conversation, conversationBloc] = useBloc(ConversationBloc, { id: \`conversation-\${conversationId}\` });

// In the message list component
const [conversation, conversationBloc] = useBloc(ConversationBloc, { id: \`conversation-\${conversationId}\` });

// In the message input component
const [conversation, conversationBloc] = useBloc(ConversationBloc, { id: \`conversation-\${conversationId}\` });`}
                theme="blue"
                showLineNumbers={false}
                className="mt-2"
              />
            </li>
            <li>
              <strong>E-commerce Product Pages:</strong> Share product state (inventory, pricing, options) 
              between different components (gallery, options selector, add-to-cart section) using the product ID.
            </li>
            <li>
              <strong>Form Wizards:</strong> Maintain state for a multi-step form across different pages or tabs 
              using a form session ID, making it easy to persist values between steps.
            </li>
            <li>
              <strong>Dashboard Widgets:</strong> Create multiple instances of the same widget type (e.g., charts) 
              where each has its own independent state, based on a widget instance ID.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
