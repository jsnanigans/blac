import { useEffect, useRef, useState, useCallback } from 'react';
import { watch } from '@blac/core';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { TodoCubit, STORAGE_KEY } from './TodoCubit';
import { TodoList } from './TodoList';
import { TodoStats } from './TodoStats';
import { TodoToolbar } from './TodoToolbar';
import { QuickAdd } from './QuickAdd';

export function TodoDemo() {
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-50), `[${time}] ${msg}`]);
  }, []);

  // watch() observes the cubit from outside React. onActivate restores and
  // saves on the ownership edges; watch() covers every change in between.
  useEffect(() => {
    const unwatch = watch(TodoCubit, (bloc) => {
      const items = bloc.state.items;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      addLog(`watch: saved ${items.length} items to localStorage`);
    });
    return unwatch;
  }, [addLog]);

  // onMount / onUnmount lifecycle hooks. This shell owns the Cubit lifecycle
  // but reads no state (`select: () => []`), so it never re-renders from todo
  // changes — only its own local `logs` state. The filter bar, list, and stats
  // each read their own slice via their own useBloc call.
  useBloc(TodoCubit, {
    select: () => [],
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

  return (
    <ExampleLayout
      title="Todo List"
      description="A todo surface wired to the lifecycle hooks: onActivate restores from localStorage on the 0→1 ownership edge and saves on the way out, watch() persists every change in between, and QuickAdd never re-renders from state at all."
      features={[
        'onActivate(signal) restores on mount and saves on abort',
        'watch() persists from outside React',
        'onMount / onUnmount component-level hooks',
        'Action-only pattern (QuickAdd never re-renders from state)',
      ]}
    >
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <div className="stack-md">
            <Card>
              <div className="stack-md">
                <QuickAdd />
                <TodoToolbar />
                <TodoList />
              </div>
            </Card>

            <TodoStats />
          </div>

          <div className="stack-md">
            <Card>
              <h4>Lifecycle Log</h4>
              <p className="text-xs text-muted">
                Live log of <code>watch()</code>, <code>onMount</code>, and{' '}
                <code>onUnmount</code> events
              </p>
              <div className="lifecycle-log" ref={logRef}>
                {logs.map((log, i) => (
                  <div key={i} className="log-entry">
                    {log}
                  </div>
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
                  <strong>onActivate(signal)</strong> restores saved items when
                  the instance is first owned, and registers an abort listener
                  that writes them back when the last owner goes away. I/O
                  belongs here, not in the constructor.
                </p>
                <p>
                  <strong>watch()</strong> observes a Cubit from outside React.
                  Here it auto-saves items on every state change in between.
                </p>
                <p>
                  <strong>Manual dependencies</strong> let you explicitly define
                  what triggers a re-render, like <code>useEffect</code> deps.
                  TodoList only re-renders when filtered results change.
                </p>
                <p>
                  <strong>Action-only</strong> pattern: QuickAdd never reads
                  TodoCubit state, so it's immune to state changes. Watch its
                  render counter — it only increments from its own local input
                  state.
                </p>
                <p>
                  <strong>onMount / onUnmount</strong> hooks fire when a
                  component first connects to (or disconnects from) a Cubit
                  instance.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
