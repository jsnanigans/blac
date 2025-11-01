import { useBloc } from '@blac/react';
import { DashboardBloc } from './DashboardBloc';
import { Card, Button, RenderCounter } from '../../shared/components';

/**
 * Control panel for manually updating specific metric groups.
 * This component ONLY accesses isAutoUpdating, so it won't re-render
 * when metrics change, only when auto-update status changes.
 */
export function ControlPanel() {
  const [state, dashboard] = useBloc(DashboardBloc);

  console.log('  ↳ [ControlPanel] Rendered');

  return (
    <Card>
      <div className="stack-md" style={{ position: 'relative' }}>
        <RenderCounter name="Controls" />

        <h3>Control Panel</h3>

        <div className="grid grid-cols-2 gap-sm">
          <Button onClick={dashboard.updateUserMetrics} variant="ghost">
            👥 Update Users
          </Button>
          <Button onClick={dashboard.updateOrderMetrics} variant="ghost">
            📦 Update Orders
          </Button>
          <Button onClick={dashboard.updateRevenueMetrics} variant="ghost">
            💰 Update Revenue
          </Button>
          <Button onClick={dashboard.updateSystemMetrics} variant="ghost">
            ⚙️ Update System
          </Button>
        </div>

        <Button
          onClick={dashboard.toggleAutoUpdate}
          variant={state.isAutoUpdating ? 'danger' : 'success'}
          style={{ width: '100%' }}
        >
          {state.isAutoUpdating
            ? '⏸️ Stop Auto-Update'
            : '▶️ Start Auto-Update'}
        </Button>

        <div className="stack-xs">
          <p className="text-xs text-muted">
            <strong>💡 Pro Tip:</strong> Open your browser console and click the
            buttons above. Notice how ONLY the widgets that access the changed
            metrics re-render!
          </p>
          <p className="text-xs text-muted">
            Example: Click "Update Users" - only user metric widgets re-render,
            NOT orders, revenue, or system widgets. This is automatic - no
            manual optimization needed!
          </p>
        </div>
      </div>
    </Card>
  );
}
