import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';
import { useEffect } from 'react';

// Timer state and props interfaces
interface TimerState {
  count: number;
  isRunning: boolean;
  startedAt: number | null;
}

interface TimerProps {
  initialCount?: number;
  step?: number;
  maxCount?: number;
  label?: string;
}

/**
 * Props-Based Timer Cubit
 * Demonstrates how to create configurable, reusable Cubits with constructor props
 */
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;
  private readonly props: Required<TimerProps>;

  constructor(props?: TimerProps) {
    // 1. Define defaults
    const defaultProps: Required<TimerProps> = {
      initialCount: 0,
      step: 1,
      maxCount: 100,
      label: 'Timer',
    };

    // 2. Merge incoming props with defaults
    const finalProps = { ...defaultProps, ...props };

    // 3. Initialize state using props
    super({
      count: finalProps.initialCount,
      isRunning: false,
      startedAt: null,
    });

    // 4. Store props for later use
    this.props = finalProps;
  }

  // 5. Use props in methods
  start = () => {
    if (this.state.isRunning) return;

    this.patch({ isRunning: true, startedAt: Date.now() });

    this.interval = setInterval(() => {
      const newCount = this.state.count + this.props.step;

      if (newCount >= this.props.maxCount) {
        // Use props.maxCount to determine when to stop
        this.patch({ count: this.props.maxCount });
        this.stop();
      } else {
        this.patch({ count: newCount });
      }
    }, 1000);
  };

  stop = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.patch({ isRunning: false });
  };

  reset = () => {
    this.stop();
    // Use props.initialCount to reset
    this.patch({
      count: this.props.initialCount,
      startedAt: null,
    });
  };

  // 6. Expose props via computed properties
  get progress(): number {
    return (this.state.count / this.props.maxCount) * 100;
  }

  get label(): string {
    return this.props.label;
  }

  get config(): Required<TimerProps> {
    return this.props;
  }

  // Cleanup on disposal
  onDispose = async () => {
    this.stop();
    return super.onDispose();
  };
}

/**
 * Timer component showing how to pass props via useBloc
 */
function Timer({ config }: { config: TimerProps }) {
  // Pass props using staticProps option
  // Use instanceId to create separate instances for each timer
  const [state, cubit] = useBloc(TimerCubit, {
    staticProps: config,
    instanceId: `timer-${config.label}`,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => cubit.stop();
  }, [cubit]);

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-blue-400 dark:border-blue-600 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/5 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300">
            {cubit.label}
          </h4>
          {state.isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
              Running
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {state.count}
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Settings className="w-3 h-3" />
            step: {cubit.config.step} | max: {cubit.config.maxCount}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${cubit.progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {cubit.progress.toFixed(0)}%
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={cubit.start}
            disabled={state.isRunning}
            variant="default"
            size="sm"
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
          <Button
            onClick={cubit.stop}
            disabled={!state.isRunning}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
          <Button
            onClick={cubit.reset}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Props demo component
 * Shows multiple timer instances with different configurations
 */
export function PropsInteractive() {
  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Default Timer - minimal props */}
        <Timer config={{ label: 'Default Timer' }} />

        {/* Fast Timer - custom step and max */}
        <Timer
          config={{
            initialCount: 5,
            step: 2,
            maxCount: 20,
            label: 'Fast Timer',
          }}
        />

        {/* Big Steps Timer - large increment */}
        <Timer
          config={{
            initialCount: 0,
            step: 10,
            maxCount: 100,
            label: 'Big Steps Timer',
          }}
        />

        {/* Countdown Timer - starts high */}
        <Timer
          config={{
            initialCount: 50,
            step: 1,
            maxCount: 60,
            label: 'Countdown Style',
          }}
        />
      </div>

      {/* State Viewer */}
      <div className="grid md:grid-cols-2 gap-6">
        <StateViewer
          bloc={TimerCubit}
          title="Timer State (Shared View)"
          defaultCollapsed={false}
          maxDepth={2}
        />

        <div className="p-6 rounded-3xl border border-border bg-surface space-y-3">
          <h4 className="font-semibold">How Props Work</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Each timer</strong> is a separate instance
              of <code className="text-xs">TimerCubit</code> created with different props.
            </p>
            <p>
              <strong className="text-foreground">Props are passed</strong> using{' '}
              <code className="text-xs">staticProps</code> in <code className="text-xs">useBloc</code>.
            </p>
            <p>
              <strong className="text-foreground">Each instance</strong> has its own independent
              state and configuration. They don't interfere with each other.
            </p>
            <p>
              <strong className="text-foreground">Instance IDs</strong> like{' '}
              <code className="text-xs">timer-Default Timer</code> ensure each timer is unique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
