import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, AlertTriangle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// State and Cubit
// ============================================================================

interface ComplexState {
  counter: number;
  text: string;
  items: string[];
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class ComplexStateCubit extends Cubit<ComplexState> {
  constructor() {
    super({
      counter: 0,
      text: '',
      items: [],
      settings: {
        theme: 'light',
        notifications: true,
      },
    });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (text: string) => {
    this.patch({ text });
  };

  addItem = (item: string) => {
    this.patch({ items: [...this.state.items, item] });
  };

  toggleTheme = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  toggleNotifications = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        notifications: !this.state.settings.notifications,
      },
    });
  };

  reset = () => {
    this.emit({
      counter: 0,
      text: '',
      items: [],
      settings: {
        theme: 'light',
        notifications: true,
      },
    });
  };

  get isEven() {
    return this.state.counter % 2 === 0;
  }

  get uppercasedText() {
    return this.state.text.toUpperCase();
  }
}

// ============================================================================
// Optimized Components with Selectors
// ============================================================================

const EvenOddDisplay: React.FC = () => {
  const [, cubit] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.counter % 2 === 0],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border-2 border-purple-300 dark:border-purple-700 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-purple-700 dark:text-purple-300 flex items-center">
          <Zap className="w-4 h-4 mr-1" />
          Even/Odd Selector
        </h4>
        <span className="text-xs font-mono bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded">
          {renderCount.current} renders
        </span>
      </div>
      <p className="text-lg mb-1">
        Counter is: <strong className="text-purple-600 dark:text-purple-400">{cubit.isEven ? 'EVEN ✓' : 'ODD ✗'}</strong>
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        <TrendingDown className="w-3 h-3 inline mr-1" />
        Only re-renders when parity changes
      </p>
    </motion.div>
  );
};

const FirstLetterDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.text[0] || ''],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 border-2 border-green-300 dark:border-green-700 rounded-lg bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center">
          <Zap className="w-4 h-4 mr-1" />
          First Letter Selector
        </h4>
        <span className="text-xs font-mono bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
          {renderCount.current} renders
        </span>
      </div>
      <p className="text-lg mb-1">
        First letter: <strong className="text-green-600 dark:text-green-400 text-2xl">{state.text[0] || '∅'}</strong>
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        <TrendingDown className="w-3 h-3 inline mr-1" />
        Only when first character changes
      </p>
    </motion.div>
  );
};

const SettingsDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.settings],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center">
          <Zap className="w-4 h-4 mr-1" />
          Settings Selector
        </h4>
        <span className="text-xs font-mono bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
          {renderCount.current} renders
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm">Theme: <strong>{state.settings.theme}</strong></p>
        <p className="text-sm">Notifications: <strong>{state.settings.notifications ? 'ON' : 'OFF'}</strong></p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        <TrendingDown className="w-3 h-3 inline mr-1" />
        Only when settings object changes
      </p>
    </motion.div>
  );
};

const NoSelectorDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit);

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-4 border-2 border-red-300 dark:border-red-700 rounded-lg bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-800/20"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-red-700 dark:text-red-300 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          No Selector
        </h4>
        <span className="text-xs font-mono bg-red-200 dark:bg-red-800 px-2 py-1 rounded animate-pulse">
          {renderCount.current} renders
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <p>Counter: {state.counter}</p>
        <p>Text: {state.text || '(empty)'}</p>
        <p>Items: {state.items.length}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        Re-renders on EVERY state change!
      </p>
    </motion.div>
  );
};

// ============================================================================
// Main Demo Component
// ============================================================================

