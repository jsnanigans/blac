import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect, useRef } from 'react';

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

  // Computed getter
  get isEven() {
    return this.state.counter % 2 === 0;
  }

  get uppercasedText() {
    return this.state.text.toUpperCase();
  }
}

// Component that only cares about counter being even/odd
const EvenOddDisplay: React.FC = () => {
  const [, cubit] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.counter % 2 === 0],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div className="p-4 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20">
      <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">
        Even/Odd Selector
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Renders: {renderCount.current}
      </p>
      <p className="text-lg">
        Counter is: <strong>{cubit.isEven ? 'EVEN' : 'ODD'}</strong>
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Only re-renders when even/odd changes, not on every increment
      </p>
    </div>
  );
};

// Component that only cares about first letter of text
const FirstLetterDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.text[0] || ''],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
        First Letter Selector
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Renders: {renderCount.current}
      </p>
      <p className="text-lg">
        First letter: <strong>{state.text[0] || '(empty)'}</strong>
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Only re-renders when first letter changes
      </p>
    </div>
  );
};

// Component that only cares about settings
const SettingsDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit, {
    dependencies: (cubit) => [cubit.state.settings],
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div className="p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        Settings Selector
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Renders: {renderCount.current}
      </p>
      <p>
        Theme: <strong>{state.settings.theme}</strong>
      </p>
      <p>
        Notifications:{' '}
        <strong>{state.settings.notifications ? 'ON' : 'OFF'}</strong>
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Only re-renders when settings change
      </p>
    </div>
  );
};

// Component without selector (re-renders on every change)
const NoSelectorDisplay: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit);

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
        No Selector (All Changes)
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Renders: {renderCount.current}
      </p>
      <p>Counter: {state.counter}</p>
      <p>Text: {state.text}</p>
      <p>Items: {state.items.length}</p>
      <p className="text-sm text-gray-500 mt-2">
        Re-renders on EVERY state change
      </p>
    </div>
  );
};

export const SelectorsDemo: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit);
  const [newItem, setNewItem] = React.useState('');

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">
          Custom Selectors for Optimization
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Selectors let components subscribe to specific parts of state,
          reducing unnecessary re-renders.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <EvenOddDisplay />
        <FirstLetterDisplay />
        <SettingsDisplay />
        <NoSelectorDisplay />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <h4 className="font-semibold">Controls</h4>

          <div className="flex flex-wrap gap-2">
            <Button onClick={cubit.incrementCounter} variant="primary">
              Increment ({state.counter})
            </Button>

            <input
              type="text"
              value={state.text}
              onChange={(e) => cubit.updateText(e.target.value)}
              placeholder="Type something..."
              className="px-3 py-1 border rounded dark:bg-gray-700"
            />

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
              className="px-3 py-1 border rounded dark:bg-gray-700 flex-1"
            />
            <Button
              onClick={() => {
                if (newItem) {
                  cubit.addItem(newItem);
                  setNewItem('');
                }
              }}
            >
              Add Item ({state.items.length})
            </Button>
          </div>

          <Button onClick={cubit.reset} variant="muted">
            Reset All
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Notice how different components have different render counts!</p>
        <p>
          Components with selectors only re-render when their selected data
          changes.
        </p>
      </div>
    </div>
  );
};

export const selectorsCode = {
  usage: `import { useBloc } from '@blac/react';

// Selector that only tracks even/odd status
const evenOddSelector = (cubit) => [
  cubit.state.counter % 2 === 0
];

function OptimizedComponent() {
  const [state, cubit] = useBloc(ComplexCubit, {
    dependencies: evenOddSelector
  });

  // This component only re-renders when
  // counter changes from even to odd or vice versa
  // Not on every increment!
}

// Selector for multiple dependencies
const multiSelector = (cubit) => [
  cubit.state.user?.name,
  cubit.state.settings.theme,
  cubit.computedValue
];

// Inline selector
const [state, cubit] = useBloc(MyCubit, {
  dependencies: (c) => [c.state.items.length]
});`,
  bloc: `import { Cubit } from '@blac/core';

class ComplexStateCubit extends Cubit<ComplexState> {
  // ... state and methods ...

  // Computed getters can be used in selectors
  get isEven() {
    return this.state.counter % 2 === 0;
  }

  get hasItems() {
    return this.state.items.length > 0;
  }

  get summary() {
    return {
      itemCount: this.state.items.length,
      isEven: this.isEven,
      theme: this.state.settings.theme
    };
  }
}

// Usage with selector
function MyComponent() {
  // Only re-render when summary changes
  const [state, cubit] = useBloc(ComplexStateCubit, {
    dependencies: (c) => [c.summary]
  });
}`,
};
