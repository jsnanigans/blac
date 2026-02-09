import { useEffect, useRef, useState, useCallback } from 'react';
import { watch } from '@blac/core';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card, Button } from '../../shared/components';
import { TodoCubit, type TodoFilter } from './TodoCubit';
import { TodoList } from './TodoList';
import { TodoStats } from './TodoStats';
import { QuickAdd } from './QuickAdd';

const STORAGE_KEY = 'blac-examples-todos';

export function TodoDemo() {
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-50), `[${time}] ${msg}`]);
  }, []);

  // watch() - persist items to localStorage whenever they change
  useEffect(() => {
    const unwatch = watch(TodoCubit, (bloc) => {
      const items = bloc.state.items;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      addLog(`watch: saved ${items.length} items to localStorage`);
    });
    return unwatch;
  }, [addLog]);

  // onMount / onUnmount lifecycle hooks
  const [state, bloc] = useBloc(TodoCubit, {
    onMount: (b) => {
      addLog(`onMount: TodoCubit loaded with ${b.state.items.length} items`);
    },
    onUnmount: () => {
      addLog('onUnmount: TodoCubit released');
    },
  });

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const filters: TodoFilter[] = ['all', 'active', 'completed'];

  return (
    <ExampleLayout
      title="Todo List"
      description="A full-featured todo app demonstrating watch(), lifecycle hooks, manual dependencies, and the action-only pattern."
      features={[
        'watch() for localStorage persistence',
        'onMount / onUnmount lifecycle hooks',
        'Manual dependency mode for optimized re-renders',
        'Action-only pattern (QuickAdd never re-renders from state)',
      ]}
    >
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <div className="stack-md">
            <Card>
              <div className="stack-md">
                <QuickAdd />

                <div className="flex-between">
                  <div className="todo-filters">
                    {filters.map((f) => (
                      <button
                        key={f}
                        className={`ghost ${state.filter === f ? 'active' : ''}`}
                        onClick={() => bloc.setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {bloc.completedCount > 0 && (
                    <Button variant="ghost" onClick={bloc.clearCompleted} style={{ fontSize: '0.8125rem' }}>
                      Clear completed
                    </Button>
                  )}
                </div>

                <TodoList />
              </div>
            </Card>

            <TodoStats />
          </div>

          <div className="stack-md">
            <Card>
              <h4>Lifecycle Log</h4>
              <p className="text-xs text-muted">
                Live log of <code>watch()</code>, <code>onMount</code>, and <code>onUnmount</code> events
              </p>
              <div className="lifecycle-log" ref={logRef}>
                {logs.map((log, i) => (
                  <div key={i} className="log-entry">{log}</div>
                ))}
                {logs.length === 0 && (
                  <span className="text-muted">Waiting for events...</span>
                )}
              </div>
            </Card>

            <Card>
              <h4>Key Concepts</h4>
              <div className="stack-xs text-small text-muted">
                <p>
                  <strong>watch()</strong> observes a Cubit from outside React. Here it auto-saves items to localStorage on every state change.
                </p>
                <p>
                  <strong>Manual dependencies</strong> let you explicitly define what triggers a re-render, like <code>useEffect</code> deps. TodoList only re-renders when filtered results change.
                </p>
                <p>
                  <strong>Action-only</strong> pattern: QuickAdd never reads TodoCubit state, so it's immune to state changes. Watch its render counter — it only increments from its own local input state.
                </p>
                <p>
                  <strong>onMount / onUnmount</strong> hooks fire when a component first connects to (or disconnects from) a Cubit instance.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
