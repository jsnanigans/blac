import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { TipCallout, InfoCallout, ComparisonPanel } from '@/components/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Trash2, Plus, Users, Component } from 'lucide-react';
import { useState } from 'react';

// Task state
interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskListState {
  tasks: Task[];
}

class TaskListCubit extends Cubit<TaskListState> {
  constructor() {
    super({
      tasks: [
        { id: '1', text: 'Learn BlaC basics', completed: true },
        { id: '2', text: 'Build your first app', completed: false },
        { id: '3', text: 'Share with the team', completed: false },
      ],
    });
  }

  addTask = (text: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    this.patch({
      tasks: [...this.state.tasks, newTask],
    });
  };

  toggleTask = (id: string) => {
    this.patch({
      tasks: this.state.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ),
    });
  };

  deleteTask = (id: string) => {
    this.patch({
      tasks: this.state.tasks.filter((task) => task.id !== id),
    });
  };
}

// Child component - TaskItem
function TaskItem({ task }: { task: Task }) {
  // Child accesses the cubit directly - no props needed!
  const [, cubit] = useBloc(TaskListCubit);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border group hover:border-concept-cubit/50 transition-colors"
    >
      <button
        onClick={() => cubit.toggleTask(task.id)}
        className="flex-shrink-0 transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <span
        className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
      >
        {task.text}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => cubit.deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </motion.div>
  );
}

// Child component - AddTaskForm
function AddTaskForm() {
  // Another child accessing the cubit - still no props!
  const [, cubit] = useBloc(TaskListCubit);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim()) {
      cubit.addTask(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-concept-cubit/50"
      />
      <Button type="submit" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        Add
      </Button>
    </form>
  );
}

// Parent component - TaskList
function TaskList() {
  // Parent reads state to render children
  const [state] = useBloc(TaskListCubit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Component className="w-5 h-5 text-concept-cubit" />
        <h3 className="font-semibold">Task List Component Tree</h3>
      </div>

      <div className="p-4 rounded-lg bg-gradient-to-br from-concept-cubit/5 to-concept-cubit/10 border border-concept-cubit/20 space-y-3">
        <AnimatePresence>
          {state.tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {state.tasks.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No tasks yet. Add one below!
          </p>
        )}
      </div>

      <AddTaskForm />

      <div className="text-sm text-muted-foreground">
        {state.tasks.filter((t) => t.completed).length} of {state.tasks.length} completed
      </div>
    </div>
  );
}

