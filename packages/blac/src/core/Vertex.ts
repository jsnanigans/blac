/**
 * Vertex - Event-driven state container (Bloc pattern)
 *
 * This validates that our StateContainer design can support
 * the event-driven Bloc pattern from the original BlaC.
 */

import { StateContainer, StateContainerConfig } from './StateContainer';
import { BaseEvent } from '../types/events';

/**
 * Event handler signature
 */
export type EventHandler<E extends BaseEvent, S> = (
  event: E,
  emit: (state: S) => void,
) => void | Promise<void>;

/**
 * Type-safe event constructor
 */
export type EventConstructor<T extends BaseEvent = BaseEvent> = new (
  ...args: never[]
) => T;

/**
 * Event handler registration
 */
interface EventHandlerRegistration<E extends BaseEvent, S> {
  eventClass: EventConstructor<E>;
  handler: EventHandler<E, S>;
}

/**
 * Vertex is an event-driven state container (Bloc pattern)
 */
export abstract class Vertex<
  S,
  E extends BaseEvent = BaseEvent,
> extends StateContainer<S, E> {
  private eventHandlers = new Map<string, EventHandlerRegistration<E, S>[]>();
  private isProcessing = false;
  private eventQueue: E[] = [];

  /**
   * Create a new Vertex
   * @param initialState Initial state value
   * @param config Configuration options
   */
  constructor(initialState: S, config?: StateContainerConfig) {
    super(initialState, config);

    // Subscribe to events for processing
    this.subscribeToEvents((event) => {
      this.processEvent(event as E);
    });
  }

  /**
   * Register an event handler
   * Arrow function to maintain correct 'this' binding
   */
  protected on = <T extends E>(
    EventClass: EventConstructor<T>,
    handler: EventHandler<T, S>,
  ): void => {
    const className = EventClass.name;
    const registrations = this.eventHandlers.get(className) || [];
    registrations.push({
      eventClass: EventClass as EventConstructor<E>,
      handler: handler as EventHandler<E, S>,
    });
    this.eventHandlers.set(className, registrations);
  };

  /**
   * Add an event to be processed
   * Arrow function to maintain correct 'this' binding in React
   */
  protected add = (event: E): void => {
    this.eventStream.dispatch(event);
  };

  /**
   * Process an event
   */
  private async processEvent(event: E): Promise<void> {
    // Queue event if already processing
    if (this.isProcessing) {
      this.eventQueue.push(event);
      return;
    }

    this.isProcessing = true;

    try {
      await this.handleEvent(event);

      // Process queued events
      while (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift()!;
        await this.handleEvent(nextEvent);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle a single event
   */
  private async handleEvent(event: E): Promise<void> {
    const className = event.constructor.name;
    const registrations = this.eventHandlers.get(className);

    if (!registrations || registrations.length === 0) {
      if (this.config.debug) {
        console.warn(`No handler registered for event: ${className}`);
      }
      return;
    }

    // Create emit function that captures current context
    const emit = (state: S) => {
      this.emit(state);
    };

    // Execute all handlers for this event type
    for (const registration of registrations) {
      try {
        await registration.handler(event, emit);
      } catch (error) {
        if (this.config.debug) {
          console.error(`Error handling event ${className}:`, error);
        }
        // Optionally emit error state
        this.onEventError(event, error as Error);
      }
    }
  }

  /**
   * Hook for handling event processing errors
   */
  protected onEventError(event: E, error: Error): void {
    // Override in subclass to handle errors
  }
}

/**
 * Example: Counter Events
 */
export class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();

  constructor(public readonly amount: number = 1) {}
}

export class DecrementEvent implements BaseEvent {
  readonly type = 'decrement';
  readonly timestamp = Date.now();

  constructor(public readonly amount: number = 1) {}
}

export class ResetEvent implements BaseEvent {
  readonly type = 'reset';
  readonly timestamp = Date.now();
}

/**
 * Example: Counter Vertex
 * Demonstrates proper typing and event handling
 */
export class CounterVertex extends Vertex<number> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (_, emit) => {
      emit(0);
    });
  }

  // Arrow functions for React compatibility
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };

  reset = () => {
    this.add(new ResetEvent());
  };
}

/**
 * Auth State and Events for testing async handlers
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; name: string; email: string } | null;
  error: string | null;
}

export class LoginEvent implements BaseEvent {
  readonly type = 'login';
  readonly timestamp = Date.now();
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export class LogoutEvent implements BaseEvent {
  readonly type = 'logout';
  readonly timestamp = Date.now();
}

export class AuthVertex extends Vertex<AuthState> {
  constructor() {
    super({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });

    // Async login handler
    this.on(LoginEvent, async (event, emit) => {
      // Set loading
      emit({ ...this.state, isLoading: true, error: null });

      // Simulate async auth
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check credentials
      if (event.email === 'user@example.com' && event.password === 'password') {
        emit({
          isAuthenticated: true,
          isLoading: false,
          user: { id: '123', name: 'Test User', email: 'user@example.com' },
          error: null,
        });
      } else {
        emit({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: 'Invalid credentials',
        });
      }
    });

    this.on(LogoutEvent, (_, emit) => {
      emit({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    });
  }

  login = (email: string, password: string) => {
    this.add(new LoginEvent(email, password));
  };

  logout = () => {
    this.add(new LogoutEvent());
  };
}
