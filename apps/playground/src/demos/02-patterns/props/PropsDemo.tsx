import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import {
  Settings,
  Play,
  Square,
  RotateCcw,
  Timer as TimerIcon,
} from 'lucide-react';
import React, { useState } from 'react';

// ============================================================================
// Timer State and Props Interfaces
// ============================================================================

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

// ============================================================================
// TimerCubit - Props-Based Cubit
// ============================================================================

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

    // Setup cleanup on disposal
    this.onDispose = () => {
      this.stop();
    };
  }

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

// ============================================================================
// Timer Component
// ============================================================================

const Timer: React.FC<{ config: TimerProps }> = ({ config }) => {
  const [state, cubit] = useBloc(TimerCubit, {
    staticProps: config,
    instanceId: `timer-${config.label}`,
  });

  React.useEffect(() => {
    return () => {
      cubit.stop();
    };
  }, [cubit]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="p-5 border-2 border-blue-300 dark:border-blue-700 rounded-lg
        bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20
        shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-lg text-blue-700 dark:text-blue-300 flex items-center">
          <TimerIcon className="w-5 h-5 mr-2" />
          {cubit.label}
        </h4>
        {state.isRunning && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center text-xs text-green-600 dark:text-green-400 font-medium"
          >
            <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-1" />
            Running
          </motion.div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-300 mb-1">
          {state.count}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <Settings className="w-3 h-3 mr-1" />
          step: {cubit.config.step} | max: {cubit.config.maxCount}
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${cubit.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">
          {cubit.progress.toFixed(0)}%
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={cubit.start}
          disabled={state.isRunning}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md
            hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all font-medium text-sm flex items-center justify-center"
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </button>
        <button
          onClick={cubit.stop}
          disabled={!state.isRunning}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-md
            hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all font-medium text-sm flex items-center justify-center"
        >
          <Square className="w-4 h-4 mr-1" />
          Stop
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md
            hover:from-gray-600 hover:to-gray-700 transition-all font-medium text-sm
            flex items-center justify-center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Demo Component
// ============================================================================

export const PropsDemo: React.FC = () => {
  const [customConfig, setCustomConfig] = useState({
    initialCount: 10,
    step: 5,
    maxCount: 50,
    label: 'Custom Timer',
  });

  return (
    <DemoArticle
      metadata={{
        id: 'props',
        title: 'Props-Based Blocs',
        description:
          'Learn how to create configurable, reusable Blocs and Cubits by passing props for initialization',
        category: '02-patterns',
        difficulty: 'intermediate',
        tags: [
          'cubit',
          'props',
          'configuration',
          'reusability',
          'instance-management',
        ],
        estimatedTime: 10,
      }}
    >
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Dynamic Configuration with Props</h2>
          <p>
            One of the most powerful patterns in BlaC is creating{' '}
            <strong>props-based Blocs and Cubits</strong>. Instead of hardcoding
            configuration, you can pass props during construction to create
            flexible, reusable state containers with different behaviors.
          </p>
          <p>
            This pattern is essential for building reusable components where
            each instance needs its own configuration, like timers with
            different intervals, forms with different validation rules, or API
            clients pointing to different endpoints.
          </p>
        </Prose>

        <ConceptCallout type="tip" title="When to Use Props-Based Blocs">
          <p>
            Use this pattern when you need multiple instances of the same
            Bloc/Cubit with different configurations, or when you want to make
            your state containers more reusable across different contexts.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Demo: Configurable Timers</h2>
          <p>
            Below are four timer instances, each created from the same{' '}
            <code>TimerCubit</code> class but with different configurations.
            Each timer is a completely separate instance with its own state.
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
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

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-lg mb-4 flex items-center text-gray-800 dark:text-gray-200">
            <Settings className="w-5 h-5 mr-2" />
            Configure Custom Timer
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initial Count
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Step Size
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Count
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timer Label
              </label>
              <input
                type="text"
                value={customConfig.label}
                onChange={(e) =>
                  setCustomConfig({ ...customConfig, label: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <StateViewer bloc={TimerCubit} title="Timer State" />
        </div>
      </ArticleSection>

      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementation: Props-Based Cubit</h2>
          <p>
            Creating a props-based Cubit involves three key steps: defining a
            props interface, accepting props in the constructor, and using those
            props throughout the class.
          </p>
        </Prose>

        <CodePanel
          code={`// 1. Define props interface
interface TimerProps {
  initialCount?: number;
  step?: number;
  maxCount?: number;
  label?: string;
}

// 2. Create Cubit that accepts props
class TimerCubit extends Cubit<TimerState> {
  private props: Required<TimerProps>;

  constructor(props?: TimerProps) {
    // Merge with defaults
    const defaultProps: Required<TimerProps> = {
      initialCount: 0,
      step: 1,
      maxCount: 100,
      label: 'Timer',
    };

    const finalProps = { ...defaultProps, ...props };

    // Initialize state using props
    super({
      count: finalProps.initialCount,
      isRunning: false,
      startedAt: null,
    });

    this.props = finalProps;
  }

  // 3. Use props in methods
  start = () => {
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

  // 4. Expose props via getters
  get config(): Required<TimerProps> {
    return this.props;
  }
}`}
          language="typescript"
          highlightLines={[2, 11, 14, 22, 25, 35, 47]}
          lineLabels={{
            2: 'Define props interface',
            11: 'Store props as private field',
            14: 'Accept optional props',
            22: 'Merge with defaults',
            25: 'Use props for initial state',
            35: 'Use props in methods',
            47: 'Expose props via getter',
          }}
        />

        <ConceptCallout type="tip" title="Always Provide Defaults">
          <p>
            Always merge incoming props with sensible defaults using the spread
            operator. This makes all props optional and ensures your Cubit can
            be instantiated without any configuration.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="usage">
        <Prose>
          <h2>Usage: Passing Props in React</h2>
          <p>
            To pass props to a Cubit in React, use the <code>staticProps</code>{' '}
            option in <code>useBloc</code>. Combine this with{' '}
            <code>instanceId</code> to create multiple independent instances.
          </p>
        </Prose>

        <CodePanel
          code={`function Timer({ config }: { config: TimerProps }) {
  const [state, cubit] = useBloc(TimerCubit, {
    staticProps: config,
    // Create unique instance for each configuration
    instanceId: \`timer-\${config.label}\`,
  });

  return (
    <div>
      <h4>{cubit.label}</h4>
      <div>{state.count}</div>
      <button onClick={cubit.start}>Start</button>
    </div>
  );
}

// Create multiple instances with different configs
function App() {
  return (
    <>
      <Timer config={{ label: 'Timer 1', step: 1, maxCount: 10 }} />
      <Timer config={{ label: 'Timer 2', step: 5, maxCount: 50 }} />
      <Timer config={{ label: 'Timer 3', step: 10, maxCount: 100 }} />
    </>
  );
}`}
          language="typescript"
          highlightLines={[2, 3, 5, 20, 21, 22]}
          lineLabels={{
            2: 'useBloc with options',
            3: 'Pass props via staticProps',
            5: 'Unique instance ID',
            20: 'Different configurations',
            21: 'Each gets own instance',
            22: 'Completely independent state',
          }}
        />

        <ConceptCallout type="info" title="Instance Management">
          <p>
            The <code>instanceId</code> is crucial when using props. Without it,
            all components would share the same instance. With unique IDs, each
            component gets its own independent Cubit instance.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="advanced">
        <Prose>
          <h2>Advanced: Props with Blocs</h2>
          <p>
            The props pattern works equally well with Blocs. This is especially
            useful for API clients, data fetchers, or any Bloc that needs
            configuration at runtime.
          </p>
        </Prose>

        <CodePanel
          code={`interface TodoListProps {
  userId: string;
  apiUrl?: string;
  pageSize?: number;
}

class TodoListBloc extends Vertex<TodoState, TodoEvent> {
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
    const response = await fetch(url);
    // Handle response...
  };
}

// Usage with dynamic userId
function UserTodoList({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(TodoListBloc, {
    staticProps: { userId },
    instanceId: \`todos-\${userId}\`,
  });

  return <div>...</div>;
}`}
          language="typescript"
          highlightLines={[1, 9, 17, 20, 24, 32, 34]}
          lineLabels={{
            1: 'Props interface',
            9: 'Constructor with required userId',
            17: 'Merge with defaults',
            20: 'Auto-load on construction',
            24: 'Use props in API calls',
            32: 'Pass userId as prop',
            34: 'Unique instance per user',
          }}
        />

        <ConceptCallout type="warning" title="Props Are Immutable">
          <p>
            Props are set once during construction and should never change. If
            you need dynamic, changing values, store them in{' '}
            <strong>state</strong> instead. Props are for configuration, not for
            values that update over time.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Props Pattern:</strong> Pass configuration to Blocs/Cubits
              via constructor parameters
            </li>
            <li>
              <strong>Defaults:</strong> Always merge incoming props with
              sensible defaults for flexibility
            </li>
            <li>
              <strong>React Integration:</strong> Use <code>staticProps</code>{' '}
              in <code>useBloc</code> to pass props
            </li>
            <li>
              <strong>Instance IDs:</strong> Combine props with unique{' '}
              <code>instanceId</code> for multiple independent instances
            </li>
            <li>
              <strong>Immutability:</strong> Props are set once and never change
              - use state for dynamic values
            </li>
            <li>
              <strong>Reusability:</strong> Props make your Blocs/Cubits more
              flexible and reusable across contexts
            </li>
            <li>
              <strong>Type Safety:</strong> TypeScript interfaces ensure props
              are used correctly
            </li>
          </ul>
        </ConceptCallout>

        <ConceptCallout type="info" title="Real-World Use Cases">
          <p>
            Props-based Blocs are perfect for: API clients with different
            endpoints, forms with different validation rules, timers with
            different intervals, paginated lists with different page sizes, and
            any component that needs configurable behavior.
          </p>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
};
