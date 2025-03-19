import React, { useState } from 'react';
// Import with type assertions
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Remove invalid module declarations

interface DocSectionProps {
  title: string;
  children: React.ReactNode;
  id?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function DocSection({ title, children, id, tag = 'h2' }: DocSectionProps) {
  const HeadingTag = tag;
  const sectionClasses = tag === 'h1' ? 'mb-10' : 'mb-8';
  const headingClasses = tag === 'h1' 
    ? 'text-4xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-700'
    : tag === 'h2'
      ? 'text-3xl font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700' 
      : tag === 'h3'
        ? 'text-2xl font-bold mb-3'
        : 'text-xl font-bold mb-2';
  
  return (
    <section className={sectionClasses} id={id}>
      <HeadingTag className={headingClasses}>{title}</HeadingTag>
      {children}
    </section>
  );
}

interface DocNoteProps {
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'error';
}

export function DocNote({ title, children, type = 'info' }: DocNoteProps) {
  const colors = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      title: 'text-blue-800 dark:text-blue-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      title: 'text-amber-800 dark:text-amber-300',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      title: 'text-green-800 dark:text-green-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      title: 'text-red-800 dark:text-red-300',
    },
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`${colors[type].bg} p-6 rounded-lg border ${colors[type].border} my-6`}>
      {title && (
        <div className="flex items-center mb-2">
          <span className={`${colors[type].title} mr-2`}>{icons[type]}</span>
          <h3 className={`${colors[type].title} font-bold text-lg mt-0`}>{title}</h3>
        </div>
      )}
      <div className="text-gray-800 dark:text-gray-200">
        {children}
      </div>
    </div>
  );
}

