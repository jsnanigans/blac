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

        <DocCode language="typescript" title="Basic useBloc Example">
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

      <DocSection title="Instance Management">
        <p>
          Blac provides flexible options for managing Cubit instances across your components. You can control whether 
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
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
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
              Each component gets its own state instance, isolated from others.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Key property!
  
  constructor() {
    super(0);
  }
  // ...methods
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Keep Alive Instances"
            color="purple"
          >
            <p>
              State persists even when all components using it are unmounted.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true; // Key property!
  
  constructor() {
    super(0);
  }
  // ...methods
}`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="Custom ID Instances"
            color="amber"
          >
            <p>
              Create multiple distinct shared instances using custom IDs.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`function CustomCounter({ id }) {
  const [count, counterCubit] = useBloc(CounterCubit, { id });
  // Each unique ID gets its own instance
}`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>

        <DocCode language="typescript" title="Instance Management Example">
{`import { Cubit } from 'blac-next';
import { useBloc } from '@blac/react';

// Shared state example
function SharedCounter() {
  const [count, counterCubit] = useBloc(CounterCubit);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterCubit.increment()}>+</button>
    </div>
  );
}

// Another component using the same shared state
function AnotherSharedCounter() {
  const [count, counterCubit] = useBloc(CounterCubit);
  // Will display the same count as SharedCounter
  return <p>Same Count: {count}</p>;
}

