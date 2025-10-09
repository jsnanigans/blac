import React from 'react';
import { Play, Check, X, Clock } from 'lucide-react';
import { DemoTest } from '@/core/utils/demoRegistry';

interface TestRunnerProps {
  tests: DemoTest[];
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export function TestRunner({ tests }: TestRunnerProps) {
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const newResults: TestResult[] = [];

    for (const test of tests) {
      const startTime = performance.now();
      try {
        const passed = await test.run();
        const duration = performance.now() - startTime;
        newResults.push({
          name: test.name,
          passed,
          duration,
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        newResults.push({
          name: test.name,
          passed: false,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      setResults([...newResults]);
    }

    setIsRunning(false);
  };

  const totalTests = tests.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>

          {results.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">
                <Check className="h-4 w-4 inline mr-1" />
                {passedTests} passed
              </span>
              {failedTests > 0 && (
                <span className="text-red-600">
                  <X className="h-4 w-4 inline mr-1" />
                  {failedTests} failed
                </span>
              )}
              <span className="text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                {totalDuration.toFixed(2)}ms
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Test List */}
      <div className="space-y-2">
        {tests.map((test) => {
          const result = results.find((r) => r.name === test.name);

          return (
            <div
              key={test.name}
              className={`border rounded-lg p-4 transition-colors ${
                result
                  ? result.passed
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {result ? (
                      result.passed ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    )}
                    <h4 className="font-medium">{test.name}</h4>
                  </div>
                  {test.description && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      {test.description}
                    </p>
                  )}
                  {result?.error && (
                    <p className="text-sm text-red-600 mt-2 ml-6 font-mono">
                      {result.error}
                    </p>
                  )}
                </div>
                {result && (
                  <span className="text-xs text-muted-foreground">
                    {result.duration.toFixed(2)}ms
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {results.length === totalTests && totalTests > 0 && (
        <div
          className={`border rounded-lg p-4 ${
            failedTests === 0
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}
        >
          <div className="text-center">
            {failedTests === 0 ? (
              <>
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-600">
                  All tests passed!
                </p>
              </>
            ) : (
              <>
                <X className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="font-semibold text-red-600">
                  {failedTests} test{failedTests > 1 ? 's' : ''} failed
                </p>
              </>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Completed in {totalDuration.toFixed(2)}ms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
