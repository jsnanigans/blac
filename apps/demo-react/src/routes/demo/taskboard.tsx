import { createFileRoute } from '@tanstack/react-router';
import { TaskBoard } from '../../components/TaskBoard';

export const Route = createFileRoute('/demo/taskboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">
          Blac: State Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This TaskBoard demo showcases how Blac enables developers to build complex applications with clean architecture
          principles and optimal performance. Experience a state management solution designed specifically to address
          the challenges professional React developers face when building scalable applications.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-white">Developer Benefits</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              <span className="font-medium">Clean Separation of Concerns:</span> UI components remain pure and focused on rendering, while business logic is isolated in blocs
            </li>
            <li>
              <span className="font-medium">Highly Testable Architecture:</span> Bloc logic can be unit tested independently from UI components
            </li>
            <li>
              <span className="font-medium">Type-Safe APIs:</span> Full TypeScript support with powerful type inference
            </li>
            <li>
              <span className="font-medium">Fine-Grained Reactivity:</span> Surgical updates to UI with performance optimization built-in
            </li>
            <li>
              <span className="font-medium">Small Bundle Size:</span> Minimal runtime footprint compared to other state solutions
            </li>
            <li>
              <span className="font-medium">Excellent Developer Experience:</span> Simple, predictable patterns that scale with your application
            </li>
          </ul>
        </div>
      </section>

        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">
            Demo:
        </h1>
      <section className="mb-8">
        <TaskBoard />
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-white">
          Architectural Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          The TaskBoard demonstrates a production-ready implementation of the Bloc pattern, showing how different components
          work together through the shared state container.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              The Cubit Pattern
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Blac's <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">Cubit</code> class is a specialized state container that manages state updates efficiently. The <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">patch()</code> method provides optimized updates by merging only the changed parts of state, avoiding unnecessary re-renders.
              This unidirectional data flow ensures predictable state transitions and makes debugging easier.
            </p>
            
            <div className="relative group mt-4">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden shadow-lg">
                  <div className="flex text-xs text-white items-center justify-between bg-gray-900 py-1.5 px-4 border-b border-gray-800">
                    <span className="font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
                      </svg>
                      Cubit Implementation
                    </span>
                    <div className="flex items-center text-gray-400 space-x-2">
                      <span className="bg-red-500 rounded-full w-2.5 h-2.5"></span>
                      <span className="bg-yellow-400 rounded-full w-2.5 h-2.5"></span>
                      <span className="bg-green-400 rounded-full w-2.5 h-2.5"></span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4 text-sm font-mono leading-relaxed">
                      <span className="text-gray-500">// The foundation of our TaskBoardBloc</span>
                      <br/><span className="text-blue-400">class</span> <span className="text-green-300">TaskBoardBloc</span> <span className="text-blue-400">extends</span> <span className="text-blue-300">Cubit</span>&lt;TaskBoardState&gt; {"{"}
                      <br/>  <span className="text-gray-500">// State transitions are explicit and traceable</span>
                      <br/>  <span className="text-yellow-300">updateTaskStatus</span> = (<span className="text-blue-300">taskId</span>: <span className="text-blue-300">string</span>, <span className="text-blue-300">status</span>: <span className="text-blue-300">TaskStatus</span>) {"=>"} {"{"}
                      <br/>    <span className="text-blue-400">this</span>.<span className="text-yellow-300">patch</span>({"{"} 
                      <br/>      tasks: <span className="text-blue-400">this</span>.state.tasks.<span className="text-yellow-300">map</span>(
                      <br/>        task {"=>"} task.id === taskId ? {"{"} ...task, status {"}"} : task
                      <br/>      )
                      <br/>    {"}"}){";"}
                      <br/>  {"}"}
                      <br/>{"}"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Component Communication Flow
            </h3>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-center">
                <div className="flex flex-col items-center text-center">
                  <div className="w-full max-w-[220px] rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-0.5">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 h-full">
                      <div className="font-medium text-blue-700 dark:text-blue-300 text-lg">TaskBoardBloc</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Central State Container</div>
                    </div>
                  </div>
                  <div className="h-8 border-l-2 border-dashed border-blue-300 dark:border-blue-700 my-1"></div>
                  <div className="p-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  <div className="w-full max-w-[180px] rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-0.5 transform transition-transform hover:scale-105">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 h-full">
                      <div className="font-medium text-green-700 dark:text-green-300 text-lg">TaskBoard</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Main Container</div>
                    </div>
                  </div>
                  <div className="w-full max-w-[180px] rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 p-0.5 transform transition-transform hover:scale-105">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 h-full">
                      <div className="font-medium text-yellow-700 dark:text-yellow-300 text-lg">TaskColumn</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Status Column</div>
                    </div>
                  </div>
                  <div className="w-full max-w-[180px] rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-0.5 transform transition-transform hover:scale-105">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800 h-full">
                      <div className="font-medium text-red-700 dark:text-red-300 text-lg">TaskCard</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Individual Task</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="mb-2 font-medium text-gray-800 dark:text-gray-200">Components share the same bloc instance, but access only the state they need:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><span className="text-green-600 dark:text-green-400 font-medium">TaskBoard</span> accesses full state and form controls</li>
                  <li><span className="text-yellow-600 dark:text-yellow-400 font-medium">TaskColumn</span> uses computed properties for filtered tasks</li>
                  <li><span className="text-red-600 dark:text-red-400 font-medium">TaskCard</span> receives data through props from TaskColumn</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Computed Properties: The Performance Secret
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              One of Blac's key performance advantages is its support for computed properties. 
              These are cached and only recalculated when their dependencies change, 
              efficiently preventing unnecessary re-renders:
            </p>
            
            <div className="relative group mt-4">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden shadow-lg">
                  <div className="flex text-xs text-white items-center justify-between bg-gray-900 py-1.5 px-4 border-b border-gray-800">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      <span className="font-medium">Computed Properties</span>
                    </div>
                    <div className="flex space-x-1.5">
                      <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">TaskBoardBloc.ts</span>
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded">TaskColumn.tsx</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4 text-sm font-mono leading-relaxed">
                      <span className="text-gray-400">// In TaskBoardBloc:</span>
                      <br/>
                      <br/><span className="text-gray-400">// First-level computed property</span>
                      <br/><span className="text-blue-400">get</span> <span className="text-yellow-300">filteredTasks</span>() {"{"}
                      <br/>  <span className="text-blue-400">const</span> {"{"} status, priority, searchQuery {"}"} = <span className="text-blue-400">this</span>.state.filter{";"}
                      <br/>  <span className="text-blue-400">return</span> <span className="text-blue-400">this</span>.state.tasks.<span className="text-yellow-300">filter</span>(<span className="text-gray-500">/* filtering logic */</span>){";"}
                      <br/>{"}"}
                      <br/>
                      <br/><span className="text-gray-400">// Second-level computed property (depends on filteredTasks)</span>
                      <br/><span className="text-blue-400">get</span> <span className="text-yellow-300">todoTasks</span>() {"{"}
                      <br/>  <span className="text-blue-400">return</span> <span className="text-blue-400">this</span>.filteredTasks.<span className="text-yellow-300">filter</span>(task {"=>"} task.status === <span className="text-green-300">'todo'</span>){";"}
                      <br/>{"}"}
                      <br/>
                      <br/><span className="text-gray-400">// Example of using patch with filters</span>
                      <br/><span className="text-yellow-300">setSearchQuery</span> = (<span className="text-blue-300">query</span>: <span className="text-blue-300">string</span>) {"=>"} {"{"}
                      <br/>  <span className="text-blue-400">this</span>.<span className="text-yellow-300">patch</span>({"{"} 
                      <br/>    filter: {"{"} 
                      <br/>      ...<span className="text-blue-400">this</span>.state.filter,
                      <br/>      searchQuery: query 
                      <br/>    {"}"}
                      <br/>  {"}"}){";"}
                      <br/>{"}"}
                      <br/>
                      <br/><span className="text-gray-400">// Component code:</span>
                      <br/><span className="text-blue-400">function</span> <span className="text-yellow-300">TaskColumn</span>({"{"} status {"}"}) {"{"}
                      <br/>  <span className="text-blue-400">const</span> [, bloc] = <span className="text-yellow-300">useBloc</span>(<span className="text-blue-300">TaskBoardBloc</span>){";"}
                      <br/>  <span className="text-gray-400">// Only re-renders when this specific property changes</span>
                      <br/>  <span className="text-blue-400">let</span> tasks = []{";"}
                      <br/>  <span className="text-blue-400">if</span> (status === <span className="text-green-300">'todo'</span>) {"{"}
                      <br/>    tasks = bloc.todoTasks{";"}
                      <br/>  {"}"} <span className="text-blue-400">else if</span> (status === <span className="text-green-300">'in-progress'</span>) {"{"}
                      <br/>    tasks = bloc.inProgressTasks{";"}
                      <br/>  {"}"} <span className="text-blue-400">else</span> {"{"}
                      <br/>    tasks = bloc.doneTasks{";"}
                      <br/>  {"}"}
                      <br/>{"}"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 