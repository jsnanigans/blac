/**
 * DevTools Panel - Chrome DevTools integration
 */

import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import { DevToolsPanel, LayoutBloc } from '@blac/devtools-ui';
import comm from './comm';

function App() {
  return (
    <DevToolsPanel
      onMount={(bloc: LayoutBloc) => {
        comm.connect();
        comm.onMessage((message) => {
          console.log('[Panel] Received message:', message);
          switch (message.type) {
            case 'INITIAL_STATE':
              // Initial load - set all instances at once
              if (message.payload?.instances) {
                flushSync(() => {
                  bloc.setAllInstances(message.payload.instances);
                  bloc.setConnected(true);
                });
              }
              break;

            case 'CACHED_STATE':
              // Cached state on reconnect - set all instances
              if (message.payload?.instances) {
                flushSync(() => {
                  bloc.setAllInstances(message.payload.instances);
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
                    console.log(`[Panel] Adding instance: ${event.data.className}#${event.data.id}`);
                    bloc.addInstance({
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
                    bloc.removeInstance(event.data.id);
                    break;

                  case 'instance-updated':
                    console.log(`[Panel] Updating instance: ${event.data.className}#${event.data.id}`);
                    const currentInstance = bloc.state.instances.find((i) => i.id === event.data.id);
                    const previousState = currentInstance?.state ?? null;
                    bloc.updateInstanceState(event.data.id, previousState, event.data.state);
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
