import { BlocBase, BlocConstructor, BlocState, Blac } from '@blac/core';
import { useRef, useMemo, useEffect, MutableRefObject } from 'react';
import { generateUUID } from '@blac/core';

export type BlocBaseInstance = BlocBase<any>;

type ExternalBlocStoreOptions<T extends BlocBase<any>> = {
  id?: string;
  selector?: (
    currentState: BlocState<T>,
    previousState: BlocState<T> | undefined,
    instance: T
  ) => unknown[];
};

type ExternalBlocStore<T extends BlocBase<any>> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => BlocState<T> | undefined;
  getServerSnapshot?: () => BlocState<T> | undefined;
};

type UseExternalBlocStoreResult<T extends BlocBase<any>> = {
  externalStore: ExternalBlocStore<T>;
  instance: MutableRefObject<T | null>;
};

/**
 * React hook for subscribing to an external Bloc instance - v3 generator-based
 * Useful when you need to observe a Bloc instance that was created outside of React
 */
export function useExternalBlocStore<
  B extends BlocConstructor<BlocBase<any>>,
  T extends InstanceType<B> = InstanceType<B>,
  S = BlocState<T>
>(
  blocConstructor: B,
  options?: ExternalBlocStoreOptions<T>
): UseExternalBlocStoreResult<T> {
  const ridRef = useRef(`external-consumer-${generateUUID()}`);
  
  // Get or create the bloc instance
  const instance = useMemo(() => {
    const Constructor = blocConstructor as any;
    const isIsolated = Constructor.isolated === true;
    
    if (isIsolated) {
      // Always create new instance for isolated blocs
      const newInstance = new Constructor() as T;
      // Use a unique ID for isolated instances
      const uniqueId = options?.id || `${Constructor.name}-${generateUUID()}`;
      newInstance._updateId(uniqueId);
      return newInstance;
    } else {
      // Use shared instance
      const sharedInstance = Blac.getBloc(Constructor, { id: options?.id }) as T;
      return sharedInstance;
    }
  }, [blocConstructor, options?.id]);
  
  const instanceRef = useRef<T | null>(instance);
  instanceRef.current = instance;

  // Track state and subscription
  const listenersRef = useRef<Set<() => void>>(new Set());
  const streamActiveRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSeenStateRef = useRef<S>(instance.state);
  const versionRef = useRef(0);

  // Function to start the stream subscription
  const startStream = () => {
    if (streamActiveRef.current || !instanceRef.current) return;
    streamActiveRef.current = true;
    abortControllerRef.current = new AbortController();
    
    (async () => {
      try {
        const currentInstance = instanceRef.current;
        if (!currentInstance || typeof currentInstance.stateStream !== 'function') return;
        
        let previousState = currentInstance.state as S;
        let isFirst = true;
        
        for await (const newState of currentInstance.stateStream()) {
          if (abortControllerRef.current?.signal.aborted) break;
          
          // Skip the first state (initial state)
          if (isFirst) {
            isFirst = false;
            continue;
          }
          
          // Check selector if provided
          if (options?.selector) {
            const prevDeps = options.selector(previousState, undefined, currentInstance);
            const currDeps = options.selector(newState as S, previousState, currentInstance);
            
            const depsChanged = prevDeps.length !== currDeps.length || 
              prevDeps.some((dep, i) => !Object.is(dep, currDeps[i]));
            if (!depsChanged) {
              previousState = newState as S;
              continue;
            }
          }
          
          previousState = newState as S;
          
          // Notify all listeners synchronously
          listenersRef.current.forEach(listener => {
            try {
              listener();
            } catch (error) {
              console.error('Listener error in useExternalBlocStore:', error);
            }
          });
        }
      } catch (error) {
        if (!abortControllerRef.current?.signal.aborted) {
          console.error('External bloc stream error:', error);
        }
      } finally {
        streamActiveRef.current = false;
      }
    })();
  };

  // Function to stop the stream
  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamActiveRef.current = false;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // Create the external store
  const externalStore = useMemo<ExternalBlocStore<T>>(() => {
    return {
      subscribe: (listener: () => void) => {
        listenersRef.current.add(listener);
        
        // Call selector immediately if provided
        if (options?.selector && instanceRef.current) {
          const state = instanceRef.current.state as S;
          options.selector(state, undefined, instanceRef.current);
        }
        
        // Start the stream if this is the first listener
        if (listenersRef.current.size === 1) {
          startStream();
        }
        
        // Create a wrapper listener that checks for immediate state changes
        const wrappedListener = () => {
          const currentInstance = instanceRef.current;
          if (!currentInstance) return;
          
          const currentState = currentInstance.state;
          if (!Object.is(lastSeenStateRef.current, currentState)) {
            const prevState = lastSeenStateRef.current;
            lastSeenStateRef.current = currentState;
            versionRef.current++;
            
            // Check selector if provided
            if (options?.selector) {
              const prevDeps = options.selector(prevState, undefined, currentInstance);
              const currDeps = options.selector(currentState, prevState, currentInstance);
              
              const depsChanged = prevDeps.length !== currDeps.length || 
                prevDeps.some((dep, i) => !Object.is(dep, currDeps[i]));
              if (!depsChanged) return;
            }
            
            // Notify original listener
            try {
              listener();
            } catch (error) {
              console.error('Listener error in useExternalBlocStore:', error);
            }
          }
        };
        
        // Override the bloc's emit method to call our listener immediately
        const originalEmit = instanceRef.current.emit;
        instanceRef.current.emit = function(newState: any) {
          originalEmit.call(this, newState);
          // Call wrapped listener immediately after emit
          wrappedListener();
        };
        
        return () => {
          // Restore original emit if this is the last listener
          if (listenersRef.current.size === 1 && instanceRef.current) {
            instanceRef.current.emit = originalEmit;
          }
          
          listenersRef.current.delete(listener);
          
          // Stop the stream if no more listeners
          if (listenersRef.current.size === 0) {
            stopStream();
          }
        };
      },
      getSnapshot: () => {
        const currentInstance = instanceRef.current;
        if (!currentInstance) return undefined;
        // Always return the current state from the instance
        return currentInstance.state;
      },
      getServerSnapshot: () => {
        const currentInstance = instanceRef.current;
        return currentInstance ? currentInstance.state : undefined;
      },
    };
  }, [options?.selector]);

  return {
    externalStore,
    instance: instanceRef,
  };
}

