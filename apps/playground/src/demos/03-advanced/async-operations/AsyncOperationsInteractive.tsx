import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import React, { useState } from 'react';

// ============================================================================
// Debounced Search Demo
// ============================================================================

interface SearchState {
  query: string;
  isSearching: boolean;
  results: string[];
  searchCount: number;
}

class DebouncedSearchCubit extends Cubit<SearchState> {
  private debounceTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    super({
      query: '',
      isSearching: false,
      results: [],
      searchCount: 0,
    });
  }

  // Update query with debouncing
  setQuery = (query: string) => {
    this.patch({ query });

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    if (query.trim()) {
      // Debounce: wait 500ms before searching
      this.debounceTimer = setTimeout(() => {
        this.performSearch(query);
      }, 500);
    } else {
      this.patch({ results: [], isSearching: false });
    }
  };

  private performSearch = async (query: string) => {
    this.abortController = new AbortController();
    this.patch({ isSearching: true });

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        this.abortController!.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });

      // Mock search results
      const mockResults = [
        `${query} - Result 1`,
        `${query} - Result 2`,
        `${query} - Result 3`,
        `Best ${query}`,
        `Top ${query} items`,
      ];

      this.patch({
        results: mockResults,
        isSearching: false,
        searchCount: this.state.searchCount + 1,
      });
    } catch (error: any) {
      if (error.message !== 'Aborted') {
        this.patch({ isSearching: false });
      }
    }
  };

  onDispose = () => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.abortController) {
      this.abortController.abort();
    }
  };
}

