import React, { FC, useState } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc, DevToolsDependencyBloc, DevToolsInstancesBloc } from '../blocs';
import type { DependencyEdge, InstanceData } from '../types';
import InstanceId from './InstanceId';
import { CurrentStateView } from './CurrentStateView';
import { StateHistoryView } from './StateHistoryView';
import { StateDiffView } from './StateDiffView';
import { T } from '../theme';

interface StateViewerProps {
  onTimeTravel?: (instanceId: string, state: any) => void;
}

function classColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

interface DependenciesViewProps {
  instanceId: string;
  className: string;
  edges: DependencyEdge[];
  instances: InstanceData[];
  onNavigate: (id: string) => void;
}

const DependenciesView: FC<DependenciesViewProps> = React.memo(
  ({ instanceId, className, edges, instances, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const outgoing = edges.filter((e) => e.fromId === instanceId);
    const incoming = edges.filter((e) => e.toClass === className);

    if (outgoing.length === 0 && incoming.length === 0) return null;

    const resolveInstance = (targetClass: string, targetKey: string) =>
      instances.find(
        (inst) =>
          inst.className === targetClass &&
          (inst.name === targetKey || inst.id.endsWith(`:${targetKey}`)),
      ) ?? instances.find((inst) => inst.className === targetClass);

    return (
      <div style={{ marginTop: '20px' }}>
        <div
          onClick={() => setIsExpanded((v) => !v)}
          style={{
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            padding: '3px 0',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.textAccent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.text0; }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '12px',
            }}
          >
            ▶
          </span>
          <span>Dependencies</span>
          <span style={{ fontSize: '11px', color: '#888', fontWeight: 400 }}>
            ({outgoing.length + incoming.length})
          </span>
        </div>

        {isExpanded && (
          <div
            style={{
              border: '1px solid #333',
              borderRadius: '3px',
              background: '#1e1e1e',
              overflow: 'hidden',
            }}
          >
            {outgoing.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: '10px',
                    color: '#666',
                    background: '#252526',
                    borderBottom: '1px solid #333',
                    letterSpacing: '0.5px',
                  }}
                >
                  DEPENDS ON
                </div>
                {outgoing.map((edge, i) => {
                  const target = resolveInstance(edge.toClass, edge.toKey);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '6px 10px',
                        borderBottom: i < outgoing.length - 1 ? '1px solid #2a2a2a' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: target ? 'pointer' : 'default',
                        fontSize: '11px',
                      }}
                      onClick={() => target && onNavigate(target.id)}
                      onMouseEnter={(e) => {
                        if (target) (e.currentTarget as HTMLElement).style.background = '#252526';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ color: classColor(edge.toClass), fontFamily: 'monospace' }}>
                        {edge.toClass}
                      </span>
                      <span style={{ color: '#555', fontSize: '10px' }}>
                        :{edge.toKey}
                      </span>
                      {target && (
                        <span style={{ color: '#569cd6', fontSize: '10px', marginLeft: 'auto' }}>
                          →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {incoming.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: '10px',
                    color: '#666',
                    background: '#252526',
                    borderBottom: '1px solid #333',
                    borderTop: outgoing.length > 0 ? '1px solid #333' : undefined,
                    letterSpacing: '0.5px',
                  }}
                >
                  DEPENDED ON BY
                </div>
                {incoming.map((edge, i) => {
                  const source = instances.find((inst) => inst.id === edge.fromId);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '6px 10px',
                        borderBottom: i < incoming.length - 1 ? '1px solid #2a2a2a' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: source ? 'pointer' : 'default',
                        fontSize: '11px',
                      }}
                      onClick={() => source && onNavigate(source.id)}
                      onMouseEnter={(e) => {
                        if (source) (e.currentTarget as HTMLElement).style.background = '#252526';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ color: classColor(edge.fromClass), fontFamily: 'monospace' }}>
                        {edge.fromClass}
                      </span>
                      {source && (
                        <span style={{ color: '#555', fontSize: '10px' }}>
                          {source.name}
                        </span>
                      )}
                      {source && (
                        <span style={{ color: '#569cd6', fontSize: '10px', marginLeft: 'auto' }}>
                          →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

DependenciesView.displayName = 'DependenciesView';

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export const StateViewer: FC<StateViewerProps> = ({ onTimeTravel }) => {
  const [{ isCurrentStateExpanded, isHistoryExpanded, isDiffExpanded }, layoutBloc] = useBloc(DevToolsLayoutBloc);
  const [{ edges }] = useBloc(DevToolsDependencyBloc);
  const [{ instances }] = useBloc(DevToolsInstancesBloc);

  const selectedInstance = layoutBloc.selectedInstance;
  const history = layoutBloc.selectedHistory;
  const diff = layoutBloc.selectedDiff;

  if (!selectedInstance) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            color: '#888',
            textAlign: 'center',
            marginTop: '50px',
          }}
        >
          Select an instance to view its state
        </div>
      </div>
    );
  }

  const timeTravelForInstance = onTimeTravel
    ? (s: any) => onTimeTravel(selectedInstance.id, s)
    : undefined;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: T.bg2,
          borderBottom: `1px solid ${T.border1}`,
          padding: '8px 12px',
        }}
      >
        <h2 style={{ fontSize: '14px', margin: 0 }}>
          <InstanceId id={selectedInstance.id} />
        </h2>
      </div>

      {/* Metrics Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderBottom: `1px solid ${T.border1}`,
          fontSize: '10px',
          color: T.text2,
          flexWrap: 'wrap',
        }}
      >
        <span>created {formatRelative(selectedInstance.createdAt ?? Date.now())}</span>
        <span>·</span>
        <span>{history.length} change{history.length !== 1 ? 's' : ''}</span>
        {selectedInstance.lastStateChangeTimestamp != null && (
          <>
            <span>·</span>
            <span>last {formatRelative(selectedInstance.lastStateChangeTimestamp)}</span>
          </>
        )}
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <CurrentStateView
          state={selectedInstance.state}
          isExpanded={isCurrentStateExpanded}
          onToggleExpanded={layoutBloc.toggleCurrentStateExpanded}
          onTimeTravel={timeTravelForInstance}
        />

        <StateDiffView
          diff={diff}
          isExpanded={isDiffExpanded}
          onToggleExpanded={layoutBloc.toggleDiffExpanded}
        />

        <StateHistoryView
          history={history}
          currentState={selectedInstance.state}
          isExpanded={isHistoryExpanded}
          onToggleExpanded={layoutBloc.toggleHistoryExpanded}
          onTimeTravel={timeTravelForInstance}
        />

        <DependenciesView
          instanceId={selectedInstance.id}
          className={selectedInstance.className}
          edges={edges}
          instances={instances}
          onNavigate={(id) => layoutBloc.setSelectedId(id)}
        />
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
