import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

interface CounterCubitProps {
  initialCount?: number;
  id?: string; // For identifying instances if needed, though isolation is usually per component instance
}

export class CounterCubit extends Cubit<CounterState, CounterCubitProps> {
  constructor(props?: CounterCubitProps) {
    super({ count: props?.initialCount ?? 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };
}

// Example of an inherently isolated version if needed directly
export class IsolatedCounterCubit extends Cubit<
  CounterState,
  CounterCubitProps
> {
  static isolated = true;

  constructor(props?: CounterCubitProps) {
    super({ count: props?.initialCount ?? 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };
}
