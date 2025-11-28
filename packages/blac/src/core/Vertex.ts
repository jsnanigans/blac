import { StateContainer } from './StateContainer';
import { BaseEvent } from '../types/events';

export type EventHandler<E extends BaseEvent, S> = (
  event: E,
  emit: (state: S) => void,
) => void;

export type EventConstructor<T extends BaseEvent = BaseEvent> = new (
  ...args: never[]
) => T;

interface EventHandlerRegistration<E extends BaseEvent, S> {
  eventClass: EventConstructor<E>;
  handler: EventHandler<E, S>;
}

export abstract class Vertex<
  S,
  E extends BaseEvent = BaseEvent,
  P = undefined,
> extends StateContainer<S, P> {
  private eventHandlers = new Map<string, EventHandlerRegistration<E, S>[]>();
  private isProcessing = false;
  private eventQueue: E[] = [];

  constructor(initialState: S) {
    super(initialState);
  }

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

  public add = (event: E): void => {
    StateContainer._registry.emit('eventAdded', this, event);
    this.processEvent(event);
  };

  private processEvent(event: E): void {
    if (this.isProcessing) {
      this.eventQueue.push(event);
      return;
    }

    this.isProcessing = true;

    try {
      this.handleEvent(event);

      while (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift()!;
        this.handleEvent(nextEvent);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private handleEvent(event: E): void {
    const className = event.constructor.name;
    const registrations = this.eventHandlers.get(className);

    if (!registrations || registrations.length === 0) {
      if (this.debug) {
        console.warn(`No handler registered for event: ${className}`);
      }
      return;
    }

    const emitFn = (state: S) => {
      this.emit(state);
    };

    for (const registration of registrations) {
      try {
        registration.handler(event, emitFn);
      } catch (error) {
        if (this.debug) {
          console.error(`Error handling event ${className}:`, error);
        }
        this.onEventError(event, error as Error);
      }
    }
  }

  protected onEventError(_event: E, _error: Error): void {}
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

    // Synchronous login handler (async operations should be done before calling this)
    this.on(LoginEvent, (event, emit) => {
      // Set loading
      emit({ ...this.state, isLoading: true, error: null });

      // Simulate sync auth (in real app, async work would be done before dispatching event)
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
