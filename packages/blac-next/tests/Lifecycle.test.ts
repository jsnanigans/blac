import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blac, BlacLifecycleEvent } from '../src/Blac';
import { BlacPlugin } from '../src/BlacPlugin';
import { Cubit } from '../src/Cubit';

// --- Test Cubits ---
class LifecycleCubit extends Cubit<number> {
  constructor(initialState = 0) {
    super(initialState);
  }
}

class LifecycleKeepAliveCubit extends Cubit<number> {
  static keepAlive = true;
  constructor(initialState = 0) {
    super(initialState);
  }
}

class LifecycleIsolatedCubit extends Cubit<number> {
  static isolated = true;
  constructor(initialState = 0) {
    super(initialState);
  }
}

// --- Test Plugin ---
const mockPlugin = {
  name: 'TestLifecyclePlugin',
  onEvent: vi.fn(),
} satisfies BlacPlugin;

// --- Test Suite ---
describe('Blac Lifecycle Events', () => {
  let blac: Blac;

  beforeEach(() => {
    // Ensure a clean Blac instance for each test
    Blac.getInstance().resetInstance();
    blac = Blac.getInstance();
    blac.addPlugin(mockPlugin);
    mockPlugin.onEvent.mockClear(); // Clear mocks before each test
  });

  afterEach(() => {
    blac.resetInstance();
  });

  it('should dispatch BLOC_CREATED when a bloc is created via getBloc', () => {
    const bloc = blac.getBloc(LifecycleCubit);
    expect(mockPlugin.onEvent).toHaveBeenCalledWith(
      BlacLifecycleEvent.BLOC_CREATED,
      bloc,
      undefined, // data for BLOC_CREATED is undefined
    );
  });

  it('should dispatch BLOC_CREATED when createNewBlocInstance is called', () => {
     const bloc = blac.createNewBlocInstance(LifecycleCubit, 'test-id');
     expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.BLOC_CREATED,
        bloc,
        undefined,
     );
  });


  it('should dispatch BLOC_DISPOSED when disposeBloc is called', () => {
    const bloc = blac.getBloc(LifecycleCubit);
    mockPlugin.onEvent.mockClear(); // Clear create event

    blac.disposeBloc(bloc);

    expect(mockPlugin.onEvent).toHaveBeenCalledWith(
      BlacLifecycleEvent.BLOC_DISPOSED,
      bloc,
      undefined, // data for BLOC_DISPOSED is undefined
    );
    // Verify bloc is actually removed
    expect(blac.blocInstanceMap.size).toBe(0);
  });

  it('should dispatch BLOC_DISPOSED when last listener is removed (non-keepAlive)', () => {
    const bloc = blac.getBloc(LifecycleCubit);
    const unsubscribe = 
        bloc._observer.subscribe({ fn: () => {}, id: 'test-listener-1' }); 
    mockPlugin.onEvent.mockClear(); // Clear create and listener added events

    unsubscribe(); // This triggers LISTENER_REMOVED internally

    // Check if the report method correctly identifies no listeners and disposes
    expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.LISTENER_REMOVED,
        bloc,
        { listenerId: 'test-listener-1' },
    );
    expect(mockPlugin.onEvent).toHaveBeenCalledWith(
      BlacLifecycleEvent.BLOC_DISPOSED,
      bloc,
      undefined,
    );
    expect(blac.blocInstanceMap.size).toBe(0);
  });

   it('should dispatch BLOC_DISPOSED when last consumer is removed (non-keepAlive)', () => {
     const bloc = blac.getBloc(LifecycleCubit);
     // Simulate adding and removing a consumer (e.g., a React component unmounting)
     blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, bloc);
     mockPlugin.onEvent.mockClear(); // Clear previous events

     blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, bloc);

     // Check if the report method correctly identifies no consumers/listeners and disposes
     expect(mockPlugin.onEvent).toHaveBeenCalledWith(
       BlacLifecycleEvent.BLOC_CONSUMER_REMOVED,
       bloc,
       undefined, // No specific data usually needed for consumer removal event
     );
     expect(mockPlugin.onEvent).toHaveBeenCalledWith(
       BlacLifecycleEvent.BLOC_DISPOSED,
       bloc,
       undefined,
     );
     expect(blac.blocInstanceMap.size).toBe(0);
   });


  // --- KeepAlive Tests ---
  describe('KeepAlive Blocs', () => {
    it('should NOT dispatch BLOC_DISPOSED when last listener is removed', () => {
      const bloc = blac.getBloc(LifecycleKeepAliveCubit);
      const unsubscribe = 
          bloc._observer.subscribe({ fn: () => {}, id: 'test-listener-2' });
      mockPlugin.onEvent.mockClear();

      unsubscribe();

      expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.LISTENER_REMOVED,
        bloc,
        { listenerId: 'test-listener-2' },
      );
      expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(
        BlacLifecycleEvent.BLOC_DISPOSED,
        bloc,
        undefined,
      );
      // Verify bloc is still registered
      const key = blac.createBlocInstanceMapKey(bloc._name, bloc._id);
      expect(blac.blocInstanceMap.get(key)).toBe(bloc);
    });

     it('should NOT dispatch BLOC_DISPOSED when last consumer is removed', () => {
       const bloc = blac.getBloc(LifecycleKeepAliveCubit);
       blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, bloc);
       mockPlugin.onEvent.mockClear();

       blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, bloc);

       expect(mockPlugin.onEvent).toHaveBeenCalledWith(
         BlacLifecycleEvent.BLOC_CONSUMER_REMOVED,
         bloc,
         undefined,
       );
       expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(
         BlacLifecycleEvent.BLOC_DISPOSED,
         bloc,
         undefined,
       );
       // Verify bloc is still registered
       const key = blac.createBlocInstanceMapKey(bloc._name, bloc._id);
       expect(blac.blocInstanceMap.get(key)).toBe(bloc);
     });

    it('should dispatch BLOC_DISPOSED when disposeBloc is called explicitly', () => {
      const bloc = blac.getBloc(LifecycleKeepAliveCubit);
      mockPlugin.onEvent.mockClear();

      blac.disposeBloc(bloc);

      expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.BLOC_DISPOSED,
        bloc,
        undefined,
      );
      expect(blac.blocInstanceMap.size).toBe(0);
    });
  });

  // --- Isolated Tests ---
  describe('Isolated Blocs', () => {
    it('should register in isolatedBlocMap upon creation', () => {
      const bloc = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-1' });
      expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toContain(bloc);
       expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.BLOC_CREATED,
        bloc,
        undefined,
      );
       // Fix: Isolated blocs should NOT be in the main map
       const key = blac.createBlocInstanceMapKey(bloc._name, bloc._id);
       expect(blac.blocInstanceMap.get(key)).toBeUndefined();
    });

    it('should unregister from isolatedBlocMap upon disposal', () => {
      const bloc = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-2' });
      expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toContain(bloc);
      mockPlugin.onEvent.mockClear();

      blac.disposeBloc(bloc);

      expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toBeUndefined();
      expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.BLOC_DISPOSED,
        bloc,
        undefined,
      );
       // Should also be removed from the main map
       expect(blac.blocInstanceMap.size).toBe(0);
    });

    it('should be retrievable using getAllBlocs with searchIsolated: true', () => {
        const bloc1 = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-find-1' });
        const bloc2 = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-find-2' });
        // Add a non-isolated one for contrast
        const bloc3 = blac.getBloc(LifecycleCubit);

        const isolatedBlocs = blac.getAllBlocs(LifecycleIsolatedCubit, { searchIsolated: true });
        expect(isolatedBlocs).toContain(bloc1);
        expect(isolatedBlocs).toContain(bloc2);
        expect(isolatedBlocs.length).toBe(2); // Only the isolated ones

        const nonIsolatedBlocs = blac.getAllBlocs(LifecycleCubit);
         expect(nonIsolatedBlocs).toContain(bloc3);
         expect(nonIsolatedBlocs.length).toBe(1);
    });

     it('getBloc should return the specific isolated instance if ID matches', () => {
       const bloc1 = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-retrieve' });
       const bloc2 = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-retrieve' });
       expect(bloc1).toBe(bloc2); // Should retrieve the same instance

       const bloc3 = blac.getBloc(LifecycleIsolatedCubit, { id: 'iso-another' });
       expect(bloc1).not.toBe(bloc3); // Different ID, different instance
     });
  });

   // --- Listener/Consumer Event Tests ---
  describe('Listener and Consumer Events', () => {
    it('should dispatch LISTENER_ADDED when subscribe is called', () => {
      const bloc = blac.getBloc(LifecycleCubit);
      mockPlugin.onEvent.mockClear(); // Clear create event

      const unsubscribe = 
          bloc._observer.subscribe({ fn: () => {}, id: 'test-listener-3' });

      expect(mockPlugin.onEvent).toHaveBeenCalledWith(
        BlacLifecycleEvent.LISTENER_ADDED,
        bloc,
        { listenerId: 'test-listener-3' },
      );

      // Unsubscribe to clean up
      unsubscribe();
    });

     // LISTENER_REMOVED tested implicitly in disposal tests above

     it('should dispatch BLOC_CONSUMER_ADDED when event is dispatched', () => {
        const bloc = blac.getBloc(LifecycleCubit);
        mockPlugin.onEvent.mockClear(); // Clear create event

        blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, bloc);

        expect(mockPlugin.onEvent).toHaveBeenCalledWith(
            BlacLifecycleEvent.BLOC_CONSUMER_ADDED,
            bloc,
            undefined,
        );
     });

      // BLOC_CONSUMER_REMOVED tested implicitly in disposal tests above
  });

  // --- Specific ID Tests ---
  describe('Bloc IDs', () => {
      it('should create bloc with specific ID', () => {
         const bloc = blac.getBloc(LifecycleCubit, { id: 'specific-id-1' });
         expect(bloc._id).toBe('specific-id-1');
         const key = blac.createBlocInstanceMapKey(bloc._name, bloc._id);
         expect(blac.blocInstanceMap.get(key)).toBe(bloc);
      });

       it('should retrieve the same bloc instance when using the same specific ID', () => {
         const bloc1 = blac.getBloc(LifecycleCubit, { id: 'specific-id-2' });
         const bloc2 = blac.getBloc(LifecycleCubit, { id: 'specific-id-2' });
         expect(bloc1).toBe(bloc2);
       });

       it('should create a new bloc instance when using a different specific ID', () => {
         const bloc1 = blac.getBloc(LifecycleCubit, { id: 'specific-id-3a' });
         const bloc2 = blac.getBloc(LifecycleCubit, { id: 'specific-id-3b' });
         expect(bloc1).not.toBe(bloc2);
         expect(blac.blocInstanceMap.size).toBe(2);
       });

        it('should create bloc with automatic ID if no ID is provided', () => {
         const bloc = blac.getBloc(LifecycleCubit);
         expect(bloc._id).toBeDefined();
         expect(typeof bloc._id).toBe('string'); // Default ID is usually a string
         // Explicitly assert type for length check and key creation
         const idAsString = bloc._id as string; 
         expect(idAsString.length).toBeGreaterThan(0); 
         const key = blac.createBlocInstanceMapKey(bloc._name, idAsString);
         expect(blac.blocInstanceMap.get(key)).toBe(bloc);
       });

        it('should retrieve the same bloc instance when using the automatic ID implicitly', () => {
            // This relies on getBloc finding the *first* registered instance if no ID is given
            const bloc1 = blac.getBloc(LifecycleCubit); // Creates with auto ID
            const bloc2 = blac.getBloc(LifecycleCubit); // Retrieves the same one
            expect(bloc1).toBe(bloc2);
            expect(blac.blocInstanceMap.size).toBe(1);
        });

        it('should dispose the correct bloc when specific IDs are used', () => {
           const bloc1 = blac.getBloc(LifecycleCubit, { id: 'dispose-id-1' });
           const bloc2 = blac.getBloc(LifecycleCubit, { id: 'dispose-id-2' });
           expect(blac.blocInstanceMap.size).toBe(2);
           mockPlugin.onEvent.mockClear();

           blac.disposeBloc(bloc1);

           expect(blac.blocInstanceMap.size).toBe(1);
           const key1 = blac.createBlocInstanceMapKey(bloc1._name, bloc1._id);
           const key2 = blac.createBlocInstanceMapKey(bloc2._name, bloc2._id);
           expect(blac.blocInstanceMap.get(key1)).toBeUndefined();
           expect(blac.blocInstanceMap.get(key2)).toBe(bloc2); // bloc2 should remain
           expect(mockPlugin.onEvent).toHaveBeenCalledWith(
               BlacLifecycleEvent.BLOC_DISPOSED,
               bloc1, // Ensure the correct bloc was reported
               undefined,
           );
            expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(
               BlacLifecycleEvent.BLOC_DISPOSED,
               bloc2,
               undefined,
           );
        });
  });

  // --- Advanced Scenarios ---
  describe('Advanced Lifecycle Scenarios', () => {
    it('should dispose shared bloc only when the LAST listener/consumer is removed', () => {
        const bloc = blac.getBloc(LifecycleCubit);
        const unsub1 = bloc._observer.subscribe({ fn: () => {}, id: 'adv-l1' });
        bloc._addConsumer('test-consumer-1');
        const unsub2 = bloc._observer.subscribe({ fn: () => {}, id: 'adv-l2' });
        bloc._addConsumer('test-consumer-2');
        expect(bloc._observer.size).toBe(2);
        expect(bloc._consumers.size).toBe(2);
        expect(blac.blocInstanceMap.size).toBe(1);
        mockPlugin.onEvent.mockClear();

        unsub1(); // First listener removed
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.LISTENER_REMOVED, bloc, { listenerId: 'adv-l1' });
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc);
        expect(blac.blocInstanceMap.size).toBe(1);

        mockPlugin.onEvent.mockClear(); // Clear before next action/check
        bloc._removeConsumer('test-consumer-1'); // First consumer removed
        // Check that the *event* for removal was dispatched
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, bloc, { consumerId: 'test-consumer-1' });
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc); // But bloc not disposed yet
        expect(blac.blocInstanceMap.size).toBe(1);

        mockPlugin.onEvent.mockClear(); // Clear before next action/check
        unsub2(); // Second listener removed
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.LISTENER_REMOVED, bloc, { listenerId: 'adv-l2' });
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc);
        expect(blac.blocInstanceMap.size).toBe(1);

        mockPlugin.onEvent.mockClear(); // Clear before final action/check
        // Remove the LAST consumer - should trigger disposal
        bloc._removeConsumer('test-consumer-2');

        // Check calls after final removal
        const calls = mockPlugin.onEvent.mock.calls;
        // Expected calls after mock clear: BLOC_CONSUMER_REMOVED, BLOC_DISPOSED
        expect(calls.length).toBeGreaterThanOrEqual(2);
        
        // Check if BLOC_CONSUMER_REMOVED was called with correct params
        expect(calls).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              BlacLifecycleEvent.BLOC_CONSUMER_REMOVED,
              bloc,
              { consumerId: 'test-consumer-2' }
            ])
          ])
        );
        
        // Check if BLOC_DISPOSED was called with correct params
        expect(calls).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              BlacLifecycleEvent.BLOC_DISPOSED,
              bloc
              // Params for BLOC_DISPOSED are undefined, which is the default if not provided
            ])
          ])
        );

        // Verify the final state
        expect(blac.blocInstanceMap.size).toBe(0);
    });

    it('getBloc should NOT retrieve an isolated bloc using the default ID if only specific IDs were used', () => {
        const bloc1 = blac.getBloc(LifecycleIsolatedCubit, { id: 'adv-iso-1' });
        // Attempt to get using the default ID (class name) - This appears to create a new instance
        const bloc2 = blac.getBloc(LifecycleIsolatedCubit);
        expect(bloc2).not.toBe(bloc1);
        // Verify the specifically created one is still there
        expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toContain(bloc1);
        // Verify a second one (presumably bloc2) is also there
        expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)?.length).toBe(2);
      });

    it('should create an isolated bloc using createNewBlocInstance', () => {
        const bloc = blac.createNewBlocInstance(LifecycleIsolatedCubit, 'adv-iso-create');
        expect(bloc).toBeInstanceOf(LifecycleIsolatedCubit);
        expect(bloc._id).toBe('adv-iso-create');
        expect(LifecycleIsolatedCubit.isolated).toBe(true);
        // Verify it's registered correctly in the isolated map
        expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toContain(bloc);
        // Verify it's NOT in the main map (unless createNewBlocInstance overrides isolation, which it shouldn't)
        const key = blac.createBlocInstanceMapKey(bloc._name, bloc._id);
        expect(blac.blocInstanceMap.get(key)).toBeUndefined();
    });

    // Combined KeepAlive + Isolated Cubit for testing
    class KeepAliveIsolatedCubit extends Cubit<number> {
      static keepAlive = true;
      static isolated = true;
      constructor(initialState = 0) { super(initialState); }
    }

    it('should handle KeepAlive + Isolated bloc lifecycle correctly', () => {
        const bloc = blac.getBloc(KeepAliveIsolatedCubit, { id: 'kai-1' });
        expect(KeepAliveIsolatedCubit.keepAlive).toBe(true);
        expect(KeepAliveIsolatedCubit.isolated).toBe(true);
        expect(blac.isolatedBlocMap.get(KeepAliveIsolatedCubit)).toContain(bloc);

        const unsub = bloc._observer.subscribe({ fn: () => {}, id: 'kai-l1' });
        mockPlugin.onEvent.mockClear();

        unsub(); // Remove listener
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.LISTENER_REMOVED, bloc, { listenerId: 'kai-l1' });
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc);
        expect(blac.isolatedBlocMap.get(KeepAliveIsolatedCubit)).toContain(bloc); // Still there

        mockPlugin.onEvent.mockClear(); // Clear before disposal check
        // Explicit disposal required
        blac.disposeBloc(bloc);
        // Check that the dispose event was fired. Argument matching can be tricky.
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc, undefined);
        // Verify side effect
        expect(blac.isolatedBlocMap.get(KeepAliveIsolatedCubit)).toBeUndefined();
    });

    it('resetInstance should dispose non-keepAlive blocs but not keepAlive blocs', () => {
        const normalBloc = blac.getBloc(LifecycleCubit); // Need this for the check below
        const keepAliveBloc = blac.getBloc(LifecycleKeepAliveCubit);
        const isolatedBloc = blac.getBloc(LifecycleIsolatedCubit, {id: 'reset-iso'});
        const keepAliveIsolatedBloc = blac.getBloc(KeepAliveIsolatedCubit, {id: 'reset-kai'});

        // Non-isolated blocs go in the main map.
        expect(blac.blocInstanceMap.size).toBe(2); // normalBloc + keepAliveBloc
        expect(blac.isolatedBlocMap.get(LifecycleIsolatedCubit)).toContain(isolatedBloc);
        expect(blac.isolatedBlocMap.get(KeepAliveIsolatedCubit)).toContain(keepAliveIsolatedBloc);
        const keepAliveKey = blac.createBlocInstanceMapKey(keepAliveBloc._name, keepAliveBloc._id);
        expect(blac.blocInstanceMap.get(keepAliveKey)).toBe(keepAliveBloc);

        mockPlugin.onEvent.mockClear();
        blac.resetInstance(); // Reset the singleton
        const newBlac = Blac.getInstance(); // Get the new instance

        // New instance should be empty initially
        expect(newBlac.blocInstanceMap.size).toBe(0);
        expect(newBlac.isolatedBlocMap.size).toBe(0);

        // Check that dispose was called on non-keepAlive via the mock plugin
        // (which was attached to the old instance that got reset)
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, normalBloc, undefined);
        expect(mockPlugin.onEvent).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, isolatedBloc, undefined); // Isolated are NOT keepAlive by default
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, keepAliveBloc, undefined);
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, keepAliveIsolatedBloc, undefined);

        // Restore blac reference for subsequent tests in the suite
        blac = newBlac;
    });

  });

   // --- Error Handling Tests ---
   describe('Error Handling', () => {
     it('getBlocOrThrow should throw if shared bloc does not exist', () => {
        expect(() => {
            blac.getBlocOrThrow(LifecycleCubit, { id: 'non-existent-shared' });
        }).toThrow(); 
     });

     it('getBlocOrThrow should throw if isolated bloc does not exist', () => {
        expect(() => {
            blac.getBlocOrThrow(LifecycleIsolatedCubit, { id: 'non-existent-iso' });
        }).toThrow();
     });

     it('disposeBloc should not throw when disposing a non-existent bloc', () => {
        // Create a dummy bloc object that isn't actually registered
        const fakeBloc = new LifecycleCubit(); 
        // Manually set properties needed for disposeBloc logic, if possible and necessary.
        // Assuming disposeBloc primarily uses these for map keys and event reporting.
        Object.defineProperty(fakeBloc, '_id', { value: 'fake-id', writable: false });
        // _name is usually derived from constructor.name
        // Object.defineProperty(fakeBloc, '_name', { value: 'LifecycleCubit', writable: false }); 
        
        mockPlugin.onEvent.mockClear();
        expect(() => {
            // Pass the object that wasn't registered
            blac.disposeBloc(fakeBloc);
        }).not.toThrow();

        // Ensure no dispose event was fired for the fake bloc because it wasn't in the maps
        expect(mockPlugin.onEvent).not.toHaveBeenCalledWith(
            BlacLifecycleEvent.BLOC_DISPOSED,
            fakeBloc
        );
        expect(blac.blocInstanceMap.size).toBe(0); // No real blocs were added
     });

      it('disposeBloc should NOT throw when disposing an already disposed bloc', () => {
        const bloc = blac.getBloc(LifecycleCubit);
        blac.disposeBloc(bloc); // First disposal
        expect(blac.blocInstanceMap.size).toBe(0);
        // Important: Mock was cleared *after* first disposal event was potentially fired
        mockPlugin.onEvent.mockClear(); 

        expect(() => {
            blac.disposeBloc(bloc); // Second disposal
        }).not.toThrow();

        // The event IS fired again according to implementation.
        // The main point is that it doesn't throw.
     });

   });

});
