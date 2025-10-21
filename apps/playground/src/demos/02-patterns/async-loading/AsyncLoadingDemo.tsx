import React, { useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import {
  ArticleSection,
  SectionHeader,
} from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';

// ============================================================================
// DEMO 1: Basic Loading States (State Machine Pattern)
// ============================================================================

type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

class DataFetchCubit extends Cubit<LoadingState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async () => {
    // Prevent multiple simultaneous fetches
    if (this.state.status === 'loading') return;

    this.emit({ status: 'loading' });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate occasional failures
      if (Math.random() < 0.3) {
        throw new Error('Failed to fetch data from server');
      }

      const data = `Data loaded at ${new Date().toLocaleTimeString()}`;
      this.emit({ status: 'success', data });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  reset = () => {
    this.emit({ status: 'idle' });
  };
}

function BasicLoadingDemo() {
  const [state, cubit] = useBloc(DataFetchCubit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={cubit.fetchData}
          disabled={state.status === 'loading'}
          variant="primary"
        >
          {state.status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Fetch Data
            </>
          )}
        </Button>

        {state.status !== 'idle' && (
          <Button onClick={cubit.reset} variant="outline">
            Reset
          </Button>
        )}
      </div>

      {/* Status Display */}
      <div className="min-h-[100px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6">
        {state.status === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400">
            Click "Fetch Data" to start
          </p>
        )}

        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">Loading data...</span>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">{state.data}</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <XCircle className="w-6 h-6" />
            <span className="font-medium">{state.error}</span>
          </div>
        )}
      </div>

      <StateViewer bloc={DataFetchCubit} title="Current State" />
    </div>
  );
}

// ============================================================================
// DEMO 2: Retry with Exponential Backoff
// ============================================================================

interface RetryState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: string;
  error?: string;
  retryCount: number;
  nextRetryIn?: number;
}

class RetryFetchCubit extends Cubit<RetryState> {
  private retryTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  constructor() {
    super({
      status: 'idle',
      retryCount: 0,
    });
  }

  fetchData = async (isRetry = false) => {
    if (this.state.status === 'loading') return;

    this.emit({
      ...this.state,
      status: 'loading',
      nextRetryIn: undefined,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Higher failure rate to demonstrate retry
      if (Math.random() < 0.6) {
        throw new Error('Network request failed');
      }

      const data = `Successfully loaded after ${this.state.retryCount} ${
        this.state.retryCount === 1 ? 'retry' : 'retries'
      }`;

      this.emit({
        status: 'success',
        data,
        retryCount: this.state.retryCount,
      });
    } catch (error) {
      const newRetryCount = isRetry
        ? this.state.retryCount
        : this.state.retryCount + 1;

      if (newRetryCount >= this.maxRetries) {
        this.emit({
          status: 'error',
          error: `Failed after ${this.maxRetries} attempts`,
          retryCount: newRetryCount,
        });
      } else {
        // Exponential backoff: 2^retryCount seconds
        const delaySeconds = Math.pow(2, newRetryCount);

        this.emit({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: newRetryCount,
          nextRetryIn: delaySeconds,
        });

        this.scheduleRetry(delaySeconds);
      }
    }
  };

  private scheduleRetry = (delaySeconds: number) => {
    // Clear any existing timers
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    // Countdown timer
    let remaining = delaySeconds;
    this.countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.patch({ nextRetryIn: remaining });
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
      }
    }, 1000);

    // Retry timer
    this.retryTimer = setTimeout(() => {
      this.fetchData(true);
    }, delaySeconds * 1000);
  };

  reset = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.emit({ status: 'idle', retryCount: 0 });
  };

  onDispose = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  };
}

