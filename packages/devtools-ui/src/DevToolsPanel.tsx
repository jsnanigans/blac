/**
 * DevTools Panel - Reusable UI component for both Chrome DevTools and in-app overlay
 */

import React from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import InstanceId from './components/InstanceId';
import type { InstanceData, DevToolsUIProps } from './types';

// Layout Bloc
type LayoutState = {
  selectedId: string | null;
  instances: InstanceData[];
  connected: boolean;
  searchQuery: string;
  previousStates: Map<string, any>;
};

export class LayoutBloc extends Cubit<LayoutState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   * (DevTools tracking itself)
   */
  static __excludeFromDevTools = true;

  constructor() {
    super({
      selectedId: null,
      instances: [],
      connected: false,
      searchQuery: '',
      previousStates: new Map(),
    });
  }

  setInstances = (instances: InstanceData[]) => {
    console.log(`[LayoutBloc] setInstances called with ${instances.length} instances:`,
      instances.map((i) => `${i.className}#${i.id}`)
    );

    const prev = new Map(this.state.previousStates);
    const stateChanges: string[] = [];

    // Store current as previous before updating
    instances.forEach((inst) => {
      const current = this.state.instances.find((i) => i.id === inst.id);
      if (
        current &&
        JSON.stringify(current.state) !== JSON.stringify(inst.state)
      ) {
        prev.set(inst.id, structuredClone(current.state));
        stateChanges.push(`${inst.className}#${inst.id}`);
      }
    });

    if (stateChanges.length > 0) {
      console.log(`[LayoutBloc] Detected state changes in ${stateChanges.length} instance(s):`, stateChanges);
    }

    this.patch({ instances, previousStates: prev });
    console.log(`[LayoutBloc] Updated to ${this.state.instances.length} instances, ${prev.size} have previous states`);
  };

  setSelectedId = (instance: string | null) => {
    console.log(`[LayoutBloc] Selected instance changed to:`, instance);
    this.patch({ selectedId: instance });
  };

  setConnected = (connected: boolean) => {
    console.log(`[LayoutBloc] Connection status changed to:`, connected ? 'CONNECTED' : 'DISCONNECTED');
    this.patch({ connected });
  };

  setSearchQuery = (query: string) => {
    console.log(`[LayoutBloc] Search query changed to:`, query);
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

export function DevToolsPanel({ onMount, onUnmount }: DevToolsUIProps) {
  const [{ instances, connected, searchQuery }, _bloc] = useBloc(LayoutBloc, {
    onMount: (b) => {
      console.log('[DevToolsPanel] Component mounted, LayoutBloc created');
      onMount(b as LayoutBloc);
    },
    onUnmount: () => {
      console.log('[DevToolsPanel] Component unmounting');
      onUnmount?.();
    },
  });
  const bloc = _bloc as LayoutBloc;

  // Log when instances change
  React.useEffect(() => {
    console.log(`[DevToolsPanel] Instances updated (${instances.length} total):`,
      instances.map((i) => `${i.className}#${i.id}`)
    );
  }, [instances]);

  console.log(bloc.filteredInstances)

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
