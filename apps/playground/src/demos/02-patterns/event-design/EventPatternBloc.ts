import { Bloc } from '@blac/core';

// Good Event Patterns - Follow these examples

// 1. Simple event with no payload
export class ResetStateEvent {}

// 2. Event with primitive payload
export class IncrementByEvent {
  constructor(public readonly amount: number) {}
}

// 3. Event with object payload
export class UpdateDataEvent {
  constructor(
    public readonly data: {
      value: string;
      timestamp: number;
    }
  ) {}
}

// 4. Command pattern event (triggers action)
export class LoadDataEvent {
  constructor(public readonly id: string) {}
}

// 5. Query result event (carries result data)
export class DataLoadedEvent {
  constructor(
    public readonly data: {
      id: string;
      content: string;
      loadedAt: number;
    }
  ) {}
}

// 6. Domain event (something happened)
export class UserLoggedInEvent {
  constructor(
    public readonly user: {
      id: string;
      name: string;
    }
  ) {}
}

// 7. Error event pattern
export class ErrorOccurredEvent {
  constructor(
    public readonly error: {
      message: string;
      code?: string;
    }
  ) {}
}

// Anti-patterns (for demonstration - DO NOT USE)
// These are shown for educational purposes to demonstrate what NOT to do

// Bad: Verb-based naming (should be noun-based)
export class DoIncrementEvent {
  constructor(public readonly value: number) {}
}

// Bad: Generic/unclear event name
export class DataEvent {
  constructor(public readonly data: any) {}
}

// Bad: Mutable payload
export class MutableStateEvent {
  constructor(public state: { count: number }) {} // Note: not readonly
}

// Bad: Event doing multiple things
export class UpdateAndResetEvent {
  constructor(
    public readonly newValue?: string,
    public readonly shouldReset?: boolean
  ) {}
}

// Define the state interface
export interface EventDemoState {
  count: number;
  data: string;
  timestamp: number;
  lastEvent: string;
  user: { id: string; name: string } | null;
  error: { message: string; code?: string } | null;
  loadedData: { id: string; content: string; loadedAt: number } | null;
}

// Union type for all good events
export type GoodEventTypes =
  | ResetStateEvent
  | IncrementByEvent
  | UpdateDataEvent
  | LoadDataEvent
  | DataLoadedEvent
  | UserLoggedInEvent
  | ErrorOccurredEvent;

// Union type for all bad events (for demo purposes)
export type BadEventTypes =
  | DoIncrementEvent
  | DataEvent
  | MutableStateEvent
  | UpdateAndResetEvent;

// All event types
export type EventPatternBlocEvents = GoodEventTypes | BadEventTypes;

// The main Bloc implementation
export class EventPatternBloc extends Bloc<EventDemoState, EventPatternBlocEvents> {
  constructor() {
    super({
      count: 0,
      data: 'initial',
      timestamp: Date.now(),
      lastEvent: 'Initialized',
      user: null,
      error: null,
      loadedData: null,
    });

    // Register handlers for good patterns
    this.on(ResetStateEvent, this.handleReset);
    this.on(IncrementByEvent, this.handleIncrementBy);
    this.on(UpdateDataEvent, this.handleUpdateData);
    this.on(LoadDataEvent, this.handleLoadData);
    this.on(DataLoadedEvent, this.handleDataLoaded);
    this.on(UserLoggedInEvent, this.handleUserLoggedIn);
    this.on(ErrorOccurredEvent, this.handleError);

    // Register handlers for bad patterns (for demonstration)
    this.on(DoIncrementEvent, this.handleBadIncrement);
    this.on(DataEvent, this.handleBadData);
    this.on(MutableStateEvent, this.handleMutableState);
    this.on(UpdateAndResetEvent, this.handleUpdateAndReset);
  }

  // Good pattern handlers

  private handleReset = (event: ResetStateEvent, emit: (state: EventDemoState) => void) => {
    emit({
      count: 0,
      data: 'initial',
      timestamp: Date.now(),
      lastEvent: 'ResetStateEvent',
      user: null,
      error: null,
      loadedData: null,
    });
  };

