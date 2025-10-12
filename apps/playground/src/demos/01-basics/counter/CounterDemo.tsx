import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { DemoLayout } from '@/core/layouts/DemoLayout';

// Counter state and Cubit
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
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
}

// Demo component
export function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <DemoLayout>
      <div className="max-w-2xl">
        <Card>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-2">{state.count}</div>
              <p className="text-muted-foreground text-sm">
                A simple counter demonstrating basic Cubit usage
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button onClick={cubit.decrement} variant="outline">
                Decrement
              </Button>
              <Button onClick={cubit.reset} variant="muted">
                Reset
              </Button>
              <Button onClick={cubit.increment} variant="primary">
                Increment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoLayout>
  );
}

// Export code for display
export const counterDemoCode = {
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
  usage: `function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <div>{state.count}</div>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}`,
};
