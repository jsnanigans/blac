import { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  AlertTriangle,
} from 'lucide-react';

// =================================================================
// State Machine Pattern Demo
// =================================================================

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
    if (this.state.status === 'loading') return;
    this.emit({ status: 'loading' });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (Math.random() < 0.3) throw new Error('Failed to fetch data');
      this.emit({
        status: 'success',
        data: `Loaded at ${new Date().toLocaleTimeString()}`,
      });
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

// =================================================================
// Retry with Exponential Backoff Demo
// =================================================================

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
    super({ status: 'idle', retryCount: 0 });
  }

  fetchData = async (isRetry = false) => {
    if (this.state.status === 'loading') return;

    this.emit({ ...this.state, status: 'loading', nextRetryIn: undefined });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (Math.random() < 0.6) throw new Error('Network request failed');

      this.emit({
        status: 'success',
        data: `Loaded after ${this.state.retryCount} ${this.state.retryCount === 1 ? 'retry' : 'retries'}`,
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
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    let remaining = delaySeconds;
    this.countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.patch({ nextRetryIn: remaining });
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
      }
    }, 1000);

    this.retryTimer = setTimeout(
      () => this.fetchData(true),
      delaySeconds * 1000,
    );
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

// =================================================================
// Optimistic Updates Demo
// =================================================================

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
    super({ items: [], isAdding: false });
  }

  addTodo = async (text: string) => {
    const optimisticId = `temp-${Date.now()}`;

    this.patch({
      items: [
        ...this.state.items,
        { id: optimisticId, text, completed: false, optimistic: true },
      ],
      isAdding: true,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (Math.random() < 0.3) throw new Error('Failed to add todo');

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

  toggleTodo = async (id: string) => {
    const item = this.state.items.find((i) => i.id === id);
    if (!item) return;

    this.patch({
      items: this.state.items.map((i) =>
        i.id === id ? { ...i, completed: !i.completed, optimistic: true } : i,
      ),
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (Math.random() < 0.2) throw new Error('Failed to toggle');
      this.patch({
        items: this.state.items.map((i) =>
          i.id === id ? { ...i, optimistic: false } : i,
        ),
      });
    } catch (error) {
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

  removeTodo = (id: string) => {
    this.patch({ items: this.state.items.filter((item) => item.id !== id) });
  };

  clearErrors = () => {
    this.patch({ items: this.state.items.filter((item) => !item.error) });
  };
}

// =================================================================
// Interactive Demos
// =================================================================

export function AsyncLoadingInteractive() {
  const [activeDemo, setActiveDemo] = useState<
    'state-machine' | 'retry' | 'optimistic'
  >('state-machine');

  return (
    <div className="my-8 space-y-6">
      {/* Demo Switcher */}
      <div className="flex justify-center gap-3 flex-wrap">
        <Button
          onClick={() => setActiveDemo('state-machine')}
          variant={activeDemo === 'state-machine' ? 'primary' : 'outline'}
          size="sm"
        >
          State Machine
        </Button>
        <Button
          onClick={() => setActiveDemo('retry')}
          variant={activeDemo === 'retry' ? 'primary' : 'outline'}
          size="sm"
        >
          Retry + Backoff
        </Button>
        <Button
          onClick={() => setActiveDemo('optimistic')}
          variant={activeDemo === 'optimistic' ? 'primary' : 'outline'}
          size="sm"
        >
          Optimistic Updates
        </Button>
      </div>

      {/* Demo Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              {activeDemo === 'state-machine' && 'State Machine Pattern'}
              {activeDemo === 'retry' && 'Retry with Exponential Backoff'}
              {activeDemo === 'optimistic' && 'Optimistic Updates'}
            </h3>

            {activeDemo === 'state-machine' && <StateMachineDemo />}
            {activeDemo === 'retry' && <RetryDemo />}
            {activeDemo === 'optimistic' && <OptimisticDemo />}
          </div>
        </div>

        <div className="space-y-4">
          {activeDemo === 'state-machine' && (
            <StateViewer
              bloc={DataFetchCubit}
              title="State Machine State"
              defaultCollapsed={false}
            />
          )}
          {activeDemo === 'retry' && (
            <StateViewer
              bloc={RetryFetchCubit}
              title="Retry State"
              defaultCollapsed={false}
            />
          )}
          {activeDemo === 'optimistic' && (
            <StateViewer
              bloc={OptimisticTodoCubit}
              title="Optimistic Updates State"
              defaultCollapsed={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StateMachineDemo() {
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

      <div className="min-h-[100px] flex items-center justify-center rounded-lg border-2 border-dashed border-border p-6">
        {state.status === 'idle' && (
          <p className="text-muted-foreground">Click "Fetch Data" to start</p>
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
    </div>
  );
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
        <div className="ml-auto text-sm text-muted-foreground">
          Attempts: {state.retryCount} / 3
        </div>
      </div>

      <div className="min-h-[120px] flex items-center justify-center rounded-lg border-2 border-dashed border-border p-6">
        {state.status === 'idle' && (
          <p className="text-muted-foreground">
            Click "Start Fetch" (60% failure rate)
          </p>
        )}
        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">
              Attempting... (#{state.retryCount + 1})
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
    </div>
  );
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
          placeholder="Add todo (30% failure rate)..."
          disabled={state.isAdding}
          className="flex-1 px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background disabled:opacity-50"
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
          <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
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
                    : 'border-border bg-background'
              }`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => cubit.toggleTodo(item.id)}
                disabled={item.optimistic || item.error}
                className="w-4 h-4 cursor-pointer"
              />
              <span
                className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''} ${item.error ? 'text-red-600 dark:text-red-400' : ''}`}
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
    </div>
  );
}
