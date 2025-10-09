import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { SimpleAsyncCubit, type AsyncState } from './SimpleAsyncCubit';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card';
import { Button } from '@/ui/Button';

export function SimpleAsyncDemo() {
  const [state, cubit] = useBloc(SimpleAsyncCubit);
  const [simulateError, setSimulateError] = useState(false);

  const getStatusColor = () => {
    switch (state.status) {
      case 'idle':
        return 'bg-gray-100 dark:bg-gray-800';
      case 'loading':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'success':
        return 'bg-green-100 dark:bg-green-900';
      case 'error':
        return 'bg-red-100 dark:bg-red-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* State Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>State Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div
              className={`px-4 py-2 rounded-lg text-center transition-colors ${
                state.status === 'idle' ? getStatusColor() : 'bg-gray-50 dark:bg-gray-900'
              }`}
            >
              <div className="font-medium">Idle</div>
            </div>
            <div className="text-gray-400">→</div>
            <div
              className={`px-4 py-2 rounded-lg text-center transition-colors ${
                state.status === 'loading' ? getStatusColor() : 'bg-gray-50 dark:bg-gray-900'
              }`}
            >
              <div className="font-medium">Loading</div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="space-y-2">
              <div
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  state.status === 'success' ? getStatusColor() : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="font-medium">Success</div>
              </div>
              <div
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  state.status === 'error' ? getStatusColor() : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="font-medium">Error</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Simple Async Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current State Display */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-medium">Current State:</span>
            <div className={`px-3 py-1 rounded-lg ${getStatusColor()}`}>
              <span className="capitalize font-medium">{state.status}</span>
            </div>
          </div>

          {/* State-specific content */}
          <div className="min-h-[120px] flex items-center justify-center mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
            {state.status === 'idle' && (
              <div className="text-center text-gray-500 dark:text-gray-400">
                Ready to fetch data. Click the button below to start.
              </div>
            )}

            {state.status === 'loading' && (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Fetching data...</div>
              </div>
            )}

            {state.status === 'success' && (
              <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">Success!</div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">{state.data}</div>
                  </div>
                </div>
              </div>
            )}

            {state.status === 'error' && (
              <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <div className="flex items-start space-x-2">
                  <span className="text-red-600 dark:text-red-400">✕</span>
                  <div>
                    <div className="font-medium text-red-800 dark:text-red-200">Error!</div>
                    <div className="text-sm text-red-700 dark:text-red-300 mt-1">{state.error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error simulation toggle */}
          <div className="flex items-center space-x-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
            <input
              type="checkbox"
              id="simulate-error"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
              className="rounded border-gray-300"
              disabled={state.status === 'loading'}
            />
            <label htmlFor="simulate-error" className="text-sm text-gray-600 dark:text-gray-400">
              Simulate error on next fetch
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            {(state.status === 'idle' || state.status === 'success') && (
              <Button
                onClick={() => cubit.fetchData(simulateError)}
                variant="primary"
              >
                Fetch Data
              </Button>
            )}

            {state.status === 'error' && (
              <>
                <Button
                  onClick={cubit.retry}
                  variant="primary"
                >
                  Retry
                </Button>
                <Button
                  onClick={cubit.reset}
                  variant="ghost"
                >
                  Reset
                </Button>
              </>
            )}

            {state.status === 'success' && (
              <Button
                onClick={cubit.reset}
                variant="ghost"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{`// State definition using discriminated unions
type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

// Simple async handling in Cubit
class SimpleAsyncCubit extends Cubit<AsyncState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async () => {
    this.emit({ status: 'loading' });

    try {
      const data = await fetchAPI();
      this.emit({ status: 'success', data });
    } catch (error) {
      this.emit({ status: 'error', error: error.message });
    }
  };

  retry = () => {
    this.fetchData();
  };

  reset = () => {
    this.emit({ status: 'idle' });
  };
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

// Export code for display
export const simpleAsyncDemoCode = {
  cubit: `import { Cubit } from '@blac/core';

type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

class SimpleAsyncCubit extends Cubit<AsyncState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async (shouldFail = false) => {
    this.emit({ status: 'loading' });

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          shouldFail ? reject(new Error('Failed')) : resolve();
        }, 1500);
      });

      const data = \`Data fetched at \${new Date().toLocaleTimeString()}\`;
      this.emit({ status: 'success', data });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error.message
      });
    }
  };

  retry = () => this.fetchData(false);
  reset = () => this.emit({ status: 'idle' });
}`,
  usage: `import { useBloc } from '@blac/react';
import { SimpleAsyncCubit } from './SimpleAsyncCubit';

function AsyncDemo() {
  const [state, cubit] = useBloc(SimpleAsyncCubit);

  return (
    <div>
      {state.status === 'idle' && (
        <button onClick={() => cubit.fetchData()}>
          Fetch Data
        </button>
      )}

      {state.status === 'loading' && <div>Loading...</div>}

      {state.status === 'success' && (
        <div>
          <p>Success: {state.data}</p>
          <button onClick={cubit.reset}>Reset</button>
        </div>
      )}

      {state.status === 'error' && (
        <div>
          <p>Error: {state.error}</p>
          <button onClick={cubit.retry}>Retry</button>
          <button onClick={cubit.reset}>Reset</button>
        </div>
      )}
    </div>
  );
}`,
};