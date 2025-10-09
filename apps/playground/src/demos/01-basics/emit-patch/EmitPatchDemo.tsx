import React, { useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

interface DemoState {
  user: {
    name: string;
    age: number;
    role: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  stats: {
    visits: number;
    lastVisit: string;
  };
}

class EmitPatchCubit extends Cubit<DemoState> {
  constructor() {
    super({
      user: {
        name: 'Alice',
        age: 28,
        role: 'Developer',
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
      stats: {
        visits: 42,
        lastVisit: '2024-01-15',
      },
    });
  }

  // EMIT examples - replaces entire state
  emitCompleteReplacement = () => {
    this.emit({
      user: {
        name: 'Bob',
        age: 35,
        role: 'Manager',
      },
      settings: {
        theme: 'dark',
        notifications: false,
        language: 'es',
      },
      stats: {
        visits: 100,
        lastVisit: '2024-01-20',
      },
    });
  };

  // PATCH examples - shallow merge
  patchUserOnly = () => {
    this.patch({
      user: {
        name: 'Charlie',
        age: 30,
        role: 'Designer',
      },
      // settings and stats remain unchanged
    });
  };

  patchSingleField = () => {
    this.patch({
      stats: {
        ...this.state.stats,
        visits: this.state.stats.visits + 1,
      },
    });
  };

  // Common MISTAKE - this replaces entire nested object
  patchNestedWrong = () => {
    this.patch({
      settings: {
        theme: 'dark',
        // ⚠️ notifications and language are now undefined!
      } as any,
    });
  };

  // CORRECT way to patch nested
  patchNestedCorrect = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        theme: 'dark',
        // ✅ notifications and language preserved
      },
    });
  };

  reset = () => {
    this.emit({
      user: {
        name: 'Alice',
        age: 28,
        role: 'Developer',
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
      stats: {
        visits: 42,
        lastVisit: '2024-01-15',
      },
    });
  };
}

