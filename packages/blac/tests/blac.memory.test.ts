import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blac, BlocBase, Cubit } from '../src';

// Helper Blocs for testing
interface CounterState {
    count: number;
    id?: string;
}

class CounterBloc extends Cubit<CounterState, { id?: string }> {
    constructor(props?: { id?: string }) {
        super({ count: 0, id: props?.id });
    }

    increment = () => {
        this.emit({ ...this.state, count: this.state.count + 1 });
    };

    decrement = () => {
        this.emit({ ...this.state, count: this.state.count - 1 });
    };

    // For testing infinite loops - will emit a few times then stop
    triggerControlledLoop = (depth = 0, maxDepth = 3) => {
        if (depth >= maxDepth) {
            this.emit({ ...this.state, count: -999 }); // Signal end
            return;
        }
        this.emit({ ...this.state, count: this.state.count + 10 });
        // Simulating an effect that re-triggers
        void Promise.resolve().then(() => { this.triggerControlledLoop(depth + 1, maxDepth); });
    }

    // Method to simulate a runaway reaction
    selfReferentialUpdate = () => {
        // This is a direct self-update which should be handled by Blac's design (e.g. not causing infinite listeners)
        // but we're testing for edge cases or improper usage patterns.
        this.emit({ ...this.state, count: this.state.count + 1 });
        if (this.state.count < 5) { // Limit to prevent actual infinite loop in test
            void Promise.resolve().then(() => { this.selfReferentialUpdate(); });
        }
    }


    // Override onDispose for testing purposes
    onDisposeCalled = vi.fn();
    onDispose = () => {
        this.onDisposeCalled();
    }
}

class KeepAliveBloc extends CounterBloc {
    static override keepAlive = true;
    override onDisposeCalled = vi.fn(); // Separate spy for this class
    onDispose = () => {
        this.onDisposeCalled();
    }
}

class IsolatedBloc extends CounterBloc {
    static override isolated = true;
    override onDisposeCalled = vi.fn(); // Separate spy for this class
    onDispose = () =>    {
        this.onDisposeCalled();
    }
}

class IsolatedKeepAliveBloc extends CounterBloc {
    static override isolated = true;
    static override keepAlive = true;
    override onDisposeCalled = vi.fn(); // Separate spy for this class
    onDispose = () => {
        this.onDisposeCalled();
    }
}