function DebouncedSearchDemo() {
  const [state, cubit] = useBloc(DebouncedSearchCubit);

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Debounced Search
        </h4>
        <span className="text-xs text-blue-600 dark:text-blue-300">
          Searches: {state.searchCount}
        </span>
      </div>

      <input
        type="text"
        value={state.query}
        onChange={(e) => cubit.setQuery(e.target.value)}
        placeholder="Type to search... (waits 500ms)"
        className="w-full px-3 py-2 rounded-md border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-foreground mb-3"
      />

      {state.isSearching && (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300 text-sm mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      )}

      {state.results.length > 0 && (
        <div className="space-y-1">
          {state.results.map((result, i) => (
            <div
              key={i}
              className="px-3 py-2 rounded bg-white dark:bg-slate-800 text-sm text-foreground"
            >
              {result}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
        💡 Type quickly - only searches after you stop typing for 500ms
      </p>
    </div>
  );
}

// ============================================================================
// Race Condition Demo
// ============================================================================

interface RaceState {
  currentRequest: number;
  completedRequests: number;
  displayedResult: string | null;
  isLoading: boolean;
}

class RaceConditionCubit extends Cubit<RaceState> {
  private requestId = 0;

  constructor() {
    super({
      currentRequest: 0,
      completedRequests: 0,
      displayedResult: null,
      isLoading: false,
    });
  }

  // Start a slow request
  fetchSlow = async () => {
    const thisRequestId = ++this.requestId;
    this.patch({ currentRequest: thisRequestId, isLoading: true });

    // Simulate slow API (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Only update if this is still the latest request
    if (thisRequestId === this.requestId) {
      this.patch({
        displayedResult: `Slow Request #${thisRequestId} (2s delay)`,
        completedRequests: this.state.completedRequests + 1,
        isLoading: false,
      });
    }
  };

  // Start a fast request
  fetchFast = async () => {
    const thisRequestId = ++this.requestId;
    this.patch({ currentRequest: thisRequestId, isLoading: true });

    // Simulate fast API (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Only update if this is still the latest request
    if (thisRequestId === this.requestId) {
      this.patch({
        displayedResult: `Fast Request #${thisRequestId} (500ms delay)`,
        completedRequests: this.state.completedRequests + 1,
        isLoading: false,
      });
    }
  };

  reset = () => {
    this.requestId = 0;
    this.emit({
      currentRequest: 0,
      completedRequests: 0,
      displayedResult: null,
      isLoading: false,
    });
  };
}

function RaceConditionDemo() {
  const [state, cubit] = useBloc(RaceConditionCubit);

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Race Condition Handling
        </h4>
        <span className="text-xs text-purple-600 dark:text-purple-300">
          Request #{state.currentRequest}
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={cubit.fetchSlow}
          disabled={state.isLoading}
          className="flex-1 px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-md transition-colors"
        >
          Slow Request (2s)
        </button>
        <button
          onClick={cubit.fetchFast}
          disabled={state.isLoading}
          className="flex-1 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-md transition-colors"
        >
          Fast Request (500ms)
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-2 text-sm bg-slate-500 hover:bg-slate-600 text-white rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      {state.isLoading && (
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 text-sm mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading request #{state.currentRequest}...
        </div>
      )}

      {state.displayedResult && (
        <div className="px-3 py-2 rounded bg-white dark:bg-slate-800 text-sm text-foreground mb-3">
          ✓ {state.displayedResult}
        </div>
      )}

      <p className="text-xs text-purple-600 dark:text-purple-400">
        💡 Click "Slow" then quickly click "Fast" - only the latest request
        updates state
      </p>
    </div>
  );
}

// ============================================================================
// Retry with Backoff Demo
// ============================================================================

interface RetryState {
  status: 'idle' | 'loading' | 'success' | 'error';
  attempts: number;
  maxAttempts: number;
  message: string | null;
  nextRetryIn: number | null;
}

class RetryBackoffCubit extends Cubit<RetryState> {
  private retryTimer: NodeJS.Timeout | null = null;
  private shouldFail = true; // Simulate failures for first few attempts

  constructor() {
    super({
      status: 'idle',
      attempts: 0,
      maxAttempts: 4,
      message: null,
      nextRetryIn: null,
    });
  }

  fetchWithRetry = async () => {
    this.shouldFail = true; // Reset failure simulation
    this.emit({
      status: 'loading',
      attempts: 0,
      maxAttempts: 4,
      message: null,
      nextRetryIn: null,
    });

    await this.attemptFetch();
  };

  private attemptFetch = async () => {
    const attempt = this.state.attempts + 1;
    this.patch({ attempts: attempt });

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Fail first 2 attempts, succeed on 3rd
          if (this.shouldFail && attempt < 3) {
            reject(new Error('Network error'));
          } else {
            resolve('Success!');
          }
        }, 800);
      });

      // Success!
      this.patch({
        status: 'success',
        message: `Success after ${attempt} attempt${attempt > 1 ? 's' : ''}!`,
        nextRetryIn: null,
      });
    } catch (error) {
      // Failed - should we retry?
      if (attempt < this.state.maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const backoffDelay = Math.pow(2, attempt - 1) * 1000;

        this.patch({
          status: 'error',
          message: `Attempt ${attempt} failed. Retrying in ${backoffDelay / 1000}s...`,
          nextRetryIn: backoffDelay,
        });

        // Schedule retry
        this.retryTimer = setTimeout(() => {
          this.attemptFetch();
        }, backoffDelay);
      } else {
        // Max attempts reached
        this.patch({
          status: 'error',
          message: `Failed after ${attempt} attempts. Max retries reached.`,
          nextRetryIn: null,
        });
      }
    }
  };

  reset = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.emit({
      status: 'idle',
      attempts: 0,
      maxAttempts: 4,
      message: null,
      nextRetryIn: null,
    });
  };

  onDispose = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  };
}

