import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { Scenario2_Dashboard_BlaC } from './scenarios/Scenario2_Dashboard_BlaC';
import { Scenario2_Dashboard_Unoptimized } from './scenarios/Scenario2_Dashboard_Unoptimized';

/**
 * Performance Benchmark Demo
 *
 * Demonstrates BlaC's automatic dependency tracking vs React's manual optimization.
 * BlaC automatically tracks which state properties each component accesses and
 * only re-renders components when their specific dependencies change.
 */
export function PerformanceBenchmarkDemo() {
  return (
    <ExampleLayout
      title="Performance Benchmark"
      description="BlaC's automatic tracking vs React's manual optimization"
      features={[
        'Watch RenderCounter badges to see which components re-render',
        'BlaC: Automatic selective re-rendering without optimization code',
        'React: All components re-render unless manually optimized',
        'Try the "Update Random Metric" button to see the difference',
        'Enable "Auto Update" to see continuous performance differences',
      ]}
    >
      {/* Introduction */}
      <section className="stack-md">
        <Card>
          <div className="stack-sm">
            <h2>Dashboard Benchmark: Independent State Properties</h2>
            <p className="text-muted">
              This benchmark showcases BlaC's core strength:{' '}
              <strong>automatic dependency tracking</strong>. Each dashboard
              widget accesses a different state property (CPU, Memory, Disk,
              etc.). Watch the render counters when you update a single metric.
            </p>
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                borderLeft: '4px solid var(--color-primary)',
              }}
            >
              <p
                className="text-small"
                style={{ fontWeight: 500, marginBottom: '0.5rem' }}
              >
                <strong>🎯 The Key Difference:</strong>
              </p>
              <ul className="text-small" style={{ marginBottom: 0 }}>
                <li>
                  <strong>BlaC:</strong> Tracks that CPUWidget only accesses
                  state.cpu, MemoryWidget only accesses state.memory, etc.
                </li>
                <li>
                  <strong>React:</strong> Doesn't track dependencies - when
                  state changes, ALL components re-render
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Two-column comparison */}
      <section className="stack-md">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {/* BlaC Implementation */}
          <Card>
            <div className="stack-sm">
              <div
                style={{
                  padding: 'var(--space-sm)',
                  backgroundColor: 'var(--color-success)',
                  color: 'white',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                BlaC (Automatic Tracking)
              </div>
              <Scenario2_Dashboard_BlaC />
            </div>
          </Card>

          {/* Unoptimized React Implementation */}
          <Card>
            <div className="stack-sm">
              <div
                style={{
                  padding: 'var(--space-sm)',
                  backgroundColor: 'var(--color-danger)',
                  color: 'white',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                React (No Optimization)
              </div>
              <Scenario2_Dashboard_Unoptimized />
            </div>
          </Card>
        </div>
      </section>

      {/* Comparison table */}
      <section className="stack-md">
        <h2>Performance Comparison</h2>
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-sm)', textAlign: 'left' }}>
                    Implementation
                  </th>
                  <th style={{ padding: 'var(--space-sm)', textAlign: 'left' }}>
                    Renders on "Update Random Metric"
                  </th>
                  <th style={{ padding: 'var(--space-sm)', textAlign: 'left' }}>
                    Code Complexity
                  </th>
                  <th style={{ padding: 'var(--space-sm)', textAlign: 'left' }}>
                    Manual Optimization Needed?
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    <strong style={{ color: 'var(--color-success)' }}>
                      BlaC
                    </strong>
                  </td>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    <strong>1 widget</strong> (only the changed metric)
                    <div className="text-xs text-muted">
                      1 component re-renders
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-sm)' }}>Simple</td>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    ✅ <strong>None</strong> - automatic tracking
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    <strong style={{ color: 'var(--color-danger)' }}>
                      React (Unoptimized)
                    </strong>
                  </td>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    <strong>16 widgets</strong> (all widgets re-render)
                    <div className="text-xs text-muted">
                      16x more work than necessary!
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-sm)' }}>Simple</td>
                  <td style={{ padding: 'var(--space-sm)' }}>
                    ❌ Would need React.memo, useCallback, context splitting,
                    etc.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Explanation */}
      <section className="stack-md">
        <h2>Why This Matters</h2>
        <Card>
          <div className="stack-md">
            <div className="stack-sm">
              <h3>The React Performance Challenge</h3>
              <p className="text-small text-muted">
                In React, when state changes, all child components re-render by
                default. To optimize:
              </p>
              <ul className="stack-xs">
                <li className="text-small">
                  <strong>React.memo:</strong> Wrap each widget component
                </li>
                <li className="text-small">
                  <strong>useCallback:</strong> Memoize all event handlers
                </li>
                <li className="text-small">
                  <strong>useMemo:</strong> Memoize computed values
                </li>
                <li className="text-small">
                  <strong>Context splitting:</strong> Separate contexts for
                  different state slices
                </li>
              </ul>
              <p className="text-small text-muted">
                This adds significant complexity and mental overhead to your
                codebase.
              </p>
            </div>

            <div className="stack-sm">
              <h3>The BlaC Advantage</h3>
              <p className="text-small text-muted">
                BlaC automatically tracks which state properties each component
                accesses:
              </p>
              <ul className="stack-xs">
                <li className="text-small">
                  <strong>CPUWidget accesses state.cpu:</strong> Only re-renders
                  when cpu changes
                </li>
                <li className="text-small">
                  <strong>MemoryWidget accesses state.memory:</strong> Only
                  re-renders when memory changes
                </li>
                <li className="text-small">
                  <strong>No optimization code:</strong> It just works
                  automatically
                </li>
                <li className="text-small">
                  <strong>Same simplicity:</strong> Write code as if performance
                  doesn't matter
                </li>
              </ul>
            </div>

            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                borderLeft: '4px solid var(--color-success)',
              }}
            >
              <p className="text-small" style={{ fontWeight: 500 }}>
                ✨ <strong>The Magic:</strong> BlaC uses Proxy objects to track
                property access during render. When state.cpu is accessed, BlaC
                knows that component depends on the cpu property. Later, when
                cpu changes, only components that accessed cpu will re-render.
                No manual dependency arrays, no optimization wrappers - it's
                automatic!
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Try it yourself */}
      <section className="stack-md">
        <h2>Try It Yourself</h2>
        <Card>
          <div className="stack-sm">
            <ol className="stack-xs">
              <li className="text-small">
                <strong>Click "Update Random Metric"</strong> in both dashboards
              </li>
              <li className="text-small">
                <strong>Watch the blue RenderCounter badges</strong> in the
                top-right of each widget
              </li>
              <li className="text-small">
                <strong>BlaC:</strong> Only ONE badge flashes orange and
                increments (e.g., CPU: 2→3)
              </li>
              <li className="text-small">
                <strong>React:</strong> ALL 16 badges flash orange and increment
                simultaneously
              </li>
              <li className="text-small">
                <strong>Try "Auto Update":</strong> BlaC stays smooth while
                React shows constant flashing
              </li>
            </ol>

            <div
              style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                borderLeft: '4px solid var(--color-warning)',
              }}
            >
              <p
                className="text-small"
                style={{ fontWeight: 500, marginBottom: '0.5rem' }}
              >
                💡 <strong>Understanding the Render Counters:</strong>
              </p>
              <ul className="text-small" style={{ marginBottom: 0 }}>
                <li>
                  <strong>Blue badge:</strong> Normal state - shows total render
                  count
                </li>
                <li>
                  <strong>Orange flash:</strong> Component just re-rendered
                </li>
                <li>
                  <strong>Counter increments:</strong> Each re-render increases
                  the number
                </li>
                <li>
                  <strong>BlaC dashboard:</strong> You'll see isolated flashes
                  on single widgets
                </li>
                <li>
                  <strong>React dashboard:</strong> You'll see ALL widgets flash
                  together (wasteful!)
                </li>
              </ul>
            </div>

            <div
              style={{
                marginTop: 'var(--space-sm)',
                padding: 'var(--space-md)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                borderLeft: '4px solid var(--color-primary)',
              }}
            >
              <p className="text-small" style={{ fontWeight: 500 }}>
                🚀 <strong>Pro tip:</strong> Enable "Auto Update" on both
                dashboards simultaneously to see how BlaC maintains smooth
                performance while React shows constant unnecessary flashing
                across all 16 widgets.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}
