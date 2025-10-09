import React, { useState, useEffect, useRef } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Callout } from '@/ui/Callout';

interface TrackedState {
  value: number;
  updateCount: number;
  createdAt: number;
  lastUpdatedAt: number;
  instanceColor: string;
}

// Track all active instances globally
const activeInstances = new Map<string, { color: string; createdAt: number }>();
const colors = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];
let colorIndex = 0;

class TrackedCubit extends Cubit<TrackedState> {
  private instanceKey: string;

  constructor() {
    const createdAt = Date.now();
    const color = colors[colorIndex % colors.length];
    colorIndex++;

    super({
      value: 0,
      updateCount: 0,
      createdAt,
      lastUpdatedAt: createdAt,
      instanceColor: color,
    });

    // Track this instance
    this.instanceKey = `${this.constructor.name}-${createdAt}`;
    activeInstances.set(this.instanceKey, { color, createdAt });
  }

  increment = () => {
    this.patch({
      value: this.state.value + 1,
      updateCount: this.state.updateCount + 1,
      lastUpdatedAt: Date.now(),
    });
  };

  decrement = () => {
    this.patch({
      value: this.state.value - 1,
      updateCount: this.state.updateCount + 1,
      lastUpdatedAt: Date.now(),
    });
  };

  // Override dispose to track cleanup
  async dispose() {
    activeInstances.delete(this.instanceKey);
    return super.dispose();
  }
}

// Component that can use different instance strategies
interface TrackedComponentProps {
  instanceId?: string;
  label: string;
}

const TrackedComponent: React.FC<TrackedComponentProps> = ({
  instanceId,
  label,
}) => {
  const [state, cubit] = useBloc(TrackedCubit, {
    instanceId,
  });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <div
      className="p-4 rounded-lg border-2 transition-all"
      style={{
        borderColor: state.instanceColor,
        backgroundColor: `${state.instanceColor}20`,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold" style={{ color: state.instanceColor }}>
            {label}
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {instanceId ? `ID: "${instanceId}"` : 'No ID (shared)'}
          </div>
        </div>
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: state.instanceColor }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Value:</span>
          <div className="text-2xl font-bold">{state.value}</div>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Updates:</span>
          <div className="text-2xl font-bold">{state.updateCount}</div>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-3">
        <div>Created: {new Date(state.createdAt).toLocaleTimeString()}</div>
        <div>Updated: {new Date(state.lastUpdatedAt).toLocaleTimeString()}</div>
        <div>Renders: {renderCount.current}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={cubit.decrement}
          className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          -
        </button>
        <button
          onClick={cubit.increment}
          className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          +
        </button>
      </div>
    </div>
  );
};

