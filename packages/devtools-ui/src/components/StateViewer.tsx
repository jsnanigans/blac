import React, { FC, useState } from 'react';
import { useBloc } from '@blac/react';
import {
  DevToolsLayoutBloc,
  DevToolsDependencyBloc,
  DevToolsInstancesBloc,
} from '../blocs';
import type { DependencyEdge, GetterInfo, InstanceData } from '../types';
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

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ============================================================================
// Shared Section Header
// ============================================================================

const SectionHeader: FC<{
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string | number;
  trailing?: React.ReactNode;
}> = ({ label, isExpanded, onToggle, badge, trailing }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 0',
      cursor: 'pointer',
      userSelect: 'none',
      color: T.text1,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = T.text0;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = T.text1;
    }}
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
    <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
    {badge !== undefined && (
      <span
        style={{
          fontSize: '10px',
          color: T.text2,
          fontWeight: 400,
          background: T.bg3,
          padding: '1px 6px',
          borderRadius: T.radiusSm,
          border: `1px solid ${T.border1}`,
        }}
      >
        {badge}
      </span>
    )}
    {trailing && (
      <div
        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
      >
        {trailing}
      </div>
    )}
  </div>
);

// ============================================================================
// Computed Getters Section
// ============================================================================

const GetterDepPill: FC<{
  className: string;
  navigable: boolean;
  onClick?: () => void;
}> = ({ className, navigable, onClick }) => {
  const color = classColor(className);
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        display: 'inline-block',
        fontSize: '9px',
        fontFamily: T.fontMono,
        fontWeight: 600,
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: '3px',
        padding: '0 4px',
        cursor: navigable ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        lineHeight: '16px',
      }}
    >
      {className}
    </span>
  );
};

const GetterRow: FC<{
  name: string;
  info: GetterInfo;
  instances: InstanceData[];
  onNavigate: (id: string) => void;
}> = ({ name, info, instances, onNavigate }) => {
  const findInstance = (cls: string) =>
    instances.find((inst) => inst.className === cls);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        padding: '3px 0',
        fontSize: '12px',
        fontFamily: T.fontMono,
        lineHeight: '18px',
      }}
    >
      <span style={{ color: '#9cdcfe', flexShrink: 0 }}>{name}</span>
      {info.dependsOn && info.dependsOn.length > 0 && (
        <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {info.dependsOn.map((dep) => {
            const target = findInstance(dep);
            return (
              <GetterDepPill
                key={dep}
                className={dep}
                navigable={!!target}
                onClick={target ? () => onNavigate(target.id) : undefined}
              />
            );
          })}
        </span>
      )}
      <span style={{ color: T.text2, flexShrink: 0 }}>:</span>
      {info.error ? (
        <span style={{ color: T.errorText }}>{info.error}</span>
      ) : (
        <GetterValue value={info.value} />
      )}
    </div>
  );
};

const GetterValue: FC<{ value: unknown }> = ({ value }) => {
  if (value === undefined)
    return <span style={{ color: '#569cd6' }}>undefined</span>;
  if (value === null) return <span style={{ color: '#569cd6' }}>null</span>;
  if (typeof value === 'string')
    return (
      <span style={{ color: '#ce9178', wordBreak: 'break-all' }}>
        "{value}"
      </span>
    );
  if (typeof value === 'number')
    return <span style={{ color: '#b5cea8' }}>{value}</span>;
  if (typeof value === 'boolean')
    return <span style={{ color: '#569cd6' }}>{String(value)}</span>;

  // Object/array — show compact preview
  try {
    const str = JSON.stringify(value);
    if (str.length <= 80) {
      return (
        <span style={{ color: T.text1, wordBreak: 'break-all' }}>{str}</span>
      );
    }
    return (
      <span style={{ color: T.text2, wordBreak: 'break-all' }}>
        {str.slice(0, 77)}...
      </span>
    );
  } catch {
    return <span style={{ color: T.text2 }}>[Object]</span>;
  }
};

interface ComputedGettersSectionProps {
  getters?: Record<string, GetterInfo>;
  isExpanded: boolean;
  onToggle: () => void;
  instances: InstanceData[];
  onNavigate: (id: string) => void;
}

