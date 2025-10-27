import { ExampleLayout } from '../../shared/ExampleLayout';
import { UserMetricsWidget } from './widgets/UserMetricsWidget';
import { OrderMetricsWidget } from './widgets/OrderMetricsWidget';
import { RevenueMetricsWidget } from './widgets/RevenueMetricsWidget';
import { SystemMetricsWidget } from './widgets/SystemMetricsWidget';
import { StatusWidget } from './widgets/StatusWidget';
import { ControlPanel } from './ControlPanel';

/**
 * Real-time dashboard demonstrating the POWER of automatic dependency tracking.
 *
 * This example shows:
 * 1. Multiple widgets accessing different parts of shared state
 * 2. Each widget ONLY re-renders when its accessed properties change
 * 3. Zero manual optimization needed (no React.memo, useMemo, useCallback)
 * 4. Render counters visually show which components re-render
 * 5. Console logs prove the granular updates
 *
 * Traditional React would require:
 * - React.memo on every widget component
 * - useMemo for every derived value
 * - useCallback for every update function
 * - Careful prop drilling and context splitting
 * - Still might have issues with object references
 *
 * With Blac: It just works. Zero boilerplate.
 */
export function DashboardDemo() {
  return (
    <ExampleLayout
      title="Real-time Dashboard"
      description="The power of automatic dependency tracking - preventing unnecessary re-renders"
      features={[
        'Render counters show which widgets re-render (green badge in top-right)',
        'Each widget ONLY re-renders when its accessed metrics change',
        'Update Users → Only user widgets re-render',
        'Update Orders → Only order widgets re-render',
        'Zero manual optimization - no React.memo, useMemo, or useCallback needed!',
      ]}
    >
      <section className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <ControlPanel />
          <StatusWidget />
        </div>
      </section>

      <section className="mb-3">
        <h2 style={{ marginBottom: '1rem' }}>
          👥 User Metrics
          <span className="text-small text-muted" style={{ marginLeft: '1rem', fontWeight: 'normal' }}>
            (Only re-renders when user data changes)
          </span>
        </h2>
        <UserMetricsWidget />
      </section>

      <section className="mb-3">
        <h2 style={{ marginBottom: '1rem' }}>
          📦 Order Metrics
          <span className="text-small text-muted" style={{ marginLeft: '1rem', fontWeight: 'normal' }}>
            (Only re-renders when order data changes)
          </span>
        </h2>
        <OrderMetricsWidget />
      </section>

      <section className="mb-3">
        <h2 style={{ marginBottom: '1rem' }}>
          💰 Revenue Metrics
          <span className="text-small text-muted" style={{ marginLeft: '1rem', fontWeight: 'normal' }}>
            (Only re-renders when revenue data changes)
          </span>
        </h2>
        <RevenueMetricsWidget />
      </section>

      <section className="mb-3">
        <h2 style={{ marginBottom: '1rem' }}>
          ⚙️ System Metrics
          <span className="text-small text-muted" style={{ marginLeft: '1rem', fontWeight: 'normal' }}>
            (Only re-renders when system data changes)
          </span>
        </h2>
        <SystemMetricsWidget />
      </section>

      <section>
        <h2>The Magic Explained</h2>
        <div className="card" style={{ background: 'var(--gray-50)' }}>
          <h3>How Traditional React Works:</h3>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>State updates → ALL connected components re-render</li>
            <li>Need React.memo() on every widget to prevent re-renders</li>
            <li>Need useMemo() for every derived value</li>
            <li>Need useCallback() for every function</li>
            <li>Still might re-render due to object reference changes</li>
            <li>
              <strong>Result: Tons of boilerplate and easy to get wrong</strong>
            </li>
          </ul>

          <h3>How Blac Works:</h3>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>State updates → Blac tracks which properties each component accessed</li>
            <li>Only components that accessed changed properties re-render</li>
            <li>No manual optimization needed</li>
            <li>Works with nested objects and arrays automatically</li>
            <li>
              <strong>Result: Zero boilerplate, perfect optimization by default</strong>
            </li>
          </ul>

          <h3>See It In Action:</h3>
          <ol style={{ marginLeft: '1.5rem' }}>
            <li>
              <strong>Open browser console</strong> to see component render logs
            </li>
            <li>
              <strong>Click "Update Users"</strong> - only the 3 user metric widgets re-render
            </li>
            <li>
              <strong>Click "Update Orders"</strong> - only the 3 order metric widgets re-render
            </li>
            <li>
              <strong>Notice</strong> the render counters (green badges) only increment for affected widgets
            </li>
            <li>
              <strong>Try auto-update mode</strong> - watch selective re-renders happen in real-time!
            </li>
          </ol>

          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius)',
              fontWeight: 'bold',
            }}
          >
            🎯 This is the power of Blac: Optimal performance by default, with zero manual
            optimization. Your components automatically become perfectly optimized.
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
