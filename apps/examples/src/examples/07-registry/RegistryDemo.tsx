import { useState, useEffect } from 'react';
import { getPluginManager, getStats } from '@blac/core';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card, Button, RenderCounter } from '../../shared/components';
import { SharedCounterCubit } from './SharedCounterCubit';
import {
  registryPlugin,
  getRegistryEvents,
  onRegistryChange,
  clearRegistryEvents,
  type RegistryEvent,
} from './RegistryPlugin';

function useRegistryData() {
  const [events, setEvents] = useState<RegistryEvent[]>(getRegistryEvents);
  const [stats, setStats] = useState(getStats);

  useEffect(() => {
    const update = () => {
      setEvents(getRegistryEvents());
      setStats(getStats());
    };
    return onRegistryChange(update);
  }, []);

  return { events, stats };
}

function PerComponentCounter({
  id,
  onRemove,
}: {
  id: number;
  onRemove: () => void;
}) {
  const [state, bloc] = useBloc(SharedCounterCubit, {
    instanceId: String(id),
  });
  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="PerComponentCounter" />
        <div
          className="counter-display"
          style={{ fontSize: '2.5rem', padding: '1.25rem 0' }}
        >
          {state.count}
        </div>
        <div className="counter-controls" style={{ marginTop: '0.5rem' }}>
          <Button onClick={bloc.decrement}>−</Button>
          <Button onClick={bloc.increment} variant="primary">
            +
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={onRemove}
          style={{
            marginTop: '8px',
            fontSize: '0.75rem',
            padding: '4px 8px',
            color: 'var(--color-danger)',
            width: '100%',
          }}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}

function SharedCounterRow({
  instanceId,
  label,
}: {
  instanceId: string;
  label: string;
}) {
  const [state, bloc] = useBloc(SharedCounterCubit, { instanceId });
  return (
    <div className="shared-counter-row">
      <span className="text-small text-muted" style={{ flex: 1 }}>
        {label}
      </span>
      <span
        className="text-bold"
        style={{ minWidth: '2rem', textAlign: 'center' }}
      >
        {state.count}
      </span>
      <Button
        onClick={bloc.increment}
        variant="primary"
        style={{ padding: '4px 12px', fontSize: '0.8125rem' }}
      >
        +
      </Button>
    </div>
  );
}

function RegistryInspector() {
  const { events, stats } = useRegistryData();
  const breakdown = Object.entries(stats.typeBreakdown).filter(
    ([, count]) => count > 0,
  );

  return (
    <Card>
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h4>Live Registry</h4>
        <div className="row-xs">
          <span className="text-xs text-muted">
            {stats.totalInstances} active
          </span>
          <Button
            variant="ghost"
            onClick={clearRegistryEvents}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Clear log
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-md">
        <div className="stack-xs">
          <p className="text-xs text-muted" style={{ marginBottom: '4px' }}>
            <strong>Instance counts</strong> — updates on every create/dispose
          </p>
          {breakdown.length === 0 ? (
            <span className="text-small text-muted">No active instances</span>
          ) : (
            breakdown.map(([name, count]) => (
              <div key={name} className="registry-stat-row">
                <code style={{ fontSize: '0.75rem' }}>{name}</code>
                <span
                  className="badge primary"
                  style={{ fontSize: '0.6875rem' }}
                >
                  {count}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="analytics-log" style={{ maxHeight: '160px' }}>
          {events.length === 0 ? (
            <span className="text-muted">
              Add or remove counters to see events...
            </span>
          ) : (
            [...events].reverse().map((e, i) => (
              <div key={i} className="log-entry">
                <span
                  style={{
                    color:
                      e.type === 'created'
                        ? 'var(--color-success)'
                        : 'var(--color-danger)',
                    fontWeight: 600,
                  }}
                >
                  [{e.type}]
                </span>{' '}
                <span>{e.name}</span>{' '}
                <span style={{ opacity: 0.5 }}>{e.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

export function RegistryDemo() {
  const [ids, setIds] = useState<number[]>(() => [Date.now()]);

  useEffect(() => {
    const pm = getPluginManager();
    if (!pm.hasPlugin(registryPlugin.name)) {
      clearRegistryEvents();
      pm.install(registryPlugin);
    }
    return () => {
      if (pm.hasPlugin(registryPlugin.name)) {
        pm.uninstall(registryPlugin.name);
      }
    };
  }, []);

  const addCounter = () => setIds((prev) => [...prev, Date.now()]);
  const removeCounter = (id: number) =>
    setIds((prev) => prev.filter((i) => i !== id));

  return (
    <ExampleLayout
      title="Instance Registry"
      description="Instance lifecycle management — instanceId controls whether components share one instance or each own their own, all ref-counted automatically."
      features={[
        'Per-component instances — use a unique instanceId per component mount',
        'instanceId — multiple components share one ref-counted instance',
        'getStats() — live snapshot of every registered type and its instance count',
        'Plugin tracks created/disposed events so the registry updates in real time',
      ]}
    >
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <Card>
            <div className="stack-md">
              <div className="flex-between">
                <div className="stack-xs">
                  <h3>Per-Component</h3>
                  <p
                    className="text-small text-muted"
                    style={{ marginBottom: 0 }}
                  >
                    <code>instanceId</code> — each counter gets a unique ID so
                    it owns its own Cubit instance. Removing it disposes the
                    instance.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={addCounter}
                  style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                >
                  Add counter
                </Button>
              </div>
              <div className="instances-grid">
                {ids.map((id) => (
                  <PerComponentCounter
                    key={id}
                    id={id}
                    onRemove={() => removeCounter(id)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-md">
              <div className="stack-xs">
                <h3>Shared</h3>
                <p className="text-small text-muted">
                  <code>instanceId</code> — components with the same ID share
                  one Cubit. Increment in any row and all rows with that ID
                  update together.
                </p>
              </div>

              <div className="stack-md">
                <div className="stack-xs">
                  <span className="text-xs text-muted">
                    Group "alpha" — 3 components, 1 instance (refCount: 3)
                  </span>
                  {[1, 2, 3].map((i) => (
                    <SharedCounterRow
                      key={i}
                      instanceId="alpha"
                      label={`Component ${i}`}
                    />
                  ))}
                </div>
                <div className="stack-xs">
                  <span className="text-xs text-muted">
                    Group "beta" — 2 components, 1 instance (refCount: 2)
                  </span>
                  {[1, 2].map((i) => (
                    <SharedCounterRow
                      key={i}
                      instanceId="beta"
                      label={`Component ${i}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <RegistryInspector />

        <Card>
          <h4>Key Concepts</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Per-component instances</strong> — give each component a
              unique <code>instanceId</code> (e.g. a stable key) and it owns its
              own Cubit. The instance disposes automatically when that component
              unmounts. Add and remove counters above to see it in the live
              registry.
            </p>
            <p>
              <strong>Shared instanceId</strong> — instances are shared by key
              and ref-counted. All three "alpha" rows reference the same{' '}
              <code>SharedCounterCubit</code>. The refCount is 3; the instance
              disposes automatically when the last consumer unmounts.
            </p>
            <p>
              <strong>getStats()</strong> — returns a live snapshot of every
              registered type and its active instance count. The inspector above
              uses this to show real-time counts without any manual tracking.
            </p>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}
