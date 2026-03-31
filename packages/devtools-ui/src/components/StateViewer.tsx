import React, { FC, useState } from 'react';
import { useBloc } from '@blac/react';
import {
  DevToolsLayoutBloc,
  DevToolsDependencyBloc,
  DevToolsInstancesBloc,
} from '../blocs';
import type {
  ConsumerInfo,
  DependencyEdge,
  GetterInfo,
  InstanceData,
  RefHolderInfo,
} from '../types';
import { CurrentStateView } from './CurrentStateView';
import { StateHistoryView } from './StateHistoryView';
import { CallStackView } from './CallStackView';
import { StateDiffView } from './StateDiffView';
import { SectionHeader } from './SectionHeader';
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
// Initiator Section
// ============================================================================

interface InitiatorSectionProps {
  createdFrom?: string;
}

const InitiatorSection: FC<InitiatorSectionProps> = React.memo(
  ({ createdFrom }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!createdFrom) return null;

    return (
      <div>
        <SectionHeader
          label="Initiator"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
        />
        {isExpanded && <CallStackView callstack={createdFrom} />}
      </div>
    );
  },
);

InitiatorSection.displayName = 'InitiatorSection';

// ============================================================================
// Consumers Section
// ============================================================================

const ConsumerRow: FC<{ consumer: ConsumerInfo }> = ({ consumer }) => {
  const [expanded, setExpanded] = useState(false);
  const hasStack = !!consumer.stackTrace;

  return (
    <div
      style={{
        background: T.bg2,
        border: `1px solid ${T.border1}`,
        borderLeft: `3px solid ${T.textAccent}`,
        borderRadius: T.radius,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={hasStack ? () => setExpanded((v) => !v) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          gap: '8px',
          cursor: hasStack ? 'pointer' : 'default',
        }}
      >
        {hasStack && (
          <span style={{ fontSize: '9px', color: T.text3, flexShrink: 0 }}>
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: T.text0,
              fontFamily: T.fontMono,
              whiteSpace: 'nowrap',
            }}
          >
            {consumer.componentName}
          </span>
          <div
            style={{
              fontSize: '9px',
              color: T.text3,
              fontFamily: T.fontMono,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {consumer.id}
          </div>
        </div>
        <span
          style={{
            fontSize: '10px',
            color: T.text3,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          mounted {formatRelative(consumer.mountedAt)}
        </span>
      </div>
      {expanded && consumer.stackTrace && (
        <CallStackView callstack={consumer.stackTrace} />
      )}
    </div>
  );
};

interface ConsumersSectionProps {
  consumers?: ConsumerInfo[];
}

const ConsumersSection: FC<ConsumersSectionProps> = React.memo(
  ({ consumers }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!consumers || consumers.length === 0) return null;

    const named = consumers.filter((c) => c.componentName !== 'Unknown');

    return (
      <div>
        <SectionHeader
          label="Consumers"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
          badge={consumers.length}
        />
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {named.map((consumer) => (
              <ConsumerRow key={consumer.id} consumer={consumer} />
            ))}
          </div>
        )}
      </div>
    );
  },
);

ConsumersSection.displayName = 'ConsumersSection';

// ============================================================================
// Reference Holders Section
// ============================================================================

const isAutoRef = (refId: string) => /^_auto_\d+$/.test(refId);
const isReactRef = (refId: string) => refId.startsWith('useBloc@');

const RefIdRow: FC<{ refId: string; holder?: RefHolderInfo }> = ({
  refId,
  holder,
}) => {
  const [expanded, setExpanded] = useState(false);
  const auto = isAutoRef(refId);
  const react = isReactRef(refId);
  const color = auto ? '#d4a017' : react ? T.textAccent : T.text0;
  const bg = auto ? '#2d2500' : react ? `${T.textAccent}18` : T.bg2;
  const border = auto ? '#d4a01740' : react ? `${T.textAccent}40` : T.border1;
  const label = react ? refId.replace('useBloc@', '') : refId;
  const hasStack = !!holder?.stackTrace;
  const tooltip = auto
    ? 'Anonymous ref — consider passing an explicit refId to acquire() for better debugging'
    : react
      ? 'React component via useBloc'
      : undefined;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: T.radius,
        overflow: 'hidden',
      }}
    >
      <div
        title={tooltip}
        onClick={hasStack ? () => setExpanded((v) => !v) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          gap: '6px',
          cursor: hasStack ? 'pointer' : tooltip ? 'help' : 'default',
        }}
      >
        {hasStack && (
          <span style={{ fontSize: '9px', color: T.text3, flexShrink: 0 }}>
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color,
            fontFamily: T.fontMono,
            whiteSpace: 'nowrap',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        {auto && (
          <span
            style={{
              fontSize: '9px',
              color: '#d4a017',
              background: '#d4a01720',
              border: '1px solid #d4a01740',
              borderRadius: '2px',
              padding: '0 3px',
              lineHeight: '14px',
              flexShrink: 0,
            }}
          >
            ANON
          </span>
        )}
        {react && (
          <span
            style={{
              fontSize: '9px',
              color: T.textAccent,
              background: `${T.textAccent}20`,
              border: `1px solid ${T.textAccent}40`,
              borderRadius: '2px',
              padding: '0 3px',
              lineHeight: '14px',
              flexShrink: 0,
            }}
          >
            REACT
          </span>
        )}
      </div>
      {expanded && holder?.stackTrace && (
        <CallStackView callstack={holder.stackTrace} />
      )}
    </div>
  );
};

interface ReferenceHoldersSectionProps {
  refIds?: string[];
  refHolders?: RefHolderInfo[];
}

const ReferenceHoldersSection: FC<ReferenceHoldersSectionProps> = React.memo(
  ({ refIds, refHolders }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!refIds || refIds.length === 0) return null;

    const holdersByRefId = new Map(refHolders?.map((h) => [h.refId, h]));
    const namedRefs = refIds.filter((id) => !isAutoRef(id));

    return (
      <div>
        <SectionHeader
          label="Reference Holders"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
          badge={refIds.length}
        />
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {namedRefs.map((refId) => (
              <RefIdRow
                key={refId}
                refId={refId}
                holder={holdersByRefId.get(refId)}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

ReferenceHoldersSection.displayName = 'ReferenceHoldersSection';

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
          {selectedInstance.consumers &&
            selectedInstance.consumers.length > 0 && (
              <>
                <span style={{ color: T.border2 }}>·</span>
                <span>
                  {selectedInstance.consumers.length} consumer
                  {selectedInstance.consumers.length !== 1 ? 's' : ''}
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
          padding: '4px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
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

        <InitiatorSection createdFrom={selectedInstance.createdFrom} />

        <ReferenceHoldersSection
          refIds={selectedInstance.refIds}
          refHolders={selectedInstance.refHolders}
        />

        <ConsumersSection consumers={selectedInstance.consumers} />
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