interface DocCodeProps {
  children: React.ReactNode;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export function DocCode({ children, language = 'typescript', title, showLineNumbers = true, highlightLines = [] }: DocCodeProps) {
  const [copied, setCopied] = useState(false);

  // Customize the atomDark theme for our neon cyberpunk style
  const customStyle = {
    ...atomDark,
    'pre[class*="language-"]': {
      ...atomDark['pre[class*="language-"]'],
      background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 20px rgba(2, 12, 27, 0.4), 0 0 10px rgba(255, 0, 222, 0.1) inset, 0 0 20px rgba(0, 255, 255, 0.1) inset',
      border: '1px solid rgba(128, 0, 255, 0.2)',
      margin: 0,
      overflow: 'auto',
    },
    'code[class*="language-"]': {
      ...atomDark['code[class*="language-"]'],
      textShadow: '0 0 2px #ff00ff50',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
    },
    'keyword': {
      ...atomDark['keyword'],
      color: '#ff36f9', // Bright pink for keywords
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(255, 54, 249, 0.6)',
    },
    'string': {
      ...atomDark['string'],
      color: '#0ff5e9', // Cyan for strings
      textShadow: '0 0 8px rgba(15, 245, 233, 0.5)',
    },
    'class-name': {
      ...atomDark['class-name'],
      color: '#f6fa70', // Yellow for class names
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(246, 250, 112, 0.5)',
    },
    'function': {
      ...atomDark['function'],
      color: '#36f9c9', // Turquoise for functions
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(54, 249, 201, 0.5)',
    },
    'comment': {
      ...atomDark['comment'],
      color: '#64748b', // Slate for comments
      fontStyle: 'italic',
    },
    'operator': {
      ...atomDark['operator'],
      color: '#c792ea', // Purple for operators
      textShadow: '0 0 8px rgba(199, 146, 234, 0.5)',
    },
    'property': {
      ...atomDark['property'],
      color: '#80ffea', // Light cyan for properties
      textShadow: '0 0 8px rgba(128, 255, 234, 0.5)',
    },
    'punctuation': {
      ...atomDark['punctuation'],
      color: '#a6accd', // Light slate for punctuation
    },
    'number': {
      ...atomDark['number'],
      color: '#f99157', // Orange for numbers
      textShadow: '0 0 8px rgba(249, 145, 87, 0.5)',
    },
    'boolean': {
      ...atomDark['boolean'],
      color: '#ff7b72', // Red-orange for booleans
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(255, 123, 114, 0.5)',
    },
    'builtin': {
      ...atomDark['builtin'],
      color: '#79e3ff', // Light blue for builtins
      textShadow: '0 0 8px rgba(121, 227, 255, 0.5)',
    },
    'tag': {
      ...atomDark['tag'],
      color: '#ff7edb', // Pink for tags
      textShadow: '0 0 8px rgba(255, 126, 219, 0.5)',
    },
    'attr-name': {
      ...atomDark['attr-name'],
      color: '#c5a5fe', // Lavender for attribute names
      textShadow: '0 0 8px rgba(197, 165, 254, 0.5)',
    },
    'attr-value': {
      ...atomDark['attr-value'],
      color: '#0ff5e9', // Cyan for attribute values
      textShadow: '0 0 8px rgba(15, 245, 233, 0.5)',
    },
  };

  // Function to copy code to clipboard
  const copyToClipboard = () => {
    const code = typeof children === 'string' ? children : '';
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getLineProps = (lineNumber: number) => {
    if (highlightLines.includes(lineNumber)) {
      return { 
        style: { 
          display: 'block',
          backgroundColor: 'rgba(255, 54, 249, 0.1)',
          borderLeft: '3px solid #ff36f9',
          paddingLeft: '0.75rem', 
        }
      };
    }
    return {};
  };

  return (
    <div className="relative my-8 group">
      {/* Title bar */}
      <div className="absolute z-10 top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-[#ff36f950] rounded-t-lg overflow-hidden">
        {/* Tech-inspired decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff36f9] to-[#0ff5e9]"></div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-[#ff36f9] to-transparent"></div>
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0ff5e9] to-transparent"></div>
        
        {/* Title or Language badge */}
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#ff3547] mr-2"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffdd00] mr-2"></div>
          <div className="w-3 h-3 rounded-full bg-[#00ff44] mr-3"></div>
          
          {title ? (
            <span className="font-mono text-sm text-gray-300">{title}</span>
          ) : (
            <div className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#ff36f9] text-white">
              {language}
            </div>
          )}
        </div>
        
        {/* Copy button */}
        <button 
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold py-1 px-2 rounded-md bg-[#0ff5e920] hover:bg-[#0ff5e940] text-[#0ff5e9] border border-[#0ff5e950] focus:outline-none focus:ring-2 focus:ring-[#0ff5e9]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Code block with syntax highlighting */}
      <div className={`overflow-hidden rounded-lg ${title ? 'mt-0' : 'mt-0'}`}>
        <div className="pt-10 overflow-auto cyberpunk-scrollbar">
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            showLineNumbers={showLineNumbers}
            lineProps={getLineProps}
            wrapLines={true}
            customStyle={{
              borderRadius: '0 0 0.75rem 0.75rem',
              margin: 0,
              padding: '1.5rem',
            }}
          >
            {typeof children === 'string' ? children : ''}
          </SyntaxHighlighter>
        </div>
      </div>
      
      {/* Decorative corner glows */}
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0ff5e9] opacity-60 blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[#ff36f9] opacity-60 blur-xl pointer-events-none"></div>
    </div>
  );
}

// Use inline styles for the CyberpunkStyles component
const CyberpunkStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .cyberpunk-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-track {
      background: rgba(26, 26, 46, 0.6);
      border-radius: 4px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #ff36f9, #0ff5e9);
      border-radius: 4px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #ff36f9, #0ff5e9);
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-corner {
      background: transparent;
    }
    
    /* For Firefox */
    .cyberpunk-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #ff36f9 rgba(26, 26, 46, 0.6);
    }
  `}} />
);

interface DocFeatureGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function DocFeatureGrid({ children, columns = 2 }: DocFeatureGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1',
    3: 'grid-cols-1',
    4: 'grid-cols-1',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6 my-6`}>
      {children}
    </div>
  );
}

interface DocFeatureProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}

export function DocFeature({ title, children, icon, color = 'blue' }: DocFeatureProps) {
  const colors = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      text: 'text-blue-500 dark:text-blue-300',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/40',
      text: 'text-green-500 dark:text-green-300',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/40',
      text: 'text-purple-500 dark:text-purple-300',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      text: 'text-amber-500 dark:text-amber-300',
    },
  };

  return (
    <div className="flex items-start">
      {icon && (
        <div className={`${colors[color].bg} p-3 rounded-full mr-4`}>
          <div className={`w-6 h-6 ${colors[color].text}`}>{icon}</div>
        </div>
      )}
      <div>
        <h3 className="text-xl font-bold mt-0">{title}</h3>
        <div className="text-gray-600 dark:text-gray-400">{children}</div>
      </div>
    </div>
  );
}

export function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
        {children}
      </table>
    </div>
  );
}

// Export the styles component
export { CyberpunkStyles };

export function CubitBasicsDoc() {
  return (
    <DocSection title="Cubit Basics" tag="h2">
      <p className="text-lg mb-4">
        Cubits are the fundamental building blocks of state management in Blac. A Cubit is a class 
        that extends the base Cubit class and emits new states.
      </p>
      
      <DocCode language="typescript" title="Basic Counter Cubit">
{`import { Cubit } from 'blac-next';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state is 0
  }

  increment = () => {
    this.emit(this.state + 1);
  }

  decrement = () => {
    this.emit(this.state - 1);
  }

  reset = () => {
    this.emit(0);
  }
}`}
      </DocCode>
      
      <p className="mt-4 mb-2">
        To use a Cubit in a React component, use the <code>useBloc</code> hook:
      </p>
      
      <DocCode language="typescript" title="Using a Cubit in a Component">
{`import { useBloc } from '@blac/react';

function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={counterCubit.decrement}>-</button>
      <button onClick={counterCubit.increment}>+</button>
    </div>
  );
}`}
      </DocCode>
      
      <DocNote title="Tip" type="info">
        The <code>useBloc</code> hook returns a tuple containing the current state and an instance of the Cubit.
      </DocNote>
    </DocSection>
  );
}