// Instance Registry Display
const InstanceRegistry: React.FC = () => {
  const [instances, setInstances] = useState<Array<[string, any]>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setInstances(Array.from(activeInstances.entries()));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h4 className="font-semibold mb-2">Active Instances Registry</h4>
      {instances.length === 0 ? (
        <p className="text-sm text-gray-500">No active instances</p>
      ) : (
        <div className="space-y-1">
          {instances.map(([key, data]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-mono text-xs">{key}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Total: {instances.length} instance(s)
      </div>
    </div>
  );
};

export const InstanceIdDemo: React.FC = () => {
  const [showComponents, setShowComponents] = useState({
    shared1: true,
    shared2: true,
    unique1: true,
    unique2: true,
    dynamic: false,
  });

  const [dynamicId, setDynamicId] = useState('user-123');

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Understanding InstanceId</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            InstanceId controls whether components share the same Cubit instance
            or get their own. Watch how different components interact with
            shared vs unique instances.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shared Instance Section */}
          <div>
            <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
              Shared Instance (No InstanceId)
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {showComponents.shared1 && (
                <TrackedComponent label="Component A" />
              )}
              {showComponents.shared2 && (
                <TrackedComponent label="Component B" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Both components share the same Cubit instance. Changes in one
              affect the other.
            </p>
          </div>

          {/* Unique Instance Section */}
          <div>
            <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">
              Unique Instances (With InstanceId)
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {showComponents.unique1 && (
                <TrackedComponent instanceId="instance-1" label="Component C" />
              )}
              {showComponents.unique2 && (
                <TrackedComponent instanceId="instance-2" label="Component D" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Each component has its own Cubit instance. Changes are
              independent.
            </p>
          </div>

          {/* Dynamic Instance Section */}
          <div>
            <h4 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">
              Dynamic InstanceId
            </h4>
            <div className="mb-3">
              <input
                type="text"
                value={dynamicId}
                onChange={(e) => setDynamicId(e.target.value)}
                placeholder="Enter instance ID"
                className="px-3 py-1 border rounded dark:bg-gray-700 mr-2"
              />
              <button
                onClick={() =>
                  setShowComponents({
                    ...showComponents,
                    dynamic: !showComponents.dynamic,
                  })
                }
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                {showComponents.dynamic ? 'Hide' : 'Show'} Component
              </button>
            </div>
            {showComponents.dynamic && (
              <TrackedComponent
                instanceId={dynamicId}
                label="Dynamic Component"
              />
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Change the ID to create a new instance or connect to an existing
              one.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Instance Registry */}
          <InstanceRegistry />

          {/* Component Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(showComponents).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setShowComponents({
                          ...showComponents,
                          [key]: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="capitalize">
                      {key.replace(/\d+/, ' $&')}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Toggle components to see instance lifecycle
              </p>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Callout variant="warning" title="Key Insights">
            <ul className="text-sm space-y-1">
              <li>• Same color = same instance</li>
              <li>• No ID = all share one instance</li>
              <li>• Same ID = share that instance</li>
              <li>• Different IDs = different instances</li>
              <li>• Instances persist until all components unmount</li>
            </ul>
          </Callout>
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How InstanceId Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-semibold mb-1">No InstanceId</h5>
              <code className="text-xs">useBloc(MyCubit)</code>
              <p className="mt-1">All components share the default instance</p>
            </div>
            <div>
              <h5 className="font-semibold mb-1">With InstanceId</h5>
              <code className="text-xs">
                useBloc(MyCubit, {`{ instanceId: 'abc' }`})
              </code>
              <p className="mt-1">
                Components with same ID share that instance
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-1">Dynamic InstanceId</h5>
              <code className="text-xs">instanceId: `user-{`{userId}`}`</code>
              <p className="mt-1">Create instances based on runtime data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const instanceIdCode = {
  usage: `import { useBloc } from '@blac/react';
import { MyCubit } from './MyCubit';

// Default: Shared instance
function ComponentA() {
  const [state, cubit] = useBloc(MyCubit);
  // Uses the default shared instance
}

function ComponentB() {
  const [state, cubit] = useBloc(MyCubit);
  // Same instance as ComponentA!
}

// With InstanceId: Separate instances
function ComponentC() {
  const [state, cubit] = useBloc(MyCubit, {
    instanceId: 'instance-1'
  });
  // Has its own instance
}

function ComponentD() {
  const [state, cubit] = useBloc(MyCubit, {
    instanceId: 'instance-2'
  });
  // Different instance from ComponentC
}

// Dynamic InstanceId
function UserProfile({ userId }) {
  const [state, cubit] = useBloc(UserCubit, {
    instanceId: \`user-\${userId}\`
  });
  // Each user gets their own instance
}`,
  bloc: `// InstanceId vs Isolated Pattern

// Option 1: InstanceId (flexible)
const [state, cubit] = useBloc(MyCubit, {
  instanceId: dynamicId
});

// Option 2: Static Isolated (always separate)
class IsolatedCubit extends Cubit<State> {
  static isolated = true; // Every component gets its own
}

// When to use InstanceId:
// - Dynamic instance creation (user-123, product-456)
// - Conditional sharing (same ID = same instance)
// - Runtime determination

// When to use Static Isolated:
// - Always want separate instances
// - No sharing needed
// - Simpler API

// Real-world example
function ChatRoom({ roomId }) {
  // Each room has its own message state
  const [messages, chatCubit] = useBloc(ChatCubit, {
    instanceId: \`room-\${roomId}\`,
    staticProps: { roomId }
  });
}`,
};
