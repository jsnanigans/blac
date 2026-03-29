/**
 * DevTools Panel - Chrome DevTools integration
 */

import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import { acquire } from '@blac/core';
import {
  DevToolsPanel,
  DevToolsInstancesBloc,
  DevToolsDiffBloc,
  DevToolsLogsBloc,
  DevToolsDependencyBloc,
  DevToolsMetricsBloc,
} from '@blac/devtools-ui';
import comm from './comm';

function estimateStateSize(state: any): number {
  try {
    return JSON.stringify(state)?.length ?? 0;
  } catch {
    return 0;
  }
}

function App() {
  return (
    <DevToolsPanel
      onMount={(instancesBloc: DevToolsInstancesBloc) => {
        const diffBloc = acquire(DevToolsDiffBloc);
        const logsBloc = acquire(DevToolsLogsBloc);
        const dependencyBloc = acquire(DevToolsDependencyBloc);
        const metricsBloc = acquire(DevToolsMetricsBloc);

        const resetAll = () => {
          flushSync(() => {
            instancesBloc.setConnected(false);
            instancesBloc.setAllInstances([]);
            diffBloc.clearAllPreviousStates();
            logsBloc.clearLogs();
            dependencyBloc.setEdges([]);
            metricsBloc.clearAll();
          });
        };

        comm.onDisconnect(() => {
          resetAll();
        });

        comm.connect();
        comm.onMessage((message) => {
          switch (message.type) {
            case 'PONG':
              comm.receivedPong();
              if (!instancesBloc.state.connected) {
                // We got a pong but panel thinks we're disconnected — re-request
                comm.sendMessage({ type: 'GET_INSTANCES' });
              }
              break;

            case 'PAGE_RELOAD':
              resetAll();
              break;

            case 'BLAC_NOT_AVAILABLE':
              flushSync(() => {
                instancesBloc.setConnected(false);
                instancesBloc.setAllInstances([]);
              });
              break;

            case 'INITIAL_STATE':
              comm.receivedData();
              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                  instancesBloc.setConnected(true);
                  for (const inst of message.payload.instances) {
                    if (inst.history?.length) {
                      diffBloc.loadInstanceHistory(inst.id, inst.history);
                    }
                    if (inst.dependencies?.length) {
                      dependencyBloc.addEdgesForInstance(
                        inst.id,
                        inst.dependencies,
                      );
                    }
                  }
                  // Load dependency graph edges from initial state dump
                  if (message.payload.dependencyGraph?.edges?.length) {
                    dependencyBloc.setEdges(
                      message.payload.dependencyGraph.edges,
                    );
                  }
                });
              }
              if (message.payload?.eventHistory) {
                flushSync(() => {
                  message.payload.eventHistory?.forEach((event: any) => {
                    if (event.type === 'init') {
                      logsBloc.addLog(
                        'init',
                        '__system__',
                        'System',
                        'DevTools',
                        {
                          instanceCount: Array.isArray(event.data)
                            ? event.data.length
                            : 0,
                        },
                      );
                    } else if (event.type === 'instance-created') {
                      logsBloc.addLog(
                        'created',
                        event.data.id,
                        event.data.className,
                        event.data.name,
                        {
                          initialState: event.data.state,
                        },
                      );
                    } else if (event.type === 'instance-disposed') {
                      logsBloc.addLog(
                        'disposed',
                        event.data.id,
                        event.data.className,
                        event.data.name,
                      );
                    } else if (event.type === 'instance-updated') {
                      logsBloc.addLog(
                        'state-changed',
                        event.data.id,
                        event.data.className,
                        event.data.name,
                        {
                          previousState: event.data.previousState,
                          newState: event.data.state || event.data.currentState,
                        },
                        event.data.callstack,
                        event.data.trigger?.name,
                      );
                    }
                  });
                });
              }
              break;

            case 'CACHED_STATE':
              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                });
              }
              break;

            case 'ATOMIC_UPDATE': {
              comm.receivedData();
              if (!message.payload) break;
              const event = message.payload;

              flushSync(() => {
                switch (event.type) {
                  case 'init': {
                    diffBloc.clearAllPreviousStates();
                    logsBloc.clearLogs();
                    dependencyBloc.setEdges([]);
                    metricsBloc.clearAll();
                    const initInstances = (
                      Array.isArray(event.data) ? event.data : []
                    ).map((inst: any) => ({
                      id: inst.id,
                      className: inst.className,
                      name: inst.name,
                      isDisposed: inst.isDisposed,
                      state: inst.state,
                      lastStateChangeTimestamp: event.timestamp,
                      createdAt: event.timestamp,
                    }));
                    instancesBloc.setAllInstances(initInstances);
                    logsBloc.addLog(
                      'init',
                      '__system__',
                      'System',
                      'DevTools',
                      {
                        instanceCount: initInstances.length,
                      },
                    );
                    break;
                  }

                  case 'instance-created': {
                    const d = event.data;
                    instancesBloc.addInstance({
                      id: d.id,
                      className: d.className,
                      name: d.name,
                      isDisposed: d.isDisposed,
                      state: d.state,
                      lastStateChangeTimestamp: event.timestamp,
                      createdAt: event.timestamp,
                      dependencies: d.dependencies,
                      consumers: d.consumers,
                    });
                    if (d.dependencies?.length) {
                      dependencyBloc.addEdgesForInstance(d.id, d.dependencies);
                    }
                    logsBloc.addLog('created', d.id, d.className, d.name, {
                      initialState: d.state,
                    });
                    break;
                  }

                  case 'instance-disposed': {
                    const d = event.data;
                    const disposedInst = instancesBloc.getInstance(d.id);
                    instancesBloc.removeInstance(d.id);
                    diffBloc.clearPreviousState(d.id);
                    dependencyBloc.removeEdgesForInstance(d.id);
                    metricsBloc.removeInstance(d.id);
                    if (disposedInst) {
                      logsBloc.addLog(
                        'disposed',
                        d.id,
                        disposedInst.className,
                        disposedInst.name,
                      );
                    }
                    break;
                  }

                  case 'instance-updated': {
                    const d = event.data;
                    const current = instancesBloc.getInstance(d.id);
                    if (current) {
                      diffBloc.storePreviousState(
                        d.id,
                        current.state,
                        d.callstack,
                        d.trigger?.name,
                      );
                    }
                    instancesBloc.updateInstanceState(d.id, d.state);
                    metricsBloc.recordUpdate(
                      d.id,
                      d.className,
                      estimateStateSize(d.state),
                    );
                    logsBloc.addLog(
                      'state-changed',
                      d.id,
                      d.className,
                      d.name,
                      { previousState: current?.state, newState: d.state },
                      d.callstack,
                      d.trigger?.name,
                    );
                    break;
                  }

                  case 'consumers-changed': {
                    const d = event.data;
                    instancesBloc.updateConsumers(d.instanceId, d.consumers);
                    break;
                  }
                }
              });
              break;
            }
          }
        });
      }}
      onUnmount={() => {
        comm.disconnect();
      }}
      onTimeTravel={(instanceId: string, state: any) =>
        comm.sendMessage({ type: 'TIME_TRAVEL', instanceId, state })
      }
    />
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
