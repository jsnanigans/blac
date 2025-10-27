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
      <section className="stack-lg">
        <div className="dashboard-top-grid">
          <ControlPanel />
          <StatusWidget />
        </div>
      </section>

      <section className="stack-lg">
        <div className="section-heading">
          <h2>👥 User Metrics</h2>
          <span className="section-subtitle">
            Only re-renders when user data changes
          </span>
        </div>
        <UserMetricsWidget />
      </section>

      <section className="stack-lg">
        <div className="section-heading">
          <h2>📦 Order Metrics</h2>
          <span className="section-subtitle">
            Only re-renders when order data changes
          </span>
        </div>
        <OrderMetricsWidget />
      </section>

      <section className="stack-lg">
        <div className="section-heading">
          <h2>💰 Revenue Metrics</h2>
          <span className="section-subtitle">
            Only re-renders when revenue data changes
          </span>
        </div>
        <RevenueMetricsWidget />
      </section>

      <section className="stack-lg">
        <div className="section-heading">
          <h2>⚙️ System Metrics</h2>
          <span className="section-subtitle">
            Only re-renders when system data changes
          </span>
        </div>
        <SystemMetricsWidget />
      </section>

      <section className="stack-lg">
        <h2>The Magic Explained</h2>
        <div className="card card-subtle narrative-card">
          <h3>How Traditional React Works:</h3>
          <ul className="features-list">
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
          <ul className="features-list">
            <li>State updates → Blac tracks which properties each component accessed</li>
            <li>Only components that accessed changed properties re-render</li>
            <li>No manual optimization needed</li>
            <li>Works with nested objects and arrays automatically</li>
            <li>
              <strong>Result: Zero boilerplate, perfect optimization by default</strong>
            </li>
          </ul>

          <h3>See It In Action:</h3>
          <ol className="sequence-list">
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

          <div className="callout-banner">
            🎯 This is the power of Blac: Optimal performance by default, with zero manual
            optimization. Your components automatically become perfectly optimized.
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
