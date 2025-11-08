import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc } from '../blocs';
import InstanceId from './InstanceId';
import { CurrentStateView } from './CurrentStateView';
import { StateDiffView } from './StateDiffView';

/**
 * Right panel displaying selected instance state and diff
 */
export const StateViewer: FC = () => {
  const [{ isDiffExpanded }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  const selectedInstance = layoutBloc.selectedInstance;
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
        <CurrentStateView state={selectedInstance.state} />

        {/* State Diff Section (Collapsible) */}
        <StateDiffView
          diff={diff}
          isExpanded={isDiffExpanded}
          onToggleExpanded={layoutBloc.toggleDiffExpanded}
        />
      </div>
    </div>
  );
};

StateViewer.displayName = 'StateViewer';
