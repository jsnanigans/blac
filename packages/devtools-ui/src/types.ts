import type { LayoutBloc } from './DevToolsPanel';

export interface DevToolsUIProps {
  /**
   * Callback when the DevTools panel mounts
   * Use this to connect to your data source (Chrome extension, window.__BLAC_DEVTOOLS__, etc)
   */
  onMount: (bloc: LayoutBloc) => void | (() => void);

  /**
   * Callback when the DevTools panel unmounts
   */
  onUnmount?: () => void;
}

export interface InstanceData {
  /** Unique instance ID */
  id: string;
  /** Class name (e.g., 'CounterCubit') */
  className: string;
  /** Whether the instance is disposed */
  isDisposed: boolean;
  /** Custom name if provided */
  name: string;
  /** Timestamp of last state change */
  lastStateChangeTimestamp: number;
  /** Current state */
  state: any;
  /** Creation timestamp */
  createdAt: number;
}
