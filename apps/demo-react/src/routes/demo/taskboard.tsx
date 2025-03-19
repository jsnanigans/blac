import { createFileRoute } from '@tanstack/react-router';
import { useBloc } from '@blac/react';
import { TaskBoard } from '../../components/TaskBoard';
import { TaskBoardBloc } from '../../components/TaskBoard/TaskBoardBloc';
import { Cubit } from 'blac-next';
import { useState } from 'react';
import CodeHighlighter from '../../components/CodeHighlighter';

export const Route = createFileRoute('/demo/taskboard')({
  component: RouteComponent,
});

// A simple counter example to demonstrate basic Blac concepts
interface CounterState {
  count: number;
}

// This class is defined right in the route file to demonstrate the simplicity of Blac
class CounterBloc extends Cubit<CounterState> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super({ count: 0 }); // Initial state
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// A simple example component to demonstrate accessing state without props drilling
function NestedCounter() {
  // Get access to the TaskBoardBloc directly, without props passing!
  const [, taskBoardBloc] = useBloc(TaskBoardBloc);
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2 text-blue-800 dark:text-blue-200">Nested Component</h3>
      <p className="text-sm mb-2">This component accesses the TaskBoardBloc directly without props:</p>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <p className="font-medium">Task Statistics</p>
        <ul className="text-sm mt-2 space-y-1">
          <li>Total Tasks: <span className="font-medium">{taskBoardBloc.taskStats.total}</span></li>
          <li>Completed: <span className="font-medium">{taskBoardBloc.taskStats.completed}</span></li>
          <li>Completion Rate: <span className="font-medium">{taskBoardBloc.taskStats.completionRate.toFixed(1)}%</span></li>
        </ul>
      </div>
    </div>
  );
}

// Isolated counters to demonstrate local state
function IsolatedCounters() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <IsolatedCounter name="Counter A" />
      <IsolatedCounter name="Counter B" />
    </div>
  );
}

function IsolatedCounter({ name }: { name: string }) {
  // Each IsolatedCounter gets its own CounterBloc instance
  const [state, counterBloc] = useBloc(CounterBloc);
  
  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2 text-purple-800 dark:text-purple-200">{name}</h3>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex items-center justify-between">
        <span className="text-2xl font-medium">{state.count}</span>
        <div className="space-x-2">
          <button 
            onClick={counterBloc.decrement}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            -
          </button>
          <button 
            onClick={counterBloc.increment}
            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-500"
          >
            +
          </button>
          <button 
            onClick={counterBloc.reset}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 ml-2"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="text-sm mt-2 text-purple-700 dark:text-purple-300">
        This counter has isolated state. Changes here don't affect other counters.
      </p>
    </div>
  );
}

// Computed properties demo
function ComputedPropertiesDemo() {
  const [, taskBoardBloc] = useBloc(TaskBoardBloc);
  const todoCount = taskBoardBloc.todoTasks.length;
  const inProgressCount = taskBoardBloc.inProgressTasks.length;
  const doneCount = taskBoardBloc.doneTasks.length;
  
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2 text-green-800 dark:text-green-200">Computed Properties</h3>
      
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">To Do</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{todoCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inProgressCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">Done</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{doneCount}</div>
        </div>
      </div>
      
      <p className="text-sm bg-green-100 dark:bg-green-900/40 p-3 rounded-md">
        These values are automatically calculated using Blac's computed properties. 
        They only recalculate when the underlying task data changes.
      </p>
    </div>
  );
}

// Code snippet component for highlighting code examples
function CodeSnippet({ code, title }: { code: string, title?: string }) {
  return (
    <CodeHighlighter
      code={code}
      language="typescript"
      showLineNumbers={true}
      className="mt-0 w-full"
      title={title}
    />
  );
}

