import React, { FC, useMemo } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc, DevToolsInstancesBloc } from '../blocs';
import type { ConsumerInfo, GetterInfo, InstanceData } from '../types';
import { computeInsights, measureStateBytes } from './computeInsights';
import { InsightPill } from './InstanceListItem';
import { CurrentStateView } from './CurrentStateView';
import { StateHistoryView } from './StateHistoryView';
import { StateDiffView } from './StateDiffView';
import { SectionHeader } from './SectionHeader';
import { PathChips } from './PathChips';
import { consumerWoke, matchedPaths } from '../utils/pathMatch';
import { T } from '../theme';
import { stringToColor } from '../utils/stringToColor';
import { instanceKey } from '../utils/instanceKey';
import { formatRelative } from '../utils/formatRelative';

interface StateViewerProps {
  onTimeTravel?: (instanceId: string, state: any) => void;
}

function classColor(className: string): string {
  return stringToColor(className, 60, 55);
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
// Consumers Section
// ============================================================================

const ConsumerRow: FC<{
  consumer: ConsumerInfo;
  lastPaths?: string[] | 'all';
}> = ({ consumer, lastPaths }) => {
  const woke = consumerWoke(consumer.paths, lastPaths);
  const matched = matchedPaths(consumer.paths, lastPaths);

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
      <span
        title={
          woke ? 're-rendered on the last change' : 'idle on the last change'
        }
        style={{
          flexShrink: 0,
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          alignSelf: 'center',
          background: woke ? T.success : T.border2,
        }}
      />
      <span style={{ color: T.text2, flexShrink: 0 }}>
        {consumer.consumerId}
      </span>
      <span style={{ color: T.border2, flexShrink: 0 }}>:</span>
      <PathChips paths={consumer.paths} highlight={matched} />
    </div>
  );
};

interface ConsumersSectionProps {
  consumers?: ConsumerInfo[];
  lastPaths?: string[] | 'all';
  isExpanded: boolean;
  onToggle: () => void;
}

const ConsumersSection: FC<ConsumersSectionProps> = React.memo(
  ({ consumers, lastPaths, isExpanded, onToggle }) => {
    if (!consumers || consumers.length === 0) return null;

    const wokeCount = consumers.filter((c) =>
      consumerWoke(c.paths, lastPaths),
    ).length;

    return (
      <div>
        <SectionHeader
          label="Consumers"
          isExpanded={isExpanded}
          onToggle={onToggle}
          badge={consumers.length}
          trailing={
            lastPaths !== undefined ? (
              <span style={{ fontSize: '10px', color: T.text2 }}>
                {wokeCount}/{consumers.length} re-rendered last change
              </span>
            ) : undefined
          }
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
            {consumers.map((consumer) => (
              <ConsumerRow
                key={consumer.consumerId}
                consumer={consumer}
                lastPaths={lastPaths}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

ConsumersSection.displayName = 'ConsumersSection';

// ============================================================================
// State Viewer (main component)
// ============================================================================

export const StateViewer: FC<StateViewerProps> = ({ onTimeTravel }) => {
  const [
    {
      selectedId,
      isCurrentStateExpanded,
      isGettersExpanded,
      isConsumersExpanded,
      isHistoryExpanded,
      isDiffExpanded,
    },
    layoutBloc,
  ] = useBloc(DevToolsLayoutBloc);
  const [{ instances }, instancesBloc] = useBloc(DevToolsInstancesBloc);

  // `selectedInstance`/`selectedHistory`/`selectedDiff` are getters read off
  // the bloc instance, not through the tracked state proxy — so reading them
  // records no path. Destructuring `selectedId` above is what subscribes this
  // component to selection changes; without it, clicking a different instance
  // never re-renders the detail panel. It also keys the insights memo below.
  const selectedInstance = layoutBloc.selectedInstance;
  const history = layoutBloc.selectedHistory;
  const diff = layoutBloc.selectedDiff;

  const updatesIn10s = selectedInstance
    ? instancesBloc.getUpdatesIn10s(selectedInstance.id)
    : 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const insights = useMemo(
    () =>
      selectedInstance
        ? computeInsights({
            state: selectedInstance.state,
            stateSizeBytes: measureStateBytes(selectedInstance.state),
            updatesIn10s,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedId,
      selectedInstance?.id,
      selectedInstance?.lastStateChangeTimestamp,
      updatesIn10s,
    ],
  );

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
          {(() => {
            const refCount = selectedInstance.refIds?.length ?? 0;
            if (refCount === 0) return null;
            return (
              <>
                <span style={{ color: T.border2 }}>·</span>
                <span>
                  {refCount} ref holder{refCount !== 1 ? 's' : ''}
                </span>
              </>
            );
          })()}
        </div>
        {insights.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              marginTop: '6px',
            }}
          >
            {insights.map((insight) => (
              <InsightPill key={insight.kind} insight={insight} large />
            ))}
          </div>
        )}
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

        <ConsumersSection
          consumers={selectedInstance.consumers}
          lastPaths={selectedInstance.lastPaths}
          isExpanded={isConsumersExpanded}
          onToggle={layoutBloc.toggleConsumersExpanded}
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
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
