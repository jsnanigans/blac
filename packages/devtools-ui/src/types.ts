import type { DevToolsInstancesBloc } from './blocs';

export interface DevToolsUIProps {
  /**
   * Callback when the DevTools panel mounts
   * Use this to connect to your data source (Chrome extension, window.__BLAC_DEVTOOLS__, etc)
   *
   * @param instancesBloc - The instances bloc for managing instance data
   * @returns Optional cleanup function
   */
  onMount: (instancesBloc: DevToolsInstancesBloc) => void | (() => void);

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

/**
 * Event types that can be logged
 */
export type LogEventType =
  | 'init' // Initial state load
  | 'created' // Instance created
  | 'disposed' // Instance disposed
  | 'state-changed' // State changed
  | 'event-added'; // Event added (for Vertex/Bloc)

/**
 * Single log entry
 */
export interface LogEntry {
  /** Unique log entry ID */
  id: string;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Type of event */
  eventType: LogEventType;
  /** Instance ID */
  instanceId: string;
  /** Class name */
  className: string;
  /** Custom instance name */
  instanceName?: string;
  /** Event-specific data */
  data?: any;
  /** Call stack (for state changes) */
  callstack?: string;
}
