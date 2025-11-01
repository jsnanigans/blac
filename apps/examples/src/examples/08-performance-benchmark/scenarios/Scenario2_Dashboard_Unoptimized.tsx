import { useState, useEffect } from 'react';
import { RenderCounter, Button, Card } from '../../../shared/components';

interface DashboardState {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  temperature: number;
  processes: number;
  uptime: number;
  latency: number;
  gpu: number;
  cache: number;
  swap: number;
  threads: number;
  bandwidth: number;
  errors: number;
  warnings: number;
  requests: number;
}

/**
 * Unoptimized React implementation - all widgets re-render on any state change.
 */
function CPUWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="CPU" />
        <div className="text-xs text-muted">CPU Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
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
              width: `${value}%`,
              height: '100%',
              background:
                value > 80 ? '#dc2626' : value > 60 ? '#f59e0b' : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function MemoryWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Memory" />
        <div className="text-xs text-muted">Memory Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
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
              width: `${value}%`,
              height: '100%',
              background:
                value > 80 ? '#dc2626' : value > 60 ? '#f59e0b' : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function DiskWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Disk" />
        <div className="text-xs text-muted">Disk Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
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
              width: `${value}%`,
              height: '100%',
              background:
                value > 80 ? '#dc2626' : value > 60 ? '#f59e0b' : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function NetworkWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Network" />
        <div className="text-xs text-muted">Network Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)} Mbps</div>
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
              width: `${Math.min(value, 100)}%`,
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

function TemperatureWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Temperature" />
        <div className="text-xs text-muted">Temperature</div>
        <div className="text-lg font-bold">{value.toFixed(1)}°C</div>
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
              width: `${((value - 50) / 40) * 100}%`,
              height: '100%',
              background:
                value > 80 ? '#dc2626' : value > 70 ? '#f59e0b' : '#10b981',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function ProcessesWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Processes" />
        <div className="text-xs text-muted">Active Processes</div>
        <div className="text-lg font-bold">{value}</div>
        <div
          className="text-xs"
          style={{ color: value > 200 ? '#dc2626' : '#6b7280' }}
        >
          {value > 200 ? 'High load' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function UptimeWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Uptime" />
        <div className="text-xs text-muted">Uptime</div>
        <div className="text-lg font-bold">{value.toFixed(2)}%</div>
        <div
          className="text-xs"
          style={{ color: value > 99 ? '#10b981' : '#f59e0b' }}
        >
          {value > 99.9 ? 'Excellent' : value > 99 ? 'Good' : 'Fair'}
        </div>
      </div>
    </Card>
  );
}

function LatencyWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Latency" />
        <div className="text-xs text-muted">Latency</div>
        <div className="text-lg font-bold">{value.toFixed(0)}ms</div>
        <div
          className="text-xs"
          style={{
            color: value < 20 ? '#10b981' : value < 50 ? '#f59e0b' : '#dc2626',
          }}
        >
          {value < 20 ? 'Fast' : value < 50 ? 'Normal' : 'Slow'}
        </div>
      </div>
    </Card>
  );
}

function GPUWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="GPU" />
        <div className="text-xs text-muted">GPU Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
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
              width: `${value}%`,
              height: '100%',
              background:
                value > 80 ? '#dc2626' : value > 60 ? '#f59e0b' : '#8b5cf6',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function CacheWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Cache" />
        <div className="text-xs text-muted">Cache Hit Rate</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
        <div
          className="text-xs"
          style={{
            color: value > 80 ? '#10b981' : value > 60 ? '#f59e0b' : '#dc2626',
          }}
        >
          {value > 80 ? 'Excellent' : value > 60 ? 'Good' : 'Poor'}
        </div>
      </div>
    </Card>
  );
}

function SwapWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Swap" />
        <div className="text-xs text-muted">Swap Usage</div>
        <div className="text-lg font-bold">{value.toFixed(1)}%</div>
        <div
          className="text-xs"
          style={{
            color: value < 20 ? '#10b981' : value < 50 ? '#f59e0b' : '#dc2626',
          }}
        >
          {value < 20 ? 'Low' : value < 50 ? 'Medium' : 'High'}
        </div>
      </div>
    </Card>
  );
}

function ThreadsWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Threads" />
        <div className="text-xs text-muted">Active Threads</div>
        <div className="text-lg font-bold">{value}</div>
        <div
          className="text-xs"
          style={{ color: value > 150 ? '#dc2626' : '#6b7280' }}
        >
          {value > 150 ? 'High' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function BandwidthWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Bandwidth" />
        <div className="text-xs text-muted">Bandwidth</div>
        <div className="text-lg font-bold">{value.toFixed(0)} Mbps</div>
        <div
          className="text-xs"
          style={{ color: value > 300 ? '#10b981' : '#6b7280' }}
        >
          {value > 300 ? 'High speed' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function ErrorsWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Errors" />
        <div className="text-xs text-muted">Error Count</div>
        <div
          className="text-lg font-bold"
          style={{ color: value > 10 ? '#dc2626' : '#6b7280' }}
        >
          {value}
        </div>
        <div
          className="text-xs"
          style={{ color: value > 10 ? '#dc2626' : '#10b981' }}
        >
          {value > 10 ? 'Critical' : value > 5 ? 'Warning' : 'OK'}
        </div>
      </div>
    </Card>
  );
}

function WarningsWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Warnings" />
        <div className="text-xs text-muted">Warning Count</div>
        <div
          className="text-lg font-bold"
          style={{ color: value > 30 ? '#f59e0b' : '#6b7280' }}
        >
          {value}
        </div>
        <div
          className="text-xs"
          style={{ color: value > 30 ? '#f59e0b' : '#10b981' }}
        >
          {value > 30 ? 'High' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

function RequestsWidget({ value }: { value: number }) {
  return (
    <Card>
      <div className="stack-xs">
        <RenderCounter name="Requests" />
        <div className="text-xs text-muted">Requests/min</div>
        <div className="text-lg font-bold">{value.toLocaleString()}</div>
        <div
          className="text-xs"
          style={{ color: value > 4000 ? '#10b981' : '#6b7280' }}
        >
          {value > 4000 ? 'High traffic' : 'Normal'}
        </div>
      </div>
    </Card>
  );
}

/**
 * Unoptimized React implementation.
 * ALL widgets re-render when ANY metric changes.
 */
export function Scenario2_Dashboard_Unoptimized() {
  const [state, setState] = useState<DashboardState>({
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 23,
    temperature: 65,
    processes: 142,
    uptime: 99.9,
    latency: 12,
    gpu: 38,
    cache: 54,
    swap: 12,
    threads: 87,
    bandwidth: 156,
    errors: 3,
    warnings: 12,
    requests: 2847,
  });

  const [intervalIds, setIntervalIds] = useState<NodeJS.Timeout[]>([]);

  const updateRandom = () => {
    const metrics: (keyof DashboardState)[] = [
      'cpu',
      'memory',
      'disk',
      'network',
      'gpu',
      'cache',
      'swap',
      'temperature',
      'processes',
      'threads',
      'uptime',
      'latency',
      'bandwidth',
      'errors',
      'warnings',
      'requests',
    ];
    const metric = metrics[Math.floor(Math.random() * metrics.length)];

    setState((prev) => ({
      ...prev,
      [metric]:
        metric === 'processes'
          ? 100 + Math.floor(Math.random() * 200)
          : metric === 'threads'
            ? 50 + Math.floor(Math.random() * 150)
            : metric === 'temperature'
              ? 50 + Math.random() * 40
              : metric === 'uptime'
                ? 95 + Math.random() * 5
                : metric === 'latency'
                  ? 5 + Math.random() * 50
                  : metric === 'bandwidth'
                    ? 50 + Math.random() * 450
                    : metric === 'errors'
                      ? Math.floor(Math.random() * 20)
                      : metric === 'warnings'
                        ? Math.floor(Math.random() * 50)
                        : metric === 'requests'
                          ? 1000 + Math.floor(Math.random() * 5000)
                          : Math.random() * 100,
    }));
  };

  const updateAll = () => {
    setState({
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      temperature: 50 + Math.random() * 40,
      processes: 100 + Math.floor(Math.random() * 200),
      uptime: 95 + Math.random() * 5,
      latency: 5 + Math.random() * 50,
      gpu: Math.random() * 100,
      cache: Math.random() * 100,
      swap: Math.random() * 100,
      threads: 50 + Math.floor(Math.random() * 150),
      bandwidth: 50 + Math.random() * 450,
      errors: Math.floor(Math.random() * 20),
      warnings: Math.floor(Math.random() * 50),
      requests: 1000 + Math.floor(Math.random() * 5000),
    });
  };

  const startAutoUpdate = () => {
    stopAutoUpdate();
    const ids = [
      setInterval(
        () => setState((prev) => ({ ...prev, cpu: Math.random() * 100 })),
        800,
      ),
      setInterval(
        () => setState((prev) => ({ ...prev, memory: Math.random() * 100 })),
        1500,
      ),
      setInterval(
        () => setState((prev) => ({ ...prev, network: Math.random() * 100 })),
        400,
      ),
      setInterval(
        () =>
          setState((prev) => ({ ...prev, latency: 5 + Math.random() * 50 })),
        600,
      ),
      setInterval(
        () => setState((prev) => ({ ...prev, gpu: Math.random() * 100 })),
        900,
      ),
      setInterval(
        () =>
          setState((prev) => ({
            ...prev,
            requests: 1000 + Math.floor(Math.random() * 5000),
          })),
        300,
      ),
      setInterval(
        () =>
          setState((prev) => ({
            ...prev,
            bandwidth: 50 + Math.random() * 450,
          })),
        500,
      ),
    ];
    setIntervalIds(ids);
  };

  const stopAutoUpdate = () => {
    intervalIds.forEach(clearInterval);
    setIntervalIds([]);
  };

  const reset = () => {
    stopAutoUpdate();
    setState({
      cpu: 45,
      memory: 62,
      disk: 78,
      network: 23,
      temperature: 65,
      processes: 142,
      uptime: 99.9,
      latency: 12,
      gpu: 38,
      cache: 54,
      swap: 12,
      threads: 87,
      bandwidth: 156,
      errors: 3,
      warnings: 12,
      requests: 2847,
    });
  };

  useEffect(() => {
    return () => {
      intervalIds.forEach(clearInterval);
    };
  }, [intervalIds]);

  return (
    <div className="stack-md">
      {/* Controls */}
      <div className="stack-sm">
        <div className="row-sm flex-wrap">
          <Button onClick={updateRandom} size="small">
            Update Random Metric
          </Button>
          <Button onClick={updateAll} size="small" variant="ghost">
            Update All
          </Button>
          <Button onClick={startAutoUpdate} size="small" variant="ghost">
            Auto Update
          </Button>
          <Button onClick={stopAutoUpdate} size="small" variant="ghost">
            Stop Auto
          </Button>
          <Button onClick={reset} size="small" variant="ghost">
            Reset
          </Button>
        </div>

        <div className="text-xs text-muted">
          ⚠️ <strong>Unoptimized React:</strong> Click "Update Random Metric" -
          watch ALL badges flash orange!
          <br />
          ALL 16 widget counters increment on EVERY change. This creates massive
          unnecessary work.
          <br />
          Every widget re-renders on any state change. Enable Auto Update to see
          the performance hit!
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
        <CPUWidget value={state.cpu} />
        <MemoryWidget value={state.memory} />
        <GPUWidget value={state.gpu} />
        <DiskWidget value={state.disk} />
        <NetworkWidget value={state.network} />
        <BandwidthWidget value={state.bandwidth} />
        <TemperatureWidget value={state.temperature} />
        <CacheWidget value={state.cache} />
        <ProcessesWidget value={state.processes} />
        <ThreadsWidget value={state.threads} />
        <SwapWidget value={state.swap} />
        <UptimeWidget value={state.uptime} />
        <LatencyWidget value={state.latency} />
        <ErrorsWidget value={state.errors} />
        <WarningsWidget value={state.warnings} />
        <RequestsWidget value={state.requests} />
      </div>

      {/* Info */}
      <div className="text-xs text-muted">
        <strong>Implementation:</strong> Plain React useState
        <br />
        <strong>Code:</strong> Simple but inefficient
        <br />
        <strong>Performance:</strong> ALL widgets re-render on any change (watch
        it lag!)
      </div>
    </div>
  );
}
