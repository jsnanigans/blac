# Building Components with Blac

This guide explains how to create beautiful, maintainable React components using the Blac state management pattern in our "cute neon cyberpunk" styled demo application.

## Component Development Workflow

### 1. Identify the Component's Purpose

Before writing any code, clearly define the component's:
- Responsibility
- State requirements
- User interactions
- Visual appearance

### 2. Create the Bloc or Cubit

Start by designing the state container (Bloc or Cubit) that will manage the component's business logic:

```tsx
// src/blocs/counter.bloc.ts
import { Cubit } from 'blac-next';

// Define the state interface
interface CounterState {
  count: number;
  lastUpdated: Date;
}

// Create the Cubit/Bloc class
export class CounterBloc extends Cubit<CounterState> {
  constructor() {
    // Initialize with default state
    super({
      count: 0,
      lastUpdated: new Date()
    });
  }

  // Define methods using arrow functions
  increment = () => {
    this.emit({
      count: this.state.count + 1,
      lastUpdated: new Date()
    });
  };

  decrement = () => {
    this.emit({
      count: Math.max(0, this.state.count - 1),
      lastUpdated: new Date()
    });
  };

  reset = () => {
    this.emit({
      count: 0,
      lastUpdated: new Date()
    });
  };
}
```

### 3. Choose the Instance Management Pattern

Decide whether your component needs:

- **Shared state** (default): For global app state that multiple components need to access
- **Isolated state**: For component-specific state that shouldn't be shared
- **Persistent state**: For state that should live beyond component unmounting

```tsx
// For isolated state:
export class CounterBloc extends Cubit<CounterState> {
  static isolated = true;
  // ...
}

// For persistent state:
export class ThemeBloc extends Cubit<ThemeState> {
  static keepAlive = true;
  // ...
}
```

### 4. Create the React Component

Now create your React component that uses the Bloc:

```tsx
// src/components/Counter.tsx
import { useBloc } from '@blac/react';
import { CounterBloc } from '../blocs/counter.bloc';

export function Counter() {
  // Connect to the Bloc
  const [state, counterBloc] = useBloc(CounterBloc);
  
  return (
    <div className="flex flex-col items-center p-4 bg-card dark:bg-gray-800 rounded-lg shadow-md border border-border dark:border-gray-700">
      <p className="text-foreground dark:text-gray-100 text-xl mb-4">
        Count: {state.count}
      </p>
      
      <div className="flex space-x-2">
        <button
          onClick={counterBloc.decrement}
          className="px-4 py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md hover:bg-accent/90 dark:hover:bg-accent-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          -
        </button>
        
        <button
          onClick={counterBloc.increment}
          className="px-4 py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md hover:bg-accent/90 dark:hover:bg-accent-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          +
        </button>
      </div>
      
      <p className="text-foreground/60 dark:text-gray-400 text-sm mt-4">
        Last updated: {state.lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
}
```

### 5. Optimize Re-renders (If Needed)

For components that display only part of a complex state, use dependency selectors to optimize re-renders:

```tsx
function CompletedTasksCounter() {
  const [state, tasksBloc] = useBloc(TasksBloc, {
    dependencySelector: (state) => [
      state.tasks.filter(task => task.completed).length
    ]
  });
  
  const completedCount = state.tasks.filter(task => task.completed).length;
  
  return (
    <div className="text-accent-light dark:text-accent-dark font-medium">
      Completed: {completedCount}
    </div>
  );
}
```

## Component Styling Guidelines

### Use TailwindCSS for Styling

This demo app uses TailwindCSS with a customized theme that implements our "cute neon cyberpunk" aesthetic:

```tsx
// Example of properly styled button with our theme
<button className="px-4 py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md hover:bg-accent/90 dark:hover:bg-accent-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50">
  Click Me
</button>
```

### Color Palette

Stick to these color variables from our theme:

- **Primary Colors**:
  - Light mode: `bg-accent-light`, `text-accent-light`
  - Dark mode: `dark:bg-accent-dark`, `dark:text-accent-dark`
  
- **Background Colors**:
  - Container backgrounds: `bg-card dark:bg-gray-800`
  - Page background: `bg-background dark:bg-gray-900`
  
- **Text Colors**:
  - Primary text: `text-foreground dark:text-gray-100`
  - Secondary text: `text-foreground/60 dark:text-gray-400`

### Accessibility

Ensure all components have:

- Sufficient color contrast (check with a color contrast analyzer)
- Appropriate focus states (`focus:outline-none focus:ring-2 focus:ring-accent/50`)
- Proper semantics (use appropriate HTML elements)
- Screen reader support (aria attributes where needed)

### Responsiveness

Make all components responsive:

