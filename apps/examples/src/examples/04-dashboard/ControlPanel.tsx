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
    <div className="card card-subtle control-panel-card">
      <h3>Control Panel</h3>
      <div className="control-panel-grid">
        <button onClick={dashboard.updateUserMetrics}>👥 Update Users</button>
        <button onClick={dashboard.updateOrderMetrics}>📦 Update Orders</button>
        <button onClick={dashboard.updateRevenueMetrics}>
          💰 Update Revenue
        </button>
        <button onClick={dashboard.updateSystemMetrics}>
          ⚙️ Update System
        </button>
        <button
          onClick={dashboard.toggleAutoUpdate}
          className={`${state.isAutoUpdating ? 'danger' : 'success'} control-panel-toggle`}
        >
          {state.isAutoUpdating
            ? '⏸️ Stop Auto-Update'
            : '▶️ Start Auto-Update'}
        </button>
      </div>

      <div className="info-note">
        <strong>💡 Pro Tip:</strong> Open your browser console and click the
        buttons above. Notice how ONLY the widgets that access the changed
        metrics re-render!
        <br />
        <br />
        Example: Click "Update Users" - only UserMetricsWidget re-renders, NOT
        orders, revenue, or system widgets. This is automatic - no manual
        optimization needed!
      </div>
    </div>
  );
}
