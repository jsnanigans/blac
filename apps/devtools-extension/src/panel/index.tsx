/**
 * DevTools Panel - Chrome DevTools integration
 */

import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  DevToolsPanel,
  DevToolsInstancesBloc,
  DevToolsDiffBloc,
} from '@blac/devtools-ui';
import comm from './comm';

function App() {
  return (
    <DevToolsPanel
      onMount={(instancesBloc: DevToolsInstancesBloc) => {
        console.log('[Panel] DevToolsPanel mounted');

        // Get the DiffBloc for storing previous states (safe now that all blocs are initialized)
        const diffBloc = DevToolsDiffBloc.get('default');

        comm.connect();
        comm.onMessage((message) => {
          console.log('[Panel] Received message:', message);
          switch (message.type) {
            case 'INITIAL_STATE':
              // Initial load - set all instances at once
              if (message.payload?.instances) {
                flushSync(() => {
                  instancesBloc.setAllInstances(message.payload.instances);
                  instancesBloc.setConnected(true);
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
                  case 'instance-created':
                    console.log(
                      `[Panel] Adding instance: ${event.data.className}#${event.data.id}`,
                    );
                    instancesBloc.addInstance({
                      id: event.data.id,
                      className: event.data.className,
                      name: event.data.name,
                      isDisposed: event.data.isDisposed,
                      state: event.data.state,
                      lastStateChangeTimestamp: event.timestamp,
                      createdAt: event.timestamp,
                    });
                    break;

                  case 'instance-disposed':
                    console.log(`[Panel] Removing instance: ${event.data.id}`);
                    instancesBloc.removeInstance(event.data.id);
                    // Clear previous state as well
                    diffBloc.clearPreviousState(event.data.id);
                    break;

                  case 'instance-updated':
                    console.log(
                      `[Panel] Updating instance: ${event.data.className}#${event.data.id}`,
                    );
                    // Get current instance to capture previous state
                    const currentInstance = instancesBloc.getInstance(
                      event.data.id,
                    );
                    if (currentInstance) {
                      // Store previous state in DiffBloc
                      diffBloc.storePreviousState(
                        event.data.id,
                        currentInstance.state,
                      );
                    }
                    // Update instance with new state
                    instancesBloc.updateInstanceState(
                      event.data.id,
                      event.data.state,
                    );
                    break;
                }
              });
              break;
          }
        });
      }}
      onUnmount={() => {
        console.log('[Panel] Unmounted');
        comm.disconnect();
      }}
    />
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
