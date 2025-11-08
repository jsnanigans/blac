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
import { DevToolsInstancesBloc, DevToolsDiffBloc } from './blocs';
import { DevToolsHeader, InstanceList, StateViewer } from './components';
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
        console.log('[DevToolsPanel] DevToolsInstancesBloc created');
        onMount(instancesBloc);
      },
      onUnmount: () => {
        onUnmount?.();
      },
    });

    // Initialize diff bloc for state comparison
    useBloc(DevToolsDiffBloc, {
      onMount: () => {
        console.log('[DevToolsPanel] DevToolsDiffBloc created');
      },
    });

    return (
      <div
        style={{
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with connection status */}
        <DevToolsHeader />

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel: Instance List */}
          <InstanceList />

          {/* Right Panel: State Viewer */}
          <StateViewer />
        </div>
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
} from './blocs';
