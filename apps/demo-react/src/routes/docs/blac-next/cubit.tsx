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
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }); // Initialize with state object
  }

  // Define methods using arrow functions
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  }

  decrement = () => {
    this.emit({ count: Math.max(0, this.state.count - 1) });
  }

  reset = () => {
    this.emit({ count: 0 });
  }
}`}
        </DocCode>

        <DocNote type="warning">
          <p>
            <strong>Important:</strong> All methods in Bloc or Cubit classes must use arrow function syntax to maintain the proper <code>this</code> context:
          </p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// Correct way (will maintain context)
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// Incorrect way (will lose 'this' context)
increment() { 
  this.emit({ count: this.state.count + 1 });
}`}
          </DocCode>
        </DocNote>
      </DocSection>

      <DocSection title="State Management Methods">
        <p>
          Cubits provide two primary methods for updating state: <code>emit()</code> and <code>patch()</code>. While both methods 
          serve the purpose of updating state, <code>patch()</code> is often the preferred approach for complex state objects.
        </p>

        <div className="space-y-8 my-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">emit()</h3>
            </div>
            <p className="mb-4">
              The <code>emit</code> method completely replaces the current state with a new state:
            </p>
            <DocCode>
{`// Replace the entire state
this.emit(newState);

// If state is not changed (using Object.is comparison),
// no update will occur
this.emit(this.state); // No effect`}
            </DocCode>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/20 p-6 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">patch()</h3>
            </div>
            <p className="mb-4">
              The <code>patch</code> method allows you to partially update an object state by merging only the changed properties:
            </p>
            <DocCode>
{`// Only update specific properties
this.patch({ completed: true, updatedAt: Date.now() });

// For nested properties, create new objects for those nested structures
this.patch({ 
  loadingState: { 
    ...this.state.loadingState,
    isInitialLoading: false 
  } 
});`}
            </DocCode>
          </div>
        </div>

        <DocNote type="info">
          <p>
            The <code>patch</code> method is only applicable when the state is an object type. It performs a shallow merge using the spread 
            operator (<code>{'{'} ...this.state, ...statePatch {'}'}</code>).
          </p>
        </DocNote>

        <DocCode title="Using patch() in a Todo Cubit">
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
  setTodos = (todos: Todo[]) => {
    this.emit({
      ...this.state,
      todos,
      isLoading: false
    });
  }

  // Using patch() for partial updates (RECOMMENDED)
  setLoading = (isLoading: boolean) => {
    this.patch({ isLoading });
  }

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.patch({ filter });
  }

  setSearchQuery = (searchQuery: string) => {
    this.patch({ searchQuery });
  }

  setError = (error: string | null) => {
    this.patch({ error });
  }

  // Combining patch() with more complex logic
  loadTodos = async () => {
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
        error: error instanceof Error ? error.message : 'Failed to fetch todos'
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

      <DocSection title="Instance Management Patterns">
        <p>
          Blac provides three key state management patterns that you can use by setting static properties on your Cubit class:
        </p>

        <DocCode title="Instance Management Patterns">
{`// 1. Shared State (Default)
class CounterCubit extends Cubit<{ count: number }> {
  // No static properties needed - this is the default
  constructor() {
    super({ count: 0 });
  }
}

// 2. Isolated State (each component gets its own instance)
class IsolatedCounterCubit extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
  }
}

// 3. Persistent State (state persists even when no components are using it)
class PersistentCounterCubit extends Cubit<{ count: number }> {
  static keepAlive = true;
  
  constructor() {
    super({ count: 0 });
  }
}`}
        </DocCode>

        <DocNote>
          <p>
            Choose the right instance pattern based on your needs:
          </p>
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>Shared state:</strong> For global app state accessed by multiple components</li>
            <li><strong>Isolated state:</strong> For component-specific state or reusable components</li>
            <li><strong>Persistent state:</strong> For state that needs to survive even when not actively used</li>
          </ul>
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
  addTodo = (text: string) => {
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
  toggleTodo = (id: number) => {
    const updatedTodos = this.state.todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    );

    this.patch({ todos: updatedTodos });
  }

  // Set the filter
  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.patch({ filter });
  }

  // Get filtered todos (computed property)
  get filteredTodos() {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter(todo => !todo.completed);
      case 'completed':
        return this.state.todos.filter(todo => todo.completed);
      default:
        return this.state.todos;
    }
  }
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Handling Async Operations">
        <p>
          Cubits make it easy to handle asynchronous operations such as API calls. Here's a pattern for managing loading states, data fetching, and error handling:
        </p>

        <DocCode title="Pet Finder Bloc Example">
{`import { Cubit } from '@blac/next';
import { petfinderAPI } from '../services/petfinder';

interface PetfinderState {
  animals: Animal[];
  searchParams: SearchParams;
  loadingState: {
    isInitialLoading: boolean;
    isPaginationLoading: boolean;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  error: string | null;
}

class PetfinderBloc extends Cubit<PetfinderState> {
  searchAnimals = async () => {
    try {
      // Show loading state
      this.patch({ 
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: true 
        } 
      });
      
      // Fetch data
      const response = await petfinderAPI.getAnimals(this.state.searchParams);
      
      // Update state with results
      this.patch({
        animals: response.animals,
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: false 
        },
        pagination: {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalCount: response.pagination.total_count,
        },
      });
    } catch (error) {
      // Handle errors
      this.patch({
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: false 
        },
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };
}`}
        </DocCode>

        <DocNote>
          <p>
            When handling async operations, make sure to:
          </p>
          <ul className="space-y-1 list-disc pl-5">
            <li>Set loading state at the beginning</li>
            <li>Use try/catch to handle errors</li>
            <li>Reset loading state in both success and error cases</li>
            <li>Provide meaningful error messages</li>
            <li>Type-check errors for better error messages</li>
          </ul>
        </DocNote>
      </DocSection>

      <DocSection title="Props & Dependency Injection">
        <p>
          You can pass configuration to blocs during initialization using props. This is useful for customizing behavior or providing dependencies.
        </p>

        <DocCode title="Cubit with Props">
{`import { Cubit } from '@blac/next';

// Define props interface
interface ThemeProps {
  defaultTheme: 'light' | 'dark';
  saveToLocalStorage?: boolean;
}

interface ThemeState {
  theme: 'light' | 'dark';
}

class ThemeCubit extends Cubit<ThemeState, ThemeProps> {
  constructor(props: ThemeProps) {
    // Initialize from localStorage or use provided default
    const savedTheme = props.saveToLocalStorage 
      ? localStorage.getItem('theme') 
      : null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    super({ theme: initialTheme as 'light' | 'dark' });
    
    // Store props for later use
    this.saveToLocalStorage = props.saveToLocalStorage;
  }

  private saveToLocalStorage?: boolean;

  toggleTheme = () => {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    
    if (this.saveToLocalStorage) {
      localStorage.setItem('theme', newTheme);
    }
    
    this.emit({ theme: newTheme });
  };
}

// In component:
const [state, bloc] = useBloc(ThemeCubit, {
  props: { 
    defaultTheme: 'dark',
    saveToLocalStorage: true 
  }
});`}
        </DocCode>
      </DocSection>
    </div>
  );
}