const ComputedGettersSection: FC<ComputedGettersSectionProps> = React.memo(
  ({ getters, isExpanded, onToggle, instances, onNavigate }) => {
    if (!getters || Object.keys(getters).length === 0) return null;

    const entries = Object.entries(getters);

    return (
      <div>
        <SectionHeader
          label="Computed Getters"
          isExpanded={isExpanded}
          onToggle={onToggle}
          badge={entries.length}
        />
        {isExpanded && (
          <div
            style={{
              background: T.bg3,
              border: `1px solid ${T.border1}`,
              borderRadius: T.radius,
              padding: '6px 10px',
            }}
          >
            {entries.map(([name, info]) => (
              <GetterRow
                key={name}
                name={name}
                info={info}
                instances={instances}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

ComputedGettersSection.displayName = 'ComputedGettersSection';

// ============================================================================
// Dependencies Section
// ============================================================================

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
      padding: '4px 8px',
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
      <span
        style={{
          color: T.textAccent,
          fontSize: '10px',
          marginLeft: 'auto',
          flexShrink: 0,
        }}
      >
        →
      </span>
    )}
  </div>
);

interface DependenciesSectionProps {
  instanceId: string;
  className: string;
  edges: DependencyEdge[];
  instances: InstanceData[];
  onNavigate: (id: string) => void;
}

const DependenciesSection: FC<DependenciesSectionProps> = React.memo(
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
      <div>
        <SectionHeader
          label="Dependencies"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
          badge={total}
        />
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {outgoing.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    color: T.text3,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    paddingLeft: '2px',
                  }}
                >
                  Depends on
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {outgoing.map((edge, i) => {
                    const target = resolveInstance(edge.toClass, edge.toKey);
                    const color = classColor(edge.toClass);
                    return (
                      <DepCard
                        key={i}
                        color={color}
                        className={edge.toClass}
                        instanceKey={
                          target ? instanceKey(target.id) : edge.toKey
                        }
                        navigable={!!target}
                        onClick={
                          target ? () => onNavigate(target.id) : undefined
                        }
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
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    paddingLeft: '2px',
                  }}
                >
                  Depended on by
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {incoming.map((edge, i) => {
                    const source = instances.find(
                      (inst) => inst.id === edge.fromId,
                    );
                    const color = classColor(edge.fromClass);
                    return (
                      <DepCard
                        key={i}
                        color={color}
                        className={edge.fromClass}
                        instanceKey={
                          source ? instanceKey(source.id) : edge.fromClass
                        }
                        navigable={!!source}
                        onClick={
                          source ? () => onNavigate(source.id) : undefined
                        }
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

DependenciesSection.displayName = 'DependenciesSection';

// ============================================================================
// State Viewer (main component)
// ============================================================================

export const StateViewer: FC<StateViewerProps> = ({ onTimeTravel }) => {
  const [
    {
      isCurrentStateExpanded,
      isGettersExpanded,
      isHistoryExpanded,
      isDiffExpanded,
    },
    layoutBloc,
  ] = useBloc(DevToolsLayoutBloc);
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
            fontSize: '12px',
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
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: T.bg1,
          borderBottom: `1px solid ${T.border1}`,
          borderLeft: `3px solid ${color}`,
          padding: '10px 12px 8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color,
              fontFamily: T.fontMono,
            }}
          >
            {selectedInstance.className}
          </span>
          <span
            style={{ fontSize: '11px', color: T.text2, fontFamily: T.fontMono }}
          >
            : {instanceKey(selectedInstance.id)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            fontSize: '10px',
            color: T.text2,
          }}
        >
          <span>
            created {formatRelative(selectedInstance.createdAt ?? Date.now())}
          </span>
          <span style={{ color: T.border2 }}>·</span>
          <span>
            {history.length} change{history.length !== 1 ? 's' : ''}
          </span>
          {selectedInstance.lastStateChangeTimestamp != null && (
            <>
              <span style={{ color: T.border2 }}>·</span>
              <span>
                last {formatRelative(selectedInstance.lastStateChangeTimestamp)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <CurrentStateView
          state={selectedInstance.state}
          isExpanded={isCurrentStateExpanded}
          onToggleExpanded={layoutBloc.toggleCurrentStateExpanded}
          onTimeTravel={timeTravelForInstance}
        />

        <ComputedGettersSection
          getters={selectedInstance.getters}
          isExpanded={isGettersExpanded}
          onToggle={layoutBloc.toggleGettersExpanded}
          instances={instances}
          onNavigate={(id) => layoutBloc.setSelectedId(id)}
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

        <DependenciesSection
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
