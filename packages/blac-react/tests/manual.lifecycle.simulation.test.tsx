import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac, Cubit, generateUUID } from '@blac/core';

// Test bloc
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

// Detailed logger
class LifecycleLogger {
  private logs: string[] = [];
  private startTime = Date.now();

  log(message: string) {
    const timestamp = Date.now() - this.startTime;
    const logEntry = `[${timestamp}ms] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.startTime = Date.now();
  }
}

// Manual external store simulation (bypassing React hooks)
function createManualExternalStore() {
  const logger = new LifecycleLogger();
  
  // Create bloc instance directly
  const bloc = Blac.getBloc(CounterCubit);
  const rid = generateUUID();
  
  // Track observers manually
  const activeObservers = new Map<Function, { observer: any, unsubscribe: () => void }>();
  
  // Simulate the external store's subscribe method
  const subscribe = (listener: (state: any) => void) => {
    logger.log(`SUBSCRIBE: Called with listener function`);
    logger.log(`  - Bloc observers before: ${bloc._observer.size}`);
    logger.log(`  - Bloc consumers before: ${bloc._consumers.size}`);
    logger.log(`  - Bloc disposed: ${bloc.isDisposed}`);
    logger.log(`  - Bloc disposal state: ${(bloc as any)._disposalState}`);
    
    // Handle disposed blocs
    if (bloc.isDisposed) {
      logger.log(`  - Bloc is disposed, attempting fresh instance...`);
      const freshBloc = Blac.getBloc(CounterCubit);
      logger.log(`  - Fresh bloc created: ${!freshBloc.isDisposed}`);
      return () => logger.log(`  - No-op unsubscribe (disposed bloc)`);
    }
    
    // Check if we already have an observer for this listener
    const existing = activeObservers.get(listener);
    if (existing) {
      logger.log(`  - Reusing existing observer`);
      return existing.unsubscribe;
    }
    
    // Create observer
    const observer = {
      fn: () => {
        logger.log(`  - Observer notification triggered`);
        listener(bloc.state);
      },
      dependencyArray: () => [[bloc.state], []],
      id: rid,
    };
    
    // Activate bloc (this is where the error occurs)
    logger.log(`  - Calling Blac.activateBloc...`);
    try {
      Blac.activateBloc(bloc);
      logger.log(`  - activateBloc succeeded`);
    } catch (error) {
      logger.log(`  - activateBloc failed: ${error}`);
    }
    
    // Subscribe to bloc's observer
    logger.log(`  - Subscribing to bloc._observer...`);
    const unSub = bloc._observer.subscribe(observer);
    
    logger.log(`  - Subscription complete`);
    logger.log(`  - Bloc observers after: ${bloc._observer.size}`);
    logger.log(`  - Bloc consumers after: ${bloc._consumers.size}`);
    logger.log(`  - Bloc disposed after: ${bloc.isDisposed}`);
    
    // Create unsubscribe function
    const unsubscribe = () => {
      logger.log(`UNSUBSCRIBE: Called`);
      logger.log(`  - Bloc observers before: ${bloc._observer.size}`);
      logger.log(`  - Bloc consumers before: ${bloc._consumers.size}`);
      logger.log(`  - Bloc disposed before: ${bloc.isDisposed}`);
      
      activeObservers.delete(listener);
      unSub();
      
      logger.log(`  - Bloc observers after: ${bloc._observer.size}`);
      logger.log(`  - Bloc consumers after: ${bloc._consumers.size}`);
      logger.log(`  - Bloc disposed after: ${bloc.isDisposed}`);
    };
    
    // Store observer
    activeObservers.set(listener, { observer, unsubscribe });
    
    return unsubscribe;
  };
  
  // Simulate getSnapshot
  const getSnapshot = () => {
    logger.log(`GET_SNAPSHOT: Called`);
    logger.log(`  - Bloc disposed: ${bloc.isDisposed}`);
    const state = bloc.state;
    logger.log(`  - Returning state: ${JSON.stringify(state)}`);
    return state;
  };
  
  return {
    logger,
    subscribe,
    getSnapshot,
    bloc,
    // Helper to create different listener functions
    createListener: (id: string) => (state: any) => {
      logger.log(`LISTENER_${id}: Received state ${JSON.stringify(state)}`);
    }
  };
}

describe('Manual React Lifecycle Simulation', () => {
  beforeEach(() => {
    // Enable detailed logging
    Blac.enableLog = true;
    Blac.logLevel = 'log';
    Blac.instance.resetInstance();
  });

  afterEach(() => {
    Blac.enableLog = false;
    Blac.instance.resetInstance();
  });

  it('should simulate normal React component lifecycle', async () => {
    const { logger, subscribe, getSnapshot, bloc } = createManualExternalStore();
    
    logger.log('=== STARTING NORMAL REACT LIFECYCLE ===');
    
    // Step 1: Component mounts
    logger.log('1. Component mounting...');
    const listener1 = (state: any) => {
      logger.log(`LISTENER_1: Received state ${JSON.stringify(state)}`);
    };
    
    // Step 2: useSyncExternalStore calls subscribe
    logger.log('2. useSyncExternalStore calling subscribe...');
    const unsubscribe1 = subscribe(listener1);
    
    // Step 3: Component renders, gets initial state
    logger.log('3. Component getting initial snapshot...');
    const initialState = getSnapshot();
    
    // Step 4: State change occurs
    logger.log('4. Triggering state change...');
    bloc.increment();
    
    // Step 5: Component unmounts
    logger.log('5. Component unmounting...');
    unsubscribe1();
    
    // Step 6: Wait for deferred disposal to complete
    logger.log('6. Waiting for deferred disposal...');
    await new Promise(resolve => queueMicrotask(resolve));
    
    logger.log('=== NORMAL LIFECYCLE COMPLETE ===');
    console.log('\n--- NORMAL LIFECYCLE LOGS ---');
    logger.getLogs().forEach(log => console.log(log));
    
    // Assertions - disposal is now deferred
    expect(bloc._observer.size).toBe(0);
    expect(bloc.isDisposed).toBe(true);
  });

  it('should simulate React Strict Mode double lifecycle', () => {
    const { logger, subscribe, getSnapshot, bloc } = createManualExternalStore();
    
    logger.log('=== STARTING REACT STRICT MODE LIFECYCLE ===');
    
    // === FIRST RENDER (Strict Mode) ===
    logger.log('=== FIRST RENDER (will be unmounted immediately) ===');
    logger.log('1a. First component mounting...');
    
    // React creates a new listener function for each render
    const listener1 = (state: any) => {
      logger.log(`LISTENER_1: Received state ${JSON.stringify(state)}`);
    };
    
    logger.log('2a. First useSyncExternalStore calling subscribe...');
    const unsubscribe1 = subscribe(listener1);
    
    logger.log('3a. First component getting snapshot...');
    const firstState = getSnapshot();
    
    // === IMMEDIATE UNMOUNT (Strict Mode cleanup) ===
    logger.log('=== IMMEDIATE UNMOUNT (Strict Mode cleanup) ===');
    logger.log('4a. First component unmounting immediately...');
    
    unsubscribe1();
    
    // === SECOND RENDER (Strict Mode remount) ===
    logger.log('=== SECOND RENDER (Strict Mode remount) ===');
    logger.log('1b. Second component mounting...');
    
    // React creates a DIFFERENT listener function for the second render
    const listener2 = (state: any) => {
      logger.log(`LISTENER_2: Received state ${JSON.stringify(state)}`);
    };
    
    logger.log('2b. Second useSyncExternalStore calling subscribe...');
    
    let unsubscribe2: (() => void) | undefined;
    try {
      unsubscribe2 = subscribe(listener2);
      logger.log('    - Second subscribe succeeded');
    } catch (error) {
      logger.log(`    - Second subscribe failed: ${error}`);
    }
    
    if (unsubscribe2) {
      logger.log('3b. Second component getting snapshot...');
      try {
        const secondState = getSnapshot();
        logger.log(`    - Second state: ${JSON.stringify(secondState)}`);
      } catch (error) {
        logger.log(`    - Getting snapshot failed: ${error}`);
      }
      
      // Test state change
      logger.log('4b. Testing state change after remount...');
      try {
        bloc.increment();
        logger.log('    - State change succeeded');
      } catch (error) {
        logger.log(`    - State change failed: ${error}`);
      }
      
      // Final cleanup
      logger.log('5b. Final cleanup...');
      unsubscribe2();
    }
    
    logger.log('=== STRICT MODE LIFECYCLE COMPLETE ===');
    console.log('\n--- STRICT MODE LIFECYCLE LOGS ---');
    logger.getLogs().forEach(log => console.log(log));
    
    // The critical assertion: did the second subscription work?
    expect(unsubscribe2).toBeDefined();
    
    // Most importantly: the same bloc instance should be reused (not disposed)
    expect(bloc.isDisposed).toBe(false);  // Still active due to cancelled disposal!
  });

  it('should test the exact timing issue', () => {
    const { logger, subscribe, getSnapshot, bloc } = createManualExternalStore();
    
    logger.log('=== TESTING EXACT TIMING ISSUE ===');
    
    // First subscription
    const listener1 = () => logger.log('LISTENER_1 called');
    const unsubscribe1 = subscribe(listener1);
    
    // Immediate unsubscribe (React Strict Mode pattern)
    unsubscribe1();
    
    // Immediate resubscribe (React Strict Mode remount)
    const listener2 = () => logger.log('LISTENER_2 called');
    
    // This is where the race condition occurs
    logger.log('Attempting immediate resubscribe...');
    try {
      const unsubscribe2 = subscribe(listener2);
      logger.log('Resubscribe success');
      
      // Test functionality
      const state = getSnapshot();
      logger.log(`State access: ${JSON.stringify(state)}`);
      
      bloc.increment();
      logger.log('State change attempted');
      
      unsubscribe2();
    } catch (error) {
      logger.log(`Resubscribe failed: ${error}`);
    }
    
    console.log('\n--- TIMING TEST LOGS ---');
    logger.getLogs().forEach(log => console.log(log));
    
    // The key test: bloc should NOT be disposed due to cancelled disposal
    expect(bloc.isDisposed).toBe(false);  // Disposal was cancelled by immediate resubscribe!
  });
});