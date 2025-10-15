import { useBloc } from '@blac/react';
import { Cubit, Bloc } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { useState } from 'react';
import confetti from 'canvas-confetti';

// ===== CUBIT IMPLEMENTATION =====
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

// ===== BLOC IMPLEMENTATION =====
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

class CounterBloc extends Bloc<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
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
}

// ===== HELPER FUNCTIONS =====
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// ===== INTERACTIVE COMPONENT =====
export function BlocVsCubitInteractive() {
  const [activeImpl, setActiveImpl] = useState<'cubit' | 'bloc'>('cubit');
  const [cubitState, cubit] = useBloc(CounterCubit);
  const [blocState, bloc] = useBloc(CounterBloc);

  return (
    <div className="my-8 space-y-6">
      {/* Implementation Switcher */}
      <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-purple-400/10 via-transparent to-blue-500/10 border-2 border-border">
        <h3 className="text-lg font-semibold">Choose Implementation:</h3>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveImpl('cubit')}
            variant={activeImpl === 'cubit' ? 'primary' : 'outline'}
            size="sm"
          >
            Cubit (Simple)
          </Button>
          <Button
            onClick={() => setActiveImpl('bloc')}
            variant={activeImpl === 'bloc' ? 'primary' : 'outline'}
            size="sm"
          >
            Bloc (Event-Driven)
          </Button>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cubit Side */}
        <div
          className={`relative overflow-hidden rounded-3xl border-2 px-6 py-6 transition-opacity ${
            activeImpl === 'cubit'
              ? 'border-brand bg-surface shadow-subtle'
              : 'opacity-50 border-border bg-surface'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-400/10 via-transparent to-emerald-500/15 opacity-90" />
          <div className="relative">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">Cubit</h3>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
                  Simple
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Direct method calls</p>
            </div>

            <div className="text-center mb-8">
              <motion.div
                key={cubitState.count}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="text-7xl font-bold text-brand"
              >
                {cubitState.count}
              </motion.div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <Button onClick={cubit.decrement} variant="outline" size="sm" disabled={activeImpl !== 'cubit'}>
                -
              </Button>
              <Button onClick={cubit.reset} variant="outline" size="sm" disabled={activeImpl !== 'cubit'}>
                Reset
              </Button>
              <Button
                onClick={() => {
                  cubit.increment();
                  if ((cubitState.count + 1) % 10 === 0 && cubitState.count + 1 > 0) {
                    celebrate();
                  }
                }}
                variant="primary"
                size="sm"
                disabled={activeImpl !== 'cubit'}
              >
                +
              </Button>
            </div>

            <div className="bg-background/50 rounded-lg p-4 text-xs font-mono">
              <div className="text-muted-foreground mb-2">// Usage:</div>
              <div>cubit.increment()</div>
              <div>cubit.decrement()</div>
              <div>cubit.reset()</div>
            </div>
          </div>
        </div>

        {/* Bloc Side */}
        <div
          className={`relative overflow-hidden rounded-3xl border-2 px-6 py-6 transition-opacity ${
            activeImpl === 'bloc'
              ? 'border-brand bg-surface shadow-subtle'
              : 'opacity-50 border-border bg-surface'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-500/15 opacity-90" />
          <div className="relative">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">Bloc</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                  Event-Driven
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Events trigger state changes</p>
            </div>

            <div className="text-center mb-8">
              <motion.div
                key={blocState.count}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="text-7xl font-bold text-brand"
              >
                {blocState.count}
              </motion.div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <Button onClick={() => bloc.decrement()} variant="outline" size="sm" disabled={activeImpl !== 'bloc'}>
                -
              </Button>
              <Button onClick={() => bloc.reset()} variant="outline" size="sm" disabled={activeImpl !== 'bloc'}>
                Reset
              </Button>
              <Button
                onClick={() => {
                  bloc.increment();
                  if ((blocState.count + 1) % 10 === 0 && blocState.count + 1 > 0) {
                    celebrate();
                  }
                }}
                variant="primary"
                size="sm"
                disabled={activeImpl !== 'bloc'}
              >
                +
              </Button>
            </div>

            <div className="bg-background/50 rounded-lg p-4 text-xs font-mono">
              <div className="text-muted-foreground mb-2">// Usage:</div>
              <div>bloc.add(new IncrementEvent())</div>
              <div>bloc.add(new DecrementEvent())</div>
              <div>bloc.add(new ResetEvent())</div>
            </div>
          </div>
        </div>
      </div>

      {/* State Viewers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StateViewer
          bloc={CounterCubit}
          title="Cubit State"
          defaultCollapsed={false}
        />
        <StateViewer
          bloc={CounterBloc}
          title="Bloc State"
          defaultCollapsed={false}
        />
      </div>
    </div>
  );
}
