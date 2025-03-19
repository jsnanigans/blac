import { createFileRoute } from '@tanstack/react-router'
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature } from '../../components/docs/DocComponents'

export const Route = createFileRoute('/docs/core-concepts')({
  component: CoreConceptsPage,
})

function CoreConceptsPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <DocSection title="Core Concepts" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          Understanding the foundational concepts of Blac will help you build robust and maintainable state management solutions.
        </p>
      </DocSection>

      <DocSection title="BlocBase">
        <p>
          The <code>BlocBase</code> class serves as the foundation for all state containers in Blac. 
          It provides the core functionality for state management, change notification, and lifecycle handling.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Foundation"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="blue"
          >
            <p>
              BlocBase provides the fundamental architecture that both Cubits and Blocs build upon, 
              ensuring consistent behavior across all state containers.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="State Management"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            color="green"
          >
            <p>
              BlocBase handles the core state management operations including state storage,
              state updates, and notifying listeners when state changes occur.
            </p>
          </DocFeature>
        </DocFeatureGrid>

        <DocCode title="BlocBase Structure">
{`abstract class BlocBase<S, P = null> {
  // Internal state
  private _state: S;
  
  // Constructor accepts initial state and optional props
  constructor(initialState: S, props?: P) {
    this._state = initialState;
    // Initialize internal mechanisms
  }
  
  // Access the current state (read-only)
  get state(): S {
    return this._state;
  }
  
  // Protected method for state updates
  protected _pushState(newState: S, oldState: S): void {
    // Update state and notify listeners
  }
  
  // Cleanup resources when no longer needed
  dispose(): void {
    // Cleanup logic
  }
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            You typically don't extend <code>BlocBase</code> directly. Instead, use either <code>Cubit</code> or <code>Bloc</code> which 
            extend BlocBase with specific patterns for state management.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Cubit">
        <p>
          A <code>Cubit</code> is the simplest form of state container in Blac. It extends <code>BlocBase</code> and 
          provides a straightforward way to update state through functions that emit new states.
        </p>

        <DocCode title="Cubit Example">
{`import { Cubit } from '@blac/next';

// Simple counter cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state is 0
  }

  // Methods to update state
  increment() {
    this.emit(this.state + 1);
  }

  decrement() {
    this.emit(this.state - 1);
  }

  // Use patch for partial updates of object states
  updateUser(name: string) {
    this.patch({ name });
  }
}`}
        </DocCode>

        <DocFeatureGrid>
          <DocFeature 
            title="When to Use Cubits"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="blue"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Simple state management needs</li>
              <li>Direct mapping between methods and state changes</li>
              <li>Minimal boilerplate preferred</li>
              <li>Form state management</li>
              <li>UI state (toggles, loading indicators, etc.)</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="Key Properties"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="green"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Extends <code>BlocBase</code></li>
              <li>Provides <code>emit()</code> method for complete state updates</li>
              <li>Provides <code>patch()</code> method for partial object state updates</li>
              <li>No explicit event handling</li>
              <li>Simpler mental model than full Blocs</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote>
          <p>
            For detailed information and examples of working with Cubits, see the <a href="/docs/blac-next/cubit" className="text-blue-500 hover:text-blue-700">Cubit documentation</a>.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Bloc">
        <p>
          A <code>Bloc</code> is a more sophisticated state container that implements the BLoC (Business Logic Component) pattern. 
          It adds event handling capabilities on top of the <code>BlocBase</code> foundation, providing a clear structure for 
          complex state transitions.
        </p>

        <DocCode title="Bloc Example">
{`import { Bloc } from '@blac/next';

// Define events
type CounterEvent = 
  | { type: 'increment', amount: number }
  | { type: 'decrement', amount: number }
  | { type: 'reset' };

// Counter bloc with events
class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0); // Initial state is 0
  }

  // Define the reducer for handling events
  reducer(event: CounterEvent, state: number): number {
    switch (event.type) {
      case 'increment':
        return state + event.amount;
      case 'decrement':
        return state - event.amount;
      case 'reset':
        return 0;
    }
  }

  // Helper methods for adding events
  increment(amount = 1) {
    this.add({ type: 'increment', amount });
  }

  decrement(amount = 1) {
    this.add({ type: 'decrement', amount });
  }

  reset() {
    this.add({ type: 'reset' });
  }
}`}
        </DocCode>

        <DocFeatureGrid>
          <DocFeature 
            title="When to Use Blocs"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="purple"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Complex business logic</li>
              <li>Event-driven flows</li>
              <li>When you need clear separation between events and state updates</li>
              <li>Complex state transitions with explicit mapping</li>
              <li>When traceability of state changes is important</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="Key Properties"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="amber"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Extends <code>BlocBase</code></li>
              <li>Adds an event-driven architecture</li>
              <li>Provides <code>add()</code> method for dispatching events</li>
              <li>Requires a <code>reducer</code> function to map events to state changes</li>
              <li>Clear separation of event handling and state updates</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote type="info">
          <p>
            Blocs are particularly useful for complex workflows where multiple events might lead to similar state changes, 
            or where a single event might cause multiple state transitions.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="State">
        <p>
          State in Blac represents the data managed by a state container (Cubit or Bloc) at any given moment. 
          State can be of any type, from primitive values to complex objects.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="State Types"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            color="blue"
          >
            <p>State can be of various types:</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Primitive values (numbers, strings, booleans)</li>
              <li>Complex objects</li>
              <li>Arrays</li>
              <li>Custom classes or interfaces</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="State Design"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            }
            color="green"
          >
            <p>Best practices for state design:</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Keep state immutable</li>
              <li>Use interfaces to define state structure</li>
              <li>Consider including loading/error indicators in state</li>
              <li>Group related data in meaningful structures</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>

        <DocCode title="State Examples">
{`// Simple state
class CounterCubit extends Cubit<number> {}

