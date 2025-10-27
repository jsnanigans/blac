import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { useRef } from 'react';

/**
 * Widget that ONLY accesses lastUpdated and isAutoUpdating.
 * Will NOT re-render when ANY metric changes, only when update status changes!
 */
export function StatusWidget() {
  const [state] = useBloc(DashboardBloc);
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`  ↳ [StatusWidget] Rendered (${renderCount.current} times)`);

  const timeAgo = Math.floor((Date.now() - state.lastUpdated) / 1000);
  const statusClass = state.isAutoUpdating ? 'status-card is-live' : 'status-card';

  return (
    <article className={`card ${statusClass}`}>
      <div className="render-badge" title={`Rendered ${renderCount.current} times`}>
        {renderCount.current}
      </div>

      <div className="metric-body">
        <div className="metric-icon status-icon">
          {state.isAutoUpdating ? '🔄' : '⏸️'}
        </div>
        <div className="metric-info">
          <span className="widget-subtitle">Status</span>
          <span className="metric-value status-value">
            {state.isAutoUpdating ? 'Auto-Updating' : 'Paused'}
          </span>
          <span className="metric-subtitle">Last update: {timeAgo}s ago</span>
        </div>
      </div>
    </article>
  );
}