export const SelectorsDemo: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit);
  const [newItem, setNewItem] = useState('');

  return (
    <DemoArticle
      metadata={{
        id: 'selectors',
        title: 'Selectors & Performance',
        description: 'Master fine-grained reactivity with custom selectors to dramatically reduce unnecessary re-renders',
        category: '03-advanced',
        difficulty: 'advanced',
        tags: ['selectors', 'performance', 'optimization', 'dependencies', 'reactivity'],
        estimatedTime: 15,
      }}
    >
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Fine-Grained Reactivity with Selectors</h2>
          <p>
            By default, React components using <code>useBloc</code> re-render on <strong>every state change</strong>.
            This is simple and works well for small applications, but can become a performance bottleneck as your
            app grows.
          </p>
          <p>
            <strong>Selectors</strong> (also called dependencies) let you tell React exactly which parts of state
            a component cares about. The component will only re-render when those specific values change, not when
            other unrelated state updates happen.
          </p>
        </Prose>

        <ConceptCallout type="info" title="The Re-Render Problem">
          <p>
            Imagine you have a state with <code>counter</code>, <code>text</code>, and <code>settings</code>.
            A component that only displays the counter still re-renders when text or settings change, wasting CPU cycles.
            Selectors solve this by subscribing only to the data you need.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Demo: Watch the Render Counts</h2>
          <p>
            Below are four components subscribed to the same Cubit. Notice how their render counts differ based
            on their selector configuration. Try the controls and watch which components re-render!
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <EvenOddDisplay />
          <FirstLetterDisplay />
          <SettingsDisplay />
          <NoSelectorDisplay />
        </div>

        <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-lg">Controls - Change State and Watch Renders</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Counter: {state.counter}</label>
              <Button onClick={cubit.incrementCounter} variant="primary" className="w-full">
                Increment Counter
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Text Input:</label>
              <input
                type="text"
                value={state.text}
                onChange={(e) => cubit.updateText(e.target.value)}
                placeholder="Type something..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={cubit.toggleTheme} variant="secondary">
                Toggle Theme
              </Button>
              <Button onClick={cubit.toggleNotifications} variant="secondary">
                Toggle Notifications
              </Button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add item..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700"
              />
              <Button
                onClick={() => {
                  if (newItem) {
                    cubit.addItem(newItem);
                    setNewItem('');
                  }
                }}
              >
                Add ({state.items.length})
              </Button>
            </div>

            <Button onClick={cubit.reset} variant="muted" className="w-full">
              Reset All State
            </Button>
          </div>
        </div>

        <ConceptCallout type="success" title="Performance Win!">
          <p>
            Notice how the <strong>Even/Odd</strong> component only re-renders when the counter crosses an even/odd
            boundary (0→1, 1→2, etc.), not on every single increment. This is the power of selectors!
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementation: Basic Selector</h2>
          <p>
            To use a selector, pass a <code>dependencies</code> function to <code>useBloc</code>. This function
            receives the Cubit instance and returns an array of values to track.
          </p>
        </Prose>

        <CodePanel
          code={`// Component that only cares about even/odd status
function EvenOddDisplay() {
  const [, cubit] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [
      cubit.state.counter % 2 === 0  // Only track parity
    ],
  });

  // This component only re-renders when the counter
  // changes from even to odd or vice versa
  return <div>{cubit.isEven ? 'EVEN' : 'ODD'}</div>;
}

// Component that only tracks first letter of text
function FirstLetterDisplay() {
  const [state] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [
      cubit.state.text[0] || ''  // Only track first character
    ],
  });

  // Re-renders only when first character changes
  return <div>First letter: {state.text[0]}</div>;
}`}
          language="typescript"
          highlightLines={[3, 4, 5, 16, 17, 18]}
          lineLabels={{
            3: 'Pass dependencies option',
            4: 'Function receives cubit',
            5: 'Return array of tracked values',
            16: 'Inline dependency function',
            17: 'Track single character',
            18: 'Component only re-renders when this changes',
          }}
        />

        <ConceptCallout type="tip" title="Selector Rules">
          <ul className="text-sm space-y-1 mt-2">
            <li>✅ Return an array of primitive values or objects</li>
            <li>✅ Use computed getters for derived values</li>
            <li>✅ Keep selectors pure (no side effects)</li>
            <li>❌ Don't return new objects/arrays on every call</li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="advanced">
        <Prose>
          <h2>Advanced: Multiple Dependencies</h2>
          <p>
            You can track multiple values by including them all in the returned array. The component will
            re-render if <strong>any</strong> of the tracked values change.
          </p>
        </Prose>

        <CodePanel
          code={`// Track multiple values
function DashboardStats() {
  const [state, cubit] = useBloc(AppCubit, {
    dependencies: (cubit) => [
      cubit.state.user?.name,           // User name
      cubit.state.settings.theme,       // Theme setting
      cubit.state.items.length,         // Item count
      cubit.computedTotalPrice,         // Computed getter
    ],
  });

  // Re-renders only when any of these 4 values change
  return (
    <div>
      <h1>Welcome, {state.user?.name}</h1>
      <p>Items: {state.items.length}</p>
      <p>Total: {cubit.computedTotalPrice}</p>
    </div>
  );
}

// Extract selector to reusable function
const dashboardSelector = (cubit: AppCubit) => [
  cubit.state.user?.name,
  cubit.state.settings.theme,
  cubit.state.items.length,
  cubit.computedTotalPrice,
];

function Dashboard() {
  const [state, cubit] = useBloc(AppCubit, {
    dependencies: dashboardSelector,
  });
}`}
          language="typescript"
          highlightLines={[4, 5, 6, 7, 8, 23, 31]}
          lineLabels={{
            4: 'Track multiple values',
            5: 'Nested property access',
            6: 'Object property',
            7: 'Array length',
            8: 'Computed getter',
            23: 'Extract to reusable function',
            31: 'Reuse selector across components',
          }}
        />

        <ConceptCallout type="warning" title="Avoid Creating New Objects">
          <p>
            Don't create new objects inside your selector function - this will cause re-renders on every state change!
            Instead, return individual primitive values or stable object references.
          </p>
          <CodePanel
            code={`// ❌ BAD: Creates new object every time
dependencies: (c) => [{ count: c.state.count }]

// ✅ GOOD: Return primitive value
dependencies: (c) => [c.state.count]

// ✅ GOOD: Return stable object reference
dependencies: (c) => [c.state.user]`}
            language="typescript"
          />
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Selectors optimize re-renders:</strong> Components only update when tracked values change
            </li>
            <li>
              <strong>Use dependencies option:</strong> Pass a function that returns an array of values to track
            </li>
            <li>
              <strong>Track multiple values:</strong> Include all values you need in the array
            </li>
            <li>
              <strong>Use computed getters:</strong> Computed properties work great with selectors
            </li>
            <li>
              <strong>Extract selectors:</strong> Create reusable selector functions for consistency
            </li>
            <li>
              <strong>Avoid new objects:</strong> Return primitive values or stable references, not new objects
            </li>
            <li>
              <strong>Measure performance:</strong> Use render counts to verify your optimizations work
            </li>
          </ul>
        </ConceptCallout>

        <ConceptCallout type="info" title="When to Use Selectors">
          <p>
            Use selectors when:
          </p>
          <ul className="text-sm space-y-1 mt-2">
            <li>• Your Cubit has multiple unrelated fields</li>
            <li>• Components only need specific slices of state</li>
            <li>• You notice performance issues with unnecessary re-renders</li>
            <li>• You have many components subscribed to the same Cubit</li>
          </ul>
          <p className="mt-2">
            For simple, small state objects, selectors may be overkill. Start without them and add when needed.
          </p>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
};
