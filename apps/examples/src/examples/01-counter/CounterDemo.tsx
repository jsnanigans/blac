import { ExampleLayout } from '../../shared/ExampleLayout';
import { CounterView } from './CounterView';
import { CounterStats } from './CounterStats';

/**
 * Counter example demonstrating Blac fundamentals.
 *
 * This example shows:
 * 1. Basic Cubit usage
 * 2. Automatic dependency tracking
 * 3. Instance management (shared vs isolated)
 * 4. Lifecycle hooks
 */
export function CounterDemo() {
  return (
    <ExampleLayout
      title="Counter Example"
      description="Introduction to Blac's core concepts with a simple counter"
      features={[
        'Basic Cubit state container',
        'Automatic dependency tracking - components only re-render when accessed properties change',
        'Instance management - shared vs isolated counters',
        'Lifecycle hooks - see console for mount/unmount logs',
      ]}
    >
      <section className="mb-3">
        <h2>Shared Instance</h2>
        <p className="text-muted mb-2">
          Both components below use the same counter instance. Changes in one are
          reflected in the other.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <CounterView label="Counter A" />
          <CounterView label="Counter B" />
        </div>
        <div className="mt-2">
          <CounterStats />
        </div>
      </section>

      <section className="mb-3">
        <h2>Isolated Instances</h2>
        <p className="text-muted mb-2">
          Each counter below has its own independent state using instanceKey.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <CounterView label="Counter 1" instanceKey="counter-1" />
            <CounterStats instanceKey="counter-1" />
          </div>
          <div>
            <CounterView label="Counter 2" instanceKey="counter-2" />
            <CounterStats instanceKey="counter-2" />
          </div>
        </div>
      </section>

      <section>
        <h2>Key Takeaways</h2>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li>
            <strong>Automatic tracking:</strong> CounterView only re-renders when
            <code>count</code> changes, CounterStats only when
            <code>incrementCount</code>, <code>decrementCount</code>, or
            <code>lastAction</code> change
          </li>
          <li>
            <strong>No manual optimization:</strong> No useMemo, useCallback, or memo
            needed - Blac handles it automatically via Proxies
          </li>
          <li>
            <strong>Instance management:</strong> Default instances are shared, use
            <code>instanceKey</code> for isolated state
          </li>
          <li>
            <strong>Lifecycle hooks:</strong> Open your browser console to see
            mount/unmount logs
          </li>
        </ul>
      </section>
    </ExampleLayout>
  );
}