export function ComplexStateDoc() {
  return (
    <DocSection title="Complex State Management" tag="h2">
      <p className="text-lg mb-4">
        Blac handles complex state with ease. Instead of using primitive values, you can use interfaces or types.
      </p>
      
      <DocCode language="typescript" title="Complex State with Interface">
{`interface CounterState {
  count: number;
  lastUpdated: Date;
  history: number[];
}

class CounterBloc extends Cubit<CounterState> {
  constructor() {
    super({
      count: 0,
      lastUpdated: new Date(),
      history: [],
    });
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      count: newCount,
      lastUpdated: new Date(),
      history: [...this.state.history, newCount],
    });
  }

  // Other methods...
}`}
      </DocCode>
      
      <DocNote title="Partial Updates" type="success">
        <p>Blac provides a <code>patch</code> method for partial state updates:</p>
        <DocCode>
{`// Instead of emitting the entire state
this.patch({ count: this.state.count + 1 });

// Equivalent to:
this.emit({
  ...this.state,
  count: this.state.count + 1
});`}
        </DocCode>
      </DocNote>
    </DocSection>
  );
}

export function InstanceManagementDoc() {
  return (
    <DocSection title="Instance Management" tag="h2">
      <p className="text-lg mb-4">
        Blac provides different instance management strategies through static properties on your Cubit classes.
      </p>
      
      <DocFeatureGrid>
        <DocFeature 
          title="Default (Shared)" 
          color="blue"
        >
          <p>By default, Blac creates a single shared instance of your Cubit that's used across all components.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// All components using this Cubit will share state
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  // Methods...
}`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="Isolated Instances" 
          color="green"
        >
          <p>Each component gets its own separate instance with independent state.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Each consumer gets its own instance
  
  constructor() {
    super(0);
  }
  // Methods...
}`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="Keep Alive" 
          color="purple"
        >
          <p>State persists even when no components are currently using the Cubit.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`class KeepAliveCounterCubit extends Cubit<number> {
  static keepAlive = true; // State persists even when unmounted
  
  constructor() {
    super(0);
  }
  // Methods...
}`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="Custom ID" 
          color="amber"
        >
          <p>Create multiple shared instances by providing a custom ID parameter.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// In your component:
const [count, counterCubit] = useBloc(CounterCubit, { id: 'counter-1' });

// Another component with a different instance:
const [count, counterCubit] = useBloc(CounterCubit, { id: 'counter-2' });`}
          </DocCode>
        </DocFeature>
      </DocFeatureGrid>
    </DocSection>
  );
}

export function DependencyTrackingDoc() {
  return (
    <DocSection title="Dependency Tracking" tag="h2">
      <p className="text-lg mb-4">
        Blac includes a powerful dependency tracking system that allows components to 
        subscribe only to the specific parts of state they use, minimizing re-renders.
      </p>
      
      <DocCode language="typescript" title="Automatic Dependency Tracking">
{`// A complex state with many properties
interface UserPreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: {
    email: boolean;
    push: boolean;
  };
  profile: {
    username: string;
    avatar: number;
  };
  // ... many more properties
}

// Component only re-renders when theme changes
function ThemeComponent() {
  // Only subscribes to the 'theme' property
  const [{ theme }, cubit] = useBloc(UserPreferencesCubit);
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => cubit.setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
    </div>
  );
}

