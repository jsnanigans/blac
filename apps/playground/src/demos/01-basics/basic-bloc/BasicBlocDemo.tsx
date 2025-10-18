import { useBloc } from '@blac/react';
import { Vertex } from '@blac/core';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { useState } from 'react';

// Event classes - each user action is represented as a class
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

// Counter state
interface CounterState {
  count: number;
}

// ClickBloc - Event-driven counter
class ClickBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods to dispatch events
  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    return this.add(new DecrementEvent(amount));
  };

  reset = () => {
    return this.add(new ResetEvent());
  };
}

// Demo component
export function BasicBlocDemo() {
  const [state, bloc] = useBloc(ClickBloc);
  const [eventLog, setEventLog] = useState<Array<{ event: string; timestamp: number }>>([]);

  const logEvent = (eventName: string) => {
    setEventLog((prev) => [{ event: eventName, timestamp: Date.now() }, ...prev].slice(0, 10));
  };

  const handleIncrement = () => {
    bloc.increment();
    logEvent('IncrementEvent(1)');
  };

  const handleDecrement = () => {
    bloc.decrement();
    logEvent('DecrementEvent(1)');
  };

  const handleReset = () => {
    bloc.reset();
    logEvent('ResetEvent()');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Main Counter Card */}
      <Card>
        <CardContent>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold mb-2">{state.count}</div>
            <p className="text-muted-foreground text-sm">
              Event-driven counter using the Bloc pattern
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <Button onClick={handleDecrement} variant="outline">
              Decrement
            </Button>
            <Button onClick={handleReset} variant="ghost">
              Reset
            </Button>
            <Button onClick={handleIncrement} variant="primary">
              Increment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event History Card */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">Event History</h3>
          <div className="bg-muted/50 rounded-md p-3 max-h-64 overflow-y-auto">
            {eventLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events yet. Click a button to see event flow!
              </p>
            ) : (
              <div className="space-y-2">
                {eventLog.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm font-mono bg-background p-2 rounded"
                  >
                    <span className="text-primary font-medium">{log.event}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Callout */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Bloc vs Cubit: Why Events?
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Event Traceability:</strong>
              <p className="text-muted-foreground mt-1">
                Every state change is triggered by a named event class, making it easy to track
                what caused each change. Perfect for debugging and logging!
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Testability:</strong>
              <p className="text-muted-foreground mt-1">
                You can test event handlers independently and verify that specific events produce
                expected state changes.
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">When to use Bloc:</strong>
              <p className="text-muted-foreground mt-1">
                Use Bloc when you need event tracking, time-travel debugging, or complex business
                logic. For simple state updates, a Cubit might be sufficient.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export code for display
export const basicBlocDemoCode = {
  bloc: `// Event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

// Event-driven Bloc
class ClickBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods to dispatch events
  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    return this.add(new DecrementEvent(amount));
  };

  reset = () => {
    return this.add(new ResetEvent());
  };
}`,
  usage: `function BasicBlocDemo() {
  const [state, bloc] = useBloc(ClickBloc);

  return (
    <div>
      <div>{state.count}</div>
      <button onClick={() => bloc.increment()}>+</button>
      <button onClick={() => bloc.decrement()}>-</button>
      <button onClick={() => bloc.reset()}>Reset</button>
    </div>
  );
}`,
};