// Visual diff component
const StateDiff: React.FC<{ before: any; after: any; operation: string }> = ({
  before,
  after,
  operation,
}) => {
  const renderDiff = (obj1: any, obj2: any, path = '') => {
    const keys = new Set([
      ...Object.keys(obj1 || {}),
      ...Object.keys(obj2 || {}),
    ]);

    return Array.from(keys).map((key) => {
      const fullPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (
        typeof val1 === 'object' &&
        typeof val2 === 'object' &&
        !Array.isArray(val1)
      ) {
        return (
          <div key={fullPath} className="ml-4">
            <div className="font-semibold text-gray-600 dark:text-gray-400">
              {key}:
            </div>
            {renderDiff(val1, val2, fullPath)}
          </div>
        );
      }

      const hasChanged = JSON.stringify(val1) !== JSON.stringify(val2);
      const isRemoved = val1 !== undefined && val2 === undefined;
      const isAdded = val1 === undefined && val2 !== undefined;

      return (
        <div key={fullPath} className="ml-4 flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">{key}:</span>
          {isRemoved && (
            <span className="line-through text-red-500">
              {JSON.stringify(val1)}
            </span>
          )}
          {isAdded && (
            <span className="text-green-500">+ {JSON.stringify(val2)}</span>
          )}
          {!isRemoved && !isAdded && (
            <>
              {hasChanged && (
                <span className="line-through text-red-500">
                  {JSON.stringify(val1)}
                </span>
              )}
              <span
                className={
                  hasChanged
                    ? 'text-green-500'
                    : 'text-gray-700 dark:text-gray-300'
                }
              >
                {hasChanged && '→'} {JSON.stringify(val2)}
              </span>
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
        {operation} Operation
      </h4>
      <div className="font-mono text-sm">{renderDiff(before, after)}</div>
    </div>
  );
};

export const EmitPatchDemo: React.FC = () => {
  const [state, cubit] = useBloc(EmitPatchCubit);
  const [beforeState, setBeforeState] = useState<DemoState | null>(null);
  const [afterState, setAfterState] = useState<DemoState | null>(null);
  const [lastOperation, setLastOperation] = useState<string>('');

  const executeOperation = (operation: () => void, opName: string) => {
    setBeforeState(state);
    operation();
    // Use setTimeout to capture the next state
    setTimeout(() => {
      setAfterState(cubit.state);
      setLastOperation(opName);
    }, 0);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Emit vs Patch - Visual Guide</h3>
        <p className="text-gray-600 dark:text-gray-400">
          See exactly how emit() and patch() differ in updating state. Watch the
          visual diff!
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current State */}
        <div>
          <h4 className="font-semibold mb-3">Current State</h4>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <pre className="text-sm overflow-x-auto font-mono">
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        </div>

        {/* Visual Diff */}
        <div>
          <h4 className="font-semibold mb-3">State Changes Visualization</h4>
          {beforeState && afterState && (
            <StateDiff
              before={beforeState}
              after={afterState}
              operation={lastOperation}
            />
          )}
          {!beforeState && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-500">
              Click an operation to see the diff
            </div>
          )}
        </div>
      </div>

      {/* Operations */}
      <div className="mt-6 space-y-4">
        <div className="p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">
            EMIT Operations (Replace Entire State)
          </h4>
          <div className="space-y-2">
            <button
              onClick={() =>
                executeOperation(cubit.emitCompleteReplacement, 'emit()')
              }
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              emit() - Complete Replacement
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Replaces ALL fields with new values. Must provide complete state
              object.
            </p>
          </div>
        </div>

        <div className="p-4 border-2 border-green-300 dark:border-green-700 rounded-lg">
          <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3">
            PATCH Operations (Shallow Merge)
          </h4>
          <div className="space-y-3">
            <div>
              <button
                onClick={() => executeOperation(cubit.patchUserOnly, 'patch()')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                patch() - Update User Only
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Only updates 'user' field. Settings and stats remain unchanged.
              </p>
            </div>

            <div>
              <button
                onClick={() =>
                  executeOperation(cubit.patchSingleField, 'patch()')
                }
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                patch() - Increment Visits
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Updates nested field correctly using spread operator.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-2 border-red-300 dark:border-red-700 rounded-lg">
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-3">
            ⚠️ Common Mistakes
          </h4>
          <div>
            <button
              onClick={() =>
                executeOperation(cubit.patchNestedWrong, 'patch() WRONG')
              }
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              patch() - Wrong Nested Update
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              This REPLACES the entire settings object, losing notifications and
              language!
            </p>
          </div>
        </div>

        <div className="p-4 border-2 border-purple-300 dark:border-purple-700 rounded-lg">
          <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">
            ✅ Correct Approach
          </h4>
          <div className="space-y-3">
            <div>
              <button
                onClick={() =>
                  executeOperation(cubit.patchNestedCorrect, 'patch() CORRECT')
                }
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                patch() - Correct Nested Update
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Uses spread operator to preserve other nested properties.
              </p>
            </div>

            <div>
              <button
                onClick={() =>
                  executeOperation(cubit.reset, 'emit() for Reset')
                }
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset (using emit)
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                emit() is perfect for resets - replaces with initial state.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
            When to use emit()
          </h4>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Resetting to initial state</li>
            <li>• Loading complete new data from API</li>
            <li>• Replacing entire state structure</li>
            <li>• When you have all fields available</li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
            When to use patch()
          </h4>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Updating specific fields</li>
            <li>• Form field changes</li>
            <li>• Toggle operations</li>
            <li>• Incremental updates</li>
          </ul>
        </div>
      </div>

      {/* Remember Box */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
        <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
          ⚠️ Remember: patch() is SHALLOW
        </h4>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p>patch() only merges at the first level. For nested objects:</p>
          <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded">
            {`// ❌ WRONG - loses other nested fields
this.patch({ settings: { theme: 'dark' } });

// ✅ CORRECT - preserves nested fields
this.patch({ 
  settings: { 
    ...this.state.settings, 
    theme: 'dark' 
  } 
});`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export const emitPatchCode = {
  usage: `import { Cubit } from '@blac/core';

class StateCubit extends Cubit<State> {
  // EMIT - Complete replacement
  loadFromApi = async () => {
    const data = await fetchData();
    this.emit(data); // Replace entire state
  };

  reset = () => {
    this.emit(initialState); // Perfect for resets
  };

  // PATCH - Partial updates
  updateName = (name: string) => {
    this.patch({ name }); // Only update name
  };

  toggleSetting = () => {
    this.patch({ 
      enabled: !this.state.enabled 
    }); // Toggle single field
  };

  // Nested updates need spreading
  updateNestedField = (value: string) => {
    this.patch({
      nested: {
        ...this.state.nested,
        field: value
      }
    });
  };
}`,
  bloc: `// Real-world examples

// Form handling with patch()
class FormCubit extends Cubit<FormState> {
  updateField = (field: string, value: any) => {
    this.patch({ [field]: value });
  };

  updateAddress = (address: Partial<Address>) => {
    this.patch({
      address: {
        ...this.state.address,
        ...address
      }
    });
  };
}

// Data loading with emit()
class DataCubit extends Cubit<DataState> {
  loadData = async (id: string) => {
    this.patch({ loading: true }); // Update loading
    
    try {
      const data = await api.fetch(id);
      this.emit({
        ...data,
        loading: false,
        error: null
      }); // Replace with new data
    } catch (error) {
      this.patch({ 
        loading: false, 
        error: error.message 
      }); // Update error state
    }
  };
}`,
};
