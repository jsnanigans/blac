import React, { useState } from 'react';
import { useCubit } from '@blac/react';
import { SimpleAsyncCubit, type AsyncState } from './SimpleAsyncCubit';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, RefreshCw, RotateCcw } from 'lucide-react';

export function SimpleAsyncDemo() {
  const [state, cubit] = useCubit(SimpleAsyncCubit);
  const [simulateError, setSimulateError] = useState(false);

  const getStatusIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'idle':
        return 'bg-gray-100';
      case 'loading':
        return 'bg-blue-100';
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* State Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">State Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div
              className={`px-4 py-2 rounded-lg text-center transition-colors ${
                state.status === 'idle' ? getStatusColor() : 'bg-gray-50'
              }`}
            >
              <div className="font-medium">Idle</div>
            </div>
            <div className="text-gray-400">→</div>
            <div
              className={`px-4 py-2 rounded-lg text-center transition-colors ${
                state.status === 'loading' ? getStatusColor() : 'bg-gray-50'
              }`}
            >
              <div className="font-medium">Loading</div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="space-y-2">
              <div
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  state.status === 'success' ? getStatusColor() : 'bg-gray-50'
                }`}
              >
                <div className="font-medium">Success</div>
              </div>
              <div
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  state.status === 'error' ? getStatusColor() : 'bg-gray-50'
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
        <CardContent className="space-y-4">
          {/* Current State Display */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Current State:</span>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="capitalize">{state.status}</span>
            </div>
          </div>

          {/* State-specific content */}
          <div className="min-h-[100px] flex items-center justify-center">
            {state.status === 'idle' && (
              <div className="text-center text-gray-500">
                Ready to fetch data. Click the button below to start.
              </div>
            )}

            {state.status === 'loading' && (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <div className="text-sm text-gray-600">Fetching data...</div>
              </div>
            )}

            {state.status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong>
                  <br />
                  {state.data}
                </AlertDescription>
              </Alert>
            )}

            {state.status === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Error!</strong>
                  <br />
                  {state.error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Error simulation toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="simulate-error"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
              className="rounded border-gray-300"
              disabled={state.status === 'loading'}
            />
            <label htmlFor="simulate-error" className="text-sm text-gray-600">
              Simulate error on next fetch
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex space-x-2">
          {(state.status === 'idle' || state.status === 'success') && (
            <Button
              onClick={() => cubit.fetchData(simulateError)}
              disabled={state.status === 'loading'}
            >
              Fetch Data
            </Button>
          )}

          {state.status === 'error' && (
            <>
              <Button
                onClick={cubit.retry}
                variant="default"
                className="space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </Button>
              <Button
                onClick={cubit.reset}
                variant="outline"
                className="space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            </>
          )}

          {state.status === 'success' && (
            <Button
              onClick={cubit.reset}
              variant="outline"
              className="space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <code>{`// State definition using discriminated unions
type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

// Simple async handling in Cubit
class SimpleAsyncCubit extends Cubit<AsyncState> {
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