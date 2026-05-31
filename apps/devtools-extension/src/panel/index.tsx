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
} from '@blac/devtools-ui';
import comm, { type AtomicEvent } from './comm';

function App() {
  return (
    <DevToolsPanel
      onMount={(instancesBloc: DevToolsInstancesBloc) => {
        const diffBloc = acquire(DevToolsDiffBloc, {});
        const logsBloc = acquire(DevToolsLogsBloc, {});

        let currentSessionId: string | null = null;

        const resetAll = () => {
          flushSync(() => {
            instancesBloc.setConnected(false);
            instancesBloc.setAllInstances([]);
            diffBloc.clearAllPreviousStates();
            logsBloc.clearLogs();
          });
        };

        // Apply a single atomic event to the panel blocs. Called from inside a
        // coalesced flushSync (see below).
        const applyAtomicEvent = (event: AtomicEvent) => {
          switch (event.type) {
            case 'init': {
              diffBloc.clearAllPreviousStates();
              logsBloc.clearLogs();
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
              logsBloc.addLog('init', '__system__', 'System', 'DevTools', {
                instanceCount: initInstances.length,
              });
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
                createdFrom: d.createdFrom,
              });
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
                  d.paths,
                );
              }
              instancesBloc.updateInstanceState(d.id, d.state, d.getters);
              logsBloc.addLog(
                'state-changed',
                d.id,
                d.className,
                d.name,
                { previousState: current?.state, newState: d.state },
                d.callstack,
                d.trigger?.name,
                d.paths,
              );
              break;
            }

            case 'refs-changed': {
              const d = event.data;
              instancesBloc.updateRefs(d.instanceId, d.refIds, d.refHolders);
              break;
            }
          }
        };

        // Coalesce atomic events into one synchronous flush per microtask.
        // flushSync forces the panel to repaint immediately even when the
        // devtools document is backgrounded — where React's normal scheduler is
        // throttled, which is what made updates appear only every few seconds.
        // The producer already rAF-coalesces upstream, so batching per microtask
        // keeps this to one render per burst.
        let atomicQueue: AtomicEvent[] = [];
        let atomicFlushScheduled = false;

        const flushAtomicQueue = () => {
          atomicFlushScheduled = false;
          if (atomicQueue.length === 0) return;
          const batch = atomicQueue;
          atomicQueue = [];
          flushSync(() => {
            for (const event of batch) applyAtomicEvent(event);
          });
        };

        comm.onDisconnect(() => {
          // Soft disconnect: surface the "Waiting for page" banner but keep the
          // last-known instances/logs so a transient stall doesn't blank the
          // panel. A real page reload arrives with a new sessionId on the next
          // INITIAL_STATE and triggers resetAll() there.
          flushSync(() => {
            instancesBloc.setConnected(false);
          });
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
              // Only mark as disconnected — session ID in the next INITIAL_STATE
              // decides whether to actually reset (full reload) or just reconnect (SPA nav)
              flushSync(() => {
                instancesBloc.setConnected(false);
              });
              break;

            case 'BLAC_NOT_AVAILABLE':
              flushSync(() => {
                instancesBloc.setConnected(false);
                instancesBloc.setAllInstances([]);
              });
              break;

            case 'INITIAL_STATE': {
              comm.receivedData();
              const incomingSessionId = message.payload?.sessionId ?? null;
              const sessionChanged =
                currentSessionId !== null &&
                incomingSessionId !== null &&
                incomingSessionId !== currentSessionId;

              if (sessionChanged) {
                resetAll();
              }
              currentSessionId = incomingSessionId;

              const isFirstConnect = !instancesBloc.state.connected;

              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                  instancesBloc.setConnected(true);
                  for (const inst of message.payload.instances) {
                    if (inst.history?.length) {
                      diffBloc.loadInstanceHistory(inst.id, inst.history);
                    }
                  }
                });
              }

              // Only replay event history on first connect to avoid duplicating logs
              if (isFirstConnect && message.payload?.eventHistory) {
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
                        { initialState: event.data.state },
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
                        (event.data as any).paths,
                      );
                    }
                  });
                });
              }
              break;
            }

            case 'ATOMIC_UPDATE': {
              comm.receivedData();
              if (!message.payload) break;
              atomicQueue.push(message.payload);
              if (!atomicFlushScheduled) {
                atomicFlushScheduled = true;
                queueMicrotask(flushAtomicQueue);
              }
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
