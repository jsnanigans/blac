import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { BlocGraphVisualizer } from '@/components/bloc-graph';

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
    <div className="flex h-[calc(100vh-100px)] gap-4 p-4">
      {/* Left Side - Counter Controls */}
      <div className="w-96">
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

      {/* Right Side - Graph Visualization */}
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
        <BlocGraphVisualizer
          layout="tree"
          showControls={true}
          showMinimap={true}
          highlightLifecycle={true}
          animationDuration={300} // Smooth animations when graph changes
          treeOptions={{
            nodeWidth: 180,
            nodeHeight: 100,
            siblingSpacing: 50,
            levelSpacing: 60,
            orientation: 'horizontal',
          }}
        />
      </div>
    </div>
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