// Isolated state example
function IsolatedCounter() {
  const [count, counterCubit] = useBloc(IsolatedCounterCubit);
  // Each IsolatedCounter component has its own independent state
  return (
    <div>
      <p>Isolated Count: {count}</p>
      <button onClick={() => counterCubit.increment()}>+</button>
    </div>
  );
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            Static properties like <code>isolated</code> and <code>keepAlive</code> give you control over state persistence
            without changing how you use the <code>useBloc</code> hook in your components.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Dependency Tracking">
        <p>
          One of the most powerful features of Blac is its automatic dependency tracking. When you access specific 
          properties of a state object in your component, Blac keeps track of exactly which properties you used.
        </p>

        <DocCode language="typescript" title="Dependency Tracking Example">
{`import React from 'react';
import { useBloc } from '@blac/react';
import { UserPreferencesCubit } from './preferences';

// Complex state with many properties
interface UserPreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  profile: {
    username: string;
    avatar: number;
  };
}

// ThemeComponent only cares about the theme
function ThemeComponent() {
  // Only subscribes to the 'theme' property
  const [{ theme }, cubit] = useBloc(UserPreferencesCubit);
  
  // This component only re-renders when theme changes,
  // not when any other state properties change!
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => cubit.setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </div>
  );
}

// NotificationComponent only cares about notification settings
function NotificationComponent() {
  // Only subscribes to the notifications object
  const [{ notifications }, cubit] = useBloc(UserPreferencesCubit);
  
  // Only re-renders when any notifications settings change
  return (
    <div>
      <h3>Notification Settings</h3>
      <label>
        <input 
          type="checkbox" 
          checked={notifications.email}
          onChange={() => cubit.toggleEmailNotifications()}
        />
        Email Notifications
      </label>
      <label>
        <input 
          type="checkbox" 
          checked={notifications.push}
          onChange={() => cubit.togglePushNotifications()}
        />
        Push Notifications
      </label>
    </div>
  );
}

// ProfileNameComponent only cares about the username
function ProfileNameComponent() {
  // Only subscribes to profile.username
  const [{ profile: { username } }, cubit] = useBloc(UserPreferencesCubit);
  
  // Only re-renders when username changes, not when avatar changes
  return <h2>Hello, {username}!</h2>;
}`}
        </DocCode>

        <DocNote type="success">
          <p>
            <strong>Performance Impact:</strong> Dependency tracking significantly reduces unnecessary re-renders in your 
            React application. Components only update when the specific data they use changes, not when other parts of 
            the state are modified.
          </p>
        </DocNote>

        <p className="mt-4">
          The dependency tracking works at any level of nesting in your state objects. You can destructure deeply nested
          properties and Blac will still track them correctly.
        </p>

        <DocCode language="typescript" title="Deep Dependency Tracking">
{`// Example of accessing nested properties
function UserProfileComponent() {
  // Only tracks the specific nested properties accessed
  const [{ user }, userCubit] = useBloc(UserProfileCubit);
  
  // This component will only re-render when user.profile.name changes
  // It won't re-render when other properties like user.settings change
  return (
    <div>
      <h2>Welcome, {user.profile.name}</h2>
      <button onClick={() => userCubit.updateProfileName('New Name')}>
        Update Name
      </button>
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Computed Properties">
        <p>
          Blac supports computed properties through class getters. These computed values are accessed directly from the 
          cubit instance returned by <code>useBloc</code>.
        </p>

        <DocCode language="typescript" title="Computed Properties Example">
{`// Cubit with computed properties
class TaskBoardCubit extends Cubit<Task[]> {
  constructor() {
    super([]);
  }
  
  // Methods to add/remove tasks...
  
  // Computed properties
  get todoTasks() {
    return this.state.filter(task => task.status === 'todo');
  }
  
  get inProgressTasks() {
    return this.state.filter(task => task.status === 'in-progress');
  }
  
  get doneTasks() {
    return this.state.filter(task => task.status === 'done');
  }
  
  get taskStats() {
    const total = this.state.length;
    const completed = this.doneTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return { total, completed, completionRate };
  }
}

// Component using computed properties
function TaskStatistics() {
  // Access computed properties from the cubit instance
  const [, taskBoardCubit] = useBloc(TaskBoardCubit);
  
  return (
    <div>
      <h3>Task Statistics</h3>
      <ul>
        <li>To Do: {taskBoardCubit.todoTasks.length}</li>
        <li>In Progress: {taskBoardCubit.inProgressTasks.length}</li>
        <li>Done: {taskBoardCubit.doneTasks.length}</li>
        <li>Completion Rate: {taskBoardCubit.taskStats.completionRate.toFixed(1)}%</li>
      </ul>
    </div>
  );
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            Computed properties are recalculated on-demand when accessed, making them efficient for derived data.
            Only the components that actually use a computed property will re-render when the underlying data changes.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Advanced useBloc Options">
        <p>
          The <code>useBloc</code> hook accepts a second parameter with configuration options:
        </p>

        <DocCode language="typescript" title="useBloc with Options">
{`const [state, bloc] = useBloc(BlocClass, {
  // Custom ID for creating multiple shared instances
  id: 'custom-instance-id',
  
  // Custom initial state
  initialState: { count: 10 },
  
  // Props to pass to the bloc constructor
  props: { api: apiClient },
  
  // Listen only to specific state properties
  // (alternative to automatic dependency tracking)
  select: state => state.user,
});`}
        </DocCode>

        <DocFeatureGrid>
          <DocFeature 
            title="id"
            color="blue"
          >
            <p>
              Specifies a unique ID for the bloc instance, allowing multiple shared instances 
              of the same bloc class.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Component A
const [state, bloc] = useBloc(CounterCubit, { id: 'counter-a' });

// Component B (different instance)
const [state, bloc] = useBloc(CounterCubit, { id: 'counter-b' });`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="initialState"
            color="green"
          >
            <p>
              Provides a custom initial state when creating a new bloc instance.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`const [state, bloc] = useBloc(CounterCubit, {
  initialState: 10 // Start from 10 instead of 0
});`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="props"
            color="purple"
          >
            <p>
              Passes additional properties to the bloc constructor.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Cubit that needs an API client
class ApiCubit extends Cubit<ApiState, ApiProps> {
  constructor(props: ApiProps) {
    super(initialState);
    this.apiClient = props.apiClient;
  }
}

// Provide required props
const [state, bloc] = useBloc(ApiCubit, {
  props: { apiClient: myApiClient }
});`}
            </DocCode>
          </DocFeature>
          
          <DocFeature 
            title="select"
            color="amber"
          >
            <p>
              Manually specify which parts of state to subscribe to.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Only re-render when user changes
const [state, bloc] = useBloc(AppCubit, {
  select: state => state.user
});`}
            </DocCode>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Best Practices">
        <DocFeatureGrid>
          <DocFeature 
            title="Granular Components"
            color="blue"
          >
            <p>
              Create smaller, focused components that each use only the parts of state they need.
              This maximizes the benefit of automatic dependency tracking.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="State Design"
            color="green"
          >
            <p>
              Organize your state in a way that makes it easy to access specific parts.
              Use nested objects to group related data.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Multiple Cubits"
            color="purple"
          >
            <p>
              Don't try to put everything in one giant state object. Use multiple cubits 
              for different concerns in your application.
            </p>
          </DocFeature>
          
          <DocFeature 
            title="Consistent Naming"
            color="amber"
          >
            <p>
              Use consistent naming conventions for your cubits and their methods
              to make your code more predictable and easier to maintain.
            </p>
          </DocFeature>
        </DocFeatureGrid>

        <DocNote type="warning">
          <p>
            Avoid accessing state properties in callbacks or effects unless you explicitly capture them.
            The dependency tracking only works during render.
          </p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// Wrong way (dependency tracking doesn't work here)
useEffect(() => {
  // This won't re-run when isLoading changes
  if (state.isLoading) {
    // ...
  }
}, [state]); // ❌ Too broad

// Right way
const { isLoading } = state; // Capture during render
useEffect(() => {
  if (isLoading) {
    // ...
  }
}, [isLoading]); // ✅ Specific dependency`}
          </DocCode>
        </DocNote>
      </DocSection>
    </div>
  );
}