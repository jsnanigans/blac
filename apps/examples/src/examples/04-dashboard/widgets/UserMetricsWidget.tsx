import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { MetricWidget } from './MetricWidget';

/**
 * Widget that ONLY accesses user metrics.
 * Will ONLY re-render when activeUsers, totalUsers, or newUsersToday change.
 * Will NOT re-render when orders, revenue, or system metrics change!
 */
export function UserMetricsWidget() {
  const [state] = useBloc(DashboardBloc);

  return (
    <div className="metric-grid">
      <MetricWidget
        title="Active Users"
        value={state.activeUsers.toLocaleString()}
        icon="👥"
        color="var(--primary)"
        componentName="ActiveUsersWidget"
      />
      <MetricWidget
        title="Total Users"
        value={state.totalUsers.toLocaleString()}
        icon="📈"
        color="var(--primary)"
        componentName="TotalUsersWidget"
      />
      <MetricWidget
        title="New Today"
        value={state.newUsersToday.toLocaleString()}
        icon="✨"
        color="var(--secondary)"
        componentName="NewUsersWidget"
      />
    </div>
  );
}
