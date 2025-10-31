/**
 * Base event interface for type-safe event system
 */

/**
 * Base event interface
 * Used by Vertex for event-driven state management
 */
export interface BaseEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly source?: string;
}
