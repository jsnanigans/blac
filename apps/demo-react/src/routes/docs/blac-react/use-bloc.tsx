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
            The <code>useBloc</code> hook is exported from the <code>@blac/react</code> package, which should be installed alongside the core <code>blac-next</code> package.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Basic Usage">
        <p>
          Here's how to use the <code>useBloc</code> hook in its simplest form:
        </p>

        <DocCode language="typescript" title="Basic useBloc Example">
{`import React from 'react';
import { useBloc } from '@blac/react';
import { CounterBloc } from '../blocs/counter.bloc';

function Counter() {
  // The hook returns a tuple with [state, bloc]
  const [state, counterBloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Current count: {state.count}</p>
      <button onClick={counterBloc.increment}>Increment</button>
      <button onClick={counterBloc.decrement}>Decrement</button>
    </div>
  );
}`}
        </DocCode>

        <p className="mt-4">
          In this example:
        </p>

        <ol className="space-y-2">
          <li><code>useBloc(CounterBloc)</code> creates or reuses a <code>CounterBloc</code> instance</li>
          <li>The current state is returned as the first element of the tuple</li>
          <li>The bloc instance is returned as the second element, allowing you to call its methods</li>
          <li>When the state changes, the component will automatically re-render</li>
        </ol>
      </DocSection>

      <DocSection title="Available Hooks">
        <p>
          The Blac React package provides three main hooks for connecting components to state containers:
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="useBloc"
            color="blue"
          >
            <p>
              The primary hook that provides both state and the bloc instance.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`const [state, bloc] = useBloc(YourBloc, options);`}
            </DocCode>
            <p className="text-sm mt-2">
              Use this when you need both the state and the ability to call bloc methods.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="useBlocValue"
            color="green"
          >
            <p>
              Access only the state value without the bloc instance.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`const state = useBlocValue(YourBloc, options);`}
            </DocCode>
            <p className="text-sm mt-2">
              Use this when you only need to read state and don't need to call any methods.
            </p>
          </DocFeature>

          <DocFeature 
            title="useBlocInstance"
            color="purple"
          >
            <p>
              Access only the bloc instance without subscribing to state changes.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`const bloc = useBlocInstance(YourBloc, options);`}
            </DocCode>
            <p className="text-sm mt-2">
              Use this when you only need to call methods and don't need to re-render on state changes.
            </p>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Instance Management">
        <p>
          Blac provides flexible options for managing Bloc instances across your components. You can control whether 
          state is shared between components, isolated to each instance, or persisted even when not in use.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Shared Instances (Default)"
            color="blue"
          >
            <p>
              By default, Blac creates a single shared instance that's reused across all components.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// All components using this will share state
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  // ...methods
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Isolated Instances"
            color="green"
          >
            <p>
              Each component gets its own isolated state by using the <code>isolated</code> static property.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Each component gets its own state
class IsolatedCounterBloc extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
  }
  // ...methods
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Persistent Instances"
            color="purple"
          >
            <p>
              Keep a bloc instance alive even when no components are using it with the <code>keepAlive</code> static property.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// State persists even when no components use it
class PersistentBloc extends Cubit<{ count: number }> {
  static keepAlive = true;
  
