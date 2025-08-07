import React from 'react';
import {
  Activity,
  Cpu,
  Database,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import {
  PerformanceMetrics,
  MemoryMetrics,
  performanceMonitor,
} from '../lib/performanceMonitor';

export function PerformanceMonitorPanel() {
  const [metrics, setMetrics] = React.useState<Map<string, PerformanceMetrics>>(
    new Map(),
  );
  const [memoryMetrics, setMemoryMetrics] = React.useState<MemoryMetrics[]>([]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    // Subscribe to metrics updates
    const unsubMetrics = performanceMonitor.onMetricsUpdate(setMetrics);
    const unsubMemory = performanceMonitor.onMemoryUpdate(setMemoryMetrics);

    // Get initial metrics
    setMetrics(performanceMonitor.getMetrics());
    setMemoryMetrics(performanceMonitor.getMemoryMetrics());

    return () => {
      unsubMetrics();
      unsubMemory();
    };
  }, []);

  const toggleExpanded = (blocName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(blocName)) {
        next.delete(blocName);
      } else {
        next.add(blocName);
      }
      return next;
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const latestMemory = memoryMetrics[memoryMetrics.length - 1];

  return (
    <div className="space-y-4">
      {/* Memory Usage */}
      {latestMemory && latestMemory.usedJSHeapSize && (
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Memory Usage</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground mb-1">Used Heap</p>
              <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {formatBytes(latestMemory.usedJSHeapSize)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Total Heap</p>
              <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                {formatBytes(latestMemory.totalJSHeapSize!)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Heap Limit</p>
              <p className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                {formatBytes(latestMemory.jsHeapSizeLimit!)}
              </p>
            </div>
          </div>
          {/* Memory usage bar */}
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500"
              style={{
                width: `${(latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit!) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bloc Metrics */}
      {metrics.size > 0 ? (
        <div className="space-y-2">
          {Array.from(metrics.values()).map((metric) => (
            <div key={metric.blocName} className="border rounded-lg bg-card">
              <div
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleExpanded(metric.blocName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      {metric.blocName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="font-mono">{metric.stateChanges}</span>
                      <span className="text-muted-foreground">updates</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-green-500" />
                      <span className="font-mono">{metric.listeners}</span>
                      <span className="text-muted-foreground">listeners</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-orange-500" />
                      <span className="font-mono">{metric.renderCount}</span>
                      <span className="text-muted-foreground">renders</span>
                    </div>
                  </div>
                </div>
              </div>

              {expanded.has(metric.blocName) && (
                <div className="border-t px-3 py-2 space-y-2">
                  {/* Average Update Time */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Average Update Time:
                    </span>
                    <span className="font-mono font-semibold">
                      {formatTime(metric.averageUpdateTime)}
                    </span>
                  </div>

                  {/* Recent Updates Timeline */}
                  {metric.updates.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Recent Updates:
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {metric.updates
                          .slice(-5)
                          .reverse()
                          .map((update, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs"
                            >
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-muted-foreground">
                                {(update.timestamp / 1000).toFixed(1)}s
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono">
                                {formatTime(update.duration)}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono truncate flex-1">
                                {JSON.stringify(update.state).substring(0, 50)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground bg-card">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No performance metrics yet</p>
          <p className="text-xs mt-1">Run your code to see metrics</p>
        </div>
      )}
    </div>
  );
}
