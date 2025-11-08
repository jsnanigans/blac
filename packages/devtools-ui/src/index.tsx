/**
 * @blac/devtools-ui
 *
 * Reusable DevTools UI components for BlaC state management.
 * Can be used in:
 * - Chrome DevTools extension panels
 * - In-app floating overlays (draggable)
 * - In-app Picture-in-Picture windows
 * - Standalone debugging tools
 */

// Main components
export { DevToolsPanel } from './DevToolsPanel';
export {
  DraggableOverlay,
  defaultDevToolsMount,
} from './DraggableOverlay';
export {
  PictureInPictureDevTools,
  isPiPSupported,
} from './PictureInPictureDevTools';
export { BlacDevtoolsUi } from './BlacDevtoolsUi';

// Blocs for state management
export {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsDiffBloc,
  DevToolsLayoutBloc,
} from './blocs';

// Backward compatibility: export DevToolsInstancesBloc as LayoutBloc
// @deprecated Use DevToolsInstancesBloc instead
export { DevToolsInstancesBloc as LayoutBloc } from './blocs';

// Types
export type { DevToolsUIProps, InstanceData } from './types';
export type { DraggableOverlayProps } from './DraggableOverlay';
export type { PictureInPictureDevToolsProps } from './PictureInPictureDevTools';
export type { BlacDevtoolsUiProps } from './BlacDevtoolsUi';
export type { DiffResult } from './blocs';