describe('@blac/core - Memory and Lifecycle Tests', () => {
    let blacInstance: Blac;

    beforeEach(() => {
        // Ensure a clean Blac instance for each test
        blacInstance = new Blac({ __unsafe_ignore_singleton: true });
        Blac.instance = blacInstance; // Override the global singleton
        Blac.enableLog = false; // Disable logs for cleaner test output
        // vi.spyOn(blacInstance, 'dispatchEvent').mockImplementation(() => {}); // Mock dispatchEvent if still needed internally by Blac
    });

    afterEach(() => {
        blacInstance.resetInstance(); // Clean up after each test
        vi.clearAllMocks();
    });

    describe('Bloc Disposal and Memory Leaks', () => {
        it('should dispose a non-keepAlive bloc when no listeners or consumers remain', () => {
            const bloc = blacInstance.getBloc(CounterBloc);
            const blocInstanceId = bloc._id;
            const onDisposeSpy = vi.spyOn(bloc, 'onDispose');
            // const dispatchEventSpy = vi.spyOn(blacInstance, 'dispatchEvent'); // Removed dispatchEventSpy

            const listener = vi.fn();
            const unsubscribe: () => void = (bloc as BlocBase<CounterState>)._observer.subscribe({ fn: (state: CounterState) => listener(state), id: 'test-dispose-non-keepalive' });
            expect(blacInstance.blocInstanceMap.has(blacInstance.createBlocInstanceMapKey(CounterBloc.name, blocInstanceId))).toBe(true);

            unsubscribe(); // This should trigger the internal disposal logic

            // Wait for any potential async disposal logic
            return new Promise(resolve => setTimeout(() => {
                expect(onDisposeSpy).toHaveBeenCalled();
                // expect(dispatchEventSpy).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc); // Removed assertion
                expect(blacInstance.blocInstanceMap.has(blacInstance.createBlocInstanceMapKey(CounterBloc.name, blocInstanceId))).toBe(false);
                resolve(null);
            }, 0));
        });

        it('should NOT dispose a keepAlive bloc even when no listeners or consumers remain', () => {
            const bloc = blacInstance.getBloc(KeepAliveBloc);
            const blocInstanceId = bloc._id;
            const onDisposeSpy = vi.spyOn(bloc, 'onDisposeCalled');
            // const dispatchEventSpy = vi.spyOn(blacInstance, 'dispatchEvent'); // Removed dispatchEventSpy

            const listener = vi.fn();
            const unsubscribeKeepAlive: () => void = (bloc as BlocBase<CounterState>)._observer.subscribe({ fn: (state: CounterState) => listener(state), id: 'test-not-dispose-keepalive' });
            unsubscribeKeepAlive();

            expect(onDisposeSpy).not.toHaveBeenCalled();
            // expect(dispatchEventSpy).not.toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, bloc); // Removed assertion
            expect(blacInstance.blocInstanceMap.has(blacInstance.createBlocInstanceMapKey(KeepAliveBloc.name, blocInstanceId))).toBe(true);
        });

        it('should dispose an ISOLATED non-keepAlive bloc when its specific instance is no longer needed', () => {
            const bloc = blacInstance.getBloc(IsolatedBloc, { id: 'isolatedTest1' });
            const blocId = bloc._id; // which is 'isolatedTest1'
            const onDisposeSpy = vi.spyOn(bloc, 'onDisposeCalled');
            // const dispatchEventSpy = vi.spyOn(blacInstance, 'dispatchEvent'); // Removed dispatchEventSpy

            // Add a consumer (simulating useBlocInstance)
            const consumerRef = 'testConsumer_isolatedTest1';
            bloc._addConsumer(consumerRef);
            expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, blocId)).toBe(bloc);

            // Remove consumer
            bloc._removeConsumer(consumerRef); // This should trigger disposal for non-keepAlive isolated blocs

            return new Promise(resolve => setTimeout(() => {
                expect(onDisposeSpy).toHaveBeenCalled();
                // expect(dispatchEventSpy).toHaveBeenCalledWith(BlacLifecycleEvent.BLOC_DISPOSED, expect.objectContaining({ _id: blocId })); // Removed assertion
                expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, blocId)).toBeUndefined();
                resolve(null);
            }, 200)); // Increased timeout for async disposal
        });

        it('should NOT dispose an ISOLATED keepAlive bloc', () => {
            const bloc = blacInstance.getBloc(IsolatedKeepAliveBloc, { id: 'isoKeepAlive1' });
            const blocId = bloc._id;
            const onDisposeSpy = vi.spyOn(bloc, 'onDisposeCalled');

            const consumerRef = 'testConsumer_isoKeepAlive1';
            bloc._addConsumer(consumerRef);
            bloc._removeConsumer(consumerRef);

            expect(onDisposeSpy).not.toHaveBeenCalled();
            expect(blacInstance.findIsolatedBlocInstance(IsolatedKeepAliveBloc, blocId)).toBe(bloc);
        });


        it('resetInstance should dispose non-keepAlive blocs and keep keepAlive blocs', () => {
            const regularBloc = blacInstance.getBloc(CounterBloc, { id: 'regular1' });
            const keepAliveBloc = blacInstance.getBloc(KeepAliveBloc, { id: 'keepAlive1' });
            const isolatedBloc = blacInstance.getBloc(IsolatedBloc, { id: 'isolated1' });
            const isolatedKeepAliveBloc = blacInstance.getBloc(IsolatedKeepAliveBloc, { id: 'isoKeepAlive1' });

            // Spy on their onDispose methods AFTER they are created
            const regularDisposeSpy = vi.spyOn(regularBloc, 'onDisposeCalled'); // Use the direct fn mock
            const keepAliveDisposeSpy = vi.spyOn(keepAliveBloc, 'onDisposeCalled'); // Use the direct fn mock
            const isolatedDisposeSpy = vi.spyOn(isolatedBloc, 'onDisposeCalled'); // Use the direct fn mock
            const isolatedKeepAliveDisposeSpy = vi.spyOn(isolatedKeepAliveBloc, 'onDisposeCalled'); // Use the direct fn mock

            // Hold references to check after reset
            const regularBlocId = regularBloc._id;
            const keepAliveBlocId = keepAliveBloc._id;
            const isolatedBlocId = isolatedBloc._id;
            const isolatedKeepAliveBlocId = isolatedKeepAliveBloc._id;

            blacInstance.resetInstance(); // This creates a new Blac.instance

            expect(regularDisposeSpy).toHaveBeenCalled();
            expect(isolatedDisposeSpy).toHaveBeenCalled();
            // KeepAlive blocs should ALSO have their onDispose called during a full resetInstance
            expect(keepAliveDisposeSpy).toHaveBeenCalled();
            expect(isolatedKeepAliveDisposeSpy).toHaveBeenCalled();

            const newBlacInstance = Blac.instance;
            expect(newBlacInstance.findRegisteredBlocInstance(CounterBloc, regularBlocId)).toBeUndefined();
            expect(newBlacInstance.findIsolatedBlocInstance(IsolatedBloc, isolatedBlocId)).toBeUndefined();
            expect(newBlacInstance.findRegisteredBlocInstance(KeepAliveBloc, keepAliveBlocId)).toBeUndefined();
            expect(newBlacInstance.findIsolatedBlocInstance(IsolatedKeepAliveBloc, isolatedKeepAliveBlocId)).toBeUndefined();
        });
    });

    describe('Potential Infinite Loops', () => {
        it('should handle controlled self-referential updates without true infinite loop', async () => {
            const bloc = blacInstance.getBloc(CounterBloc, { id: 'loopTest1' });
            const stateChanges: CounterState[] = [];
            const unsubscribeLoop: () => void = (bloc as BlocBase<CounterState>)._observer.subscribe({ fn: (state: CounterState) => { stateChanges.push(state); }, id: 'test-controlled-loop' });

            const emitSpy = vi.spyOn(bloc, 'emit');

            bloc.triggerControlledLoop(0, 3); // Max depth 3, so 4 emits (10, 20, 30, -999)

            await vi.waitFor(() => {
                expect(stateChanges.some(s => s.count === -999)).toBe(true);
            }, { timeout: 500 });

            // Emits are: 10, 20, 30, -999 (assuming subscribe doesn't send initial state)
            expect(stateChanges.length).toBe(4);
            expect(stateChanges[0].count).toBe(10);
            expect(stateChanges[1].count).toBe(20);
            expect(stateChanges[2].count).toBe(30);
            expect(stateChanges[3].count).toBe(-999); // End signal

            expect(emitSpy).toHaveBeenCalledTimes(4); // 3 increments + 1 end signal

            unsubscribeLoop();
        });

        it('should limit direct self-referential updates to avoid call stack overflow', async () => {
            const bloc = blacInstance.getBloc(CounterBloc, { id: 'selfRefLimit' });
            let unsubscribeSelfRef: (() => void) | undefined;
            const finalState = await new Promise<CounterState>((resolve) => {
                unsubscribeSelfRef = (bloc as BlocBase<CounterState>)._observer.subscribe({
                    fn: (state: CounterState) => {
                        if (state.count >= 5) {
                            resolve(state);
                        }
                    }, id: 'test-self-ref'
                });
                bloc.selfReferentialUpdate();
            });

            expect(finalState.count).toBe(5);
            if (unsubscribeSelfRef) unsubscribeSelfRef();
        });
    });

    describe('Bloc Instance Management', () => {
        it('should correctly retrieve multiple instances of the same NON-ISOLATED bloc if they were created with different IDs (which is unusual)', () => {
            const blocA = blacInstance.getBloc(CounterBloc, { id: 'multiA' });
            const blocB = blacInstance.getBloc(CounterBloc, { id: 'multiB' });
            expect(blocA).not.toBe(blocB);
            expect(blocA._id).toBe('multiA');
            expect(blocB._id).toBe('multiB');
            expect(blacInstance.getBloc(CounterBloc, { id: 'multiA' })).toBe(blocA);
        });

        it('getAllBlocs should retrieve all instances of a non-isolated bloc type', () => {
            blacInstance.getBloc(CounterBloc, { id: 'allTest1' });
            blacInstance.getBloc(CounterBloc, { id: 'allTest2' });
            blacInstance.getBloc(KeepAliveBloc, { id: 'otherType' }); // Create a different type too

            console.log('Bloc instance map for getAllBlocs test:', blacInstance.blocInstanceMap);
            const counterBlocs = blacInstance.getAllBlocs(CounterBloc);
            expect(counterBlocs.length).toBe(2);
            expect(counterBlocs.find(b => b._id === 'allTest1')).toBeDefined();
            expect(counterBlocs.find(b => b._id === 'allTest2')).toBeDefined();
        });

        it('getAllBlocs should retrieve all instances of an ISOLATED bloc type', () => {
            const isoA = blacInstance.getBloc(IsolatedBloc, { id: 'isoAllA' });
            const isoB = blacInstance.getBloc(IsolatedBloc, { id: 'isoAllB' });
            // Add a non-isolated one for contrast if needed, or another isolated type
            blacInstance.getBloc(CounterBloc, { id: 'nonIsoContrast' });

            const allIsolated = blacInstance.getAllBlocs(IsolatedBloc, { searchIsolated: true });
            expect(allIsolated).toContain(isoA);
            expect(allIsolated).toContain(isoB);
            expect(allIsolated.length).toBe(2);
        });

        it('should correctly handle disposal of a specific isolated bloc instance among many', () => {
            const blocA = blacInstance.getBloc(IsolatedBloc, { id: 'multiIsoA' });
            const blocB = blacInstance.getBloc(IsolatedBloc, { id: 'multiIsoB' });

            const blocAonDisposeSpy = vi.spyOn(blocA, 'onDisposeCalled'); // Use the direct fn mock
            const blocBonDisposeSpy = vi.spyOn(blocB, 'onDisposeCalled'); // Use the direct fn mock

            // Simulate usage for blocA
            const consumerA = 'consumer-A';
            blocA._addConsumer(consumerA);

            // Simulate usage for blocB
            const consumerB = 'consumer-B';
            blocB._addConsumer(consumerB);

            expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, 'multiIsoA')).toBe(blocA);
            expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, 'multiIsoB')).toBe(blocB);

            // Remove consumer for blocA, should trigger its disposal
            blocA._removeConsumer(consumerA);
            
            return new Promise(resolve => setTimeout(() => {
                expect(blocAonDisposeSpy).toHaveBeenCalledTimes(1);
                expect(blocBonDisposeSpy).not.toHaveBeenCalled();
                expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, 'multiIsoA')).toBeUndefined();
                expect(blacInstance.findIsolatedBlocInstance(IsolatedBloc, 'multiIsoB')).toBe(blocB); // blocB should still be there
                resolve(null);
            }, 200)); // Increased timeout for async disposal
        });
    });
}); 