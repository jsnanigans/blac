import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { Card, Badge, RenderCounter } from '../../../shared/components';

/**
 * Widget that ONLY accesses lastUpdated and isAutoUpdating.
 * Will NOT re-render when ANY metric changes, only when update status changes!
 */
export function StatusWidget() {
  const [state] = useBloc(DashboardBloc);

  console.log(`  ↳ [StatusWidget] Rendered`);

  const timeAgo = Math.floor((Date.now() - state.lastUpdated) / 1000);

  return (
    <Card>
      <div className="stack-sm" style={{ position: 'relative' }}>
        <RenderCounter name="Status" />

        <div className="flex-between">
          <h3>Dashboard Status</h3>
          <Badge variant={state.isAutoUpdating ? 'success' : 'default'}>
            {state.isAutoUpdating ? '🔄 Live' : '⏸️ Paused'}
          </Badge>
        </div>

        <div className="stack-xs">
          <div className="row-sm">
            <span className="text-muted">Last update:</span>
            <span style={{ fontWeight: 500 }}>{timeAgo}s ago</span>
          </div>

          <p className="text-xs text-muted">
            💡 This widget only re-renders when update status changes, not when
            metrics change
          </p>
        </div>
      </div>
    </Card>
  );
}
