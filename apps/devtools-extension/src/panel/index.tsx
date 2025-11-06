/**
 * DevTools Panel - Main UI for BlaC DevTools
 */

import ReactDOM from 'react-dom/client';
import InstanceId from './components/InstanceId';
import { Cubit } from '@blac/core';
import comm, { InstanceData } from './comm';
import { useBloc } from '@blac/react';

// Layout Bloc
type LayoutState = {
  selectedId: string | null;
  instances: InstanceData[];
  connected: boolean;
};
class LayoutBloc extends Cubit<LayoutState> {
  constructor() {
    super({ selectedId: null, instances: [], connected: false });
  }

  onDispose() {
    console.log('[LayoutBloc] Disposed');
    comm.disconnect();
  }

  setInstances = (instances: InstanceData[]) => {
    this.patch({ instances });
  };

  setSelectedId = (instance: string | null) => {
    this.patch({ selectedId: instance });
  };

  setConnected = (connected: boolean) => {
    this.patch({ connected });
  };

  get selected() {
    return (
      this.state.instances.find((inst) => inst.id === this.state.selectedId) ||
      null
    );
  }
}

function App() {
  const [{ instances, connected }, { setSelectedId: setSelected, selected }] =
    useBloc(LayoutBloc, {
      onMount: (bloc) => {
        comm.connect();
        comm.onMessage((message) => {
          console.log('[App] Received message:', message);
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
      },
    });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #444',
          background: '#252526',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>BlaC DevTools</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#4CAF50' : '#f44336',
            }}
          />
          <span style={{ fontSize: '12px' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {instances.length} instances
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Instance List */}
        <div
          style={{
            width: '300px',
            borderRight: '1px solid #444',
            overflow: 'auto',
            background: '#1e1e1e',
          }}
        >
          {instances.length === 0 ? (
            <div
              style={{ padding: '20px', color: '#888', textAlign: 'center' }}
            >
              No instances detected
            </div>
          ) : (
            instances.map((instance: InstanceData) => (
              <div
                key={instance.id}
                onClick={() => setSelected(instance.id)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selected === instance ? '#2d2d30' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selected !== instance) {
                    e.currentTarget.style.background = '#252526';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selected !== instance) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  <InstanceId id={instance.id} />
                </div>
                {instance.isDisposed && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#f44336',
                      marginTop: '4px',
                    }}
                  >
                    DISPOSED
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* State Viewer */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {selected ? (
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
                <InstanceId id={selected.id} />
              </h2>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                Current State
              </h3>
              <pre
                style={{
                  background: '#252526',
                  padding: '15px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(selected.state, null, 2)}
              </pre>
            </div>
          ) : (
            <div
              style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}
            >
              Select an instance to view its state
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
