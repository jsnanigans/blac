import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc } from '../blocs';
import InstanceId from './InstanceId';
import { CurrentStateView } from './CurrentStateView';
import { StateHistoryView } from './StateHistoryView';

/**
 * Right panel displaying selected instance state and history
 */
export const StateViewer: FC = () => {
  const [{ isCurrentStateExpanded, isHistoryExpanded }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  const selectedInstance = layoutBloc.selectedInstance;
  const history = layoutBloc.selectedHistory;

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
          padding: '15px 20px',
        }}
      >
        <h2 style={{ fontSize: '18px', margin: 0 }}>
          <InstanceId id={selectedInstance.id} />
        </h2>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Current State Section */}
        <CurrentStateView
          state={selectedInstance.state}
          isExpanded={isCurrentStateExpanded}
          onToggleExpanded={layoutBloc.toggleCurrentStateExpanded}
        />

        {/* State History Section (Collapsible) */}
        <StateHistoryView
          history={history}
          currentState={selectedInstance.state}
          isExpanded={isHistoryExpanded}
          onToggleExpanded={layoutBloc.toggleHistoryExpanded}
        />
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
