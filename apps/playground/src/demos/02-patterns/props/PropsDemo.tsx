import React, { useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

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

// Cubit that accepts props
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;
  private props: Required<TimerProps>;

  constructor(props?: TimerProps) {
    const defaultProps: Required<TimerProps> = {
      initialCount: 0,
      step: 1,
      maxCount: 100,
      label: 'Timer',
    };

    const finalProps = { ...defaultProps, ...props };

    super({
      count: finalProps.initialCount,
      isRunning: false,
      startedAt: null,
    });

    this.props = finalProps;
  }

  // Access props in methods
  start = () => {
    if (this.state.isRunning) return;

    this.patch({ isRunning: true, startedAt: Date.now() });

    this.interval = setInterval(() => {
      const newCount = this.state.count + this.props.step;

      if (newCount >= this.props.maxCount) {
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
    this.patch({
      count: this.props.initialCount,
      startedAt: null,
    });
  };

  // Getters can use props
  get progress(): number {
    return (this.state.count / this.props.maxCount) * 100;
  }

  get label(): string {
    return this.props.label;
  }

  get config(): Required<TimerProps> {
    return this.props;
  }
}

// Component using Cubit with props
const Timer: React.FC<{ config: TimerProps }> = ({ config }) => {
  const [state, cubit] = useBloc(TimerCubit, {
    staticProps: config,
    // Use instanceId to create separate instances for different configs
    instanceId: `timer-${config.label}`,
  });

  React.useEffect(() => {
    return () => {
      cubit.stop(); // Cleanup on unmount
    };
  }, [cubit]);

  return (
    <div className="p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        {cubit.label}
      </h4>

      <div className="mb-3">
        <div className="text-2xl font-bold">{state.count}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Config: step={cubit.config.step}, max={cubit.config.maxCount}
        </div>
      </div>

      <div className="mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${cubit.progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Progress: {cubit.progress.toFixed(0)}%
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={cubit.start}
          disabled={state.isRunning}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={cubit.stop}
          disabled={!state.isRunning}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {state.isRunning && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          ● Running
        </div>
      )}
    </div>
  );
};

export const PropsDemo: React.FC = () => {
  const [customConfig, setCustomConfig] = useState({
    initialCount: 10,
    step: 5,
    maxCount: 50,
    label: 'Custom Timer',
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Props in Cubits/Blocs</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Pass configuration and initial values to Cubits through props.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Timer config={{ label: 'Default Timer' }} />
        <Timer
          config={{
            initialCount: 5,
            step: 2,
            maxCount: 20,
            label: 'Fast Timer',
          }}
        />
        <Timer
          config={{
            initialCount: 0,
            step: 10,
            maxCount: 100,
            label: 'Big Steps',
          }}
        />
        <Timer config={customConfig} />
      </div>

      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-3">Custom Timer Configuration</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Initial
            </label>
            <input
              type="number"
              value={customConfig.initialCount}
              onChange={(e) =>
                setCustomConfig({
                  ...customConfig,
                  initialCount: Number(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Step
            </label>
            <input
              type="number"
              value={customConfig.step}
              onChange={(e) =>
                setCustomConfig({
                  ...customConfig,
                  step: Number(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Max
            </label>
            <input
              type="number"
              value={customConfig.maxCount}
              onChange={(e) =>
                setCustomConfig({
                  ...customConfig,
                  maxCount: Number(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Label
            </label>
            <input
              type="text"
              value={customConfig.label}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, label: e.target.value })
              }
              className="w-full px-2 py-1 border rounded dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
        <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
          Props Pattern Benefits
        </h4>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Configure Cubits with initial values and settings</li>
          <li>• Create reusable, parameterized state containers</li>
          <li>• Pass dependencies and configuration at creation time</li>
          <li>• Different instances can have different configurations</li>
          <li>• Props are immutable after construction</li>
        </ul>
      </div>
    </div>
  );
};

export const propsCode = {
  usage: `import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// Define props interface
interface CounterProps {
  initialValue?: number;
  step?: number;
  min?: number;
  max?: number;
}

// Cubit accepting props
class CounterCubit extends Cubit<CounterState> {
  private props: Required<CounterProps>;

  constructor(props?: CounterProps) {
    // Merge with defaults
    const defaults = {
      initialValue: 0,
      step: 1,
      min: -100,
      max: 100,
    };
    
    const finalProps = { ...defaults, ...props };
    
    super({
      count: finalProps.initialValue
    });
    
    this.props = finalProps;
  }

  increment = () => {
    const newCount = Math.min(
      this.state.count + this.props.step,
      this.props.max
    );
    this.patch({ count: newCount });
  };
}

// Usage in component
function Counter() {
  const [state, cubit] = useBloc(CounterCubit, {
    staticProps: {
      initialValue: 10,
      step: 5,
      max: 50
    }
  });
  
  return <div>{state.count}</div>;
}`,
  bloc: `// Props with Bloc pattern
interface TodoListProps {
  userId: string;
  apiUrl?: string;
  pageSize?: number;
}

class TodoListBloc extends Bloc<TodoState, TodoEvent> {
  private props: Required<TodoListProps>;

  constructor(props: TodoListProps) {
    const defaults = {
      apiUrl: '/api/todos',
      pageSize: 10,
    };
    
    super(initialState);
    this.props = { ...defaults, ...props };
    
    // Use props in initialization
    this.loadUserTodos();
  }

  private loadUserTodos = async () => {
    const url = \`\${this.props.apiUrl}?userId=\${this.props.userId}&limit=\${this.props.pageSize}\`;
    // Fetch todos...
  };
}

// Dynamic props from component
function TodoList({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(TodoListBloc, {
    staticProps: { userId },
    // Create new instance for each userId
    id: \`todos-\${userId}\`
  });
}`,
};