// Complex state with TypeScript interface
interface UserState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      isLoading: false,
      error: null
    });
  }
}`}
        </DocCode>

        <DocNote type="warning">
          <p>
            Never mutate state directly. Always create new state objects when making changes to ensure 
            proper change detection and avoid unexpected behavior.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Bloc Observer">
        <p>
          The <code>BlocObserver</code> provides a way to monitor all state changes and events across your application's 
          Blocs and Cubits. It's particularly useful for debugging, logging, and analytics.
        </p>

        <DocCode title="BlocObserver Example">
{`import { BlocObserver, BlocBase, Bloc } from '@blac/next';

class MyBlocObserver extends BlocObserver {
  // Called when a new bloc is created
  onCreate(bloc: BlocBase<any>): void {
    console.log(\`Bloc Created: \${bloc.constructor.name}\`);
  }

  // Called when a bloc's state changes
  onChange<S>(bloc: BlocBase<S>, state: S, previousState: S): void {
    console.log(
      \`\${bloc.constructor.name} state changed: \`,
      previousState,
      ' -> ',
      state
    );
  }

  // Called when an event is added to a bloc
  onEvent<E>(bloc: Bloc<any, E>, event: E): void {
    console.log(\`\${bloc.constructor.name} received event: \`, event);
  }

  // Called when an error occurs in a bloc
  onError(bloc: BlocBase<any>, error: any): void {
    console.error(\`Error in \${bloc.constructor.name}: \`, error);
  }

  // Called when a bloc is disposed
  onDispose(bloc: BlocBase<any>): void {
    console.log(\`Bloc Disposed: \${bloc.constructor.name}\`);
  }
}

// Set the observer globally
import { Blac } from '@blac/next';
Blac.observer = new MyBlocObserver();`}
        </DocCode>

        <p className="mt-4">
          The BlocObserver is a powerful tool for:
        </p>

        <ul className="space-y-2">
          <li>Debugging state changes across your application</li>
          <li>Implementing global error handling for blocs</li>
          <li>Tracking analytics based on state changes or events</li>
          <li>Logging application behavior for troubleshooting</li>
          <li>Performance monitoring of state updates</li>
        </ul>
      </DocSection>

      <DocSection title="Plugins">
        <p>
          Blac supports a plugin system that allows you to extend its functionality. Plugins can hook into various 
          lifecycle events and add capabilities like persistence, logging, time-travel debugging, etc.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Hydration Plugin"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
            color="blue"
          >
            <p>
              Persists and restores state across application restarts, ensuring a seamless user experience.
            </p>
            <DocCode>
{`import { HydrationPlugin } from '@blac/plugins';
Blac.addPlugin(new HydrationPlugin());`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="DevTools Plugin"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            }
            color="purple"
          >
            <p>
              Connects to the Redux DevTools Extension to provide time-travel debugging and state inspection.
            </p>
            <DocCode>
{`import { DevToolsPlugin } from '@blac/plugins';
Blac.addPlugin(new DevToolsPlugin());`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocCode title="Custom Plugin Example">
{`import { BlacPlugin, BlacLifecycleEvent, BlocBase } from '@blac/next';

class AnalyticsPlugin implements BlacPlugin {
  name = 'AnalyticsPlugin';
  
  onEvent(event: BlacLifecycleEvent, bloc: BlocBase<any>, data?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      const oldState = data.oldState;
      const newState = data.newState;
      
      // Track state changes in analytics
      analytics.trackStateChange(
        bloc.constructor.name,
        oldState,
        newState
      );
    }
  }
}

// Add the plugin
Blac.addPlugin(new AnalyticsPlugin());`}
        </DocCode>

        <DocNote>
          <p>
            Plugins are a powerful way to extend Blac's functionality without modifying your state containers. 
            They can be enabled globally or for specific Blocs/Cubits.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Next Steps">
        <p>
          Now that you understand the core concepts of Blac, you can explore these topics in more detail:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-4">
          <a href="/docs/blac-next/cubit" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Cubits</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Learn more about using Cubits for simple state management.
            </p>
          </a>
          
          <a href="/docs/blac-next/bloc" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400">Blocs</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Explore Blocs for event-driven state management.
            </p>
          </a>
          
          <a href="/docs/blac-react/use-bloc" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">React Integration</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              See how to use Blac in React applications with the useBloc hook.
            </p>
          </a>
          
          <a href="/docs/advanced/dependency-tracking" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">Advanced Concepts</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Dive deeper into dependency tracking and advanced patterns.
            </p>
          </a>
        </div>
      </DocSection>
    </div>
  )
}