function RetryDemo() {
  const [state, cubit] = useBloc(RetryFetchCubit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => cubit.fetchData()}
          disabled={state.status === 'loading'}
          variant="primary"
        >
          {state.status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Attempting...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Start Fetch
            </>
          )}
        </Button>

        <Button onClick={cubit.reset} variant="outline">
          Reset
        </Button>

        <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
          Attempts: {state.retryCount} / 3
        </div>
      </div>

      <div className="min-h-[120px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6">
        {state.status === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400">
            Click "Start Fetch" to begin (60% failure rate)
          </p>
        )}

        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">
              Attempting to load data... (Attempt {state.retryCount + 1})
            </span>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">{state.data}</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
              <XCircle className="w-6 h-6" />
              <span className="font-medium">{state.error}</span>
            </div>
            {state.nextRetryIn !== undefined && state.nextRetryIn > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Retrying in {state.nextRetryIn}s...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <StateViewer bloc={RetryFetchCubit} title="Current State" />
    </div>
  );
}

// ============================================================================
// DEMO 3: Optimistic Updates
// ============================================================================

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  optimistic?: boolean;
  error?: boolean;
}

interface TodoState {
  items: TodoItem[];
  isAdding: boolean;
}

class OptimisticTodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      items: [],
      isAdding: false,
    });
  }

  addTodo = async (text: string) => {
    const optimisticId = `temp-${Date.now()}`;

    // Optimistic update: add immediately
    this.patch({
      items: [
        ...this.state.items,
        {
          id: optimisticId,
          text,
          completed: false,
          optimistic: true,
        },
      ],
      isAdding: true,
    });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate occasional failures
      if (Math.random() < 0.3) {
        throw new Error('Failed to add todo');
      }

      // Success: replace optimistic item with real one
      const realId = `todo-${Date.now()}`;
      this.patch({
        items: this.state.items.map((item) =>
          item.id === optimisticId
            ? { ...item, id: realId, optimistic: false }
            : item,
        ),
        isAdding: false,
      });
    } catch (error) {
      // Failure: mark as error (could also remove it)
      this.patch({
        items: this.state.items.map((item) =>
          item.id === optimisticId
            ? { ...item, error: true, optimistic: false }
            : item,
        ),
        isAdding: false,
      });
    }
  };

  removeTodo = (id: string) => {
    this.patch({
      items: this.state.items.filter((item) => item.id !== id),
    });
  };

  toggleTodo = async (id: string) => {
    const item = this.state.items.find((i) => i.id === id);
    if (!item) return;

    // Optimistic update
    this.patch({
      items: this.state.items.map((i) =>
        i.id === id ? { ...i, completed: !i.completed, optimistic: true } : i,
      ),
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (Math.random() < 0.2) {
        throw new Error('Failed to toggle');
      }

      // Confirm success
      this.patch({
        items: this.state.items.map((i) =>
          i.id === id ? { ...i, optimistic: false } : i,
        ),
      });
    } catch (error) {
      // Revert on failure
      this.patch({
        items: this.state.items.map((i) =>
          i.id === id
            ? {
                ...i,
                completed: item.completed,
                optimistic: false,
                error: true,
              }
            : i,
        ),
      });
    }
  };

  clearErrors = () => {
    this.patch({
      items: this.state.items.filter((item) => !item.error),
    });
  };
}

