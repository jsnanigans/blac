import { ExampleLayout } from '../../shared/ExampleLayout';
import { CounterView } from './CounterView';
import { CounterStats } from './CounterStats';

/**
 * Counter example demonstrating BlaC fundamentals.
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
      title="Counter"
      description="Learn BlaC's core concepts with a simple counter. See how automatic dependency tracking and instance management work."
      features={[
        'Basic Cubit state container',
        'Automatic dependency tracking',
        'Shared vs isolated instances',
        'Lifecycle hooks (check console)',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Shared Instance</h2>
          <p className="text-muted">
            Both counters below share the same state. Changes in one are
            reflected in the other.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <CounterView label="Counter A" />
          <CounterView label="Counter B" />
        </div>

        <CounterStats />
      </section>

      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Isolated Instances</h2>
          <p className="text-muted">
            Each counter has its own independent state using instanceId.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div className="stack-md">
            <CounterView label="Counter 1" instanceKey="counter-1" />
            <CounterStats instanceKey="counter-1" />
          </div>
          <div className="stack-md">
            <CounterView label="Counter 2" instanceKey="counter-2" />
            <CounterStats instanceKey="counter-2" />
          </div>
        </div>
      </section>

      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Automatic tracking:</strong> CounterView only re-renders
            when <code>count</code> changes. CounterStats only re-renders when{' '}
            <code>incrementCount</code>, <code>decrementCount</code>, or{' '}
            <code>lastAction</code> change.
          </p>
          <p>
            • <strong>No manual optimization:</strong> No useMemo, useCallback,
            or memo needed - BlaC handles it automatically via Proxies.
          </p>
          <p>
            • <strong>Instance management:</strong> Default instances are
            shared. Use <code>instanceId</code> for isolated state.
          </p>
          <p>
            • <strong>Lifecycle hooks:</strong> Open browser console to see
            disposal logs.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
