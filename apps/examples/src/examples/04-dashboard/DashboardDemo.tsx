import { ExampleLayout } from '../../shared/ExampleLayout';
import { PerformanceOverlay } from '../../shared/components';
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
 * 4. RenderCounters visually show which components re-render
 * 5. Console logs prove the granular updates
 *
 * Traditional React would require:
 * - React.memo on every widget component
 * - useMemo for every derived value
 * - useCallback for every update function
 * - Careful prop drilling and context splitting
 * - Still might have issues with object references
 *
 * With BlaC: It just works. Zero boilerplate.
 */
export function DashboardDemo() {
  return (
    <ExampleLayout
      title="Real-Time Dashboard"
      description="The power of automatic dependency tracking - preventing unnecessary re-renders"
      features={[
        'RenderCounters show which widgets re-render (watch the badges!)',
        'Each widget ONLY re-renders when its accessed metrics change',
        'Update Users → Only user widgets re-render',
        'Update Orders → Only order widgets re-render',
        'Zero manual optimization - no React.memo, useMemo, or useCallback needed!',
        'Performance overlay shows real-time FPS',
      ]}
    >
      {/* Performance Overlay */}
      <PerformanceOverlay position="top-right" detailed />

      {/* Control Section */}
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <ControlPanel />
          <StatusWidget />
        </div>
      </section>

      {/* User Metrics Section */}
      <section className="stack-md">
        <div>
          <h2>👥 User Metrics</h2>
          <p className="text-small text-muted">
            Only re-renders when user data changes
          </p>
        </div>
        <UserMetricsWidget />
      </section>

      {/* Order Metrics Section */}
      <section className="stack-md">
        <div>
          <h2>📦 Order Metrics</h2>
          <p className="text-small text-muted">
            Only re-renders when order data changes
          </p>
        </div>
        <OrderMetricsWidget />
      </section>

      {/* Revenue Metrics Section */}
      <section className="stack-md">
        <div>
          <h2>💰 Revenue Metrics</h2>
          <p className="text-small text-muted">
            Only re-renders when revenue data changes
          </p>
        </div>
        <RevenueMetricsWidget />
      </section>

      {/* System Metrics Section */}
      <section className="stack-md">
        <div>
          <h2>⚙️ System Metrics</h2>
          <p className="text-small text-muted">
            Only re-renders when system data changes
          </p>
        </div>
        <SystemMetricsWidget />
      </section>

      {/* Explanation Section */}
      <section className="stack-md">
        <h2>The Magic Explained</h2>
        <div className="card">
          <div className="stack-md">
            <div className="stack-sm">
              <h3>How Traditional React Works:</h3>
              <ul className="stack-xs">
                <li className="text-small">
                  State updates → ALL connected components re-render
                </li>
                <li className="text-small">
                  Need React.memo() on every widget to prevent re-renders
                </li>
                <li className="text-small">
                  Need useMemo() for every derived value
                </li>
                <li className="text-small">
                  Need useCallback() for every function
                </li>
                <li className="text-small">
                  Still might re-render due to object reference changes
                </li>
                <li className="text-small">
                  <strong>
                    Result: Tons of boilerplate and easy to get wrong
                  </strong>
                </li>
              </ul>
            </div>

            <div className="stack-sm">
              <h3>How BlaC Works:</h3>
              <ul className="stack-xs">
                <li className="text-small">
                  State updates → BlaC tracks which properties each component
                  accessed
                </li>
                <li className="text-small">
                  Only components that accessed changed properties re-render
                </li>
                <li className="text-small">No manual optimization needed</li>
                <li className="text-small">
                  Works with nested objects and arrays automatically
                </li>
                <li className="text-small">
                  <strong>
                    Result: Zero boilerplate, perfect optimization by default
                  </strong>
                </li>
              </ul>
            </div>

            <div className="stack-sm">
              <h3>See It In Action:</h3>
              <ol className="stack-xs">
                <li className="text-small">
                  <strong>Open browser console</strong> to see component render
                  logs
                </li>
                <li className="text-small">
                  <strong>Click "Update Users"</strong> - only the 3 user metric
                  widgets re-render
                </li>
                <li className="text-small">
                  <strong>Click "Update Orders"</strong> - only the 3 order
                  metric widgets re-render
                </li>
                <li className="text-small">
                  <strong>Notice</strong> the RenderCounters (badges in
                  top-right) only increment for affected widgets
                </li>
                <li className="text-small">
                  <strong>Try auto-update mode</strong> - watch selective
                  re-renders happen in real-time!
                </li>
              </ol>
            </div>

            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                borderLeft: '4px solid var(--color-primary)',
              }}
            >
              <p className="text-small" style={{ fontWeight: 500 }}>
                🎯 This is the power of BlaC: Optimal performance by default,
                with zero manual optimization. Your components automatically
                become perfectly optimized.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
