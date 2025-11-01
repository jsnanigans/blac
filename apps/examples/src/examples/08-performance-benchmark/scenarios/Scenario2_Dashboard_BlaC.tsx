import { useBloc } from '@blac/react';
import { DashboardBloc } from './Scenario2_DashboardBloc';
import { RenderCounter, Button, Card } from '../../../shared/components';

/**
 * Individual metric widgets that ONLY access their specific state property.
 * BlaC automatically tracks which property each widget accesses.
 */
function CPUWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="CPU" />
        <div className="text-xs text-muted">CPU Usage</div>
        <div className="text-lg font-bold">{state.cpu.toFixed(1)}%</div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${state.cpu}%`,
              height: '100%',
              background:
                state.cpu > 80
                  ? '#dc2626'
                  : state.cpu > 60
                    ? '#f59e0b'
                    : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function MemoryWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Memory" />
        <div className="text-xs text-muted">Memory Usage</div>
        <div className="text-lg font-bold">{state.memory.toFixed(1)}%</div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${state.memory}%`,
              height: '100%',
              background:
                state.memory > 80
                  ? '#dc2626'
                  : state.memory > 60
                    ? '#f59e0b'
                    : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function DiskWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Disk" />
        <div className="text-xs text-muted">Disk Usage</div>
        <div className="text-lg font-bold">{state.disk.toFixed(1)}%</div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${state.disk}%`,
              height: '100%',
              background:
                state.disk > 80
                  ? '#dc2626'
                  : state.disk > 60
                    ? '#f59e0b'
                    : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function NetworkWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Network" />
        <div className="text-xs text-muted">Network Usage</div>
        <div className="text-lg font-bold">{state.network.toFixed(1)} Mbps</div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(state.network, 100)}%`,
              height: '100%',
              background: '#3b82f6',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function TemperatureWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Temperature" />
        <div className="text-xs text-muted">Temperature</div>
        <div className="text-lg font-bold">
          {state.temperature.toFixed(1)}°C
        </div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((state.temperature - 50) / 40) * 100}%`,
              height: '100%',
              background:
                state.temperature > 80
                  ? '#dc2626'
                  : state.temperature > 70
                    ? '#f59e0b'
                    : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function ProcessesWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Processes" />
        <div className="text-xs text-muted">Active Processes</div>
        <div className="text-lg font-bold">{state.processes}</div>
        <div
          className="text-xs"
          style={{ color: state.processes > 200 ? '#dc2626' : '#6b7280' }}
        >
          {state.processes > 200 ? 'High load' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function UptimeWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Uptime" />
        <div className="text-xs text-muted">Uptime</div>
        <div className="text-lg font-bold">{state.uptime.toFixed(2)}%</div>
        <div
          className="text-xs"
          style={{ color: state.uptime > 99 ? '#10b981' : '#f59e0b' }}
        >
          {state.uptime > 99.9
            ? 'Excellent'
            : state.uptime > 99
              ? 'Good'
              : 'Fair'}
        </div>
      </div>
    </Card>
  );
}

function LatencyWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Latency" />
        <div className="text-xs text-muted">Latency</div>
        <div className="text-lg font-bold">{state.latency.toFixed(0)}ms</div>
        <div
          className="text-xs"
          style={{
            color:
              state.latency < 20
                ? '#10b981'
                : state.latency < 50
                  ? '#f59e0b'
                  : '#dc2626',
          }}
        >
          {state.latency < 20 ? 'Fast' : state.latency < 50 ? 'Normal' : 'Slow'}
        </div>
      </div>
    </Card>
  );
}

function GPUWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="GPU" />
        <div className="text-xs text-muted">GPU Usage</div>
        <div className="text-lg font-bold">{state.gpu.toFixed(1)}%</div>
        <div
          style={{
            height: '4px',
            background: '#e5e5e5',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${state.gpu}%`,
              height: '100%',
              background:
                state.gpu > 80
                  ? '#dc2626'
                  : state.gpu > 60
                    ? '#f59e0b'
                    : '#8b5cf6',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function CacheWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Cache" />
        <div className="text-xs text-muted">Cache Hit Rate</div>
        <div className="text-lg font-bold">{state.cache.toFixed(1)}%</div>
        <div
          className="text-xs"
          style={{
            color:
              state.cache > 80
                ? '#10b981'
                : state.cache > 60
                  ? '#f59e0b'
                  : '#dc2626',
          }}
        >
          {state.cache > 80 ? 'Excellent' : state.cache > 60 ? 'Good' : 'Poor'}
        </div>
      </div>
    </Card>
  );
}

function SwapWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Swap" />
        <div className="text-xs text-muted">Swap Usage</div>
        <div className="text-lg font-bold">{state.swap.toFixed(1)}%</div>
        <div
          className="text-xs"
          style={{
            color:
              state.swap < 20
                ? '#10b981'
                : state.swap < 50
                  ? '#f59e0b'
                  : '#dc2626',
          }}
        >
          {state.swap < 20 ? 'Low' : state.swap < 50 ? 'Medium' : 'High'}
        </div>
      </div>
    </Card>
  );
}

function ThreadsWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Threads" />
        <div className="text-xs text-muted">Active Threads</div>
        <div className="text-lg font-bold">{state.threads}</div>
        <div
          className="text-xs"
          style={{ color: state.threads > 150 ? '#dc2626' : '#6b7280' }}
        >
          {state.threads > 150 ? 'High' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function BandwidthWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Bandwidth" />
        <div className="text-xs text-muted">Bandwidth</div>
        <div className="text-lg font-bold">
          {state.bandwidth.toFixed(0)} Mbps
        </div>
        <div
          className="text-xs"
          style={{ color: state.bandwidth > 300 ? '#10b981' : '#6b7280' }}
        >
          {state.bandwidth > 300 ? 'High speed' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function ErrorsWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Errors" />
        <div className="text-xs text-muted">Error Count</div>
        <div
          className="text-lg font-bold"
          style={{ color: state.errors > 10 ? '#dc2626' : '#6b7280' }}
        >
          {state.errors}
        </div>
        <div
          className="text-xs"
          style={{ color: state.errors > 10 ? '#dc2626' : '#10b981' }}
        >
          {state.errors > 10 ? 'Critical' : state.errors > 5 ? 'Warning' : 'OK'}
        </div>
      </div>
    </Card>
  );
}

function WarningsWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Warnings" />
        <div className="text-xs text-muted">Warning Count</div>
        <div
          className="text-lg font-bold"
          style={{ color: state.warnings > 30 ? '#f59e0b' : '#6b7280' }}
        >
          {state.warnings}
        </div>
        <div
          className="text-xs"
          style={{ color: state.warnings > 30 ? '#f59e0b' : '#10b981' }}
        >
          {state.warnings > 30 ? 'High' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function RequestsWidget() {
  const [state] = useBloc(DashboardBloc);
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Requests" />
        <div className="text-xs text-muted">Requests/min</div>
        <div className="text-lg font-bold">
          {state.requests.toLocaleString()}
        </div>
        <div
          className="text-xs"
          style={{ color: state.requests > 4000 ? '#10b981' : '#6b7280' }}
        >
          {state.requests > 4000 ? 'High traffic' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

/**
 * Dashboard benchmark using BlaC.
 * Each widget automatically tracks only the state property it accesses.
 * When CPU updates, only CPUWidget re-renders - no manual optimization needed!
 */
export function Scenario2_Dashboard_BlaC() {
  const [_state, bloc] = useBloc(DashboardBloc);

  return (
    <div className="stack-md">
      {/* Controls */}
      <div className="stack-sm">
        <div className="row-sm flex-wrap">
          <Button onClick={bloc.updateRandom} size="small">
            Update Random Metric
          </Button>
          <Button onClick={bloc.updateAll} size="small" variant="ghost">
            Update All
          </Button>
          <Button onClick={bloc.startAutoUpdate} size="small" variant="ghost">
            Auto Update
          </Button>
          <Button onClick={bloc.stopAutoUpdate} size="small" variant="ghost">
            Stop Auto
          </Button>
          <Button onClick={bloc.reset} size="small" variant="ghost">
            Reset
          </Button>
        </div>

        <div className="text-xs text-muted">
          🎯 <strong>BlaC:</strong> Click "Update Random Metric" - watch the
          render counters!
          <br />
          Only ONE widget's blue badge will flash orange and increment. The rest
          stay unchanged.
          <br />
          Each widget automatically tracks only its specific metric. Zero
          optimization code needed.
        </div>
      </div>

      {/* Dashboard grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-sm)',
        }}
      >
        <CPUWidget />
        <MemoryWidget />
        <GPUWidget />
        <DiskWidget />
        <NetworkWidget />
        <BandwidthWidget />
        <TemperatureWidget />
        <CacheWidget />
        <ProcessesWidget />
        <ThreadsWidget />
        <SwapWidget />
        <UptimeWidget />
        <LatencyWidget />
        <ErrorsWidget />
        <WarningsWidget />
        <RequestsWidget />
      </div>

      {/* Info */}
      <div className="text-xs text-muted">
        <strong>Implementation:</strong> BlaC with automatic tracking
        <br />
        <strong>Code:</strong> Simple, no optimization needed
        <br />
        <strong>Performance:</strong> Only changed widgets re-render
        automatically
      </div>
    </div>
  );
}
