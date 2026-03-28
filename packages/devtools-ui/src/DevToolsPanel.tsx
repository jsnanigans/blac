/**
 * DevTools Panel - Reusable UI component for both Chrome DevTools and in-app overlay
 */

import React, { FC } from 'react';
import { T } from './theme';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
  DevToolsDependencyBloc,
  DevToolsMetricsBloc,
} from './blocs';
import {
  DevToolsHeader,
  InstanceList,
  StateViewer,
  LogsView,
  DependencyGraph,
  PerformancePanel,
} from './components';
import type { DevToolsUIProps } from './types';

class DetailErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#ef4444',
          }}
        >
          <div
            style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}
          >
            Error rendering detail view
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#888',
              marginBottom: '12px',
              textAlign: 'center',
              maxWidth: '300px',
            }}
          >
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              fontSize: '11px',
              padding: '4px 12px',
              background: 'transparent',
              border: `1px solid ${T.border2}`,
              color: T.text1,
              borderRadius: T.radius,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        width: '3px',
        cursor: 'col-resize',
        background: T.border0,
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = T.borderAccent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = T.border0;
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
    useBloc(DevToolsDependencyBloc);
    useBloc(DevToolsMetricsBloc);

    const [{ activeTab, leftPanelWidth }, layoutBloc] =
      useBloc(DevToolsLayoutBloc);

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
            <DetailErrorBoundary>
              <StateViewer onTimeTravel={onTimeTravel} />
            </DetailErrorBoundary>
          </div>
        ) : activeTab === 'Logs' ? (
          <LogsView />
        ) : activeTab === 'Graph' ? (
          <DetailErrorBoundary>
            <DependencyGraph />
          </DetailErrorBoundary>
        ) : activeTab === 'Performance' ? (
          <DetailErrorBoundary>
            <PerformancePanel />
          </DetailErrorBoundary>
        ) : null}
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
  DevToolsDependencyBloc,
  DevToolsMetricsBloc,
} from './blocs';
