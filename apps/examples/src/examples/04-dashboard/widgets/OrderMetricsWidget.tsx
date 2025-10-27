import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { MetricWidget } from './MetricWidget';

/**
 * Widget that ONLY accesses order metrics.
 * Will ONLY re-render when ordersToday, pendingOrders, or completedOrders change.
 * Will NOT re-render when users, revenue, or system metrics change!
 */
export function OrderMetricsWidget() {
  const [state] = useBloc(DashboardBloc);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
      <MetricWidget
        title="Orders Today"
        value={state.ordersToday.toLocaleString()}
        icon="📦"
        color="var(--primary)"
        componentName="OrdersTodayWidget"
      />
      <MetricWidget
        title="Pending"
        value={state.pendingOrders.toLocaleString()}
        icon="⏳"
        color="#f59e0b"
        componentName="PendingOrdersWidget"
      />
      <MetricWidget
        title="Completed"
        value={state.completedOrders.toLocaleString()}
        icon="✅"
        color="var(--secondary)"
        componentName="CompletedOrdersWidget"
      />
    </div>
  );
}