  private handleIncrementBy = (event: IncrementByEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      count: this.state.count + event.amount,
      timestamp: Date.now(),
      lastEvent: `IncrementByEvent(${event.amount})`,
    });
  };

  private handleUpdateData = (event: UpdateDataEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      data: event.data.value,
      timestamp: event.data.timestamp,
      lastEvent: `UpdateDataEvent(${event.data.value})`,
    });
  };

  private handleLoadData = (event: LoadDataEvent, emit: (state: EventDemoState) => void) => {
    // Simulate async loading
    emit({
      ...this.state,
      lastEvent: `LoadDataEvent(${event.id})`,
    });

    // Simulate async operation completion
    setTimeout(() => {
      this.add(
        new DataLoadedEvent({
          id: event.id,
          content: `Loaded content for ${event.id}`,
          loadedAt: Date.now(),
        })
      );
    }, 100);
  };

  private handleDataLoaded = (event: DataLoadedEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      loadedData: event.data,
      lastEvent: `DataLoadedEvent(${event.data.id})`,
    });
  };

  private handleUserLoggedIn = (
    event: UserLoggedInEvent,
    emit: (state: EventDemoState) => void
  ) => {
    emit({
      ...this.state,
      user: event.user,
      lastEvent: `UserLoggedInEvent(${event.user.name})`,
      error: null, // Clear any previous errors on successful login
    });
  };

  private handleError = (event: ErrorOccurredEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      error: event.error,
      lastEvent: `ErrorOccurredEvent(${event.error.message})`,
    });
  };

  // Bad pattern handlers (for demonstration purposes)

  private handleBadIncrement = (event: DoIncrementEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      count: this.state.count + event.value,
      lastEvent: `DoIncrementEvent(${event.value}) - BAD PATTERN`,
    });
  };

  private handleBadData = (event: DataEvent, emit: (state: EventDemoState) => void) => {
    emit({
      ...this.state,
      data: String(event.data),
      lastEvent: `DataEvent - BAD PATTERN (generic)`,
    });
  };

  private handleMutableState = (event: MutableStateEvent, emit: (state: EventDemoState) => void) => {
    // This is bad because the event's state is mutable
    const newCount = event.state.count;
    event.state.count = 999; // Mutation! This is bad!

    emit({
      ...this.state,
      count: newCount,
      lastEvent: `MutableStateEvent - BAD PATTERN (mutable)`,
    });
  };

  private handleUpdateAndReset = (
    event: UpdateAndResetEvent,
    emit: (state: EventDemoState) => void
  ) => {
    // This is bad because the event tries to do multiple things
    if (event.shouldReset) {
      emit({
        count: 0,
        data: event.newValue || 'initial',
        timestamp: Date.now(),
        lastEvent: 'UpdateAndResetEvent - BAD PATTERN (multi-purpose)',
        user: null,
        error: null,
        loadedData: null,
      });
    } else {
      emit({
        ...this.state,
        data: event.newValue || this.state.data,
        lastEvent: 'UpdateAndResetEvent - BAD PATTERN (multi-purpose)',
      });
    }
  };

  // Public API methods (good patterns)

  reset = () => {
    return this.add(new ResetStateEvent());
  };

  incrementBy = (amount: number) => {
    return this.add(new IncrementByEvent(amount));
  };

  updateData = (value: string) => {
    return this.add(
      new UpdateDataEvent({
        value,
        timestamp: Date.now(),
      })
    );
  };

  loadData = (id: string) => {
    return this.add(new LoadDataEvent(id));
  };

  loginUser = (id: string, name: string) => {
    return this.add(new UserLoggedInEvent({ id, name }));
  };

  setError = (message: string, code?: string) => {
    return this.add(new ErrorOccurredEvent({ message, code }));
  };

  // Public API methods (bad patterns - for demonstration)

  doIncrement = (value: number) => {
    return this.add(new DoIncrementEvent(value));
  };

  sendGenericData = (data: any) => {
    return this.add(new DataEvent(data));
  };

  sendMutableState = (count: number) => {
    return this.add(new MutableStateEvent({ count }));
  };

  updateOrReset = (newValue?: string, shouldReset?: boolean) => {
    return this.add(new UpdateAndResetEvent(newValue, shouldReset));
  };
}