function RetryBackoffDemo() {
  const [state, cubit] = useBloc(RetryBackoffCubit);

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-2 border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry with Exponential Backoff
        </h4>
        <span className="text-xs text-amber-600 dark:text-amber-300">
          Attempt {state.attempts}/{state.maxAttempts}
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={cubit.fetchWithRetry}
          disabled={state.status === 'loading'}
          className="flex-1 px-3 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-md transition-colors"
        >
          Fetch with Auto-Retry
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-2 text-sm bg-slate-500 hover:bg-slate-600 text-white rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      {state.message && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded text-sm mb-3 ${
            state.status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : state.status === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
          }`}
        >
          {state.status === 'success' ? (
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : state.status === 'error' ? (
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <p className="text-xs text-amber-600 dark:text-amber-400">
        💡 Simulates failures for first 2 attempts. Backoff: 1s → 2s → 4s → 8s
      </p>
    </div>
  );
}

// ============================================================================
// Parallel vs Sequential Demo
// ============================================================================

interface ParallelState {
  mode: 'idle' | 'parallel' | 'sequential';
  results: string[];
  startTime: number | null;
  endTime: number | null;
  isLoading: boolean;
}

class ParallelSequentialCubit extends Cubit<ParallelState> {
  constructor() {
    super({
      mode: 'idle',
      results: [],
      startTime: null,
      endTime: null,
      isLoading: false,
    });
  }

  // Simulate API call
  private fetchItem = async (id: number, delay: number): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return `Item ${id} (${delay}ms)`;
  };

  fetchParallel = async () => {
    this.emit({
      mode: 'parallel',
      results: [],
      startTime: Date.now(),
      endTime: null,
      isLoading: true,
    });

    // Execute all requests in parallel
    const results = await Promise.all([
      this.fetchItem(1, 800),
      this.fetchItem(2, 600),
      this.fetchItem(3, 1000),
    ]);

    this.patch({
      results,
      endTime: Date.now(),
      isLoading: false,
    });
  };

  fetchSequential = async () => {
    this.emit({
      mode: 'sequential',
      results: [],
      startTime: Date.now(),
      endTime: null,
      isLoading: true,
    });

    // Execute requests one after another
    const result1 = await this.fetchItem(1, 800);
    this.patch({ results: [result1] });

    const result2 = await this.fetchItem(2, 600);
    this.patch({ results: [result1, result2] });

    const result3 = await this.fetchItem(3, 1000);
    this.patch({
      results: [result1, result2, result3],
      endTime: Date.now(),
      isLoading: false,
    });
  };

  reset = () => {
    this.emit({
      mode: 'idle',
      results: [],
      startTime: null,
      endTime: null,
      isLoading: false,
    });
  };
}

function ParallelSequentialDemo() {
  const [state, cubit] = useBloc(ParallelSequentialCubit);

  const duration =
    state.startTime && state.endTime
      ? ((state.endTime - state.startTime) / 1000).toFixed(2)
      : null;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Parallel vs Sequential
        </h4>
        {duration && (
          <span className="text-xs text-green-600 dark:text-green-300">
            Completed in {duration}s
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={cubit.fetchParallel}
          disabled={state.isLoading}
          className="flex-1 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-md transition-colors"
        >
          Parallel (~1s total)
        </button>
        <button
          onClick={cubit.fetchSequential}
          disabled={state.isLoading}
          className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md transition-colors"
        >
          Sequential (~2.4s total)
        </button>
        <button
          onClick={cubit.reset}
          className="px-3 py-2 text-sm bg-slate-500 hover:bg-slate-600 text-white rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      {state.isLoading && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-300 text-sm mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Fetching {state.mode}...
        </div>
      )}

      {state.results.length > 0 && (
        <div className="space-y-1 mb-3">
          {state.results.map((result, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="px-3 py-2 rounded bg-white dark:bg-slate-800 text-sm text-foreground"
            >
              {result}
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-xs text-green-600 dark:text-green-400">
        💡 Parallel executes all requests simultaneously. Sequential waits for
        each to finish.
      </p>
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function AsyncOperationsInteractive() {
  return (
    <div className="my-8 space-y-4 not-prose">
      <DebouncedSearchDemo />
      <RaceConditionDemo />
      <RetryBackoffDemo />
      <ParallelSequentialDemo />

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Async Operation Patterns
          </p>
          <p className="text-sm text-muted-foreground">
            These four patterns cover the most common async challenges:
            preventing excessive API calls (debouncing), ensuring correct
            ordering (race condition handling), graceful failure recovery (retry
            with backoff), and optimizing performance (parallel vs sequential
            execution).
          </p>
        </div>
      </div>
    </div>
  );
}