function OptimisticDemo() {
  const [state, cubit] = useBloc(OptimisticTodoCubit);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      cubit.addTodo(inputValue.trim());
      setInputValue('');
    }
  };

  const hasErrors = state.items.some((item) => item.error);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a todo (30% failure rate)..."
          disabled={state.isAdding}
          className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 disabled:opacity-50"
        />
        <Button
          onClick={handleAdd}
          disabled={state.isAdding || !inputValue.trim()}
          variant="primary"
        >
          Add
        </Button>
      </div>

      {hasErrors && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Some operations failed</span>
          </div>
          <Button
            onClick={cubit.clearErrors}
            variant="outline"
            className="text-sm"
          >
            Clear Errors
          </Button>
        </div>
      )}

      <div className="space-y-2 min-h-[200px]">
        {state.items.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No todos yet. Add one above!
            </p>
          </div>
        ) : (
          state.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                item.error
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'
                  : item.optimistic
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => cubit.toggleTodo(item.id)}
                disabled={item.optimistic || item.error}
                className="w-4 h-4"
              />
              <span
                className={`flex-1 ${
                  item.completed
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : ''
                } ${item.error ? 'text-red-600 dark:text-red-400' : ''}`}
              >
                {item.text}
              </span>
              {item.optimistic && (
                <Loader2 className="w-4 h-4 animate-spin text-yellow-600 dark:text-yellow-400" />
              )}
              {item.error && (
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <Button
                onClick={() => cubit.removeTodo(item.id)}
                variant="outline"
                className="text-sm px-2 py-1"
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>

      <StateViewer bloc={OptimisticTodoCubit} title="Current State" />
    </div>
  );
}

// ===== DEMO METADATA =====

