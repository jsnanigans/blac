import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc } from '../blocs';
import InstanceId from './InstanceId';
import { CurrentStateView } from './CurrentStateView';
import { StateHistoryView } from './StateHistoryView';
import { StateDiffView } from './StateDiffView';

interface StateViewerProps {
  onTimeTravel?: (instanceId: string, state: any) => void;
}

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
          background: '#1e1e1e',
          borderBottom: '1px solid #444',
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
          borderBottom: '1px solid #333',
          fontSize: '10px',
          color: '#555',
          flexWrap: 'wrap',
        }}
      >
        <span>created {formatRelative(selectedInstance.createdAt)}</span>
        <span>·</span>
        <span>{history.length} change{history.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>last {formatRelative(selectedInstance.lastStateChangeTimestamp)}</span>
        {selectedInstance.isIsolated && (
          <>
            <span>·</span>
            <span
              style={{
                color: '#d97706',
                background: '#1c1208',
                padding: '1px 5px',
                borderRadius: '3px',
                fontSize: '9px',
                fontWeight: 600,
              }}
            >
              isolated
            </span>
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
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
