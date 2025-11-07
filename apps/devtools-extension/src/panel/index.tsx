/**
 * DevTools Panel - Chrome DevTools integration
 */

import ReactDOM from 'react-dom/client';
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
            case 'STATE_UPDATE':
            case 'SYNC':
            case 'REFRESH_RESPONSE':
              if (message.payload?.instances) {
                bloc.setInstances(message.payload.instances);
                bloc.setConnected(true);
              }
              break;

            case 'CACHED_STATE':
              if (message.payload?.instances) {
                bloc.setInstances(message.payload.instances);
              }
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