const demoMetadata = {
  id: 'async-loading',
  title: 'Async Loading States',
  description:
    'Master async operations with loading states, error handling, retry logic, and optimistic updates.',
  category: '02-patterns' as const,
  difficulty: 'intermediate' as const,
  tags: ['cubit', 'async', 'loading', 'error-handling', 'retry', 'optimistic'],
  estimatedTime: 15,
  learningPath: {
    previous: 'form-validation',
    next: 'data-fetching',
    sequence: 3,
  },
  theme: {
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
};

// ============================================================================
// Main Demo Component
// ============================================================================

export function AsyncLoadingDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>Mastering Async Operations</SectionHeader>
        <Prose>
          <p>
            Async operations are everywhere in modern applications—API calls,
            database queries, file uploads. Handling these operations gracefully
            is critical for good UX.
          </p>
          <p>
            In this guide, you'll learn three essential patterns for async
            operations:
          </p>
          <ul>
            <li>
              <strong>State machine pattern</strong> for explicit loading states
            </li>
            <li>
              <strong>Retry with exponential backoff</strong> for resilient
              error handling
            </li>
            <li>
              <strong>Optimistic updates</strong> for instant feedback
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Demo 1: Basic Loading States */}
      <ArticleSection id="state-machine">
        <SectionHeader>The State Machine Pattern</SectionHeader>
        <Prose>
          <p>
            The most robust way to handle loading states is with a{' '}
            <strong>discriminated union type</strong>. This creates a state
            machine where each state is explicit and type-safe.
          </p>
        </Prose>

        <ConceptCallout type="tip" title="Why Discriminated Unions?">
          <p>
            With a discriminated union, TypeScript{' '}
            <strong>narrows the type</strong> based on the status field. This
            prevents bugs like accessing <code>data</code> when it doesn't
            exist.
          </p>
        </ConceptCallout>

        <CodePanel
          language="typescript"
          title="DataFetchCubit.ts"
          code={`type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

class DataFetchCubit extends Cubit<LoadingState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async () => {
    // Prevent multiple simultaneous fetches
    if (this.state.status === 'loading') return;

    this.emit({ status: 'loading' });

    try {
      await simulateApiCall();
      const data = \`Data loaded at \${new Date().toLocaleTimeString()}\`;
      this.emit({ status: 'success', data });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error.message,
      });
    }
  };
}`}
        />

        <Prose>
          <p>
            Notice how we{' '}
            <strong>guard against multiple simultaneous fetches</strong>.
            Without this check, clicking the button rapidly could cause race
            conditions.
          </p>
        </Prose>

        <div className="my-6">
          <BasicLoadingDemo />
        </div>

        <ConceptCallout type="warning" title="Common Mistake">
          <p>
            Using separate boolean flags (<code>isLoading</code>,{' '}
            <code>hasError</code>) leads to impossible states like "loading AND
            error." Discriminated unions make impossible states unrepresentable.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 2: Retry with Backoff */}
      <ArticleSection theme="neutral" id="retry-backoff">
        <SectionHeader>Retry with Exponential Backoff</SectionHeader>
        <Prose>
          <p>
            Network requests fail. Sometimes they fail temporarily and succeed
            on retry. Exponential backoff is the industry standard for retry
            logic:
          </p>

          <ul>
            <li>
              <strong>First retry:</strong> 2 seconds (2^1)
            </li>
            <li>
              <strong>Second retry:</strong> 4 seconds (2^2)
            </li>
            <li>
              <strong>Third retry:</strong> 8 seconds (2^3)
            </li>
          </ul>

          <p>
            This prevents overwhelming a struggling server while still giving
            requests a chance to succeed.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="RetryFetchCubit.ts"
          code={`interface RetryState {
  status: 'idle' | 'loading' | 'success' | 'error';
  retryCount: number;
  nextRetryIn?: number;
}

class RetryFetchCubit extends Cubit<RetryState> {
  private maxRetries = 3;

  fetchData = async (isRetry = false) => {
    this.emit({ ...this.state, status: 'loading' });

    try {
      await simulateApiCall();
      this.emit({ status: 'success', retryCount: this.state.retryCount });
    } catch (error) {
      const newRetryCount = isRetry
        ? this.state.retryCount
        : this.state.retryCount + 1;

      if (newRetryCount >= this.maxRetries) {
        this.emit({ status: 'error', retryCount: newRetryCount });
      } else {
        // Exponential backoff: 2^retryCount seconds
        const delaySeconds = Math.pow(2, newRetryCount);
        this.scheduleRetry(delaySeconds);
      }
    }
  };

  private scheduleRetry = (delaySeconds: number) => {
    setTimeout(() => this.fetchData(true), delaySeconds * 1000);
  };
}`}
        />

        <div className="my-6">
          <RetryDemo />
        </div>

        <ConceptCallout type="tip" title="Production Considerations">
          <p>In production, add:</p>
          <ul>
            <li>
              <strong>Jitter:</strong> Add randomness to prevent thundering herd
            </li>
            <li>
              <strong>Maximum delay:</strong> Cap backoff at ~60 seconds
            </li>
            <li>
              <strong>Cancellation:</strong> Allow users to cancel retries
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 3: Optimistic Updates */}
      <ArticleSection id="optimistic-updates">
        <SectionHeader>Optimistic Updates</SectionHeader>
        <Prose>
          <p>
            Optimistic updates provide <strong>instant feedback</strong> by
            updating the UI immediately, then confirming with the server. If the
            request fails, revert the change.
          </p>

          <p>This pattern is perfect for:</p>
          <ul>
            <li>Liking/favoriting items</li>
            <li>Toggling checkboxes</li>
            <li>Adding items to lists</li>
            <li>Any action with high success rate</li>
          </ul>
        </Prose>

        <CodePanel
          language="typescript"
          title="OptimisticTodoCubit.ts"
          code={`interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  optimistic?: boolean;  // Flag for pending confirmation
  error?: boolean;       // Flag for failed operations
}

class OptimisticTodoCubit extends Cubit<TodoState> {
  addTodo = async (text: string) => {
    const optimisticId = \`temp-\${Date.now()}\`;

    // 1. Optimistic update: add immediately
    this.patch({
      items: [...this.state.items, {
        id: optimisticId,
        text,
        completed: false,
        optimistic: true
      }]
    });

    try {
      const realId = await apiAddTodo(text);

      // 2. Success: replace temp ID with real one
      this.patch({
        items: this.state.items.map(item =>
          item.id === optimisticId
            ? { ...item, id: realId, optimistic: false }
            : item
        )
      });
    } catch (error) {
      // 3. Failure: mark as error (or remove)
      this.patch({
        items: this.state.items.map(item =>
          item.id === optimisticId
            ? { ...item, error: true, optimistic: false }
            : item
        )
      });
    }
  };
}`}
        />

        <div className="my-6">
          <OptimisticDemo />
        </div>

        <ConceptCallout
          type="warning"
          title="When NOT to Use Optimistic Updates"
        >
          <p>Avoid optimistic updates for:</p>
          <ul>
            <li>
              <strong>Critical operations:</strong> Financial transactions,
              deleting data
            </li>
            <li>
              <strong>Complex validation:</strong> Operations that might fail
              frequently
            </li>
            <li>
              <strong>Non-reversible actions:</strong> Sending emails,
              publishing content
            </li>
          </ul>
          <p>
            For these cases, use explicit loading states and wait for server
            confirmation.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Pattern Comparison */}
      <ArticleSection theme="neutral" id="comparison">
        <SectionHeader>Pattern Comparison</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-gray-700">
                <th className="text-left py-3 px-4">Pattern</th>
                <th className="text-left py-3 px-4">Best For</th>
                <th className="text-left py-3 px-4">User Experience</th>
                <th className="text-left py-3 px-4">Complexity</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">State Machine</td>
                <td className="py-3 px-4">
                  Critical operations, explicit feedback
                </td>
                <td className="py-3 px-4">Clear, honest status</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">
                  Low
                </td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Retry + Backoff</td>
                <td className="py-3 px-4">
                  Unreliable networks, API rate limits
                </td>
                <td className="py-3 px-4">Resilient to transient failures</td>
                <td className="py-3 px-4 text-yellow-600 dark:text-yellow-400">
                  Medium
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Optimistic Updates</td>
                <td className="py-3 px-4">
                  High-success operations, instant feedback
                </td>
                <td className="py-3 px-4">Feels instant, responsive</td>
                <td className="py-3 px-4 text-orange-600 dark:text-orange-400">
                  High
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>1. Always Prevent Duplicate Requests</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`fetchData = async () => {
  if (this.state.status === 'loading') return; // Guard clause
  this.emit({ status: 'loading' });
  // ...
}`}
        />

        <Prose>
          <h3>2. Clean Up Timers on Dispose</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`onDispose = () => {
  if (this.retryTimer) clearTimeout(this.retryTimer);
  if (this.countdownTimer) clearInterval(this.countdownTimer);
}`}
        />

        <Prose>
          <h3>3. Provide User Control</h3>
          <p>Always give users a way to:</p>
          <ul>
            <li>Cancel ongoing operations</li>
            <li>Retry failed operations</li>
            <li>Reset to initial state</li>
            <li>See clear error messages</li>
          </ul>

          <h3>4. Handle Edge Cases</h3>
          <ul>
            <li>
              <strong>Network offline:</strong> Detect and queue operations
            </li>
            <li>
              <strong>Request timeout:</strong> Don't wait forever
            </li>
            <li>
              <strong>Component unmount:</strong> Cancel pending requests
            </li>
            <li>
              <strong>Stale data:</strong> Implement cache invalidation
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Summary */}
      <ArticleSection theme="success" id="summary">
        <SectionHeader>Summary</SectionHeader>
        <Prose>
          <p>You've learned three essential async patterns:</p>
        </Prose>

        <div className="grid gap-4 my-6">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2">State Machine Pattern</h4>
            <p className="text-sm">
              Use discriminated unions for type-safe, explicit loading states.
              Perfect for critical operations where users need clear feedback.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold mb-2">Retry with Backoff</h4>
            <p className="text-sm">
              Implement exponential backoff for resilient error handling.
              Essential for production apps dealing with unreliable networks.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800">
            <h4 className="font-semibold mb-2">Optimistic Updates</h4>
            <p className="text-sm">
              Provide instant feedback by updating UI immediately, then confirm
              with server. Great for high-success operations.
            </p>
          </div>
        </div>

        <ConceptCallout type="tip" title="Next Steps">
          <p>
            Try combining these patterns! For example, use optimistic updates
            with exponential backoff retry for the best of both worlds.
          </p>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
}
