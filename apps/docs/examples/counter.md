# Counter Example

A simple counter demonstrating the basics of BlaC state management.

## Basic Counter

The simplest possible example - a number that increments and decrements.

### Cubit Implementation

```typescript
import { Cubit } from '@blac/core';

export class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }
  
  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  reset = () => this.emit(0);
}
```

### React Component

```tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './CounterCubit';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.reset}>Reset</button>
    </div>
  );
}
```

## Advanced Counter

A more complex example with additional features.

### Enhanced Cubit

```typescript
interface CounterState {
  value: number;
  step: number;
  min: number;
  max: number;
  history: number[];
}

export class AdvancedCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({
      value: 0,
      step: 1,
      min: -10,
      max: 10,
      history: [0]
    });
  }
  
  increment = () => {
    const newValue = Math.min(
      this.state.value + this.state.step,
      this.state.max
    );
    
    this.emit({
      ...this.state,
      value: newValue,
      history: [...this.state.history, newValue]
    });
  };
  
  decrement = () => {
    const newValue = Math.max(
      this.state.value - this.state.step,
      this.state.min
    );
    
    this.emit({
      ...this.state,
      value: newValue,
      history: [...this.state.history, newValue]
    });
  };
  
  setStep = (step: number) => {
    this.patch({ step: Math.max(1, step) });
  };
  
  setLimits = (min: number, max: number) => {
    this.patch({
      min,
      max,
      value: Math.max(min, Math.min(max, this.state.value))
    });
  };
  
  undo = () => {
    if (this.state.history.length <= 1) return;
    
    const newHistory = this.state.history.slice(0, -1);
    const previousValue = newHistory[newHistory.length - 1];
    
    this.patch({
      value: previousValue,
      history: newHistory
    });
  };
  
  reset = () => {
    this.emit({
      ...this.state,
      value: 0,
      history: [0]
    });
  };
}
```

### Enhanced Component

```tsx
function AdvancedCounter() {
  const [state, cubit] = useBloc(AdvancedCounterCubit);
  const canUndo = state.history.length > 1;
  const canIncrement = state.value < state.max;
  const canDecrement = state.value > state.min;
  
  return (
    <div className="counter-container">
      <h1>Advanced Counter</h1>
      
      <div className="counter-display">
        <h2>{state.value}</h2>
        <p>Range: {state.min} to {state.max}</p>
      </div>
      
      <div className="counter-controls">
        <button 
          onClick={cubit.decrement} 
          disabled={!canDecrement}
        >
          - {state.step}
        </button>
        
        <button 
          onClick={cubit.increment} 
          disabled={!canIncrement}
        >
          + {state.step}
        </button>
        
        <button onClick={cubit.reset}>Reset</button>
        
        <button onClick={cubit.undo} disabled={!canUndo}>
          Undo
        </button>
      </div>
      
      <div className="counter-settings">
        <label>
          Step:
          <input
            type="number"
            value={state.step}
            onChange={e => cubit.setStep(Number(e.target.value))}
            min="1"
          />
        </label>
        
        <label>
          Min:
          <input
            type="number"
            value={state.min}
            onChange={e => cubit.setLimits(Number(e.target.value), state.max)}
          />
        </label>
        
        <label>
          Max:
          <input
            type="number"
            value={state.max}
            onChange={e => cubit.setLimits(state.min, Number(e.target.value))}
          />
        </label>
      </div>
      
      <div className="counter-history">
        <h3>History ({state.history.length} values)</h3>
        <p>{state.history.join(' → ')}</p>
      </div>
    </div>
  );
}
```

## Multiple Counters

Demonstrating instance management with multiple independent counters.

### Isolated Counter

```typescript
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Each component gets its own instance
  
  constructor() {
    super(0);
  }
  
  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

function MultipleCounters() {
  return (
    <div>
      <h2>Independent Counters</h2>
      <CounterWidget title="Counter A" />
      <CounterWidget title="Counter B" />
      <CounterWidget title="Counter C" />
    </div>
  );
}

function CounterWidget({ title }: { title: string }) {
  const [count, cubit] = useBloc(IsolatedCounterCubit);
  
  return (
    <div className="counter-widget">
      <h3>{title}: {count}</h3>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

### Named Instances

```typescript
function NamedCounters() {
  const [countA] = useBloc(CounterCubit, { id: 'counter-a' });
  const [countB] = useBloc(CounterCubit, { id: 'counter-b' });
  const [countC] = useBloc(CounterCubit, { id: 'counter-c' });
  
  return (
    <div>
      <h2>Named Counter Instances</h2>
      <NamedCounter id="counter-a" label="Team A Score" />
      <NamedCounter id="counter-b" label="Team B Score" />
      <NamedCounter id="counter-c" label="Rounds Played" />
      
      <div className="scores">
        <p>Current Scores: {countA} - {countB} (Round {countC})</p>
      </div>
    </div>
  );
}

