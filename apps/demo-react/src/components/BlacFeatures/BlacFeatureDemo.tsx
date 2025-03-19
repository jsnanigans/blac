import { useBloc } from '@blac/react';
import { FeatureBloc } from './FeatureBloc';
import { DirectAccessDemo } from './DirectAccessDemo';
import { NoPropsDemo } from './NoPropsDemo';
import { ComputedDemo } from './ComputedDemo';
import { IsolatedDemo } from './IsolatedDemo';
import { CodeSnippet } from './CodeSnippet';

export function BlacFeatureDemo() {
  const [state, featureBloc] = useBloc(FeatureBloc);
  const { activeSection, expandedSections } = state;

  const sections = [
    {
      id: 'intro',
      title: 'Introducing Blac',
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            Blac is a lightweight, powerful state management library for React applications that focuses on simplicity
            and predictability while eliminating common pain points in state management.
          </p>
          <p>
            Unlike traditional state management libraries, Blac provides a unique approach that makes it
            easy to manage complex application state without the typical boilerplate and complexity.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2">Try it out!</h3>
            <p className="mb-3">
              This interactive article demonstrates key Blac features with live examples you can experiment with.
              Explore the sections below to see how Blac can simplify your state management.
            </p>
            <button
              onClick={() => featureBloc.setActiveSection('directAccess')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start exploring Blac
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'directAccess',
      title: 'Direct State Access Everywhere',
      content: (
        <div className="space-y-4">
          <p>
            With Blac, you can access your application state from anywhere in your component tree without
            Context Providers or complex setup. The <code>useBloc</code> hook gives any component direct
            access to shared state.
          </p>
          <DirectAccessDemo />
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">How It Works</h3>
            <p>
              Blac manages bloc instances globally, eliminating the need for Context Providers or other
              wrapping components. This means any component can access any bloc instance directly:
            </p>
            <CodeSnippet 
              language="tsx" 
              code={`// In any component
const [state, counterBloc] = useBloc(CounterBloc);

// Now you have the state and methods from the bloc
return (
  <div>
    <p>Count: {state.count}</p>
    <button onClick={() => counterBloc.increment()}>Increment</button>
  </div>
);`} 
            />
          </div>
        </div>
      ),
    },
    {
      id: 'props',
      title: 'No More Props Drilling',
      content: (
        <div className="space-y-4">
          <p>
            Say goodbye to passing props through multiple component layers. With Blac, any component at
            any level can directly access the state and methods it needs.
          </p>
          <NoPropsDemo />
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Benefits</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cleaner component interfaces - no more prop overload</li>
              <li>Easier refactoring - move components freely without breaking prop chains</li>
              <li>Better separation of concerns - components only access what they need</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'computed',
      title: 'Intelligent Computed Properties',
      content: (
        <div className="space-y-4">
          <p>
            Blac's computed properties (getters) are only recalculated when their dependencies change, making
            your application more efficient and responsive.
          </p>
          <ComputedDemo />
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">How Computed Properties Work</h3>
            <p>
              Define computed properties in your bloc using getters. These automatically track dependencies
              and only recalculate when needed:
            </p>
            <CodeSnippet 
              language="ts" 
              code={`class TaskBloc extends Cubit<TaskState> {
  // Regular methods to update state
  addTask(task: Task) { /* ... */ }
  
  // Computed properties (getters)
  get completedTasks() {
    // Only recalculated when tasks change
    return this.state.tasks.filter(task => task.completed);
  }
  
  get completionRate() {
    // Only recalculated when relevant dependencies change
    const total = this.state.tasks.length;
    const completed = this.completedTasks.length;
    return total > 0 ? (completed / total) * 100 : 0;
  }
}`} 
            />
          </div>
        </div>
      ),
    },
    {
      id: 'isolated',
      title: 'Shared & Isolated State',
      content: (
        <div className="space-y-4">
          <p>
            Blac supports both shared state (for global app state) and isolated state (for component-level state)
            with a simple flag. No complex configuration needed.
          </p>
          <IsolatedDemo />
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Choosing Between Shared and Isolated</h3>
            <p>
              By default, blocs are shared, but you can easily create isolated blocs for component-specific state:
            </p>
            <CodeSnippet 
              language="ts" 
              code={`// Shared bloc by default - every component gets the same instance
class GlobalSettingsBloc extends Cubit<SettingsState> {
  // ...
}

// Isolated bloc - each component gets its own instance
class LocalCounterBloc extends Cubit<CounterState> {
  static isolated = true;
  // ...
}`} 
            />
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      title: 'Fine-Grained Updates & Performance',
      content: (
        <div className="space-y-4">
          <p>
            Blac's intelligent dependency tracking ensures components only re-render when the specific
            data they use changes. This leads to better performance in complex applications.
          </p>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2">Key Performance Features</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Automatic Dependency Tracking:</strong> Components only re-render when the specific 
                properties they use change
              </li>
              <li>
                <strong>Intelligent Memoization:</strong> Computed properties are cached and only recalculated 
                when dependencies change
              </li>
              <li>
                <strong>Efficient Updates:</strong> State updates are batched and optimized to minimize renders
              </li>
              <li>
                <strong>Developer-Friendly:</strong> All this optimization without complex boilerplate or setup
              </li>
            </ul>
          </div>
          <CodeSnippet 
            language="tsx" 
            code={`function UserProfile() {
  // This component only re-renders when username or email change
  // Even if other properties in user state change
  const [{ username, email }, userBloc] = useBloc(UserBloc);
  
  return (
    <div>
      <h2>{username}</h2>
      <p>{email}</p>
    </div>
  );
}`} 
          />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Blac: Making Complex State Management Simple
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          An interactive guide to @blac-next and @blac-react
        </p>

        <div className="space-y-8">
          {sections.map(section => (
            <div 
              key={section.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                className={`w-full px-4 py-3 flex justify-between items-center ${
                  activeSection === section.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => featureBloc.toggleSection(section.id)}
              >
                <span className="text-xl font-semibold">{section.title}</span>
                <span className="text-lg">
                  {expandedSections[section.id] ? '−' : '+'}
                </span>
              </button>
              
              {expandedSections[section.id] && (
                <div className="px-4 py-4 bg-white dark:bg-gray-800">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Getting Started with Blac</h2>
          <p className="mb-4">
            Ready to try Blac in your own project? Installation is simple:
          </p>
          <div className="bg-gray-800 text-white p-4 rounded-md font-mono text-sm mb-4">
            <p>npm install @blac-next @blac-react</p>
            <p># or</p>
            <p>yarn add @blac-next @blac-react</p>
          </div>
          <p>
            Check out the full documentation and more examples on the{' '}
            <a href="#" className="text-blue-600 hover:underline">GitHub repository</a>.
          </p>
        </div>
      </div>
    </div>
  );
} 