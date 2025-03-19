import { createFileRoute } from '@tanstack/react-router'
import { 
  DocSection, 
  DocNote, 
  DocCode, 
  DocFeatureGrid, 
  DocFeature,
  CubitBasicsDoc,
  ComplexStateDoc,
  InstanceManagementDoc,
  DependencyTrackingDoc,
  ComputedPropertiesDoc,
  AsyncOperationsDoc,
  BlocArchitectureDoc
} from '../../components/docs/DocComponents'

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

        <DocNote type="warning" title="Arrow Functions Required">
          <p>
            All methods in Bloc or Cubit classes must use arrow function syntax (<code>method = () =&gt; {}</code>) instead of the traditional method syntax (<code>method() {}</code>).
          </p>
          <p className="mt-2">
            This is because arrow functions automatically bind <code>this</code> to the class instance. Without this binding, methods called from React components would lose their context and could not access instance properties.
          </p>
        </DocNote>
      </DocSection>

      {/* Include our new comprehensive Cubit docs */}
      <CubitBasicsDoc />
      
      {/* Include documentation on complex state management */}
      <ComplexStateDoc />
      
      {/* Include documentation on instance management strategies */}
      <InstanceManagementDoc />
      
      {/* Include documentation on automatic dependency tracking */}
      <DependencyTrackingDoc />
      
      {/* Include documentation on computed properties */}
      <ComputedPropertiesDoc />
      
      {/* Include documentation on async operations with Blac */}
      <AsyncOperationsDoc />
      
      {/* Architecture patterns with Blac */}
      <BlocArchitectureDoc />

      <DocSection title="Bloc">
        <p>
          A <code>Bloc</code> extends <code>BlocBase</code> but implements a more sophisticated pattern 
          with events and state transformations. Blocs are suitable for more complex state management needs.
        </p>

        <DocCode title="Basic Bloc Pattern">
{`import { Bloc } from '@blac/next';

// Define events
type CounterEvent = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

// Create a Bloc
class CounterBloc extends Bloc<CounterEvent, number> {
  constructor() {
    super(0); // Initial state
    
    // Register event handlers
    this.on('increment', this.increment);
    this.on('decrement', this.decrement);
    this.on('reset', this.reset);
  }
  
  // Event handlers
  private increment = () => {
    this.emit(this.state + 1);
  };
  
  private decrement = () => {
    this.emit(this.state - 1);
  };
  
  private reset = () => {
    this.emit(0);
  };
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
              <li>Complex state transitions</li>
              <li>Business logic with many events</li>
              <li>When you need event traceability</li>
              <li>Workflow-based features</li>
              <li>Asynchronous event processing</li>
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
              <li>Event-driven architecture</li>
              <li>Clearly defined state transitions</li>
              <li>Better traceability and logging</li>
              <li>Support for complex workflows</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote type="warning">
          <p>
            Blocs require a bit more boilerplate than Cubits, but they provide stronger 
            guarantees around how state can change.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="React Integration">
        <p>
          Blac integrates seamlessly with React through the <code>@blac/react</code> package.
          The primary integration point is the <code>useBloc</code> hook.
        </p>

        <DocCode title="Using Blac with React">
{`import { useBloc } from '@blac/react';
import { CounterCubit } from './counter';

function Counter() {
  // Get state and cubit instance
  const [count, counterCubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => counterCubit.decrement()}>-</button>
      <button onClick={() => counterCubit.increment()}>+</button>
      <button onClick={() => counterCubit.reset()}>Reset</button>
    </div>
  );
}`}
        </DocCode>

        <DocFeatureGrid>
          <DocFeature 
            title="Automatic Dependency Tracking"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            }
            color="blue"
          >
            <p>
              React components only re-render when the specific parts of state they use change,
              even with complex nested state objects.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Instance Management"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="green"
          >
            <p>
              The <code>useBloc</code> hook automatically handles the lifecycle of Blac instances, 
              creating and disposing of instances as needed.
            </p>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>
    </div>
  );
}
