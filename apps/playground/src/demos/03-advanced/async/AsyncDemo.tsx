import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React from 'react';

// State for async operations with error handling
interface ApiState {
  data: any | null;
  loading: boolean;
  error: string | null;
  successCount: number;
  errorCount: number;
}

// Simple Cubit with async operations and error handling
class ApiCubit extends Cubit<ApiState> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0,
    });
  }

  // Simulated API call that can succeed or fail
  fetchData = async (shouldFail: boolean = false) => {
    // Set loading state
    this.emit({ ...this.state, loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (shouldFail) {
        throw new Error('Network request failed: 500 Internal Server Error');
      }

      // Simulate successful response
      const data = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        message: 'Data fetched successfully',
        value: Math.floor(Math.random() * 100),
      };

      this.emit({
        data,
        loading: false,
        error: null,
        successCount: this.state.successCount + 1,
        errorCount: this.state.errorCount,
      });
    } catch (error) {
      this.emit({
        ...this.state,
        loading: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        errorCount: this.state.errorCount + 1,
      });
    }
  };

  // Retry with exponential backoff
  fetchWithRetry = async (maxRetries: number = 3) => {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      this.emit({
        ...this.state,
        loading: true,
        error:
          retryCount > 0
            ? `Retry attempt ${retryCount}/${maxRetries}...`
            : null,
      });

      try {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount)),
        );

        // 50% chance of success for demo purposes
        if (Math.random() > 0.5) {
          const data = {
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toISOString(),
            message: `Success after ${retryCount + 1} attempt(s)`,
            value: Math.floor(Math.random() * 100),
          };

          this.emit({
            data,
            loading: false,
            error: null,
            successCount: this.state.successCount + 1,
            errorCount: this.state.errorCount,
          });
          return;
        } else {
          throw new Error(`Attempt ${retryCount + 1} failed`);
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          this.emit({
            ...this.state,
            loading: false,
            error: `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            errorCount: this.state.errorCount + 1,
          });
        }
      }
    }
  };

  reset = () => {
    this.emit({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0,
    });
  };

  clearError = () => {
    this.emit({ ...this.state, error: null });
  };
}

export const AsyncDemo: React.FC = () => {
  const [apiState, apiCubit] = useBloc(ApiCubit);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="mb-4">
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">
            Async Operations with Error Handling
          </h3>

          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              onClick={() => apiCubit.fetchData(false)}
              disabled={apiState.loading}
              variant="primary"
            >
              Fetch Data (Success)
            </Button>
            <Button
              onClick={() => apiCubit.fetchData(true)}
              disabled={apiState.loading}
              variant="danger"
            >
              Fetch Data (Fail)
            </Button>
            <Button
              onClick={() => apiCubit.fetchWithRetry(3)}
              disabled={apiState.loading}
              variant="secondary"
            >
              Fetch with Retry
            </Button>
            <Button onClick={apiCubit.reset} variant="ghost">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="min-h-[200px]">
          {apiState.loading && (
            <div className="text-center text-gray-600 dark:text-gray-400">
              <div className="mb-2">Loading...</div>
              {apiState.error && (
                <div className="text-sm">{apiState.error}</div>
              )}
            </div>
          )}

          {!apiState.loading && apiState.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {apiState.error}
                </div>
                <Button onClick={apiCubit.clearError} size="sm" variant="ghost">
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!apiState.loading && apiState.data && (
            <div>
              <div className="font-semibold text-green-600 dark:text-green-400 mb-2">
                Success!
              </div>
              <pre className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm overflow-x-auto">
                {JSON.stringify(apiState.data, null, 2)}
              </pre>
            </div>
          )}

          {!apiState.loading && !apiState.data && !apiState.error && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Click a button to fetch data
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
        <strong>Statistics:</strong>
        <div className="mt-1">
          Success: {apiState.successCount} | Errors: {apiState.errorCount}
        </div>
      </div>
    </div>
  );
};

// Export code snippets for the playground
export const asyncDemoCode = {
  usage: `import { useBloc } from '@blac/react';
import { ApiCubit } from './ApiCubit';

function AsyncApp() {
  const [state, cubit] = useBloc(ApiCubit);

  return (
    <div>
      <button 
        onClick={() => cubit.fetchData()} 
        disabled={state.loading}
      >
        {state.loading ? 'Loading...' : 'Fetch Data'}
      </button>

      {state.error && (
        <div className="error">
          Error: {state.error}
          <button onClick={cubit.clearError}>Dismiss</button>
        </div>
      )}

      {state.data && (
        <div className="success">
          <pre>{JSON.stringify(state.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}`,
  bloc: `import { Cubit } from '@blac/core';

interface ApiState {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export class ApiCubit extends Cubit<ApiState> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
    });
  }

  fetchData = async () => {
    // Set loading state
    this.emit({ 
      ...this.state, 
      loading: true, 
      error: null 
    });

    try {
      // Simulate API call
      const response = await fetch('/api/data');
      const data = await response.json();

      // Update with success
      this.emit({
        data,
        loading: false,
        error: null,
      });
    } catch (error) {
      // Handle error
      this.emit({
        ...this.state,
        loading: false,
        error: error.message,
      });
    }
  };

  // Retry with exponential backoff
  fetchWithRetry = async (maxRetries = 3) => {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await this.fetchData();
        return; // Success!
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }
  };

  clearError = () => {
    this.emit({ ...this.state, error: null });
  };
}`,
};
