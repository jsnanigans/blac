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
import comm from './comm';

function App() {
  return (
    <DevToolsPanel
      onMount={(instancesBloc: DevToolsInstancesBloc) => {
        // Get the DiffBloc for storing previous states
        const diffBloc = acquire(DevToolsDiffBloc);

        // Get the LogsBloc for logging events
        const logsBloc = acquire(DevToolsLogsBloc);

        comm.connect();
        comm.onMessage((message) => {
          switch (message.type) {
            case 'PAGE_RELOAD':
              // Page is reloading - clear all state
              flushSync(() => {
                instancesBloc.setConnected(false);
                instancesBloc.setAllInstances([]);
                diffBloc.clearAllPreviousStates();
                logsBloc.clearLogs();
              });
              break;

            case 'BLAC_NOT_AVAILABLE':
              // BlaC is not on this page
              flushSync(() => {
                instancesBloc.setConnected(false);
                instancesBloc.setAllInstances([]);
              });
              break;

            case 'INITIAL_STATE':
              // Initial load - set all instances at once
              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                  instancesBloc.setConnected(true);
                });
              }
              // Process event history to populate logs
              if (message.payload?.eventHistory) {
                const eventHistory = message.payload.eventHistory;
                flushSync(() => {
                  eventHistory.forEach((event: any) => {
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
                      );
                    }
                  });
                });
              }
              break;

            case 'CACHED_STATE':
              // Cached state on reconnect - set all instances
              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                });
              }
              break;

            case 'ATOMIC_UPDATE':
              // Atomic update - handle specific change
              if (!message.payload) break;
              const event = message.payload;

              flushSync(() => {
                switch (event.type) {
                  case 'init':
                    // Clear all existing state
                    diffBloc.clearAllPreviousStates();
                    logsBloc.clearLogs();
                    // Set new instances from init event
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
                    // Log init event
                    logsBloc.addLog(
                      'init',
                      '__system__',
                      'System',
                      'DevTools',
                      { instanceCount: initInstances.length },
                    );
                    break;

                  case 'instance-created':
                    instancesBloc.addInstance({
                      id: event.data.id,
                      className: event.data.className,
                      name: event.data.name,
                      isDisposed: event.data.isDisposed,
                      state: event.data.state,
                      lastStateChangeTimestamp: event.timestamp,
                      createdAt: event.timestamp,
                    });
                    // Log instance creation
                    logsBloc.addLog(
                      'created',
                      event.data.id,
                      event.data.className,
                      event.data.name,
                      { initialState: event.data.state },
                    );
                    break;

                  case 'instance-disposed':
                    // Get instance info before removing for the log
                    const disposedInstance = instancesBloc.getInstance(
                      event.data.id,
                    );
                    instancesBloc.removeInstance(event.data.id);
                    // Clear previous state as well
                    diffBloc.clearPreviousState(event.data.id);
                    // Log disposal
                    if (disposedInstance) {
                      logsBloc.addLog(
                        'disposed',
                        event.data.id,
                        disposedInstance.className,
                        disposedInstance.name,
                      );
                    }
                    break;

                  case 'instance-updated':
                    // Get current instance to capture previous state
                    const currentInstance = instancesBloc.getInstance(
                      event.data.id,
                    );
                    if (currentInstance) {
                      // Store previous state in DiffBloc with callstack
                      diffBloc.storePreviousState(
                        event.data.id,
                        currentInstance.state,
                        event.data.callstack,
                      );
                    }
                    // Update instance with new state
                    instancesBloc.updateInstanceState(
                      event.data.id,
                      event.data.state,
                    );
                    // Log state change
                    logsBloc.addLog(
                      'state-changed',
                      event.data.id,
                      event.data.className,
                      event.data.name,
                      {
                        previousState: currentInstance?.state,
                        newState: event.data.state,
                      },
                      event.data.callstack,
                    );
                    break;
                }
              });
              break;
          }
        });
      }}
      onUnmount={() => {
        comm.disconnect();
      }}
    />
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
