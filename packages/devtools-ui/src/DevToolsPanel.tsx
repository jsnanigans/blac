/**
 * DevTools Panel - Reusable UI component for both Chrome DevTools and in-app overlay
 */

import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
} from './blocs';
import {
  DevToolsHeader,
  InstanceList,
  StateViewer,
  LogsView,
} from './components';
import type { DevToolsUIProps } from './types';

function ResizeDivider({
  onResize,
  currentWidth,
}: {
  onResize: (width: number) => void;
  currentWidth: number;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = currentWidth;

    const handleMove = (e: MouseEvent) => {
      onResize(startWidth + (e.clientX - startX));
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: '4px',
        cursor: 'col-resize',
        background: '#333',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#569cd6';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#333';
      }}
    />
  );
}

export const DevToolsPanel: FC<DevToolsUIProps> = React.memo(
  ({ onMount, onUnmount, onTimeTravel }) => {
    useBloc(DevToolsInstancesBloc, {
      onMount: (instancesBloc) => {
        onMount(instancesBloc);
      },
      onUnmount: () => {
        onUnmount?.();
      },
    });

    useBloc(DevToolsDiffBloc);
    useBloc(DevToolsLogsBloc);

    const [{ activeTab, leftPanelWidth }, layoutBloc] = useBloc(DevToolsLayoutBloc);

    return (
      <div
        style={{
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DevToolsHeader />

        {activeTab === 'Instances' ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <InstanceList width={leftPanelWidth} />
            <ResizeDivider
              onResize={layoutBloc.setLeftPanelWidth}
              currentWidth={leftPanelWidth}
            />
            <StateViewer onTimeTravel={onTimeTravel} />
          </div>
        ) : (
          <LogsView />
        )}
      </div>
    );
  },
);

DevToolsPanel.displayName = 'DevToolsPanel';

export {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
} from './blocs';
