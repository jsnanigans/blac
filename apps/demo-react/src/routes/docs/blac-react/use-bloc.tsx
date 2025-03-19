import { createFileRoute } from '@tanstack/react-router';
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature } from '../../../components/docs/DocComponents';

export const Route = createFileRoute('/docs/blac-react/use-bloc')({
  component: UseBlocPage,
});

function UseBlocPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <DocSection title="useBloc Hook" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          The useBloc hook is the primary way to connect React components to Blac state containers, providing fine-grained reactivity and automatic dependency tracking.
        </p>
      </DocSection>

      <DocSection title="Introduction">
        <p>
          The <code>useBloc</code> hook is at the heart of integrating Blac with React. It allows React components to:
        </p>

        <ul className="space-y-2">
          <li>Connect to state containers (Blocs and Cubits)</li>
          <li>Access and respond to state changes</li>
          <li>Trigger state updates through methods</li>
          <li>Automatically track dependencies for optimized rendering</li>
        </ul>

        <DocNote>
          <p>
            The <code>useBloc</code> hook is exported from the <code>@blac/react</code> package, which should be installed alongside the core <code>@blac/next</code> package.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Basic Usage">
        <p>
          Here's how to use the <code>useBloc</code> hook in its simplest form:
        </p>

        <DocCode title="Basic useBloc Example">
{`import React from 'react';
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter_cubit';

function Counter() {
  // The hook returns a tuple with [state, bloc]
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div>
      <p>Current count: {count}</p>
      <button onClick={() => counterCubit.increment()}>Increment</button>
      <button onClick={() => counterCubit.decrement()}>Decrement</button>
    </div>
  );
}`}
        </DocCode>

        <p className="mt-4">
          In this example:
        </p>

        <ol className="space-y-2">
          <li><code>useBloc(CounterCubit)</code> creates or reuses a <code>CounterCubit</code> instance</li>
          <li>The current state (count) is returned as the first element of the tuple</li>
          <li>The cubit instance is returned as the second element, allowing you to call its methods</li>
          <li>When the state changes, the component will automatically re-render</li>
        </ol>
      </DocSection>

      <DocSection title="Dependency Tracking">
        <p>
          One of the most powerful features of Blac is its automatic dependency tracking. When you access specific 
          properties of a state object in your component, Blac keeps track of exactly which properties you used.
        </p>

        <DocCode title="Dependency Tracking Example">
{`import React from 'react';
import { useBloc } from '@blac/react';
import { TodoListCubit } from './todo_list_cubit';

// The state is a complex object with todos, filter, etc.
// interface TodoListState {
//   todos: Todo[];
//   filter: 'all' | 'active' | 'completed';
//   isLoading: boolean;
// }

function TodoCounter() {
  // We're only accessing the todos array length in this component
  const [{ todos }, todoListCubit] = useBloc(TodoListCubit);
  
  // This component will only re-render when the number of todos changes,
  // not when the filter or isLoading properties change
  return <div>Total todos: {todos.length}</div>;
}

function FilterControls() {
  // This component only cares about the filter
  const [{ filter }, todoListCubit] = useBloc(TodoListCubit);
  
  // Will only re-render when the filter changes
  return (
    <div>
      <button 
        className={filter === 'all' ? 'active' : ''} 
        onClick={() => todoListCubit.setFilter('all')}
      >
        All
      </button>
      <button 
        className={filter === 'active' ? 'active' : ''} 
        onClick={() => todoListCubit.setFilter('active')}
      >
        Active
      </button>
      <button 
        className={filter === 'completed' ? 'active' : ''} 
        onClick={() => todoListCubit.setFilter('completed')}
      >
        Completed
      </button>
    </div>
  );
}

function LoadingIndicator() {
  // This component only cares about the loading state
  const [{ isLoading }] = useBloc(TodoListCubit);
  
  // Will only re-render when isLoading changes
  return isLoading ? <div>Loading...</div> : null;
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            <strong>How it works:</strong> Blac uses JavaScript Proxies to track which properties of the state are accessed during rendering. 
            When the state changes, Blac will only trigger a re-render if the specific properties you accessed have changed.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Advanced useBloc Options">
        <p>
          The <code>useBloc</code> hook accepts a second parameter with configuration options:
        </p>

        <DocCode title="useBloc with Options">
{`const [state, bloc] = useBloc(BlocClass, {
  // Configuration options
  params: [...constructorParams],
  selector: (state) => transformedState,
  store: externalStore
});`}
        </DocCode>

        <DocFeatureGrid>
          <DocFeature 
            title="Constructor Parameters"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            }
            color="blue"
          >
            <p className="mb-2">
              Pass constructor parameters to your Bloc or Cubit using the <code>params</code> option:
            </p>
            <DocCode>
{`// UserBloc requires userId in constructor
const [user, userBloc] = useBloc(UserBloc, {
  params: [userId, authService]
});`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="State Selectors"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
            color="purple"
          >
            <p className="mb-2">
              Transform the state with a selector function:
            </p>
            <DocCode>
{`// Transform state before it reaches component
const [activeTodos, todoBloc] = useBloc(TodoListBloc, {
  selector: (state) => state.todos.filter(
    todo => !todo.completed
  )
});

// activeTodos is now just the filtered array`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="External Bloc Store">
        <p>
          For larger applications, you might want to use an external Bloc store to manage global state containers:
        </p>

        <DocCode title="Creating an External Store">
{`// store.ts
import { BlocStore } from '@blac/react';
import { CounterCubit } from './counter/counter_cubit';
import { AuthBloc } from './auth/auth_bloc';
import { ThemeCubit } from './theme/theme_cubit';
import { ApiService } from './services/api_service';

// Create the API service to be injected
const apiService = new ApiService();

// Create a store with factory functions for all global blocs
export const appStore = new BlocStore({
  // Simple cubit without dependencies
  counterCubit: () => new CounterCubit(),
  
  // Bloc with dependency injection
  authBloc: () => new AuthBloc(apiService),
  
  // Cubit that persists between navigations
  themeCubit: {
    create: () => new ThemeCubit(),
    persist: true // This instance will be kept alive
  }
});

// Export type for type safety when using the store
export type AppStore = typeof appStore;`}
        </DocCode>

        <p className="mt-4">
          Once you have a store, you can use it with the <code>useBloc</code> hook:
        </p>

        <DocCode title="Using an External Store">
{`// In components
import React from 'react';
import { useBloc } from '@blac/react';
import { appStore } from './store';

function ThemeToggle() {
  // Get the bloc from the store using a function that receives the store
  const [theme, themeCubit] = useBloc(
    (store) => store.themeCubit, 
    { store: appStore }
  );

  return (
    <button onClick={() => themeCubit.toggle()}>
      Switch to {theme === 'light' ? 'dark' : 'light'} theme
    </button>
  );
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            External stores are great for sharing state between components that are far apart in the component tree, 
            without having to pass props down through many levels or use context providers.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Lifecycle Management">
        <p>
          Blac automatically manages the lifecycle of Bloc instances used with the <code>useBloc</code> hook:
        </p>

        <ul className="space-y-2">
          <li>When a component mounts, a new Bloc is created (or retrieved from the store)</li>
          <li>When the component unmounts, the Bloc is automatically closed and resources are cleaned up</li>
          <li>If multiple components use the same Bloc type, they will share the same instance by default</li>
          <li>Blocs from external stores can be configured to persist even when no components are using them</li>
        </ul>

        <DocCode title="Lifecycle Example">
{`// This pattern is common for handling side effects on mount/unmount
function DataFetcher() {
  const [data, dataBloc] = useBloc(DataBloc);

  // When component mounts, fetch data
  React.useEffect(() => {
    dataBloc.fetchData();
    
    // No cleanup needed here - the bloc will be 
    // automatically disposed when the component unmounts
  }, [dataBloc]);

  if (data.isLoading) return <div>Loading...</div>;
  if (data.error) return <div>Error: {data.error}</div>;
  
  return (
    <ul>
      {data.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Performance Optimizations">
        <p>
          The <code>useBloc</code> hook is designed for optimal performance, but there are a few techniques you can use to ensure your components render efficiently:
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Access Only What You Need"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            color="green"
          >
            <p>
              Only access the state properties you actually need in your component. The dependency tracking 
              system will optimize rendering based on which properties you actually use.
            </p>
            <DocCode>
{`// Only access the isLoading property
const [{ isLoading }] = useBloc(DataBloc);

// Instead of
// const [state] = useBloc(DataBloc);
// ...and then using state.isLoading`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Use Selectors for Derived Data"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            }
            color="blue"
          >
            <p>
              Use the selector option to transform or filter data before it reaches your component, especially for complex calculations.
            </p>
            <DocCode>
{`// Use a selector to calculate derived data
const completedCount = useBloc(TodoBloc, {
  selector: state => state.todos.filter(
    todo => todo.completed
  ).length
});

// Instead of calculating in render
// const [{ todos }] = useBloc(TodoBloc);
// const completedCount = todos.filter(t => t.completed).length;`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote type="warning">
          <p>
            <strong>Remember:</strong> Even though Blac has automatic dependency tracking, 
            it's still good practice to structure your components in a way that they only access the 
            parts of state they truly need. This makes your components more focused and maintainable.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="TypeScript Support">
        <p>
          The <code>useBloc</code> hook is fully typed and provides excellent TypeScript integration:
        </p>

        <DocCode title="TypeScript Example">
{`import { Cubit } from '@blac/next';
import { useBloc } from '@blac/react';

// Define your state interface
interface UserState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

// Create a typed cubit
class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      user: null,
      isLoading: false,
      error: null
    });
  }

  // Methods...
}

// In your component
function UserProfile() {
  // TypeScript knows the exact shape of the state
  const [{ user, isLoading, error }, userCubit] = useBloc(UserCubit);

  // TypeScript will enforce null checks
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {user && (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      )}
    </div>
  );
}`}
        </DocCode>

        <p>
          When using external stores, you can also leverage TypeScript for type safety:
        </p>

        <DocCode title="TypeScript with External Store">
{`import { useBloc } from '@blac/react';
import { appStore, AppStore } from './store';

// Create a type-safe hook for your store
function useAppBloc<Selected>(
  selector: (store: AppStore) => Selected,
) {
  return useBloc(selector, { store: appStore });
}

// In your component
function AuthStatus() {
  const [{ isAuthenticated, user }] = useAppBloc(
    store => store.authBloc
  );
  
  // Types are preserved
  return (
    <div>
      {isAuthenticated ? \`Welcome, \${user!.name}\` : 'Please log in'}
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Common Patterns">
        <DocFeatureGrid>
          <DocFeature 
            title="Form Handling"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="blue"
          >
            <DocCode>
{`function LoginForm() {
  const [form, formCubit] = useBloc(LoginFormCubit);
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      formCubit.submit();
    }}>
      <input
        value={form.email}
        onChange={(e) => formCubit.setEmail(e.target.value)}
      />
      {form.errors.email && (
        <p className="error">{form.errors.email}</p>
      )}
      <button disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Data Fetching"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }
            color="purple"
          >
            <DocCode>
{`function ProductList() {
  const [{ products, isLoading }, productsBloc] = 
    useBloc(ProductsBloc);
  
  React.useEffect(() => {
    productsBloc.loadProducts();
  }, [productsBloc]);
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Next Steps">
        <p>
          Now that you understand how to use the <code>useBloc</code> hook, you might want to explore these related topics:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-4">
          <a href="/docs/advanced/external-store" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">External Bloc Store</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Learn more about using the external store for more complex applications.
            </p>
          </a>
          
          <a href="/docs/advanced/dependency-tracking" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Dependency Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Dive deeper into how dependency tracking works and how to optimize it.
            </p>
          </a>
          
          <a href="/docs/advanced/testing" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">Testing React Components</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Learn how to test React components that use the useBloc hook.
            </p>
          </a>
          
          <a href="/docs/advanced/performance" className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400">Performance Optimization</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Advanced techniques for optimizing performance in complex applications.
            </p>
          </a>
        </div>
      </DocSection>
    </div>
  );
}