import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';

// Discriminated union types for type-safe state handling
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

// State machine Cubit
class DataFetchCubit extends Cubit<LoadingState> {
  constructor() {
    super({ status: 'idle' });
  }

  // Fetch data (simulated async operation)
  fetchData = async (shouldFail = false) => {
    // Transition to loading state
    this.emit({ status: 'loading' });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (shouldFail) {
        throw new Error('Failed to fetch data');
      }

      // Transition to success state
      this.emit({
        status: 'success',
        data: `Data fetched at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      // Transition to error state
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Reset to idle state
  reset = () => {
    this.emit({ status: 'idle' });
  };

  // Retry after error
  retry = () => {
    this.fetchData(false);
  };
}

// Demo component
export function LoadingStatesDemo() {
  const [state, cubit] = useBloc(DataFetchCubit);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Main State Display Card */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">State Machine Demo</h3>

          {/* State visualization */}
          <div className="min-h-32 flex items-center justify-center bg-muted/50 rounded-md p-6 mb-4">
            {state.status === 'idle' && (
              <div className="text-center">
                <div className="text-4xl mb-2">⏸️</div>
                <p className="text-muted-foreground">Idle - Ready to fetch data</p>
              </div>
            )}

            {state.status === 'loading' && (
              <div className="text-center">
                <div className="text-4xl mb-2 animate-spin">⏳</div>
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            )}

            {state.status === 'success' && (
              <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-600 dark:text-green-400 font-medium mb-1">Success!</p>
                <p className="text-sm text-muted-foreground">{state.data}</p>
              </div>
            )}

            {state.status === 'error' && (
              <div className="text-center">
                <div className="text-4xl mb-2">❌</div>
                <p className="text-red-600 dark:text-red-400 font-medium mb-1">Error</p>
                <p className="text-sm text-muted-foreground">{state.error}</p>
              </div>
            )}
          </div>

          {/* Action buttons based on current state */}
          <div className="flex justify-center gap-2">
            {state.status === 'idle' && (
              <>
                <Button onClick={() => cubit.fetchData(false)} variant="primary">
                  Fetch Data (Success)
                </Button>
                <Button onClick={() => cubit.fetchData(true)} variant="outline">
                  Fetch Data (Error)
                </Button>
              </>
            )}

            {state.status === 'loading' && (
              <Button disabled variant="muted">
                Loading...
              </Button>
            )}

            {state.status === 'success' && (
              <>
                <Button onClick={() => cubit.fetchData(false)} variant="primary">
                  Fetch Again
                </Button>
                <Button onClick={cubit.reset} variant="outline">
                  Reset
                </Button>
              </>
            )}

            {state.status === 'error' && (
              <>
                <Button onClick={cubit.retry} variant="primary">
                  Retry
                </Button>
                <Button onClick={cubit.reset} variant="outline">
                  Reset
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* State Diagram Card */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">State Machine Diagram</h3>
          <div className="bg-muted/50 rounded-md p-4">
            <div className="font-mono text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className={state.status === 'idle' ? 'font-bold text-primary' : ''}>
                  [Idle]
                </span>
                <span>→</span>
                <span className="text-muted-foreground">fetchData()</span>
                <span>→</span>
                <span className={state.status === 'loading' ? 'font-bold text-primary' : ''}>
                  [Loading]
                </span>
              </div>
              <div className="flex items-center gap-2 pl-20">
                <span>→</span>
                <span className="text-muted-foreground">success</span>
                <span>→</span>
                <span className={state.status === 'success' ? 'font-bold text-primary' : ''}>
                  [Success]
                </span>
              </div>
              <div className="flex items-center gap-2 pl-20">
                <span>→</span>
                <span className="text-muted-foreground">error</span>
                <span>→</span>
                <span className={state.status === 'error' ? 'font-bold text-primary' : ''}>
                  [Error]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    state.status === 'success' || state.status === 'error'
                      ? 'font-bold text-primary'
                      : ''
                  }
                >
                  [Success/Error]
                </span>
                <span>→</span>
                <span className="text-muted-foreground">reset()</span>
                <span>→</span>
                <span>[Idle]</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Current state highlighted in <span className="text-primary font-bold">bold</span>
          </p>
        </CardContent>
      </Card>

      {/* Type Safety Explanation Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Why Discriminated Unions?
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Type Safety:</strong>
              <p className="text-muted-foreground mt-1">
                TypeScript knows which properties are available based on the status field. No more
                undefined errors!
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Impossible States:</strong>
              <p className="text-muted-foreground mt-1">
                You can't have loading=true and error set at the same time. The type system prevents
                invalid state combinations.
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Exhaustive Checking:</strong>
              <p className="text-muted-foreground mt-1">
                When you handle all cases in a switch/if statement, TypeScript ensures you don't
                miss any states.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export code for display
export const loadingStatesDemoCode = {
  types: `// Discriminated union for type-safe state handling
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };`,
  cubit: `class DataFetchCubit extends Cubit<LoadingState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async (shouldFail = false) => {
    this.emit({ status: 'loading' });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (shouldFail) {
        throw new Error('Failed to fetch data');
      }

      this.emit({
        status: 'success',
        data: \`Data fetched at \${new Date().toLocaleTimeString()}\`,
      });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  retry = () => this.fetchData(false);
  reset = () => this.emit({ status: 'idle' });
}`,
  usage: `function LoadingStatesDemo() {
  const [state, cubit] = useBloc(DataFetchCubit);

  // TypeScript knows which properties are available!
  if (state.status === 'success') {
    console.log(state.data); // ✅ data is available
  }

  if (state.status === 'error') {
    console.log(state.error); // ✅ error is available
  }

  return (
    <div>
      {state.status === 'idle' && <button onClick={() => cubit.fetchData()}>Fetch</button>}
      {state.status === 'loading' && <div>Loading...</div>}
      {state.status === 'success' && <div>{state.data}</div>}
      {state.status === 'error' && <div>Error: {state.error}</div>}
    </div>
  );
}`,
};