// Main page component with all the explanations and interactive examples
function RouteComponent() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'no-context', title: 'No Context Providers' },
    { id: 'no-props-drilling', title: 'No Props Drilling' },
    { id: 'computed', title: 'Computed Properties' },
    { id: 'isolated', title: 'Instance Management' },
    { id: 'demo', title: 'Complete TaskBoard' },
  ];

  return (
    <div className="space-y-8">
      <section className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gradient-multi animate-text-shimmer">
          The Blac Library Experience
        </h1>
        <p className="text-xl dark:text-cyan-100/90 text-slate-700 max-w-3xl mx-auto">
          An interactive tour of Blac's powerful features through practical examples and explanations.
        </p>
      </section>
      
      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-white dark:bg-gray-900 py-4 z-10 border-b border-gray-200 dark:border-gray-800">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Overview section */}
      {activeSection === 'overview' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">What Makes Blac Different</h2>
          
          <p className="text-lg">
            Blac is a lightweight (just 2KB gzipped!) yet powerful state management library for React applications that focuses on simplicity and predictability.
            Unlike traditional state management libraries, Blac provides unique features that make it easy to manage complex application state without the typical
            boilerplate and complexity.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-semibold mb-3 text-blue-800 dark:text-blue-300">Key Features</h3>
              <ul className="space-y-2 list-disc pl-5">
                <li>No context providers or complex setup</li>
                <li>Direct state access from any component</li>
                <li>No props drilling through component tree</li>
                <li>Intelligent computed properties with dependency tracking</li>
                <li>Fine-grained reactivity for optimal performance</li>
                <li>Isolated and shared state options</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-semibold mb-3 text-purple-800 dark:text-purple-300">Why Use Blac?</h3>
              <ul className="space-y-2 list-disc pl-5">
                <li>Cleaner component code with less boilerplate</li>
                <li>Better performance through intelligent re-rendering</li>
                <li>Simpler testing with clear data flow</li>
                <li>More maintainable codebase with clear separation</li>
                <li>Easier refactoring without breaking prop chains</li>
                <li>Balance between simplicity and power</li>
              </ul>
            </div>
          </div>
          
          <p className="mt-6">
            The examples below demonstrate these features in action using a TaskBoard application.
            Try interacting with the examples to see how Blac makes state management simpler and more
            intuitive.
          </p>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start">
            <div className="text-yellow-600 dark:text-yellow-400 mr-3 text-xl mt-1">ℹ️</div>
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Getting Started</h3>
              <p className="text-sm mt-1">
                Navigate through the tabs above to explore different Blac features with interactive examples.
                Each section showcases a specific aspect of Blac and how it simplifies state management.
              </p>
            </div>
          </div>
        </section>
      )}
      
      {/* No Context Providers section */}
      {activeSection === 'no-context' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">No Context Providers Needed</h2>
          
          <p>
            Unlike Redux or Context API, Blac doesn't require provider wrapping or complex setup.
            Your state containers are accessible from anywhere in your component tree without passing
            providers down the component hierarchy.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">With Traditional State Management</h3>
              <CodeSnippet 
                code={`// Provider wrapping in index.js or App.js
import { BlocProvider } from '@blac/react';
import { TaskBoardBloc } from './TaskBoardBloc';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BlocProvider blocs={[TaskBoardBloc]}>
    <App />
  </BlocProvider>
);`}
                title="Provider Pattern (Legacy)"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">With Blac</h3>
              <CodeSnippet 
                code={`// Define your state container
class TaskBoardBloc extends Cubit<TaskBoardState> {
  constructor() {
    super({
      tasks: [],
      filter: {
        status: 'all',
        searchTerm: '',
      },
      selectedTask: null,
    });
  }

  // Methods to add, update, delete tasks
  addTask = (task: Task) => {
    this.emit([...this.state.tasks, task]);
  }

  // ... other methods
}`} 
                title="Task Board Bloc"
              />
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Live Example</h3>
            <p className="mb-4">
              The NestedCounter component below directly accesses the TaskBoardBloc without any props
              or context providers. It works anywhere in your component tree.
            </p>
            
            <NestedCounter />
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">How It Works</h4>
              <p className="text-sm">
                Blac manages bloc instances globally, eliminating the need for Context Providers.
                When you call <code className="text-pink-600 dark:text-pink-400">useBloc(YourBloc)</code>,
                Blac returns the same instance to all components, ensuring consistent state.
              </p>
              <CodeSnippet code={`function NestedCounter() {
  // Get access to the TaskBoardBloc directly!
  const [, taskBoardBloc] = useBloc(TaskBoardBloc);
  
  return (
    <div>
      <p>Total Tasks: {taskBoardBloc.taskStats.total}</p>
      <p>Completion Rate: {taskBoardBloc.taskStats.completionRate}%</p>
    </div>
  );
}`} />
            </div>
          </div>
        </section>
      )}
      
      {/* No Props Drilling section */}
      {activeSection === 'no-props-drilling' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">No More Props Drilling</h2>
          
          <p>
            With Blac, you can say goodbye to passing props through multiple layers of components.
            Any component at any level can directly access the state and methods it needs,
            making your component tree cleaner and easier to maintain.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Traditional Props Drilling</h3>
              <CodeSnippet code={`// Top level component
function TaskBoard({ tasks, onAddTask, onUpdateTask }) {
  return (
    <div>
      <TaskColumn 
        tasks={tasks} 
        onAddTask={onAddTask}
        onUpdateTask={onUpdateTask} 
      />
    </div>
  );
}

// Middle component passes props down
function TaskColumn({ tasks, onAddTask, onUpdateTask }) {
  return (
    <div>
      {tasks.map(task => (
        <TaskCard 
          task={task} 
          onUpdateTask={onUpdateTask}
        />
      ))}
    </div>
  );
}

// Leaf component finally uses the props
function TaskCard({ task, onUpdateTask }) {
  return (
    <div>
      <h3>{task.title}</h3>
      <button onClick={() => onUpdateTask(task.id)}>
        Update
      </button>
    </div>
  );
}`} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">With Blac</h3>
              <CodeSnippet code={`// Top level component
function TaskBoard() {
  return <div><TaskColumn /></div>;
}

// Middle component needs no props
function TaskColumn() {
  const [state, bloc] = useBloc(TaskBoardBloc);
  
  return (
    <div>
      {bloc.todoTasks.map(task => (
        <TaskCard task={task} />
      ))}
    </div>
  );
}

// Leaf component directly accesses the bloc
function TaskCard({ task }) {
  const [, bloc] = useBloc(TaskBoardBloc);
  
  return (
    <div>
      <h3>{task.title}</h3>
      <button onClick={() => bloc.updateTask(task.id)}>
        Update
      </button>
    </div>
  );
}`} />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Benefits</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Cleaner Component Interfaces</strong> - No more prop overload</li>
              <li><strong>Easier Refactoring</strong> - Move components freely without breaking prop chains</li>
              <li><strong>Better Separation of Concerns</strong> - Components only access what they need</li>
              <li><strong>More Maintainable Code</strong> - Fewer points of failure and easier debugging</li>
            </ul>
          </div>
          
          <p className="mt-4">
            Try using the TaskBoard demo in the "Complete TaskBoard" tab to see this in action. 
            Notice how components at different levels can access and modify the shared state
            without passing props through intermediate components.
          </p>
        </section>
      )}
      
      {/* Computed Properties section */}
      {activeSection === 'computed' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Intelligent Computed Properties</h2>
          
          <p>
            Blac's computed properties (getters) are automatically cached and only recalculated when
            their dependencies change. This creates an elegant way to derive state without performance
            overhead.
          </p>
          
          <div className="mt-6">
            <ComputedPropertiesDemo />
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-3">How Computed Properties Work</h3>
            <CodeSnippet 
              code={`class TaskBoardBloc extends Cubit<TaskBoardState> {
  // ... constructor and methods

  // Computed properties
  get todoTasks() {
    return this.state.tasks.filter(task => task.status === 'todo');
  }

  get inProgressTasks() {
    return this.state.tasks.filter(task => task.status === 'in-progress');
  }

  get doneTasks() {
    return this.state.tasks.filter(task => task.status === 'done');
  }

  // State calculations
  get taskCount() {
    return this.state.tasks.length;
  }

  get completionRate() {
    const totalTasks = this.state.tasks.length;
    if (totalTasks === 0) return 0;
    
    const completedTasks = this.doneTasks.length;
    return Math.round((completedTasks / totalTasks) * 100);
  }
}`} 
              title="Computed Properties Example"
            />
          </div>
          
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Key Benefits</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Automatic Memoization</strong> - Results are cached until dependencies change</li>
              <li><strong>Dependency Tracking</strong> - Only recomputes when needed</li>
              <li><strong>Declarative Approach</strong> - Define what data should look like, not how to calculate it</li>
              <li><strong>Performance Optimization</strong> - No unnecessary recalculations</li>
            </ul>
          </div>
        </section>
      )}
      
      {/* Isolated vs Shared State section */}
      {activeSection === 'isolated' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Instance Management</h2>
          
          <p>
            Blac supports both shared state (for global app state) and isolated state (for
            component-level state) with a simple flag. This gives you flexibility to use the
            right approach for each use case.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Shared State (Default)</h3>
              <CodeSnippet code={`// Shared by default - one instance for all components
class TaskBoardBloc extends Cubit<TaskBoardState> {
  constructor() {
    super({ /* initial state */ });
  }
  
  // Methods...
}

// Every component gets the same instance
function ComponentA() {
  const [state, bloc] = useBloc(TaskBoardBloc);
  // state changes here affect ComponentB
}

function ComponentB() {
  const [state, bloc] = useBloc(TaskBoardBloc);
  // state changes here affect ComponentA
}`} />

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
                <strong>Use Case:</strong> Global app state like authentication, themes, shared data
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Isolated State</h3>
              <CodeSnippet code={`// Isolated - each component gets its own instance
class CounterBloc extends Cubit<CounterState> {
  static isolated = true; // This makes it isolated
  
  constructor() {
    super({ count: 0 });
  }
  
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// ComponentA gets its own instance
function ComponentA() {
  const [state, bloc] = useBloc(CounterBloc);
  // state changes here do NOT affect ComponentB
}

// ComponentB gets its own instance
function ComponentB() {
  const [state, bloc] = useBloc(CounterBloc);
  // state changes here do NOT affect ComponentA
}`} />

              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md text-sm">
                <strong>Use Case:</strong> Component-specific state, form state, UI state for a specific feature
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Live Example: Isolated Counters</h3>
            <p className="mb-4">
              The counters below each have their own isolated state. Try incrementing one counter and
              notice that it doesn't affect the other counter.
            </p>
            
            <IsolatedCounters />
            
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
              <p>
                Each counter above uses the same <code className="text-pink-600 dark:text-pink-400">CounterBloc</code> class,
                but because we've set <code className="text-pink-600 dark:text-pink-400">static isolated = true</code>,
                each component gets its own instance with independent state.
              </p>
            </div>
          </div>
        </section>
      )}
      
      {/* Complete TaskBoard section */}
      {activeSection === 'demo' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Interactive TaskBoard Demo</h2>
          
          <p>
            This TaskBoard application demonstrates all of Blac's features working together in a real-world
            scenario. It shows how different components can access and modify shared state without props
            drilling, and how computed properties optimize performance.
          </p>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-6">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Try These Features:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Add new tasks using the "Add Task" button</li>
              <li>Filter tasks by status, priority, or search term</li>
              <li>Drag tasks between columns to change their status</li>
              <li>Click the ⋮ menu on each task to change its status or priority</li>
              <li>Notice how only the affected components re-render when state changes</li>
            </ul>
          </div>
          
          <TaskBoard />
          
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-300">Key Code Patterns</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Direct State Access</h4>
                <CodeSnippet code={`// TaskColumn.tsx - Notice how it gets computed tasks directly
export function TaskColumn({ status }: TaskColumnProps) {
  const [, taskBoardBloc] = useBloc(TaskBoardBloc);
  
  // Access only the tasks for this column via computed property
  let tasks = [];
  if (status === 'todo') {
    tasks = taskBoardBloc.todoTasks;
  } else if (status === 'in-progress') {
    tasks = taskBoardBloc.inProgressTasks;
  } else {
    tasks = taskBoardBloc.doneTasks;
  }
  
  // ...rest of the component
}`} />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. State Updates via Bloc Methods</h4>
                <CodeSnippet code={`// TaskCard can update task status directly
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('taskId');
  
  // Call state update method directly on the bloc
  taskBoardBloc.updateTaskStatus(taskId, status);
};`} />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Efficient Updates with patch()</h4>
                <CodeSnippet code={`// Efficient partial state updates
toggleAddTask = () => {
  // Use patch to efficiently update only what changed
  this.patch({
    showAddTask: !this.state.showAddTask,
  });
};`} />
              </div>
            </div>
          </div>
        </section>
      )}
      
      <section className="text-center mt-12 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gradient-multi">
          Ready to Simplify Your State Management?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Blac makes complex application state simple while delivering top-tier performance. 
          Try it in your next project and experience the difference.
        </p>
        <div className="flex justify-center space-x-4">
          <a 
            href="https://github.com/jsnanigans/blac" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-neon-blue px-5 py-2.5 rounded-md border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            Explore on GitHub
          </a>
          <a 
            href="https://www.npmjs.com/package/blac-next" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-neon-cyan px-5 py-2.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all shadow-sm shadow-cyan-500/20 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 0v24h24V0H0zm21.41 16.59c-.78.78-1.81 1.21-2.91 1.21H5.5c-1.1 0-2.13-.43-2.91-1.21-.78-.78-1.21-1.81-1.21-2.91V5.5c0-1.1.43-2.13 1.21-2.91.78-.78 1.81-1.21 2.91-1.21h13c1.1 0 2.13.43 2.91 1.21.78.78 1.21 1.81 1.21 2.91v8.18c0 1.1-.43 2.13-1.21 2.91z"/>
            </svg>
            Install from NPM
          </a>
        </div>
      </section>
    </div>
  );
} 