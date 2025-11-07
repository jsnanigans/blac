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

export { DevToolsPanel, LayoutBloc } from './DevToolsPanel';
export {
  DraggableOverlay,
  defaultDevToolsMount,
} from './DraggableOverlay';
export {
  PictureInPictureDevTools,
  isPiPSupported,
} from './PictureInPictureDevTools';
export { BlacDevtoolsUi } from './BlacDevtoolsUi';
export type { DevToolsUIProps, InstanceData } from './types';
export type { DraggableOverlayProps } from './DraggableOverlay';
export type { PictureInPictureDevToolsProps } from './PictureInPictureDevTools';
export type { BlacDevtoolsUiProps } from './BlacDevtoolsUi';
