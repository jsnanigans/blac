import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { Heart, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// State interface
interface CounterState {
  count: number;
  instanceId: number;
  lastUpdated: number;
}

// Instance counter for tracking
let instanceCounter = 0;

/**
 * KeepAlive Cubit - Persists even when no components are using it
 * The static keepAlive = true property tells BlaC to keep this instance alive
 */
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true; // This is the magic line!

  constructor() {
    instanceCounter++;
    super({
      count: 0,
      instanceId: instanceCounter,
      lastUpdated: Date.now(),
    });
  }

  increment = () => {
    this.emit({
      ...this.state,
      count: this.state.count + 1,
      lastUpdated: Date.now(),
    });
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
  };
}

/**
 * Regular Cubit - Disposed when no components are using it
 * Without keepAlive, the instance is disposed when last consumer unmounts
 */
class RegularCounterCubit extends Cubit<CounterState> {
  // No keepAlive property - default behavior

  constructor() {
    instanceCounter++;
    super({
      count: 0,
      instanceId: instanceCounter,
      lastUpdated: Date.now(),
    });
  }

  increment = () => {
    this.emit({
      ...this.state,
      count: this.state.count + 1,
      lastUpdated: Date.now(),
    });
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
  };
}

/**
 * Counter component for KeepAlive Cubit
 */
function KeepAliveCounter() {
  const [state, cubit] = useBloc(KeepAliveCounterCubit);

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-blue-400 dark:border-blue-600 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-current" />
            <h4 className="font-semibold text-blue-700 dark:text-blue-300">
              KeepAlive Counter
            </h4>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
            Instance #{state.instanceId}
          </span>
        </div>

        <div className="text-5xl font-bold text-center bg-white dark:bg-gray-800 rounded-lg py-6 text-blue-600 dark:text-blue-400">
          {state.count}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}
        </p>

        <div className="flex gap-2">
          <Button onClick={cubit.increment} variant="default" className="flex-1">
            Increment
          </Button>
          <Button onClick={cubit.reset} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Counter component for Regular Cubit
 */
function RegularCounter() {
  const [state, cubit] = useBloc(RegularCounterCubit);

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-orange-400 dark:border-orange-600 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-500/5 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-orange-700 dark:text-orange-300">
              Regular Counter
            </h4>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-mono">
            Instance #{state.instanceId}
          </span>
        </div>

        <div className="text-5xl font-bold text-center bg-white dark:bg-gray-800 rounded-lg py-6 text-orange-600 dark:text-orange-400">
          {state.count}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}
        </p>

        <div className="flex gap-2">
          <Button onClick={cubit.increment} variant="default" className="flex-1">
            Increment
          </Button>
          <Button onClick={cubit.reset} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive KeepAlive demo component
 * Demonstrates the difference between KeepAlive and Regular Cubits
 */
export function KeepAliveInteractive() {
  const [showKeepAlive, setShowKeepAlive] = useState(true);
  const [showRegular, setShowRegular] = useState(true);

  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* KeepAlive Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                KeepAlive Counter
              </h3>
            </div>
            <Button
              onClick={() => setShowKeepAlive(!showKeepAlive)}
              variant={showKeepAlive ? 'outline' : 'default'}
              size="sm"
              className="flex items-center gap-2"
            >
              {showKeepAlive ? (
                <>
                  <EyeOff className="w-4 h-4" /> Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Show
                </>
              )}
            </Button>
          </div>

          <div className="min-h-[280px]">
            {showKeepAlive ? (
              <KeepAliveCounter />
            ) : (
              <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10">
                <div className="text-center">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-blue-400 fill-current" />
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">
                    ✨ State Still Alive!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The Cubit instance still exists in memory.
                    <br />
                    Click Show to see the preserved state.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>KeepAlive Behavior:</strong> The instance ID stays the same and state
              is preserved even when hidden. Try hiding and showing multiple times!
            </p>
          </div>
        </div>

        {/* Regular Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                Regular Counter
              </h3>
            </div>
            <Button
              onClick={() => setShowRegular(!showRegular)}
              variant={showRegular ? 'outline' : 'default'}
              size="sm"
              className="flex items-center gap-2"
            >
              {showRegular ? (
                <>
                  <EyeOff className="w-4 h-4" /> Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Show
                </>
              )}
            </Button>
          </div>

          <div className="min-h-[280px]">
            {showRegular ? (
              <RegularCounter />
            ) : (
              <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-3xl bg-orange-50/50 dark:bg-orange-900/10">
                <div className="text-center">
                  <Trash2 className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                  <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">
                    💨 State Disposed!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The Cubit was disposed and state is lost.
                    <br />
                    Click Show to create a new instance.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              <strong>Regular Behavior:</strong> Each time you show it, a new instance is
              created (watch the instance ID increment). State resets each time!
            </p>
          </div>
        </div>
      </div>

      {/* State Viewers */}
      <div className="grid md:grid-cols-2 gap-6">
        <StateViewer
          bloc={KeepAliveCounterCubit}
          title="KeepAlive State"
          defaultCollapsed={false}
          maxDepth={2}
        />
        {showRegular && (
          <StateViewer
            bloc={RegularCounterCubit}
            title="Regular State (only when shown)"
            defaultCollapsed={false}
            maxDepth={2}
          />
        )}
      </div>
    </div>
  );
}