// This component only re-renders when username changes
function UserProfileComponent() {
  // Only subscribes to profile.username
  const [{ profile: { username } }, cubit] = useBloc(UserPreferencesCubit);
  
  return <p>Hello, {username}!</p>;
}`}
      </DocCode>
      
      <DocNote title="Performance Benefit" type="success">
        <p>
          This automatic dependency tracking means components only re-render when the specific 
          pieces of state they use change, even within complex nested state objects.
        </p>
      </DocNote>
    </DocSection>
  );
}

export function ComputedPropertiesDoc() {
  return (
    <DocSection title="Computed Properties" tag="h2">
      <p className="text-lg mb-4">
        Cubits can have computed properties using getters, which are recalculated only when 
        their dependencies change.
      </p>
      
      <DocCode language="typescript" title="Computed Properties Example">
{`class TaskBoardCubit extends Cubit<Task[]> {
  constructor() {
    super([]); // Initial state is an empty array of tasks
  }

  // Add, remove, update task methods...

  // Computed properties (getters)
  get todoTasks() {
    return this.state.filter(task => task.status === 'todo');
  }

  get inProgressTasks() {
    return this.state.filter(task => task.status === 'in-progress');
  }

  get doneTasks() {
    return this.state.filter(task => task.status === 'done');
  }

  // Private cached values for memoization
  private _cachedTaskStats: { total: number, completed: number, completionRate: number } | null = null;
  private _lastStateForStats: Task[] | null = null;

  get taskStats() {
    // Return cached result if state hasn't changed
    if (this._lastStateForStats === this.state && this._cachedTaskStats !== null) {
      return this._cachedTaskStats;
    }

    const total = this.state.length;
    const completed = this.doneTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Cache the result and state reference
    this._cachedTaskStats = { total, completed, completionRate };
    this._lastStateForStats = this.state;
    
    return this._cachedTaskStats;
  }
}`}
      </DocCode>
      
      <DocNote title="Usage in Components" type="info">
        <p>
          Access computed properties directly from the cubit instance:
        </p>
        <DocCode language="typescript" showLineNumbers={false}>
{`function TaskStatistics() {
  const [, taskBoardCubit] = useBloc(TaskBoardCubit);
  
  return (
    <div>
      <p>Total Tasks: {taskBoardCubit.taskStats.total}</p>
      <p>Completed: {taskBoardCubit.taskStats.completed}</p>
      <p>Completion Rate: {taskBoardCubit.taskStats.completionRate.toFixed(1)}%</p>
    </div>
  );
}`}
        </DocCode>
      </DocNote>
    </DocSection>
  );
}

export function AsyncOperationsDoc() {
  return (
    <DocSection title="Async Operations" tag="h2">
      <p className="text-lg mb-4">
        Blac makes it easy to handle asynchronous operations and API calls.
      </p>
      
      <DocCode language="typescript" title="Async Operations Example">
{`interface PetState {
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
}

class PetfinderCubit extends Cubit<PetState> {
  constructor() {
    super({
      pets: [],
      isLoading: false,
      error: null
    });
  }

  searchPets = async (zipCode: string, animalType: string) => {
    try {
      // Set loading state
      this.patch({ isLoading: true, error: null });
      
      // Perform API call
      const response = await fetch(\`/api/pets?zipCode=\${zipCode}&type=\${animalType}\`);
      if (!response.ok) throw new Error('Failed to fetch pets');
      
      const pets = await response.json();
      
      // Update state with results
      this.patch({ 
        pets,
        isLoading: false 
      });
    } catch (error) {
      // Handle errors
      this.patch({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}`}
      </DocCode>
      
      <DocNote title="Loading and Error States" type="info">
        <p>
          A common pattern is to include <code>isLoading</code> and <code>error</code> properties in your state 
          to handle the lifecycle of async operations.
        </p>
      </DocNote>
    </DocSection>
  );
}

export function BlocArchitectureDoc() {
  return (
    <DocSection title="Blac Architecture Patterns" tag="h2">
      <p className="text-lg mb-4">
        The Blac library encourages a clean architecture approach to state management.
      </p>
      
      <DocFeatureGrid>
        <DocFeature 
          title="Separation of Concerns" 
          color="blue"
        >
          <p>Keep business logic in Cubits, UI logic in components.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// Business logic in Cubit
class AuthCubit extends Cubit<AuthState> {
  login = (username: string, password: string) => {
    // Authentication logic here
  }
}

// UI in component
function LoginForm() {
  const [state, authCubit] = useBloc(AuthCubit);
  // Form handling and rendering
}`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="State Composition" 
          color="green"
        >
          <p>Break down complex state into smaller, focused Cubits.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// Instead of one massive state object:
class UserCubit extends Cubit<UserState> { /* ... */ }
class CartCubit extends Cubit<CartState> { /* ... */ }
class ProductCubit extends Cubit<ProductState> { /* ... */ }`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="Testability" 
          color="purple"
        >
          <p>Cubits are easy to test in isolation.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`test('counter increments', () => {
  const counter = new CounterCubit();
  counter.increment();
  expect(counter.state).toBe(1);
});`}
          </DocCode>
        </DocFeature>
        
        <DocFeature 
          title="Direct Access" 
          color="amber"
        >
          <p>Access state from any component without prop drilling.</p>
          <DocCode language="typescript" showLineNumbers={false}>
{`// Deep in component tree:
function DeepComponent() {
  const [user] = useBloc(UserCubit);
  return <p>Hello, {user.name}</p>;
}`}
          </DocCode>
        </DocFeature>
      </DocFeatureGrid>
    </DocSection>
  );
}