// Demo metadata
const demoMetadata = {
  id: 'multiple-components',
  title: 'Component Composition',
  description:
    'Learn how to share state across parent and child components without prop drilling. See component composition in action!',
  category: '01-fundamentals',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'components', 'composition', 'shared-state', 'prop-drilling'],
  estimatedTime: 8,
  learningPath: {
    previous: 'updating-state',
    next: 'instance-management',
    sequence: 5,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// Main demo component
export function MultipleComponentsDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>No More Prop Drilling</h2>
          <p>
            One of the most tedious parts of React development is{' '}
            <strong>prop drilling</strong>—passing props through multiple layers of components
            just to get data where it's needed.
          </p>
          <p>
            With BlaC, child components can access shared state directly, without any props. The
            parent doesn't need to know what data its children need, and children don't need to
            receive endless prop lists.
          </p>
        </Prose>

        <TipCallout title="Component Independence">
          <p>
            In BlaC, components are <strong>independent consumers</strong> of state. They connect
            directly to the Cubit they need, making them easier to test, move, and reuse.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>Try It Yourself</SectionHeader>
        <Prose>
          <p>
            Below is a task list built with parent and child components. Notice how TaskItem and
            AddTaskForm components can update state without receiving any callback props!
          </p>
        </Prose>

        <div className="my-8">
          <TaskList />
        </div>

        <div className="my-8">
          <StateViewer bloc={TaskListCubit} title="Shared Task State" />
        </div>

        <InfoCallout title="What You're Seeing">
          <p>
            The <code>TaskList</code> parent renders <code>TaskItem</code> children, and the{' '}
            <code>AddTaskForm</code> is a sibling. Yet all three components can read and update the
            same state—no props required!
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* The Old Way vs BlaC Way */}
      <ArticleSection theme="neutral" id="comparison">
        <SectionHeader>The Old Way vs The BlaC Way</SectionHeader>
        <Prose>
          <p>Let's compare how you'd build this with traditional prop drilling:</p>
        </Prose>

        <ComparisonPanel orientation="vertical">
          <ComparisonPanel.Left title="Traditional Prop Drilling" color="danger">
            <CodePanel
              code={`// Parent must pass everything down
function TaskList() {
  const [tasks, setTasks] = useState([...]);

  const addTask = (text) => {
    setTasks([...tasks, newTask]);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t =>
      t.id === id ? {...t, completed: !t.completed} : t
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div>
      {tasks.map(task => (
        <TaskItem
          task={task}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      ))}
      <AddTaskForm onAdd={addTask} />
    </div>
  );
}

// Child must receive props
function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div>
      <button onClick={() => onToggle(task.id)}>
        Toggle
      </button>
      <button onClick={() => onDelete(task.id)}>
        Delete
      </button>
    </div>
  );
}`}
              language="tsx"
              showLineNumbers={false}
            />
          </ComparisonPanel.Left>

          <ComparisonPanel.Right title="BlaC Way" color="cubit">
            <CodePanel
              code={`// Parent just renders
function TaskList() {
  const [state] = useBloc(TaskListCubit);

  return (
    <div>
      {state.tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
      <AddTaskForm />
    </div>
  );
}

// Child accesses cubit directly
function TaskItem({ task }) {
  const [, cubit] = useBloc(TaskListCubit);

  return (
    <div>
      <button onClick={() => cubit.toggleTask(task.id)}>
        Toggle
      </button>
      <button onClick={() => cubit.deleteTask(task.id)}>
        Delete
      </button>
    </div>
  );
}`}
              language="tsx"
              showLineNumbers={false}
            />
          </ComparisonPanel.Right>
        </ComparisonPanel>

        <Prose>
          <p>
            Notice how much cleaner the BlaC version is! The parent doesn't need to pass callbacks,
            and the child doesn't need to receive them. Everything "just works" through shared
            state.
          </p>
        </Prose>
      </ArticleSection>

      {/* How It Works */}
      <ArticleSection theme="info" id="how-it-works">
        <SectionHeader>How Does This Work?</SectionHeader>
        <Prose>
          <p>
            Every component that calls <code>useBloc(TaskListCubit)</code> connects to the{' '}
            <strong>same instance</strong>. When any component updates the state, BlaC notifies all
            connected components:
          </p>
          <ol>
            <li>
              <strong>Child calls method</strong>: <code>cubit.toggleTask(id)</code>
            </li>
            <li>
              <strong>State updates</strong>: Cubit emits new state with <code>patch()</code>
            </li>
            <li>
              <strong>All subscribers notified</strong>: BlaC notifies parent and all children
            </li>
            <li>
              <strong>React re-renders</strong>: Only components using the changed state re-render
            </li>
          </ol>
        </Prose>

        <CodePanel
          code={`// The Cubit holds shared state
class TaskListCubit extends Cubit<TaskListState> {
  toggleTask = (id: string) => {
    this.patch({
      tasks: this.state.tasks.map(task =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      ),
    });
  };
}

// Any component can call methods
function TaskItem({ task }) {
  const [, cubit] = useBloc(TaskListCubit);

  // Direct access - no props needed!
  return (
    <button onClick={() => cubit.toggleTask(task.id)}>
      Toggle
    </button>
  );
}`}
          language="tsx"
          title="DirectAccess.tsx"
          showLineNumbers={true}
          highlightLines={[3, 16, 19]}
          lineLabels={{
            3: 'Method updates state',
            16: 'Child gets cubit directly',
            19: 'Calls method without props',
          }}
        />
      </ArticleSection>

      {/* Component Architecture */}
      <ArticleSection theme="cubit" id="architecture">
        <SectionHeader>Component Architecture</SectionHeader>
        <Prose>
          <p>Here's how the components are structured in this demo:</p>
        </Prose>

        <div className="my-6 p-6 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-concept-cubit" />
              <div>
                <p className="font-semibold">TaskList (Parent)</p>
                <p className="text-sm text-muted-foreground">
                  Reads state, renders children
                </p>
              </div>
            </div>

            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-3">
                <Component className="w-5 h-5 text-concept-bloc" />
                <div>
                  <p className="font-semibold">TaskItem (Child)</p>
                  <p className="text-sm text-muted-foreground">
                    Accesses cubit directly, updates state
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Component className="w-5 h-5 text-concept-event" />
                <div>
                  <p className="font-semibold">AddTaskForm (Sibling)</p>
                  <p className="text-sm text-muted-foreground">
                    Also accesses cubit directly, adds tasks
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Prose>
          <p>
            All three components use <code>useBloc(TaskListCubit)</code> to access the same shared
            instance. No props, no callbacks, no context providers—just simple, direct access.
          </p>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>No prop drilling</strong>: Child components access state directly
            </li>
            <li>
              <strong>Independent components</strong>: Each component connects to what it needs
            </li>
            <li>
              <strong>Cleaner code</strong>: No endless prop lists or callback chains
            </li>
            <li>
              <strong>Easy refactoring</strong>: Move components without rewiring props
            </li>
            <li>
              <strong>Better testing</strong>: Test components in isolation more easily
            </li>
            <li>
              <strong>Same instance</strong>: All components share one Cubit instance by default
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="tip" id="next-steps">
        <SectionHeader>What's Next?</SectionHeader>
        <Prose>
          <p>
            So far, we've seen how BlaC shares one instance across all components. But what if you
            want <strong>multiple independent instances</strong> of the same state?
          </p>
          <p>
            In the next demo, you'll learn about <strong>instance management</strong>—how to create
            isolated instances, when to use shared vs. isolated state, and how to control instance
            lifecycle.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
