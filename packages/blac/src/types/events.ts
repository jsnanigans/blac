/**
 * Base event interface
 * Used by Vertex for event-driven state management
 */
export interface BaseEvent {
  /** Event type identifier (typically the class name) */
  readonly type: string;
  /** Unix timestamp when the event was created */
  readonly timestamp: number;
  /** Optional source identifier for debugging */
  readonly source?: string;
}
