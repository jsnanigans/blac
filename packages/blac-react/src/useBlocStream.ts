import { BlocBase, BlocConstructor, BlocState } from '@blac/core';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import useBloc from './useBloc';

/**
 * Hook state for managing async generator iteration
 */
interface StreamState<T> {
  value: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Options for useBlocStream hook
 */
interface UseBlocStreamOptions<B extends BlocConstructor<BlocBase<any>>> {
  // All options from useBloc
  staticProps?: ConstructorParameters<B>[0];
  instanceId?: string;
  dependencies?: (bloc: InstanceType<B>) => unknown[];
  onMount?: (bloc: InstanceType<B>) => void;
  onUnmount?: (bloc: InstanceType<B>) => void;
  // New stream-specific options
  streamMode?: 'state' | 'stateChanges' | 'disabled';
}

/**
 * Return type for useBlocStream hook
 */
interface BlocStreamResult<B extends BlocConstructor<BlocBase<any>>> {
  // Traditional state access (compatible with useBloc)
  state: BlocState<InstanceType<B>>;
  bloc: InstanceType<B>;
  // Generator-based stream access
  stream: AsyncIterable<BlocState<InstanceType<B>>>;
  stateChanges: AsyncIterable<{ 
    previous: BlocState<InstanceType<B>>; 
    current: BlocState<InstanceType<B>> 
  }>;
  // Utility functions
  takeNext: () => Promise<BlocState<InstanceType<B>>>;
  // Stream control
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
}

/**
 * Enhanced React hook that provides both traditional state access and generator-based streams
 * Fully backward compatible with useBloc while adding streaming capabilities
 * 
 * @example
 * ```typescript
 * // Traditional usage (backward compatible)
 * const { state, bloc } = useBlocStream(CounterBloc);
 * 
 * // Stream usage in effect
 * useEffect(() => {
 *   (async () => {
 *     for await (const state of bloc.stateStream()) {
 *       console.log('State changed:', state);
 *     }
 *   })();
 * }, [bloc]);
 * 
 * // Or use the provided stream
 * const { stream } = useBlocStream(CounterBloc);
 * useEffect(() => {
 *   (async () => {
 *     for await (const state of stream) {
 *       console.log('State:', state);
 *     }
 *   })();
 * }, [stream]);
 * ```
 */
function useBlocStream<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: UseBlocStreamOptions<B>,
): BlocStreamResult<B> {
  // Use the existing useBloc hook for core functionality
  const [state, bloc] = useBloc(blocConstructor, options);
  
  // Stream management state
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Create lazy stream iterables
  const stream = useMemo(
    () => ({
      [Symbol.asyncIterator]: () => {
        const iterator = bloc.stateStream();
        return {
          next: () => iterator.next(),
          return: async () => {
            await iterator.return?.();
            return { done: true as const, value: undefined };
          },
          throw: async (error?: any) => {
            await iterator.throw?.(error);
            return { done: true as const, value: undefined };
          },
        };
      },
    }),
    [bloc],
  );
  
  const stateChanges = useMemo(
    () => ({
      [Symbol.asyncIterator]: () => {
        const iterator = bloc.stateChanges();
        return {
          next: () => iterator.next(),
          return: async () => {
            await iterator.return?.();
            return { done: true as const, value: undefined };
          },
          throw: async (error?: any) => {
            await iterator.throw?.(error);
            return { done: true as const, value: undefined };
          },
        };
      },
    }),
    [bloc],
  );
  
  // Utility function to get next state
  const takeNext = useCallback(async (): Promise<BlocState<InstanceType<B>>> => {
    const iterator = bloc.stateStream();
    const { value } = await iterator.next();
    await iterator.return?.();
    return value;
  }, [bloc]);
  
  // Stream control functions
  const startStream = useCallback(() => {
    if (isStreaming) return;
    
    // Don't start if explicitly disabled (unless manually called)
    if (options?.streamMode === 'disabled' && !abortControllerRef.current) {
      // Manual call when disabled - allow it
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    
    // Start streaming (default to state stream if no mode specified)
    const streamMode = options?.streamMode === 'stateChanges' ? 'stateChanges' : 'state';
    
    (async () => {
      try {
        const iterator = streamMode === 'stateChanges' 
          ? bloc.stateChanges()
          : bloc.stateStream();
          
        while (!controller.signal.aborted) {
          const { done } = await iterator.next();
          if (done) break;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Stream error:', error);
        }
      } finally {
        setIsStreaming(false);
      }
    })();
  }, [bloc, isStreaming, options?.streamMode]);
  
  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);
  
  // Auto-start stream if mode is specified
  useEffect(() => {
    if (options?.streamMode && options.streamMode !== 'disabled') {
      startStream();
    }
    
    return () => {
      stopStream();
    };
  }, [options?.streamMode]);
  
  return {
    state,
    bloc,
    stream,
    stateChanges,
    takeNext,
    isStreaming,
    startStream,
    stopStream,
  };
}

export default useBlocStream;