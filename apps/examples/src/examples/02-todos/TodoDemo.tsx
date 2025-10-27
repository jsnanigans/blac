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
      title="Todo List Example"
      description="Intermediate patterns showing granular dependency tracking and persistence"
      features={[
        'Fine-grained updates - TodoList re-renders only on todos/filter changes',
        'TodoFilters re-renders only on filter changes',
        'TodoStats re-renders only on todos changes (not filter)',
        'LocalStorage persistence via lifecycle hooks',
        'Named instances for multiple independent lists',
      ]}
    >
      <section className="mb-3">
        <h2>Main Todo List</h2>
        <p className="text-muted mb-2">
          Watch the console to see which components re-render as you interact.
          Notice how filtering doesn't cause TodoStats to re-render!
        </p>
        <TodoInput />
        <TodoFilters />
        <TodoStats />
        <div className="mt-2">
          <TodoList />
        </div>
      </section>

      <section className="mb-3">
        <h2>Independent Lists</h2>
        <p className="text-muted mb-2">
          Each list below has its own state using named instances. Try using both!
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3>Work Tasks</h3>
            <TodoInput instanceKey="work" />
            <TodoFilters instanceKey="work" />
            <TodoStats instanceKey="work" />
            <div className="mt-2">
              <TodoList instanceKey="work" />
            </div>
          </div>
          <div>
            <h3>Personal Tasks</h3>
            <TodoInput instanceKey="personal" />
            <TodoFilters instanceKey="personal" />
            <TodoStats instanceKey="personal" />
            <div className="mt-2">
              <TodoList instanceKey="personal" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>Key Takeaways</h2>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li>
            <strong>Granular tracking:</strong> TodoList re-renders when todos or filter
            change, TodoFilters only when filter changes, TodoStats only when todos
            change
          </li>
          <li>
            <strong>Automatic optimization:</strong> Components automatically track only
            the properties they access - no manual dependencies needed
          </li>
          <li>
            <strong>Named instances:</strong> Use <code>instanceKey</code> to create
            multiple independent state containers
          </li>
          <li>
            <strong>Persistence:</strong> TodoBloc uses lifecycle hooks and subscriptions
            to automatically save to localStorage
          </li>
          <li>
            <strong>Reload safe:</strong> Refresh the page - your todos persist across
            sessions!
          </li>
        </ul>
      </section>
    </ExampleLayout>
  );
}
