import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { MetricWidget } from './MetricWidget';

/**
 * Widget that ONLY accesses system metrics.
 * Will ONLY re-render when cpuUsage, memoryUsage, or diskUsage change.
 * Will NOT re-render when users, orders, or revenue metrics change!
 */
export function SystemMetricsWidget() {
  const [state] = useBloc(DashboardBloc);

  return (
    <div className="metric-grid">
      <MetricWidget
        title="CPU Usage"
        value={`${state.cpuUsage}%`}
        icon="⚙️"
        color={state.cpuUsage > 80 ? 'var(--danger)' : 'var(--primary)'}
        componentName="CPUWidget"
      />
      <MetricWidget
        title="Memory"
        value={`${state.memoryUsage}%`}
        icon="💾"
        color={state.memoryUsage > 80 ? 'var(--danger)' : 'var(--primary)'}
        componentName="MemoryWidget"
      />
      <MetricWidget
        title="Disk"
        value={`${state.diskUsage}%`}
        icon="💿"
        color={state.diskUsage > 80 ? 'var(--danger)' : 'var(--primary)'}
        componentName="DiskWidget"
      />
    </div>
  );
}
