import { Bloc, BlocConstructor } from '@blac/core';
import { useEffect, useCallback, useRef } from 'react';
import useBloc from './useBloc';

/**
 * Options for useBlocEvents hook
 */
interface UseBlocEventsOptions<E> {
  // Event filtering
  eventType?: new (...args: any[]) => E;
  // Callback for each event
  onEvent?: (event: E) => void | Promise<void>;
  // Whether to start listening immediately
  autoStart?: boolean;
  // All options from useBloc
  staticProps?: any;
  instanceId?: string;
  dependencies?: (bloc: any) => unknown[];
  onMount?: (bloc: any) => void;
  onUnmount?: (bloc: any) => void;
}

/**
 * Hook for subscribing to Bloc events using async generators
 * 
 * @example
 * ```typescript
 * // Listen to all events
 * useBlocEvents(CounterBloc, {
 *   onEvent: (event) => console.log('Event:', event)
 * });
 * 
 * // Listen to specific event type
 * useBlocEvents(CounterBloc, {
 *   eventType: IncrementEvent,
 *   onEvent: (event) => console.log('Increment!', event)
 * });
 * 
 * // Manual control
 * const { startListening, stopListening } = useBlocEvents(CounterBloc, {
 *   autoStart: false
 * });
 * ```
 */
function useBlocEvents<
  B extends BlocConstructor<Bloc<any, any>>,
  E extends InstanceType<B> extends Bloc<any, infer A> ? A : never
>(
  blocConstructor: B,
  options?: UseBlocEventsOptions<E>,
) {
  const [, bloc] = useBloc(blocConstructor, options);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isListeningRef = useRef(false);
  
  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isListeningRef.current = true;
    
    (async () => {
      try {
        const iterator = options?.eventType
          ? bloc.eventsOfType(options.eventType)
          : bloc.events();
          
        for await (const event of iterator) {
          if (controller.signal.aborted) break;
          
          try {
            await options?.onEvent?.(event);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Event stream error:', error);
        }
      } finally {
        isListeningRef.current = false;
      }
    })();
  }, [bloc, options?.eventType, options?.onEvent]);
  
  const stopListening = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isListeningRef.current = false;
  }, []);
  
  // Auto-start if requested (default true)
  useEffect(() => {
    if (options?.autoStart !== false && options?.onEvent) {
      startListening();
    }
    
    return () => {
      stopListening();
    };
  }, [options?.autoStart, options?.onEvent, startListening, stopListening]);
  
  return {
    bloc,
    startListening,
    stopListening,
    isListening: isListeningRef.current,
  };
}

export default useBlocEvents;