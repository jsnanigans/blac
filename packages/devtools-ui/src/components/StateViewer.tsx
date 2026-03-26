import React, { FC, useState } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc, DevToolsDependencyBloc, DevToolsInstancesBloc } from '../blocs';
import type { DependencyEdge, InstanceData } from '../types';
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
  return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
}

function instanceKey(id: string): string {
  const i = id.indexOf(':');
  return i !== -1 ? id.slice(i + 1) : id;
}

interface DependenciesViewProps {
  instanceId: string;
  className: string;
  edges: DependencyEdge[];
  instances: InstanceData[];
  onNavigate: (id: string) => void;
}

const DepCard: FC<{
  color: string;
  className: string;
  instanceKey: string;
  navigable: boolean;
  onClick?: () => void;
}> = ({ color, className, instanceKey: key, navigable, onClick }) => (
  <div
    onClick={onClick}
    onMouseEnter={(e) => {
      if (navigable) e.currentTarget.style.background = T.bgHover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = T.bg2;
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '5px 10px',
      background: T.bg2,
      border: `1px solid ${T.border1}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: T.radius,
      cursor: navigable ? 'pointer' : 'default',
      gap: '6px',
    }}
  >
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color,
        fontFamily: T.fontMono,
        whiteSpace: 'nowrap',
      }}
    >
      {className}
    </span>
    <span
      style={{
        fontSize: '10px',
        color: T.text2,
        fontFamily: T.fontMono,
        whiteSpace: 'nowrap',
      }}
    >
      : {key}
    </span>
    {navigable && (
      <span style={{ color: T.textAccent, fontSize: '10px', marginLeft: 'auto', flexShrink: 0 }}>
        →
      </span>
    )}
  </div>
);

const DependenciesView: FC<DependenciesViewProps> = React.memo(
  ({ instanceId, className, edges, instances, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const outgoing = edges.filter((e) => e.fromId === instanceId);
    const incoming = edges.filter((e) => e.toClass === className);

    if (outgoing.length === 0 && incoming.length === 0) return null;

    const resolveInstance = (targetClass: string, targetKey: string) =>
      instances.find(
        (inst) =>
          inst.className === targetClass &&
          (inst.name === targetKey || inst.id.endsWith(`:${targetKey}`)),
      ) ?? instances.find((inst) => inst.className === targetClass);

    const total = outgoing.length + incoming.length;

    return (
      <div style={{ marginTop: '16px' }}>
        <div
          onClick={() => setIsExpanded((v) => !v)}
          style={{
            fontSize: '12px',
            marginBottom: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            padding: '3px 0',
            color: T.text1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.text0; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.text1; }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.15s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '10px',
              color: T.text2,
            }}
          >
            ▶
          </span>
          <span>Dependencies</span>
          <span
            style={{
              fontSize: '10px',
              color: T.text3,
              fontWeight: 400,
              background: T.bg3,
              padding: '1px 5px',
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border1}`,
            }}
          >
            {total}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {outgoing.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: T.text3,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    marginBottom: '5px',
                    paddingLeft: '2px',
                  }}
                >
                  Depends on
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {outgoing.map((edge, i) => {
                    const target = resolveInstance(edge.toClass, edge.toKey);
                    const color = classColor(edge.toClass);
                    return (
                      <DepCard
                        key={i}
                        color={color}
                        className={edge.toClass}
                        instanceKey={target ? instanceKey(target.id) : edge.toKey}
                        navigable={!!target}
                        onClick={target ? () => onNavigate(target.id) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {incoming.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: T.text3,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    marginBottom: '5px',
                    paddingLeft: '2px',
                  }}
                >
                  Depended on by
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {incoming.map((edge, i) => {
                    const source = instances.find((inst) => inst.id === edge.fromId);
                    const color = classColor(edge.fromClass);
                    return (
                      <DepCard
                        key={i}
                        color={color}
                        className={edge.fromClass}
                        instanceKey={source ? instanceKey(source.id) : edge.fromClass}
                        navigable={!!source}
                        onClick={source ? () => onNavigate(source.id) : undefined}
                      />
                    );
                  })}
                </div>
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
            color: T.text2,
            textAlign: 'center',
            marginTop: '50px',
          }}
        >
          Select an instance to view its state
        </div>
      </div>
    );
  }

  const color = classColor(selectedInstance.className);
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
          borderLeft: `3px solid ${color}`,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color,
            fontFamily: T.fontMono,
          }}
        >
          {selectedInstance.className}
        </span>
        <span style={{ fontSize: '12px', color: T.text2, fontFamily: T.fontMono }}>
          : {instanceKey(selectedInstance.id)}
        </span>
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
        <span style={{ color: T.border2 }}>·</span>
        <span>{history.length} change{history.length !== 1 ? 's' : ''}</span>
        {selectedInstance.lastStateChangeTimestamp != null && (
          <>
            <span style={{ color: T.border2 }}>·</span>
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
