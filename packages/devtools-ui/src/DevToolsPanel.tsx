/**
 * DevTools Panel - Reusable UI component for both Chrome DevTools and in-app overlay
 */

import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Viewer, Differ } from 'json-diff-kit';
import 'json-diff-kit/dist/viewer.css';
import JsonView from '@uiw/react-json-view';
import InstanceId from './components/InstanceId';
import type { InstanceData, DevToolsUIProps } from './types';

// Create a differ instance for state comparisons
const differ = new Differ();

/**
 * Fuzzy match scoring algorithm
 * Returns a score based on how well the query matches the text
 * Higher score = better match
 */
function fuzzyMatch(query: string, text: string): number {
  let score = 0;
  let queryIndex = 0;
  let textIndex = 0;
  let consecutiveMatches = 0;

  while (queryIndex < query.length && textIndex < text.length) {
    if (query[queryIndex] === text[textIndex]) {
      // Exact match
      queryIndex++;
      consecutiveMatches++;

      // Bonus for consecutive matches
      score += 1 + consecutiveMatches * 0.5;

      // Bonus for match at start
      if (textIndex === 0) score += 10;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }

  // Return 0 if not all characters in query were found
  if (queryIndex < query.length) return 0;

  // Normalize score by text length (shorter matches rank higher)
  return score / text.length;
}

// Layout Bloc
type LayoutState = {
  selectedId: string | null;
  instances: InstanceData[];
  connected: boolean;
  previousStates: Map<string, any>;
  searchQuery: string;
  // Track animation triggers: instanceId -> array of timestamps
  animationTriggers: Map<string, number[]>;
  // Track if diff section is expanded
  isDiffExpanded: boolean;
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
      previousStates: new Map(),
      searchQuery: '',
      animationTriggers: new Map(),
      isDiffExpanded: false,
    });
  }

  // ============================================================================
  // Atomic Update Methods
  // ============================================================================

  /**
   * Add a new instance to the list
   */
  addInstance = (instance: InstanceData) => {
    console.log(
      `[LayoutBloc] addInstance: ${instance.className}#${instance.id}`,
    );

    // Check if instance already exists
    const existing = this.state.instances.find((i) => i.id === instance.id);
    if (existing) {
      console.warn(
        `[LayoutBloc] Instance already exists, updating instead: ${instance.id}`,
      );
      this.updateInstance(instance.id, instance);
      return;
    }

    const instances = [...this.state.instances, instance];
    this.patch({ instances });
    console.log(`[LayoutBloc] Instance added (total: ${instances.length})`);
  };

  /**
   * Remove an instance from the list
   */
  removeInstance = (instanceId: string) => {
    console.log(`[LayoutBloc] removeInstance: ${instanceId}`);

    const instances = this.state.instances.filter((i) => i.id !== instanceId);
    const previousStates = new Map(this.state.previousStates);
    previousStates.delete(instanceId);

    // Clear selection if the removed instance was selected
    const selectedId =
      this.state.selectedId === instanceId ? null : this.state.selectedId;

    this.patch({ instances, previousStates, selectedId });
    console.log(`[LayoutBloc] Instance removed (total: ${instances.length})`);
  };

  /**
   * Update an existing instance (used when duplicate is added)
   */
  updateInstance = (instanceId: string, updates: Partial<InstanceData>) => {
    console.log(`[LayoutBloc] updateInstance: ${instanceId}`);

    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return { ...inst, ...updates };
      }
      return inst;
    });

    this.patch({ instances });
  };

  /**
   * Update state of an existing instance
   */
  updateInstanceState = (
    instanceId: string,
    previousState: any,
    currentState: any,
  ) => {
    console.log(`[LayoutBloc] updateInstanceState: ${instanceId}`);

    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return {
          ...inst,
          state: currentState,
          lastStateChangeTimestamp: Date.now(),
        };
      }
      return inst;
    });

    // Store previous state for diff view
    const previousStates = new Map(this.state.previousStates);
    previousStates.set(instanceId, structuredClone(previousState));

    // Add animation trigger
    const animationTriggers = new Map(this.state.animationTriggers);
    const triggers = animationTriggers.get(instanceId) || [];
    const now = Date.now();

    // Keep only recent triggers (within 500ms) to prevent memory leak
    const recentTriggers = triggers.filter((t) => now - t < 500);
    recentTriggers.push(now);
    animationTriggers.set(instanceId, recentTriggers);

    this.patch({ instances, previousStates, animationTriggers });
    console.log(`[LayoutBloc] Instance state updated: ${instanceId}`);
  };

  /**
   * Set all instances at once (used only for initial load)
   */
  setAllInstances = (instances: InstanceData[]) => {
    console.log(`[LayoutBloc] setAllInstances: ${instances.length} instances`);
    this.patch({ instances: instances.slice() });
  };

  setSelectedId = (instance: string | null) => {
    console.log(`[LayoutBloc] Selected instance changed to:`, instance);
    this.patch({ selectedId: instance });
  };

  setConnected = (connected: boolean) => {
    console.log(
      `[LayoutBloc] Connection status changed to:`,
      connected ? 'CONNECTED' : 'DISCONNECTED',
    );
    this.patch({ connected });
  };

  setSearchQuery = (searchQuery: string) => {
    console.log(`[LayoutBloc] Search query changed to: "${searchQuery}"`);
    this.patch({ searchQuery });
  };

  toggleDiffExpanded = () => {
    this.patch({ isDiffExpanded: !this.state.isDiffExpanded });
  };

  get selected() {
    return (
      this.state.instances.find((inst) => inst.id === this.state.selectedId) ||
      null
    );
  }

  get filteredInstances() {
    const { instances, searchQuery } = this.state;

    if (!searchQuery.trim()) {
      return [...instances].sort((a, b) => a.createdAt - b.createdAt);
    }

    // Fuzzy search
    const query = searchQuery.toLowerCase();
    const filtered = instances
      .map((instance) => {
        const classNameScore = fuzzyMatch(
          query,
          instance.className.toLowerCase(),
        );
        const idScore = fuzzyMatch(query, instance.id.toLowerCase());
        const score = Math.max(classNameScore, idScore);

        return { instance, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        // Sort by score first (higher is better)
        if (b.score !== a.score) return b.score - a.score;
        // Then by creation time (newest first)
        return b.instance.createdAt - a.instance.createdAt;
      })
      .map(({ instance }) => instance);

    return filtered;
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

export const DevToolsPanel: FC<DevToolsUIProps> = React.memo(
  ({ onMount, onUnmount }) => {
    const [{ instances, connected, searchQuery, animationTriggers, isDiffExpanded }, _bloc] =
      useBloc(LayoutBloc, {
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
      console.log(
        `[DevToolsPanel] Instances updated (${instances.length} total):`,
        instances.map((i: InstanceData) => `${i.className}#${i.id}`),
      );
    }, [instances]);

    return (
      <div style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <div
              style={{
                padding: '10px',
                borderBottom: '1px solid #444',
                background: '#252526',
              }}
            >
              <input
                type="text"
                placeholder="Search instances..."
                value={searchQuery}
                onChange={(e) => bloc.setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#1e1e1e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007acc';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#444';
                }}
              />
            </div>

            {/* Instance List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <style>{`
                @keyframes sweepLine {
                  0% {
                    left: -2px;
                    opacity: 0.8;
                  }
                  100% {
                    left: 100%;
                    opacity: 0;
                  }
                }

                .sweep-line {
                  position: absolute;
                  top: 0;
                  left: -2px;
                  width: 2px;
                  height: 100%;
                  animation: sweepLine 300ms linear;
                  pointer-events: none;
                  z-index: 10;
                }
              `}</style>
              {instances.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    color: '#888',
                    textAlign: 'center',
                  }}
                >
                  No instances detected
                </div>
              ) : bloc.filteredInstances.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    color: '#888',
                    textAlign: 'center',
                  }}
                >
                  No matches found
                </div>
              ) : (
                bloc.filteredInstances.map((instance: InstanceData) => {
                  const borderColor = stringToColor(instance.className);
                  const triggers = animationTriggers.get(instance.id) || [];
                  const now = Date.now();
                  // Only show lines for triggers within 300ms
                  const activeTriggers = triggers.filter(
                    (t: number) => now - t < 300,
                  );

                  return (
                    <div
                      key={instance.id}
                      onClick={() => bloc.setSelectedId(instance.id)}
                      style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid #333',
                        borderLeft: `4px solid ${borderColor}`,
                        cursor: 'pointer',
                        background:
                          bloc.selected?.id === instance.id
                            ? '#094771'
                            : 'transparent',
                        transition: 'background 0.2s',
                        position: 'relative',
                        overflow: 'hidden',
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
                      {/* Render animated lines for each trigger */}
                      {activeTriggers.map((triggerTime: number) => (
                        <div
                          key={triggerTime}
                          className="sweep-line"
                          style={{
                            background: borderColor,
                          }}
                        />
                      ))}

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
                  );
                })
              )}
            </div>
          </div>

          {/* State Viewer */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {bloc.selected ? (
              <>
                {/* Sticky Header */}
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: '#1e1e1e',
                    borderBottom: '1px solid #444',
                    padding: '15px 20px',
                  }}
                >
                  <h2 style={{ fontSize: '18px', margin: 0 }}>
                    <InstanceId id={bloc.selected.id} />
                  </h2>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                  <style>{`
                    /* Enhanced diff styling */
                    .json-diff-viewer {
                      font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
                      font-size: 13px !important;
                      line-height: 1.6 !important;
                      border-collapse: collapse !important;
                      width: 100%;
                    }

                    /* Line backgrounds for modified lines */
                    .json-diff-viewer td.line-modify {
                      background-color: rgba(59, 130, 246, 0.1) !important;
                    }

                    .json-diff-viewer td.line-add {
                      background-color: rgba(16, 185, 129, 0.15) !important;
                    }

                    .json-diff-viewer td.line-delete {
                      background-color: rgba(239, 68, 68, 0.15) !important;
                    }

                    /* Line numbers */
                    .json-diff-viewer td.line-number {
                      color: #6b7280 !important;
                      background-color: #1a1a1a !important;
                      padding: 2px 12px !important;
                      text-align: right !important;
                      user-select: none !important;
                      border-right: 1px solid #333 !important;
                      vertical-align: top !important;
                      width: 50px !important;
                    }

                    /* Content cells */
                    .json-diff-viewer td:not(.line-number) {
                      padding: 2px 12px !important;
                      vertical-align: top !important;
                    }

                    /* Inline diff highlights - ADDITIONS */
                    .json-diff-viewer .inline-diff-add {
                      background-color: rgba(16, 185, 129, 0.35) !important;
                      color: #10b981 !important;
                      font-weight: 700 !important;
                      padding: 1px 2px !important;
                      border-radius: 2px !important;
                    }

                    /* Inline diff highlights - REMOVALS */
                    .json-diff-viewer .inline-diff-remove {
                      background-color: rgba(239, 68, 68, 0.35) !important;
                      color: #ef4444 !important;
                      font-weight: 700 !important;
                      text-decoration: line-through !important;
                      padding: 1px 2px !important;
                      border-radius: 2px !important;
                    }

                    /* Regular token colors (unchanged values) */
                    .json-diff-viewer .token.plain {
                      color: #d4d4d4 !important;
                    }

                    /* Pre tags inside cells */
                    .json-diff-viewer pre {
                      margin: 0 !important;
                      padding: 0 !important;
                      background: transparent !important;
                      white-space: pre !important;
                      word-wrap: normal !important;
                      font-family: inherit !important;
                    }

                    /* Improved JsonView styles */
                    .w-json-view-container {
                      line-height: 1.8 !important;
                    }

                    /* Remove ugly highlight backgrounds on changed values */
                    .w-json-view-container mark {
                      background: transparent !important;
                      color: inherit !important;
                    }

                    /* Improve collapse/expand arrows */
                    .w-json-view-container .w-rjv-arrow {
                      opacity: 0.7;
                      transition: opacity 0.2s;
                    }

                    .w-json-view-container .w-rjv-arrow:hover {
                      opacity: 1;
                    }

                    /* Better spacing for nested objects */
                    .w-json-view-container .w-rjv-line {
                      padding: 2px 0;
                    }
                  `}</style>

                  {/* Current State Section - FIRST */}
                  <div>
                    <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 600 }}>
                      Current State
                    </h3>
                    <div
                      style={{
                        background: '#252526',
                        padding: '15px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        border: '1px solid #333',
                      }}
                    >
                      <JsonView
                        value={bloc.selected.state}
                        className="w-json-view-container"
                        style={{
                          fontSize: '13px',
                          fontFamily: 'Monaco, Consolas, monospace',
                          '--w-rjv-background-color': '#252526',
                          '--w-rjv-color': '#d4d4d4',
                          '--w-rjv-key-string': '#9cdcfe',
                          '--w-rjv-type-string-color': '#ce9178',
                          '--w-rjv-type-int-color': '#b5cea8',
                          '--w-rjv-type-float-color': '#b5cea8',
                          '--w-rjv-type-bigint-color': '#b5cea8',
                          '--w-rjv-type-boolean-color': '#569cd6',
                          '--w-rjv-type-null-color': '#569cd6',
                          '--w-rjv-type-undefined-color': '#569cd6',
                          '--w-rjv-brackets-color': '#808080',
                          '--w-rjv-arrow-color': '#808080',
                          '--w-rjv-quotes-color': '#808080',
                        }}
                      />
                    </div>
                  </div>

                  {/* State Diff Section - SECOND (Collapsible) */}
                  {bloc.diff && (
                    <div style={{ marginTop: '30px' }}>
                      <div
                        onClick={bloc.toggleDiffExpanded}
                        style={{
                          fontSize: '16px',
                          marginBottom: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          userSelect: 'none',
                          padding: '4px 0',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#569cd6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#fff';
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          transition: 'transform 0.2s',
                          transform: isDiffExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}>
                          ▶
                        </span>
                        <span>State Diff (Previous vs Current)</span>
                      </div>
                      {isDiffExpanded && (
                        <div
                          style={{
                            background: '#1e1e1e',
                            borderRadius: '4px',
                            overflow: 'auto',
                            border: '1px solid #333',
                          }}
                        >
                          <Viewer
                            diff={differ.diff(
                              bloc.diff.previous,
                              bloc.diff.current,
                            )}
                            indent={2}
                            lineNumbers={true}
                            highlightInlineDiff={true}
                            inlineDiffOptions={{
                              mode: 'word',
                              wordSeparator: ' ',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  color: '#888',
                  textAlign: 'center',
                  marginTop: '50px',
                }}
              >
                Select an instance to view its state
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
