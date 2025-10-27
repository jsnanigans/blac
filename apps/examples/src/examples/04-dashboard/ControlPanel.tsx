import { useBloc } from '@blac/react';
import { DashboardBloc } from './DashboardBloc';

/**
 * Control panel for manually updating specific metric groups.
 * This component ONLY accesses isAutoUpdating, so it won't re-render
 * when metrics change, only when auto-update status changes.
 */
export function ControlPanel() {
  const [state, dashboard] = useBloc(DashboardBloc);

  return (
    <div className="card" style={{ background: 'var(--gray-50)' }}>
      <h3 style={{ marginBottom: '1rem' }}>Control Panel</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <button
          onClick={dashboard.updateUserMetrics}
          style={{ padding: '0.75rem' }}
        >
          👥 Update Users
        </button>
        <button
          onClick={dashboard.updateOrderMetrics}
          style={{ padding: '0.75rem' }}
        >
          📦 Update Orders
        </button>
        <button
          onClick={dashboard.updateRevenueMetrics}
          style={{ padding: '0.75rem' }}
        >
          💰 Update Revenue
        </button>
        <button
          onClick={dashboard.updateSystemMetrics}
          style={{ padding: '0.75rem' }}
        >
          ⚙️ Update System
        </button>
        <button
          onClick={dashboard.toggleAutoUpdate}
          className={state.isAutoUpdating ? 'danger' : 'success'}
          style={{ padding: '0.75rem', gridColumn: 'span 2' }}
        >
          {state.isAutoUpdating ? '⏸️ Stop Auto-Update' : '▶️ Start Auto-Update'}
        </button>
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'white',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
        }}
      >
        <strong>💡 Pro Tip:</strong> Open your browser console and click the buttons above.
        Notice how ONLY the widgets that access the changed metrics re-render!
        <br />
        <br />
        Example: Click "Update Users" - only UserMetricsWidget re-renders, NOT orders,
        revenue, or system widgets. This is automatic - no manual optimization needed!
      </div>
    </div>
  );
}