```tsx
// Example of responsive component
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## Component Patterns

### Forms with Blac

```tsx
// Form bloc
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
    } else if (!/\S+@\S+\.\S+/.test(this.state.email)) {
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
      <div className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md text-green-800 dark:text-green-300">
        Thank you for signing up! Check your email for confirmation.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-foreground dark:text-gray-100 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={state.email}
          onChange={(e) => formBloc.updateField('email', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {state.errors.email && (
          <p className="text-red-500 text-sm mt-1">{state.errors.email}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="block text-foreground dark:text-gray-100 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={state.password}
          onChange={(e) => formBloc.updateField('password', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {state.errors.password && (
          <p className="text-red-500 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="block text-foreground dark:text-gray-100 mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={state.confirmPassword}
          onChange={(e) => formBloc.updateField('confirmPassword', e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {state.errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{state.errors.confirmPassword}</p>
        )}
      </div>
      
      {state.submitError && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md text-red-800 dark:text-red-300">
          {state.submitError}
        </div>
      )}
      
      <button
        type="submit"
        disabled={state.isSubmitting}
        className="w-full px-4 py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md hover:bg-accent/90 dark:hover:bg-accent-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
      >
        {state.isSubmitting ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Lists and Collections

```tsx
// Todo item interface
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

// Todo list state
interface TodoListState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

// List bloc
class TodoListBloc extends Cubit<TodoListState> {
  constructor() {
    super({
      todos: [],
      filter: 'all'
    });
  }
  
  addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date()
    };
    
    this.patch({
      todos: [...this.state.todos, newTodo]
    });
  };
  
  toggleTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.map(todo => 
        todo.id === id 
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    });
  };
  
  removeTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.filter(todo => todo.id !== id)
    });
  };
  
  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.patch({ filter });
  };
  
  // Computed property
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
}

// List component
function TodoList() {
  const [state, todoListBloc] = useBloc(TodoListBloc);
  const [newTodoText, setNewTodoText] = useState('');
  
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      todoListBloc.addTodo(newTodoText);
      setNewTodoText('');
    }
  };
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleAddTodo} className="flex space-x-2">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="Add a new todo..."
        />
        <button
          type="submit"
          className="px-4 py-2 bg-accent-light dark:bg-accent-dark text-white rounded-md hover:bg-accent/90 dark:hover:bg-accent-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          Add
        </button>
      </form>
      
      <div className="flex space-x-2 mb-2">
        <button
          onClick={() => todoListBloc.setFilter('all')}
          className={`px-3 py-1 rounded-md ${
            state.filter === 'all' 
              ? 'bg-accent-light dark:bg-accent-dark text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-foreground dark:text-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => todoListBloc.setFilter('active')}
          className={`px-3 py-1 rounded-md ${
            state.filter === 'active' 
              ? 'bg-accent-light dark:bg-accent-dark text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-foreground dark:text-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => todoListBloc.setFilter('completed')}
          className={`px-3 py-1 rounded-md ${
            state.filter === 'completed' 
              ? 'bg-accent-light dark:bg-accent-dark text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-foreground dark:text-gray-200'
          }`}
        >
          Completed
        </button>
      </div>
      
      <ul className="space-y-2">
        {todoListBloc.filteredTodos.map(todo => (
          <li 
            key={todo.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md"
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => todoListBloc.toggleTodo(todo.id)}
                className="h-5 w-5 text-accent-light dark:text-accent-dark focus:ring-accent/50"
              />
              <span className={`text-foreground dark:text-gray-100 ${
                todo.completed ? 'line-through text-foreground/60 dark:text-gray-400' : ''
              }`}>
                {todo.text}
              </span>
            </div>
            <button
              onClick={() => todoListBloc.removeTodo(todo.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      
      {state.todos.length === 0 && (
        <p className="text-center text-foreground/60 dark:text-gray-400 py-4">
          No todos yet. Add one above!
        </p>
      )}
    </div>
  );
}
```

### Async Data Loading

```tsx
// Data loading bloc
interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

class UsersBloc extends Cubit<UsersState> {
  constructor() {
    super({
      users: [],
      isLoading: false,
      error: null
    });
  }
  
  fetchUsers = async () => {
    this.patch({ isLoading: true, error: null });
    
    try {
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch('https://jsonplaceholder.typicode.com/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      this.patch({ users, isLoading: false });
    } catch (error) {
      this.patch({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };
}

// Component with loading states
function UsersList() {
  const [state, usersBloc] = useBloc(UsersBloc);
  
  useEffect(() => {
    usersBloc.fetchUsers();
  }, []);
  
  if (state.isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-light dark:border-accent-dark"></div>
      </div>
    );
  }
  
  if (state.error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md text-red-800 dark:text-red-300">
        {state.error}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {state.users.map(user => (
        <div key={user.id} className="p-4 bg-card dark:bg-gray-800 rounded-lg shadow-md border border-border dark:border-gray-700">
          <h3 className="text-foreground dark:text-gray-100 font-medium">
            {user.name}
          </h3>
          <p className="text-foreground/60 dark:text-gray-400">
            {user.email}
          </p>
        </div>
      ))}
    </div>
  );
}
```

## Advanced Component Patterns

### 1. Combining Multiple Blocs

```tsx
function DashboardPage() {
  // Use multiple blocs in a single component
  const [userState, userBloc] = useBloc(UserBloc);
  const [notificationState, notificationBloc] = useBloc(NotificationBloc);
  const [settingsState, settingsBloc] = useBloc(SettingsBloc);
  
  // Get user's unread notifications
  const unreadCount = useMemo(() => {
    return notificationState.notifications.filter(n => !n.read).length;
  }, [notificationState.notifications]);
  
  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">
            Welcome, {userState.user?.name || 'Guest'}
          </h1>
          <p className="text-foreground/60 dark:text-gray-400">
            {settingsState.showLastLogin && userState.lastLogin && (
              <>Last login: {new Date(userState.lastLogin).toLocaleString()}</>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={notificationBloc.markAllAsRead}
            className="relative p-2"
          >
            <span className="sr-only">Notifications</span>
            <BellIcon className="h-6 w-6 text-foreground dark:text-gray-200" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center rounded-full text-xs text-white bg-accent-light dark:bg-accent-dark">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={settingsBloc.toggleDarkMode}
            className="p-2 text-foreground dark:text-gray-200"
          >
            <span className="sr-only">Toggle theme</span>
            {settingsState.darkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </button>
          
          <button
            onClick={userBloc.logout}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Logout
          </button>
        </div>
      </header>
      
      {/* Dashboard content */}
    </div>
  );
}
```

### 2. Reusable Component with Isolated Bloc

```tsx
// Define props for the component
interface CounterCardProps {
  title: string;
  initialCount?: number;
  color?: 'blue' | 'green' | 'purple';
}

// Create an isolated bloc for this component
class CounterCardBloc extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor(props: { initialCount?: number }) {
    super({ count: props.initialCount || 0 });
  }
  
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
  
  decrement = () => {
    this.emit({ count: Math.max(0, this.state.count - 1) });
  };
}

// The reusable component
function CounterCard({ title, initialCount = 0, color = 'blue' }: CounterCardProps) {
  const [{ count }, bloc] = useBloc(CounterCardBloc, {
    props: { initialCount }
  });
  
  // Determine the color classes based on the color prop
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500/50',
    green: 'bg-green-500 hover:bg-green-600 focus:ring-green-500/50',
    purple: 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500/50',
  }[color];
  
  return (
    <div className="bg-card dark:bg-gray-800 rounded-lg shadow-md border border-border dark:border-gray-700 p-4">
      <h3 className="text-lg font-medium text-foreground dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      <div className="text-3xl font-bold text-center py-4 text-foreground dark:text-white">
        {count}
      </div>
      
      <div className="flex justify-between mt-4">
        <button
          onClick={bloc.decrement}
          className={`px-3 py-1 text-white rounded-md ${colorClasses} focus:outline-none focus:ring-2`}
        >
          Decrease
        </button>
        
        <button
          onClick={bloc.increment}
          className={`px-3 py-1 text-white rounded-md ${colorClasses} focus:outline-none focus:ring-2`}
        >
          Increase
        </button>
      </div>
    </div>
  );
}

// Usage in parent component
function StatisticsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CounterCard title="Visitors" initialCount={1024} color="blue" />
      <CounterCard title="Signups" initialCount={512} color="green" />
      <CounterCard title="Purchases" initialCount={128} color="purple" />
    </div>
  );
}
```

## Testing Components

### Testing Blocs

```tsx
// counter.bloc.test.ts
import { CounterBloc } from '../blocs/counter.bloc';

describe('CounterBloc', () => {
  let counterBloc: CounterBloc;
  
  beforeEach(() => {
    counterBloc = new CounterBloc();
  });
  
  it('should initialize with count 0', () => {
    expect(counterBloc.state.count).toBe(0);
  });
  
  it('should increment count', () => {
    counterBloc.increment();
    expect(counterBloc.state.count).toBe(1);
  });
  
  it('should decrement count but not below 0', () => {
    counterBloc.increment();
    expect(counterBloc.state.count).toBe(1);
    
    counterBloc.decrement();
    expect(counterBloc.state.count).toBe(0);
    
    counterBloc.decrement();
    expect(counterBloc.state.count).toBe(0); // Should not go below 0
  });
  
  it('should reset count to 0', () => {
    counterBloc.increment();
    counterBloc.increment();
    expect(counterBloc.state.count).toBe(2);
    
    counterBloc.reset();
    expect(counterBloc.state.count).toBe(0);
  });
});
```

### Testing React Components

```tsx
// Counter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from '../components/Counter';

describe('Counter Component', () => {
  it('renders the counter with initial value', () => {
    render(<Counter />);
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
  
  it('increments the counter when + button is clicked', async () => {
    render(<Counter />);
    
    fireEvent.click(screen.getByText('+'));
    
    expect(await screen.findByText('Count: 1')).toBeInTheDocument();
  });
  
  it('decrements the counter when - button is clicked', async () => {
    render(<Counter />);
    
    // First increment to 1
    fireEvent.click(screen.getByText('+'));
    expect(await screen.findByText('Count: 1')).toBeInTheDocument();
    
    // Then decrement back to 0
    fireEvent.click(screen.getByText('-'));
    expect(await screen.findByText('Count: 0')).toBeInTheDocument();
  });
  
  it('does not decrement below 0', async () => {
    render(<Counter />);
    
    // Try to decrement at 0
    fireEvent.click(screen.getByText('-'));
    
    // Should still be 0
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});
```

## Common Pitfalls and Solutions

### Pitfall: Methods Losing `this` Context

**Problem**: Regular methods lose `this` context when called from React event handlers.

**Solution**: Always use arrow functions for methods in Bloc/Cubit classes.

```tsx
// Correct
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// Incorrect
increment() {
  this.emit({ count: this.state.count + 1 });
}
```

### Pitfall: Re-renders with Complex State

**Problem**: Components re-render when unrelated parts of state change.

**Solution**: Use dependency selectors to specify exactly what state changes should trigger re-renders.

```tsx
const [state, bloc] = useBloc(ComplexBloc, {
  dependencySelector: (state) => [
    state.relevantPart,
    state.anotherRelevantPart
  ]
});
```

### Pitfall: Bloc State Initialization with Props

**Problem**: Props passed to Bloc constructor not being used for initial state.

**Solution**: Access props in the constructor and use them to initialize state.

```tsx
class ConfigurableBloc extends Cubit<State, Props> {
  constructor(props: Props) {
    super({
      value: props.initialValue || 'default',
      // other state properties
    });
  }
}
```

### Pitfall: Forgetting to Handle Loading/Error States

**Problem**: UI doesn't reflect loading or error states, leading to poor user experience.

**Solution**: Always include loading and error handling in your state and UI.

```tsx
// In your Bloc
this.patch({ isLoading: true, error: null });

try {
  // async operation
  this.patch({ 
    data: result,
    isLoading: false 
  });
} catch (error) {
  this.patch({
    isLoading: false,
    error: error instanceof Error ? error.message : 'An error occurred'
  });
}

// In your Component
if (state.isLoading) {
  return <LoadingSpinner />;
}

if (state.error) {
  return <ErrorMessage message={state.error} />;
}

return <YourComponent data={state.data} />;
```

## Performance Optimization

### 1. Memoize Computed Values

```tsx
function TaskList() {
  const [state, tasksBloc] = useBloc(TasksBloc);
  
  // Memoize expensive calculations to prevent unnecessary recalculations
  const completedTasks = useMemo(() => {
    return state.tasks.filter(task => task.completed);
  }, [state.tasks]);
  
  const pendingTasks = useMemo(() => {
    return state.tasks.filter(task => !task.completed);
  }, [state.tasks]);
  
  return (
    <div>
      <h2>Completed Tasks: {completedTasks.length}</h2>
      <h2>Pending Tasks: {pendingTasks.length}</h2>
      {/* Rest of the component */}
    </div>
  );
}
```

### 2. Use Fragments for Conditional Rendering

```tsx
function UserProfile() {
  const [state, userBloc] = useBloc(UserBloc);
  
  return (
    <div className="user-profile">
      <h1>{state.user?.name}</h1>
      
      {/* Use fragments for conditional rendering to avoid unnecesary divs */}
      {state.user?.isPremium && (
        <>
          <PremiumBadge />
          <PremiumFeatures />
        </>
      )}
      
      {/* Rest of the component */}
    </div>
  );
}
```

## Conclusion

By following these guidelines, you'll create beautiful, maintainable components that leverage the full power of the Blac state management pattern. Remember the core principles:

1. Separate business logic from UI components
2. Use arrow functions for Bloc/Cubit methods
3. Choose the appropriate instance management pattern
4. Optimize re-renders with dependency tracking
5. Follow the "cute neon cyberpunk" styling guidelines
6. Ensure accessibility and responsiveness
7. Test both your Blocs and UI components 