function NamedCounter({ id, label }: { id: string; label: string }) {
  const [count, cubit] = useBloc(CounterCubit, { id });
  
  return (
    <div>
      <h3>{label}: {count}</h3>
      <button onClick={cubit.increment}>+1</button>
      <button onClick={cubit.reset}>Reset</button>
    </div>
  );
}
```

## Event-Driven Counter (Bloc)

Using Bloc for event-driven state management.

### Events

```typescript
// Define event classes
class Increment {
  constructor(public readonly amount: number = 1) {}
}

class Decrement {
  constructor(public readonly amount: number = 1) {}
}

class Reset {}

class SetStep {
  constructor(public readonly step: number) {}
}

type CounterEvent = Increment | Decrement | Reset | SetStep;
```

### Bloc Implementation

```typescript
interface CounterState {
  value: number;
  step: number;
  eventCount: number;
}

export class CounterBloc extends Bloc<CounterState, CounterEvent> {
  constructor() {
    super({
      value: 0,
      step: 1,
      eventCount: 0
    });
    
    // Register event handlers
    this.on(Increment, this.handleIncrement);
    this.on(Decrement, this.handleDecrement);
    this.on(Reset, this.handleReset);
    this.on(SetStep, this.handleSetStep);
  }
  
  private handleIncrement = (event: Increment, emit: (state: CounterState) => void) => {
    emit({
      ...this.state,
      value: this.state.value + (event.amount * this.state.step),
      eventCount: this.state.eventCount + 1
    });
  };
  
  private handleDecrement = (event: Decrement, emit: (state: CounterState) => void) => {
    emit({
      ...this.state,
      value: this.state.value - (event.amount * this.state.step),
      eventCount: this.state.eventCount + 1
    });
  };
  
  private handleReset = (_: Reset, emit: (state: CounterState) => void) => {
    emit({
      ...this.state,
      value: 0,
      eventCount: this.state.eventCount + 1
    });
  };
  
  private handleSetStep = (event: SetStep, emit: (state: CounterState) => void) => {
    emit({
      ...this.state,
      step: event.step,
      eventCount: this.state.eventCount + 1
    });
  };
  
  // Helper methods
  increment = (amount?: number) => this.add(new Increment(amount));
  decrement = (amount?: number) => this.add(new Decrement(amount));
  reset = () => this.add(new Reset());
  setStep = (step: number) => this.add(new SetStep(step));
}
```

### Bloc Component

```tsx
function EventDrivenCounter() {
  const [state, bloc] = useBloc(CounterBloc);
  
  return (
    <div>
      <h2>Event-Driven Counter</h2>
      
      <div className="counter-value">
        <h1>{state.value}</h1>
        <p>Step: {state.step} | Events: {state.eventCount}</p>
      </div>
      
      <div className="controls">
        <button onClick={() => bloc.decrement()}>-1</button>
        <button onClick={() => bloc.decrement(5)}>-5</button>
        <button onClick={() => bloc.reset()}>Reset</button>
        <button onClick={() => bloc.increment()}>+1</button>
        <button onClick={() => bloc.increment(5)}>+5</button>
      </div>
      
      <div className="step-control">
        <label>
          Step Size:
          <input
            type="range"
            min="1"
            max="10"
            value={state.step}
            onChange={e => bloc.setStep(Number(e.target.value))}
          />
          <span>{state.step}</span>
        </label>
      </div>
    </div>
  );
}
```

## Persistent Counter

Counter that saves its state to localStorage.

```typescript
import { Persist } from '@blac/core';

class PersistentCounterCubit extends Cubit<number> {
  constructor() {
    super(0);
    
    // Add persistence
    this.addAddon(new Persist({
      key: 'counter-state',
      storage: localStorage
    }));
  }
  
  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  reset = () => this.emit(0);
}

function PersistentCounter() {
  const [count, cubit] = useBloc(PersistentCounterCubit);
  
  return (
    <div>
      <h2>Persistent Counter</h2>
      <p>This counter saves to localStorage!</p>
      <h1>{count}</h1>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.reset}>Reset</button>
      <p>Try refreshing the page!</p>
    </div>
  );
}
```

## Complete App

Putting it all together in a complete application:

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import './CounterApp.css';

function CounterApp() {
  return (
    <div className="app">
      <header>
        <h1>BlaC Counter Examples</h1>
      </header>
      
      <main>
        <section>
          <Counter />
        </section>
        
        <section>
          <AdvancedCounter />
        </section>
        
        <section>
          <MultipleCounters />
        </section>
        
        <section>
          <EventDrivenCounter />
        </section>
        
        <section>
          <PersistentCounter />
        </section>
      </main>
    </div>
  );
}

export default CounterApp;
```

## Key Takeaways

1. **Simple API**: Just extend `Cubit` and define methods
2. **Type Safety**: Full TypeScript support out of the box
3. **Flexible Instances**: Shared, isolated, or named instances
4. **Event-Driven**: Use `Bloc` for complex state transitions
5. **Persistence**: Easy to add with addons
6. **Testing**: State logic is separate from UI

## Next Steps

- [Todo List Example](/examples/todo-list) - More complex state management
- [Authentication Example](/examples/authentication) - Async operations
- [API Reference](/api/core/cubit) - Complete API documentation