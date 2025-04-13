import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blac, BlacLifecycleEvent, BlacPlugin } from '../src/Blac';
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
const mockPlugin: BlacPlugin = {
  name: 'TestLifecyclePlugin',
  onEvent: vi.fn(),
};

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

});
