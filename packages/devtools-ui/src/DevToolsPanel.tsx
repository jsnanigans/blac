/**
 * DevTools Panel - Reusable UI component for both Chrome DevTools and in-app overlay
 *
 * This component has been refactored into smaller, focused components:
 * - Blocs: DevToolsInstancesBloc, DevToolsSearchBloc, DevToolsDiffBloc, DevToolsLayoutBloc
 * - Components: DevToolsHeader, InstanceList, StateViewer
 *
 * Each component subscribes only to the bloc(s) it needs, optimizing re-renders.
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

/**
 * Main DevTools Panel component
 *
 * Coordinates multiple blocs:
 * - DevToolsInstancesBloc: Manages instance list and connection
 * - DevToolsSearchBloc: Manages search query and filtering
 * - DevToolsDiffBloc: Manages state history for diffs
 * - DevToolsLayoutBloc: Manages UI layout (selection, expansion)
 */
export const DevToolsPanel: FC<DevToolsUIProps> = React.memo(
  ({ onMount, onUnmount }) => {
    // Initialize core blocs needed for the panel
    useBloc(DevToolsInstancesBloc, {
      onMount: (instancesBloc) => {
        onMount(instancesBloc);
      },
      onUnmount: () => {
        onUnmount?.();
      },
    });

    // Initialize diff bloc for state comparison
    useBloc(DevToolsDiffBloc);

    // Initialize logs bloc for event logging
    useBloc(DevToolsLogsBloc);

    // Initialize layout bloc for tab management
    const [{ activeTab }] = useBloc(DevToolsLayoutBloc);

    return (
      <div
        style={{
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compact Header with tabs integrated */}
        <DevToolsHeader />

        {/* Main Content - conditionally render based on active tab */}
        {activeTab === 'Instances' ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Panel: Instance List */}
            <InstanceList />

            {/* Right Panel: State Viewer */}
            <StateViewer />
          </div>
        ) : (
          <LogsView />
        )}
      </div>
    );
  },
);

DevToolsPanel.displayName = 'DevToolsPanel';

// Re-export the blocs for external use (e.g., in plugin communication)
export {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
  DevToolsLogsBloc,
} from './blocs';
