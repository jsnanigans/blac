import { useBloc } from '@blac/react';
import { Cubit, Vertex } from '@blac/core';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { useState } from 'react';

// ===== CUBIT IMPLEMENTATION =====
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  // Direct methods - simple and straightforward
  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// ===== BLOC IMPLEMENTATION =====

// Event classes - explicit actions
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

class CounterBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
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

  // Helper methods dispatch events
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

// ===== DEMO COMPONENT =====
export function BlocVsCubitDemo() {
  const [activeImpl, setActiveImpl] = useState<'cubit' | 'bloc'>('cubit');
  const [cubitState, cubit] = useBloc(CounterCubit);
  const [blocState, bloc] = useBloc(CounterBloc);

  const state = activeImpl === 'cubit' ? cubitState : blocState;
  const controller = activeImpl === 'cubit' ? cubit : bloc;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Implementation Switcher */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Choose Implementation:</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveImpl('cubit')}
                variant={activeImpl === 'cubit' ? 'primary' : 'outline'}
              >
                Cubit (Simple)
              </Button>
              <Button
                onClick={() => setActiveImpl('bloc')}
                variant={activeImpl === 'bloc' ? 'primary' : 'outline'}
              >
                Bloc (Event-Driven)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cubit Side */}
        <Card className={activeImpl === 'cubit' ? 'ring-2 ring-primary' : 'opacity-50'}>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Cubit</h3>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  Simple
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Direct method calls</p>
            </div>

            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-2">{cubitState.count}</div>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              <Button onClick={cubit.decrement} variant="outline" disabled={activeImpl !== 'cubit'}>
                -
              </Button>
              <Button onClick={cubit.reset} variant="ghost" disabled={activeImpl !== 'cubit'}>
                Reset
              </Button>
              <Button onClick={cubit.increment} variant="primary" disabled={activeImpl !== 'cubit'}>
                +
              </Button>
            </div>

            <div className="bg-muted/50 rounded p-3 text-xs font-mono">
              <div className="text-muted-foreground mb-1">// Usage:</div>
              <div>cubit.increment()</div>
              <div>cubit.decrement()</div>
              <div>cubit.reset()</div>
            </div>
          </CardContent>
        </Card>

        {/* Bloc Side */}
        <Card className={activeImpl === 'bloc' ? 'ring-2 ring-primary' : 'opacity-50'}>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Bloc</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  Event-Driven
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Events trigger state changes</p>
            </div>

            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-2">{blocState.count}</div>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              <Button onClick={() => bloc.decrement()} variant="outline" disabled={activeImpl !== 'bloc'}>
                -
              </Button>
              <Button onClick={() => bloc.reset()} variant="ghost" disabled={activeImpl !== 'bloc'}>
                Reset
              </Button>
              <Button onClick={() => bloc.increment()} variant="primary" disabled={activeImpl !== 'bloc'}>
                +
              </Button>
            </div>

            <div className="bg-muted/50 rounded p-3 text-xs font-mono">
              <div className="text-muted-foreground mb-1">// Usage:</div>
              <div>bloc.add(new IncrementEvent())</div>
              <div>bloc.add(new DecrementEvent())</div>
              <div>bloc.add(new ResetEvent())</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Matrix */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">When to Use Which?</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Criteria</th>
                  <th className="text-left p-2 font-semibold">Cubit</th>
                  <th className="text-left p-2 font-semibold">Bloc</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Complexity</td>
                  <td className="p-2">✅ Simpler, less boilerplate</td>
                  <td className="p-2">⚠️ More setup required</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Traceability</td>
                  <td className="p-2">❌ Direct method calls</td>
                  <td className="p-2">✅ Named events, clear history</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Debugging</td>
                  <td className="p-2">⚠️ Standard debugging</td>
                  <td className="p-2">✅ Event logs, time-travel</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Testing</td>
                  <td className="p-2">✅ Test methods directly</td>
                  <td className="p-2">✅ Test events & handlers</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Performance</td>
                  <td className="p-2">✅ Slightly faster</td>
                  <td className="p-2">⚠️ Event queue overhead</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Use Case</td>
                  <td className="p-2">Simple state, direct updates</td>
                  <td className="p-2">Complex logic, need tracking</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Code Comparison */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">Code Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cubit Code */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Cubit Implementation</h4>
              <div className="bg-muted/50 rounded p-3 text-xs font-mono overflow-x-auto">
                <pre>{`class CounterCubit extends Cubit<State> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({
      count: this.state.count + 1
    });
  };

  decrement = () => {
    this.patch({
      count: this.state.count - 1
    });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// Usage
const cubit = new CounterCubit();
cubit.increment(); // Direct call`}</pre>
              </div>
            </div>

            {/* Bloc Code */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Bloc Implementation</h4>
              <div className="bg-muted/50 rounded p-3 text-xs font-mono overflow-x-auto">
                <pre>{`// Event classes
class IncrementEvent {}
class DecrementEvent {}
class ResetEvent {}

class CounterBloc extends Vertex<State> {
  constructor() {
    super({ count: 0 });

    this.on(IncrementEvent, (e, emit) => {
      emit({ count: this.state.count + 1 });
    });

    this.on(DecrementEvent, (e, emit) => {
      emit({ count: this.state.count - 1 });
    });

    this.on(ResetEvent, (e, emit) => {
      emit({ count: 0 });
    });
  }
}

// Usage
const bloc = new CounterBloc();
bloc.add(new IncrementEvent());`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Flowchart */}
      <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Decision Guide
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="font-bold text-purple-700 dark:text-purple-300 min-w-[100px]">
                Choose Cubit:
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Simple state management</li>
                <li>Direct, synchronous updates</li>
                <li>No need for event tracking</li>
                <li>Prototyping or small features</li>
                <li>Performance is critical</li>
              </ul>
            </div>
            <div className="flex items-start gap-3">
              <div className="font-bold text-purple-700 dark:text-purple-300 min-w-[100px]">
                Choose Bloc:
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Complex business logic</li>
                <li>Need event tracing/logging</li>
                <li>Time-travel debugging required</li>
                <li>Multiple triggers for same state change</li>
                <li>Need to replay or test event sequences</li>
              </ul>
            </div>
            <div className="mt-4 p-3 bg-background rounded border">
              <strong>💡 Pro Tip:</strong> Start with Cubit for simplicity. Migrate to Bloc when you
              need event tracking or complex logic. They share the same API, so migration is
              straightforward!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export code for display
export const blocVsCubitDemoCode = {
  cubit: `class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}`,
  bloc: `// Event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}
class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}
class ResetEvent {}

class CounterBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0 });

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
  usage: `// Cubit usage
const [state, cubit] = useBloc(CounterCubit);
cubit.increment(); // Direct method call

// Bloc usage
const [state, bloc] = useBloc(CounterBloc);
bloc.increment(); // Dispatches IncrementEvent
// or
bloc.add(new IncrementEvent(5)); // Explicit event`,
};
