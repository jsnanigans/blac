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
  searchQuery: string;
  previousStates: Map<string, any>;
};
class LayoutBloc extends Cubit<LayoutState> {
  constructor() {
    super({
      selectedId: null,
      instances: [],
      connected: false,
      searchQuery: '',
      previousStates: new Map(),
    });
  }

  onDispose() {
    console.log('[LayoutBloc] Disposed');
    comm.disconnect();
  }

  setInstances = (instances: InstanceData[]) => {
    const prev = new Map(this.state.previousStates);

    // Store current as previous before updating
    instances.forEach((inst) => {
      const current = this.state.instances.find((i) => i.id === inst.id);
      if (
        current &&
        JSON.stringify(current.state) !== JSON.stringify(inst.state)
      ) {
        prev.set(inst.id, structuredClone(current.state));
      }
    });

    this.patch({ instances, previousStates: prev });
  };

  setSelectedId = (instance: string | null) => {
    this.patch({ selectedId: instance });
  };

  setConnected = (connected: boolean) => {
    this.patch({ connected });
  };

  setSearchQuery = (query: string) => {
    this.patch({ searchQuery: query });
  };

  get selected() {
    return (
      this.state.instances.find((inst) => inst.id === this.state.selectedId) ||
      null
    );
  }

  get filteredInstances() {
    const query = this.state.searchQuery.toLowerCase();

    const filtered = this.state.instances.filter(
      (inst) =>
        !query ||
        inst.className.toLowerCase().includes(query) ||
        inst.id.toLowerCase().includes(query),
    );

    // Sort by className to group them together
    return filtered.sort((a, b) => a.className.localeCompare(b.className));
  }

  get diff() {
    if (!this.selected) return null;
    const previous = this.state.previousStates.get(this.selected.id);
    if (!previous) return null;

    return { previous, current: this.selected.state };
  }
}

// Generate consistent color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

function App() {
  const [{ instances, connected, searchQuery }, _bloc] = useBloc(
    LayoutBloc,
    {
      onMount: (b) => {
        const { setInstances, setConnected } = b as LayoutBloc;
        comm.connect();
        comm.onMessage((message) => {
          console.log('[App] Received message:', message);
          switch (message.type) {
            case 'INITIAL_STATE':
            case 'STATE_UPDATE':
            case 'SYNC':
            case 'REFRESH_RESPONSE':
              if (message.payload?.instances) {
                setInstances(message.payload.instances);
                setConnected(true);
              }
              break;

            case 'CACHED_STATE':
              if (message.payload?.instances) {
                setInstances(message.payload.instances);
              }
              break;
          }
        });
      },
    },
  );
  const bloc = _bloc as LayoutBloc;

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
            display: 'flex',
            flexDirection: 'column',
            background: '#1e1e1e',
          }}
        >
          {/* Search Input */}
          <div style={{ padding: '10px', borderBottom: '1px solid #444' }}>
            <input
              type="text"
              placeholder="Filter instances..."
              value={searchQuery}
              onChange={(e) => bloc.setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#3c3c3c',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Instance List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {instances.length === 0 ? (
              <div
                style={{ padding: '20px', color: '#888', textAlign: 'center' }}
              >
                No instances detected
              </div>
            ) : bloc.filteredInstances.length === 0 ? (
              <div
                style={{ padding: '20px', color: '#888', textAlign: 'center' }}
              >
                No matches found
              </div>
            ) : (
              bloc.filteredInstances.map((instance: InstanceData) => (
                <div
                  key={instance.id}
                  onClick={() => bloc.setSelectedId(instance.id)}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #333',
                    borderLeft: `4px solid ${stringToColor(instance.className)}`,
                    cursor: 'pointer',
                    background:
                      bloc.selected?.id === instance.id
                        ? '#094771'
                        : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (bloc.selected?.id !== instance.id) {
                      e.currentTarget.style.background = '#252526';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (bloc.selected?.id !== instance.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <InstanceId id={instance.id} />
                    {instance.isDisposed && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: '#f44336',
                          borderRadius: '3px',
                        }}
                      >
                        DISPOSED
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* State Viewer */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {bloc.selected ? (
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
                <InstanceId id={bloc.selected.id} />
              </h2>

              {bloc.diff ? (
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                    State Diff (Previous vs Current)
                  </h3>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Previous State */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: '#f44336',
                        }}
                      >
                        Previous
                      </div>
                      <pre
                        style={{
                          background: '#252526',
                          padding: '15px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'Monaco, Consolas, monospace',
                          overflow: 'auto',
                          border: '1px solid #f44336',
                        }}
                      >
                        {JSON.stringify(bloc.diff.previous, null, 2)}
                      </pre>
                    </div>

                    {/* Current State */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: '#4caf50',
                        }}
                      >
                        Current
                      </div>
                      <pre
                        style={{
                          background: '#252526',
                          padding: '15px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'Monaco, Consolas, monospace',
                          overflow: 'auto',
                          border: '1px solid #4caf50',
                        }}
                      >
                        {JSON.stringify(bloc.diff.current, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
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
                    {JSON.stringify(bloc.selected.state, null, 2)}
                  </pre>
                </div>
              )}
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
