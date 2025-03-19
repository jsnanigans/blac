import { createFileRoute } from '@tanstack/react-router'
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature, CyberpunkStyles } from '../../../components/docs/DocComponents'

export const Route = createFileRoute('/docs/blac-next/cubit')({
  component: CubitPage,
})

function CubitPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <CyberpunkStyles />
      
      <DocSection title="Cubit" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          A Cubit is the simplest form of state container in Blac, providing a straightforward way to manage state in your application.
        </p>
      </DocSection>

      <DocSection title="Introduction to Cubits">
        <p>
          Cubits are the simplest form of state containers in Blac. They extend the <code>BlocBase</code> class and provide a straightforward way to manage state. 
          Cubits are perfect for simpler use cases where you don't need complex event processing or state transitions.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="What is a Cubit?"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            color="blue"
          >
            <p>
              A Cubit is a class that extends <code>BlocBase</code> and can emit new states. Each Cubit has:
            </p>
            <ul className="space-y-1 list-disc pl-5">
              <li>An initial state provided in the constructor</li>
              <li>Methods that update the state</li>
              <li>A current state accessible via the <code>state</code> property</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="When to Use Cubits"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          >
            <p>Cubits are ideal for:</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Simple state management with direct actions</li>
              <li>When you want minimal boilerplate code</li>
              <li>Form state management</li>
              <li>UI state (toggle states, loading indicators, etc.)</li>
              <li>When there is a straightforward mapping between user actions and state changes</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Creating a Cubit">
        <p>
          Creating a Cubit is straightforward. You need to define a class that extends <code>Cubit&lt;T&gt;</code> where <code>T</code> is the type of state you want to manage.
        </p>

        <DocCode title="Basic Cubit Example">
{`import { Cubit } from '@blac/next';

// A simple counter cubit that manages a number state
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initialize with state 0
  }

  // Define methods that update the state
  increment() {
    this.emit(this.state + 1);
  }

  decrement() {
    this.emit(this.state - 1);
  }

  reset() {
    this.emit(0);
  }
}`}
        </DocCode>

        <DocNote>
          <p>
            The generic type parameter <code>&lt;T&gt;</code> specifies the type of state managed by the Cubit. This can be any type - 
            from primitive values like numbers to complex objects.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="State Management Methods">
        <p>
          Cubits provide two primary methods for updating state: <code>emit()</code> and <code>patch()</code>. While both methods 
          serve the purpose of updating state, <code>patch()</code> is often the preferred approach for complex state objects.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="emit()"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="blue"
          >
            <p>
              The <code>emit</code> method completely replaces the current state with a new state:
            </p>
            <DocCode>
{`// Replace the entire state
this.emit(newState);

// If state is not changed (using Object.is comparison),
// no update will occur
this.emit(this.state); // No effect`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="patch()"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            }
            color="green"
          >
            <p>
              The <code>patch</code> method allows you to partially update an object state by merging only the changed properties:
            </p>
            <DocCode highlightLines={[2, 5]}>
{`// Only update specific properties
this.patch({ completed: true, updatedAt: Date.now() });

// Skip change detection with optional parameter
this.patch(statePatch, true); // Force update`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote type="info">
          <p>
            The <code>patch</code> method is only applicable when the state is an object type. It performs a shallow merge using the spread 
            operator (<code>{'{'} ...this.state, ...statePatch {'}'}</code>).
          </p>
        </DocNote>

        <DocCode title="Using patch() in a Todo Cubit" highlightLines={[18, 19, 23, 27, 31, 40, 41, 42, 43, 44, 48, 49, 50, 51]}>
{`import { Cubit } from '@blac/next';

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'completed';
  searchQuery: string;
  error: string | null;
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [],
      isLoading: false,
      filter: 'all',
      searchQuery: '',
      error: null
    });
  }

  // Using emit() to replace the entire state
  setTodos(todos: Todo[]) {
    this.emit({
      ...this.state,
      todos,
      isLoading: false
    });
  }

  // Using patch() for partial updates (RECOMMENDED)
  setLoading(isLoading: boolean) {
    this.patch({ isLoading });
  }

  setFilter(filter: 'all' | 'active' | 'completed') {
    this.patch({ filter });
  }

  setSearchQuery(searchQuery: string) {
    this.patch({ searchQuery });
  }

  setError(error: string | null) {
    this.patch({ error });
  }

  // Combining patch() with more complex logic
  async fetchTodos() {
    try {
      this.patch({ isLoading: true, error: null });
      
      const response = await fetch('/api/todos');
      const todos = await response.json();
      
      // Update multiple fields with a single patch
      this.patch({ 
        todos, 
        isLoading: false 
      });
    } catch (error) {
      this.patch({ 
        isLoading: false,
        error: 'Failed to fetch todos'
      });
    }
  }
}`}
        </DocCode>

        <p className="mt-4">
          <strong>Why use patch() instead of emit()?</strong>
        </p>

        <ul className="space-y-2">
          <li><strong>More concise code:</strong> No need to spread the entire state object manually</li>
          <li><strong>Selective change detection:</strong> Only checks if the specific properties being updated have changed</li>
          <li><strong>Reduced risk of bugs:</strong> Less likely to accidentally overwrite parts of the state</li>
          <li><strong>Better readability:</strong> Makes it clearer which parts of state are being modified</li>
          <li><strong>Type safety:</strong> TypeScript ensures you only patch properties that exist in your state</li>
        </ul>

        <DocNote type="warning">
          <p>
            The <code>patch()</code> method performs a shallow merge. If you need to update nested properties, you'll still need to manually create 
            new objects for those nested structures, as shown in the nested notification examples below.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Managing Complex State">
        <p>
          Cubits can manage any type of state, from primitive values to complex objects. When working with complex state, it's important 
          to maintain immutability when updating the state. You can use either the <code>emit()</code> method with manual spreading,
          or the more convenient <code>patch()</code> method for partial updates.
        </p>

        <DocCode title="Todo List Cubit Example">
{`import { Cubit } from '@blac/next';

// Define the state type
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  isLoading: boolean;
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all',
      isLoading: false
    });
  }

  // Add a new todo
  addTodo(text: string) {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false
    };

    // Using patch() to update the todos array
    this.patch({
      todos: [...this.state.todos, newTodo]
    });
  }

  // Toggle a todo's completed status
  toggleTodo(id: number) {
    const updatedTodos = this.state.todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed } 
        : todo
    );

    // Using patch() to update just the todos
    this.patch({ todos: updatedTodos });
  }

  // Remove a todo
  removeTodo(id: number) {
    this.patch({
      todos: this.state.todos.filter(todo => todo.id !== id)
    });
  }

  // Change the filter
  setFilter(filter: 'all' | 'active' | 'completed') {
    this.patch({ filter });
  }

  // Load todos from an API
  async loadTodos() {
    try {
      // Set loading state
      this.patch({ isLoading: true });

      // Simulate API call
      const response = await fetch('/api/todos');
      const todos = await response.json();

      // Update state with loaded todos
      this.patch({
        todos,
        isLoading: false
      });
    } catch (error) {
      // Handle error
      this.patch({ isLoading: false });
    }
  }
}`}
        </DocCode>

        <DocNote type="warning">
          <p>
            <strong>Always maintain immutability</strong> when updating the state. Whether using <code>emit()</code> or <code>patch()</code>, 
            never directly modify arrays or objects within your state. Always create new instances.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Asynchronous Operations">
        <p>
          Cubits can handle asynchronous operations such as API calls or other side effects. Methods in a Cubit can be async, 
          allowing you to emit multiple state updates during an async operation.
        </p>

        <DocCode title="Async Cubit Example with patch()" highlightLines={[16, 17, 18, 19, 24, 25, 26, 27, 31, 32, 33, 34]}>
{`import { Cubit } from '@blac/next';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

class UserCubit extends Cubit<UserState> {
  constructor(private userService: UserService) {
    super({
      user: null,
      isLoading: false,
      error: null
    });
  }

  async loadUser(userId: string) {
    try {
      // Update state to loading
      this.patch({
        isLoading: true,
        error: null
      });

      // Perform async operation
      const user = await this.userService.getUser(userId);

      // Update state with successful result
      this.patch({
        user,
        isLoading: false
      });
    } catch (error) {
      // Update state with error
      this.patch({
        isLoading: false,
        error: error.message || 'Failed to load user'
      });
    }
  }
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            Using <code>patch()</code> in async operations makes the code more maintainable as your state grows in complexity. 
            It allows you to update only the relevant parts of state at each stage of the operation.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Cubit Lifecycle">
        <p>
          Like all Blac state containers, Cubits have a lifecycle that you can hook into:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 not-prose">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-2">
                <span className="text-blue-600 dark:text-blue-300 font-bold">1</span>
              </div>
              <h3 className="text-base font-bold">Construction</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              The Cubit is instantiated with an initial state.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-100 dark:border-green-800 shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-2">
                <span className="text-green-600 dark:text-green-300 font-bold">2</span>
              </div>
              <h3 className="text-base font-bold">State Changes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Methods are called that patch or emit new states.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm">
            <div className="flex items-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-2">
                <span className="text-amber-600 dark:text-amber-300 font-bold">3</span>
              </div>
              <h3 className="text-base font-bold">Subscription</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Components subscribe to state changes through hooks.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-100 dark:border-red-800 shadow-sm">
            <div className="flex items-center">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-2">
                <span className="text-red-600 dark:text-red-300 font-bold">4</span>
              </div>
              <h3 className="text-base font-bold">Disposal</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              The Cubit is disposed when no longer needed, cleaning up resources.
            </p>
          </div>
        </div>

        <p className="mt-6">
          You can add custom disposal logic by overriding the <code>dispose</code> method:
        </p>

        <DocCode title="Custom Disposal Logic">
{`class StreamCubit extends Cubit<Data> {
  private subscription: Subscription;

  constructor(stream: Observable<Data>) {
    super(initialData);
    
    // Subscribe to an external data source
    this.subscription = stream.subscribe(data => {
      this.emit(data);
    });
  }

  // Override dispose to clean up resources
  dispose() {
    // Cancel the subscription when the cubit is disposed
    this.subscription.unsubscribe();
    
    // Always call the parent dispose method
    super.dispose();
  }
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Best Practices">
        <DocFeatureGrid>
          <DocFeature 
            title="Keep Cubits Focused"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
            color="blue"
          >
            <p>
              Each Cubit should manage a specific domain of your application state. Avoid creating "god" Cubits that try to 
              manage too many different aspects of your application.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Immutable State Updates"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            color="green"
          >
            <p>
              Always create new state objects when updating complex state rather than modifying the existing state object. 
              Use the spread operator or libraries like Immer to help maintain immutability.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Use patch() for Partial Updates"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            }
            color="purple"
          >
            <p>
              When working with complex object states, prefer the <code>patch()</code> method for partial updates. It's more 
              efficient as it only checks if the specific properties being updated have changed, and makes your code more 
              concise by reducing the need to spread the entire state object manually.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Handle Errors Gracefully"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="amber"
          >
            <p>
              Always handle errors in async methods and update the state accordingly. This allows your UI to display 
              appropriate error messages or retry options.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Clear Method Names"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
            color="blue"
          >
            <p>
              Use descriptive method names that clearly indicate what the method does. This makes your Cubits more 
              intuitive to use and easier to understand for other developers.
            </p>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Testing Cubits">
        <p>
          One of the advantages of using Cubits for state management is that they are easy to test. Here's an example of how to test a Cubit using Jest:
        </p>

        <DocCode title="Testing a Counter Cubit">
{`import { CounterCubit } from './counter_cubit';

describe('CounterCubit', () => {
  let counterCubit: CounterCubit;

  beforeEach(() => {
    // Create a fresh cubit for each test
    counterCubit = new CounterCubit();
  });

  afterEach(() => {
    // Clean up after each test
    counterCubit.dispose();
  });

  test('initial state is 0', () => {
    expect(counterCubit.state).toBe(0);
  });

  test('increment increases state by 1', () => {
    counterCubit.increment();
    expect(counterCubit.state).toBe(1);
  });

  test('decrement decreases state by 1', () => {
    counterCubit.decrement();
    expect(counterCubit.state).toBe(-1);
  });

  test('reset sets state back to 0', () => {
    counterCubit.increment();
    counterCubit.increment();
    counterCubit.reset();
    expect(counterCubit.state).toBe(0);
  });
});`}
        </DocCode>

        <DocNote type="info">
          <p>
            You can also test asynchronous Cubit methods using Jest's async/await support or utilities like <code>fakeTimers</code> for testing time-based operations.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Next Steps">
        <p>
          Now that you understand Cubits, you might want to explore:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-4">
          <a href="/docs/blac-react/use-bloc" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">useBloc Hook</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Learn how to use Cubits in React components with the useBloc hook.
            </p>
          </a>
          
          <a href="/docs/blac-next/bloc" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400">Bloc</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Explore Blocs for more complex state management with event-driven architecture.
            </p>
          </a>
          
          <a href="/docs/advanced/dependency-tracking" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Advanced: Dependency Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Learn how Blac's fine-grained reactivity works to optimize your application.
            </p>
          </a>
          
          <a href="/docs/advanced/external-store" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">External Bloc Store</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Discover how to manage global Cubits with an external store.
            </p>
          </a>
        </div>
      </DocSection>
    </div>
  )
}
