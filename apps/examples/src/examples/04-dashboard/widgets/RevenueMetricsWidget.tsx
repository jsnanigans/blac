import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { MetricWidget } from './MetricWidget';

/**
 * Widget that ONLY accesses revenue metrics.
 * Will ONLY re-render when revenueToday, revenueThisWeek, or revenueThisMonth change.
 * Will NOT re-render when users, orders, or system metrics change!
 */
export function RevenueMetricsWidget() {
  const [state] = useBloc(DashboardBloc);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
      <MetricWidget
        title="Today"
        value={`$${state.revenueToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon="💰"
        color="var(--secondary)"
        componentName="RevenueTodayWidget"
      />
      <MetricWidget
        title="This Week"
        value={`$${state.revenueThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon="📊"
        color="var(--secondary)"
        componentName="RevenueWeekWidget"
      />
      <MetricWidget
        title="This Month"
        value={`$${state.revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon="💎"
        color="var(--secondary)"
        componentName="RevenueMonthWidget"
      />
    </div>
  );
}
