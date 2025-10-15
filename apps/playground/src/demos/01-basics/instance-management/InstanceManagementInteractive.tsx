import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { Share2, Lock } from 'lucide-react';

// Counter state
interface CounterState {
  count: number;
}

// Shared counter - default behavior
class SharedCounterCubit extends Cubit<CounterState> {
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
    this.patch({ count: 0 });
  };
}

// Isolated counter - each component gets its own
class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // This is the magic!

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
    this.patch({ count: 0 });
  };
}

// Shared counter component
function SharedCounterCard({ label }: { label: string }) {
  const [state, cubit] = useBloc(SharedCounterCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-5 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-teal-500/20 opacity-90" />
      <div className="relative flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h4>
      </div>

      <div className="relative text-4xl font-bold text-center my-6 text-foreground">
        {state.count}
      </div>

      <div className="relative flex gap-2">
        <Button onClick={cubit.decrement} variant="outline" size="sm" className="flex-1">
          -
        </Button>
        <Button onClick={cubit.increment} variant="primary" size="sm" className="flex-1">
          +
        </Button>
        <Button onClick={cubit.reset} variant="ghost" size="sm">
          Reset
        </Button>
      </div>
    </motion.div>
  );
}

// Isolated counter component
function IsolatedCounterCard({ label }: { label: string }) {
  const [state, cubit] = useBloc(IsolatedCounterCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-5 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-400/15 via-transparent to-fuchsia-500/20 opacity-90" />
      <div className="relative flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h4>
      </div>

      <div className="relative text-4xl font-bold text-center my-6 text-foreground">
        {state.count}
      </div>

      <div className="relative flex gap-2">
        <Button onClick={cubit.decrement} variant="outline" size="sm" className="flex-1">
          -
        </Button>
        <Button onClick={cubit.increment} variant="primary" size="sm" className="flex-1">
          +
        </Button>
        <Button onClick={cubit.reset} variant="ghost" size="sm">
          Reset
        </Button>
      </div>
    </motion.div>
  );
}

// Interactive component for MDX
export function InstanceManagementInteractive() {
  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shared Counters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-semibold text-lg">Shared Counters</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            All three counters share the same state. Changing one updates all of them.
          </p>
          <div className="space-y-3">
            <SharedCounterCard label="Counter A" />
            <SharedCounterCard label="Counter B" />
            <SharedCounterCard label="Counter C" />
          </div>
        </div>

        {/* Isolated Counters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-lg">Isolated Counters</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Each counter has its own state. They're completely independent.
          </p>
          <div className="space-y-3">
            <IsolatedCounterCard label="Counter A" />
            <IsolatedCounterCard label="Counter B" />
            <IsolatedCounterCard label="Counter C" />
          </div>
        </div>
      </div>

      <div className="my-8">
        <StateViewer bloc={SharedCounterCubit} title="Shared Counter State" />
        <p className="text-xs text-muted-foreground mt-2">
          Note: Isolated counters can't be viewed in a single StateViewer because each has its own
          separate instance.
        </p>
      </div>
    </div>
  );
}
