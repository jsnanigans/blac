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
  emit: (state: S) => void
) => void | Promise<void>;

/**
 * Event handler registration
 */
interface EventHandlerRegistration<S> {
  eventClass: new (...args: any[]) => BaseEvent;
  handler: EventHandler<any, S>;
}

/**
 * Vertex is an event-driven state container (Bloc pattern)
 */
export abstract class Vertex<S, E extends BaseEvent = BaseEvent> extends StateContainer<S, E> {
  private eventHandlers = new Map<string, EventHandlerRegistration<S>[]>();
  private isProcessing = false;
  private eventQueue: E[] = [];

  /**
   * Create a new Vertex
   * @param initialState Initial state value
   * @param config Configuration options
   */
  constructor(initialState: S, config?: StateContainerConfig) {
    super(initialState, config);

    // Subscribe to event stream
    this.eventStream.subscribe(event => {
      this.processEvent(event as E);
    });
  }

  /**
   * Register an event handler
   * Arrow function to maintain correct 'this' binding
   */
  protected on = <T extends E>(
    EventClass: new (...args: any[]) => T,
    handler: EventHandler<T, S>
  ): void => {
    const className = EventClass.name;
    const registrations = this.eventHandlers.get(className) || [];
    registrations.push({
      eventClass: EventClass,
      handler: handler as EventHandler<any, S>,
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
 */
export class CounterVertex extends Vertex<number, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super(0, { name: 'CounterVertex' });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ResetEvent, (event, emit) => {
      emit(0);
    });
  }

  // Public API methods (arrow functions for React binding)
  increment = (amount = 1): void => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1): void => {
    this.add(new DecrementEvent(amount));
  };

  reset = (): void => {
    this.add(new ResetEvent());
  };
}

/**
 * Example: Authentication Events and Vertex
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string } | null;
  isLoading: boolean;
  error: string | null;
}

export class LoginRequestEvent implements BaseEvent {
  readonly type = 'login-request';
  readonly timestamp = Date.now();

  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
}

export class LoginSuccessEvent implements BaseEvent {
  readonly type = 'login-success';
  readonly timestamp = Date.now();

  constructor(public readonly user: NonNullable<AuthState['user']>) {}
}

export class LoginFailureEvent implements BaseEvent {
  readonly type = 'login-failure';
  readonly timestamp = Date.now();

  constructor(public readonly error: string) {}
}

export class LogoutEvent implements BaseEvent {
  readonly type = 'logout';
  readonly timestamp = Date.now();
}

export class AuthVertex extends Vertex<AuthState> {
  constructor() {
    super(
      {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      },
      { name: 'AuthVertex', keepAlive: true }
    );

    // Register event handlers
    this.on(LoginRequestEvent, async (event, emit) => {
      // Start loading
      emit({
        ...this.state,
        isLoading: true,
        error: null,
      });

      // Simulate API call
      await this.simulateLogin(event.email, event.password);
    });

    this.on(LoginSuccessEvent, (event, emit) => {
      emit({
        isAuthenticated: true,
        user: event.user,
        isLoading: false,
        error: null,
      });
    });

    this.on(LoginFailureEvent, (event, emit) => {
      emit({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: event.error,
      });
    });

    this.on(LogoutEvent, (event, emit) => {
      emit({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    });
  }

  // Public API
  login = (email: string, password: string): void => {
    this.add(new LoginRequestEvent(email, password));
  };

  logout = (): void => {
    this.add(new LogoutEvent());
  };

  // Private helper
  private async simulateLogin(email: string, password: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple validation
    if (email === 'user@example.com' && password === 'password') {
      this.add(new LoginSuccessEvent({
        id: '123',
        name: 'Test User',
        email: email,
      }));
    } else {
      this.add(new LoginFailureEvent('Invalid credentials'));
    }
  }
}