  constructor() {
    super({ count: 0 });
  }
  // ...methods
}`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote>
          <p>
            Choose the right instance management pattern based on your needs:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Shared state:</strong> For global app state like themes, user info, or app settings</li>
            <li><strong>Isolated state:</strong> For component-specific state or reusable components</li>
            <li><strong>Persistent state:</strong> For state that needs to survive between page navigations</li>
          </ul>
        </DocNote>
      </DocSection>

      <DocSection title="Custom Instance IDs">
        <p>
          In some cases, you may need multiple instances of the same bloc type. For example, when creating multiple chat rooms or distinct form instances:
        </p>

        <DocCode language="typescript" title="Custom ID for Bloc Instances">
{`function ChatRoom({ roomId }: { roomId: string }) {
  const [state, chatBloc] = useBloc(ChatBloc, {
    id: \`chat-\${roomId}\`, // Custom ID creates separate instance
    props: { roomId }
  });
  
  return (
    <div>
      <h2>Room: {roomId}</h2>
      <div className="messages">
        {state.messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}`}
        </DocCode>

        <DocNote>
          <p>
            The <code>id</code> option allows you to have multiple instances of the same bloc class, each with its own state.
            This is particularly useful for list items, tabs, or other repeated components that need isolated state.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Smart Dependency Tracking">
        <p>
          Blac uses a smart dependency tracking system to optimize re-renders. Components only re-render when the 
          specific parts of state they use change.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Automatic Property Tracking"
            color="blue"
          >
            <p>
              Blac automatically tracks which properties of state are accessed during rendering and only re-renders when those specific properties change:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`function UserProfile() {
  const [state, bloc] = useBloc(UserBloc);
  
  // This component only re-renders when state.name changes
  return <h1>{state.name}</h1>;
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Custom Dependency Selection"
            color="green"
          >
            <p>
              For more control, you can provide a custom dependency selector function:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`function TodoList() {
  const [state, bloc] = useBloc(TodoBloc, {
    dependencySelector: (state) => [
      state.todos.length, // Re-render when todo count changes
      state.filter        // Re-render when filter changes
    ]
  });
  
  // ...render logic
}`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocCode title="Optimized Renders Example">
{`// Only re-render when the completed count changes
function CompletedTasksCounter() {
  const [state, bloc] = useBloc(TaskBloc, {
    dependencySelector: (state) => [
      state.tasks.filter(task => task.completed).length
    ]
  });
  
  const completedCount = state.tasks.filter(task => task.completed).length;
  
  return <span>Completed: {completedCount}</span>;
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Passing Props to Blocs">
        <p>
          Use the <code>props</code> option to initialize a bloc with specific parameters:
        </p>

        <DocCode language="typescript" title="Passing Props to a Bloc">
{`interface ThemeProps {
  defaultTheme: 'light' | 'dark';
  saveToLocalStorage?: boolean;
}

class ThemeCubit extends Cubit<{ theme: 'light' | 'dark' }, ThemeProps> {
  constructor(props: ThemeProps) {
    // Initialize from localStorage or use provided default
    const savedTheme = props.saveToLocalStorage
      ? localStorage.getItem('theme')
      : null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || props.defaultTheme || (prefersDark ? 'dark' : 'light');
    
    super({ theme: initialTheme as 'light' | 'dark' });
    
    // Store props for later use if needed
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

function App() {
  const [state, themeCubit] = useBloc(ThemeCubit, {
    props: { 
      defaultTheme: 'dark',
      saveToLocalStorage: true
    }
  });
  
  return (
    <div className={state.theme === 'dark' ? 'dark-theme' : 'light-theme'}>
      <button onClick={themeCubit.toggleTheme}>
        Switch to {state.theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>
      {/* Rest of app */}
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Lifecycle Management">
        <p>
          The <code>useBloc</code> hook provides an <code>onMount</code> option that's called when the bloc is first mounted:
        </p>

        <DocCode language="typescript" title="Using onMount">
{`function PetList() {
  const [state, petfinderBloc] = useBloc(PetfinderBloc, {
    onMount: (bloc) => {
      // This runs once when the bloc is mounted
      bloc.searchAnimals();
    }
  });
  
  return (
    <div>
      {state.isLoading ? (
        <LoadingSpinner />
      ) : state.error ? (
        <ErrorMessage message={state.error} />
      ) : (
        <div className="pet-grid">
          {state.animals.map(animal => (
            <PetCard key={animal.id} animal={animal} />
          ))}
        </div>
      )}
    </div>
  );
}`}
        </DocCode>

        <DocNote>
          <p>
            The <code>onMount</code> callback works similarly to React's <code>useEffect</code> with an empty dependency array.
            It's a convenient way to load initial data or set up the bloc when the component renders.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Error Handling">
        <p>
          Proper error handling is essential for good user experience. Here's how to handle errors in a Bloc pattern:
        </p>

        <DocCode title="Error Handling Example">
{`// In your Bloc
class UserBloc extends Cubit<UserState> {
  fetchUser = async (userId: string) => {
    try {
      this.patch({ loading: true, error: null });
      
      const response = await fetch(\`/api/users/\${userId}\`);
      
      if (!response.ok) {
        throw new Error(\`Error \${response.status}: \${response.statusText}\`);
      }
      
      const user = await response.json();
      this.patch({ user, loading: false });
    } catch (error) {
      this.patch({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };
}

// In your Component
function UserProfile({ userId }) {
  const [state, userBloc] = useBloc(UserBloc, {
    onMount: (bloc) => bloc.fetchUser(userId)
  });

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return (
      <div className="error-container">
        <p className="error-message">{state.error}</p>
        <button onClick={() => userBloc.fetchUser(userId)}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h1>{state.user.name}</h1>
      <p>{state.user.email}</p>
      {/* More user details */}
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Form Handling">
        <p>
          The Blac pattern is excellent for managing form state. Here's an example of form validation and submission:
        </p>

        <DocCode title="Form Handling Example">
{`// Form bloc
class FormBloc extends Cubit<FormState> {
  constructor() {
    super({
      email: '',
      password: '',
      confirmPassword: '',
      errors: {},
      isSubmitting: false,
      isSubmitted: false,
      submitError: null
    });
  }

  updateField = (field: keyof FormState, value: string) => {
    this.patch({ [field]: value });
  };
  
  validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!this.state.email) {
      errors.email = 'Email is required';
    } else if (!/\\S+@\\S+\\.\\S+/.test(this.state.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!this.state.password) {
      errors.password = 'Password is required';
    } else if (this.state.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (this.state.password !== this.state.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    this.patch({ errors });
    return Object.keys(errors).length === 0;
  };
  
  submitForm = async () => {
    const isValid = this.validateForm();
    if (!isValid) return;
    
    this.patch({ isSubmitting: true, submitError: null });
    
    try {
      // Submit form logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      this.patch({ isSubmitted: true, isSubmitting: false });
    } catch (error) {
      this.patch({ 
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'Submit failed'
      });
    }
  };
}

// Form component
function SignupForm() {
  const [state, formBloc] = useBloc(FormBloc);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    formBloc.submitForm();
  };
  
  if (state.isSubmitted) {
    return (
      <div className="success-message">
        Thank you for signing up! Check your email for confirmation.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={state.email}
          onChange={(e) => formBloc.updateField('email', e.target.value)}
          className="form-input"
        />
        {state.errors.email && (
          <p className="error-text">{state.errors.email}</p>
        )}
      </div>
      
      {/* Password and confirm password fields */}
      
      {state.submitError && (
        <div className="error-container">{state.submitError}</div>
      )}
      
      <button
        type="submit"
        disabled={state.isSubmitting}
        className="submit-button"
      >
        {state.isSubmitting ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
}`}
        </DocCode>
      </DocSection>
    </div>
  );
}