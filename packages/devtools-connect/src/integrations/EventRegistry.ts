/**
 * Event metadata stored in the registry
 */
export interface EventMetadata {
  /**
   * The event constructor
   */
  constructor: new (...args: any[]) => any;

  /**
   * Parameter names for the constructor
   */
  parameterNames: string[];

  /**
   * Optional custom deserializer function
   */
  deserialize?: (payload: any) => any;
}

/**
 * Global event registry for Redux DevTools action dispatch support.
 *
 * Events must be registered using the @DevToolsEvent() decorator
 * to enable dispatching them from Redux DevTools UI.
 */
class EventRegistryClass {
  private registry = new Map<string, EventMetadata>();

  /**
   * Register an event class with metadata
   */
  register(
    name: string,
    constructor: new (...args: any[]) => any,
    options: {
      parameterNames?: string[];
      deserialize?: (payload: any) => any;
    } = {},
  ): void {
    if (this.registry.has(name)) {
      console.warn(
        `[EventRegistry] Event "${name}" is already registered. Overwriting.`,
      );
    }

    this.registry.set(name, {
      constructor,
      parameterNames: options.parameterNames || [],
      deserialize: options.deserialize,
    });
  }

  /**
   * Get event metadata by name
   */
  get(name: string): EventMetadata | undefined {
    return this.registry.get(name);
  }

  /**
   * Check if an event is registered
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all registered event names
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Deserialize an event from a JSON payload
   */
  deserializeEvent(eventName: string, payload: any): any {
    const metadata = this.registry.get(eventName);

    if (!metadata) {
      throw new Error(
        `[EventRegistry] Unknown event: "${eventName}". Did you forget to use @DevToolsEvent() decorator?`,
      );
    }

    // Use custom deserializer if provided
    if (metadata.deserialize) {
      return metadata.deserialize(payload);
    }

    // Default deserialization: reconstruct from payload properties
    if (!payload || typeof payload !== 'object') {
      // No payload, use default constructor
      return new metadata.constructor();
    }

    // Map payload properties to constructor parameters
    const args = metadata.parameterNames.map((paramName) => payload[paramName]);

    // Create instance with parameters
    return new metadata.constructor(...args);
  }

  /**
   * Clear all registered events (useful for testing)
   */
  clear(): void {
    this.registry.clear();
  }
}

/**
 * Global singleton instance of the event registry
 */
export const EventRegistry = new EventRegistryClass();

/**
 * Decorator to register an event class for Redux DevTools action dispatch.
 *
 * @example
 * ```typescript
 * @DevToolsEvent({ params: ['amount'] })
 * class IncrementEvent {
 *   constructor(public amount: number = 1) {}
 * }
 *
 * // In DevTools, dispatch:
 * // { type: '[CounterBloc] IncrementEvent', payload: { amount: 5 } }
 * ```
 *
 * @example
 * With custom deserializer:
 * ```typescript
 * @DevToolsEvent({
 *   params: ['user'],
 *   deserialize: (payload) => new LoginEvent(User.fromJSON(payload.user))
 * })
 * class LoginEvent {
 *   constructor(public user: User) {}
 * }
 * ```
 */
export function DevToolsEvent(
  options: {
    /**
     * Parameter names matching the constructor signature.
     * Used to map JSON payload properties to constructor arguments.
     */
    params?: string[];

    /**
     * Custom name for the event (defaults to class name)
     */
    name?: string;

    /**
     * Custom deserializer function.
     * Useful for complex events with nested objects.
     */
    deserialize?: (payload: any) => any;
  } = {},
): ClassDecorator {
  return function (target: any) {
    const eventName = options.name || target.name;

    EventRegistry.register(eventName, target, {
      parameterNames: options.params || [],
      deserialize: options.deserialize,
    });

    return target;
  };
}
