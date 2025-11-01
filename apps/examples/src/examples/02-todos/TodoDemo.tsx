import { ExampleLayout } from '../../shared/ExampleLayout';
import { TodoInput } from './TodoInput';
import { TodoList } from './TodoList';
import { TodoFilters } from './TodoFilters';
import { TodoStats } from './TodoStats';

/**
 * Todo list example demonstrating granular dependency tracking.
 *
 * This example shows:
 * 1. Components only re-render when their accessed properties change
 * 2. Named instances for multiple independent lists
 * 3. LocalStorage persistence via lifecycle hooks
 * 4. Computed properties pattern
 */
export function TodoDemo() {
  return (
    <ExampleLayout
      title="Todo List"
      description="See granular dependency tracking in action. Watch how different components re-render based on what data they access."
      features={[
        'Fine-grained updates - each component tracks only what it uses',
        'TodoFilters re-renders only on filter changes',
        'TodoStats re-renders only on todos changes (not filter)',
        'LocalStorage persistence',
        'Named instances for multiple lists',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Main Todo List</h2>
          <p className="text-muted">
            Watch the console to see which components re-render as you interact.
            Notice how filtering doesn't cause TodoStats to re-render!
          </p>
        </div>

        <div className="stack-md">
          <TodoInput />
          <TodoFilters />
          <TodoList />
          <TodoStats />
        </div>
      </section>

      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Independent Lists</h2>
          <p className="text-muted">
            Each list has its own state using named instances. Changes in one
            don't affect the other.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div className="stack-md">
            <h3>Work Tasks</h3>
            <TodoInput instanceKey="work" />
            <TodoFilters instanceKey="work" />
            <TodoList instanceKey="work" />
            <TodoStats instanceKey="work" />
          </div>

          <div className="stack-md">
            <h3>Personal Tasks</h3>
            <TodoInput instanceKey="personal" />
            <TodoFilters instanceKey="personal" />
            <TodoList instanceKey="personal" />
            <TodoStats instanceKey="personal" />
          </div>
        </div>
      </section>

      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Granular tracking:</strong> TodoList re-renders when todos
            or filter change. TodoFilters only when filter changes. TodoStats
            only when todos change.
          </p>
          <p>
            • <strong>Automatic optimization:</strong> Components track only the
            properties they access - no manual dependencies needed.
          </p>
          <p>
            • <strong>Named instances:</strong> Use <code>instanceId</code> to
            create multiple independent state containers.
          </p>
          <p>
            • <strong>Persistence:</strong> TodoBloc uses subscriptions to
            automatically save to localStorage.
          </p>
          <p>
            • <strong>Reload safe:</strong> Refresh the page - your todos
            persist!
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
