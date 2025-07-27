import {
  AdapterOptions,
  Blac,
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
  InferPropsFromGeneric,
} from '@blac/core';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

// Global hook instance counter
let hookInstanceCounter = 0;

/**
 * Type definition for the return type of the useBloc hook
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * React hook for integrating with Blac state management
 */
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: AdapterOptions<InstanceType<B>>,
): HookTypes<B> {
  // Create a unique identifier for this hook instance
  const hookIdRef = useRef<string>();
  if (!hookIdRef.current) {
    hookIdRef.current = `useBloc-${++hookInstanceCounter}-${Date.now()}`;
    console.log(`⚛️ [useBloc] 🎬 Hook instance created: ${hookIdRef.current}`);
    console.log(`⚛️ [useBloc] Constructor: ${blocConstructor.name}`);
    console.log(`⚛️ [useBloc] Options:`, {
      hasDependencies: !!options?.dependencies,
      hasProps: !!options?.props,
      hasOnMount: !!options?.onMount,
      hasOnUnmount: !!options?.onUnmount,
      id: options?.id,
    });
  }

  const renderCount = useRef(0);
  renderCount.current++;
  console.log(
    `⚛️ [useBloc] 🔄 Render #${renderCount.current} for ${hookIdRef.current}`,
  );

  const componentRef = useRef<object>({});

  // Track adapter creation
  const adapterCreationStart = performance.now();
  const adapter = useMemo(() => {
    console.log(
      `⚛️ [useBloc] 🏗️ Creating BlacAdapter (useMemo) for ${hookIdRef.current}`,
    );
    const newAdapter = new BlacAdapter<B>(
      {
        componentRef: componentRef,
        blocConstructor,
      },
      options,
    );
    const creationTime = performance.now() - adapterCreationStart;
    console.log(
      `⚛️ [useBloc] ✅ BlacAdapter created in ${creationTime.toFixed(2)}ms`,
    );
    return newAdapter;
  }, []);

  // Track options changes
  const optionsChangeCount = useRef(0);
  useEffect(() => {
    optionsChangeCount.current++;
    console.log(
      `⚛️ [useBloc] 📝 Options effect triggered (change #${optionsChangeCount.current}) for ${hookIdRef.current}`,
    );
    console.log(`⚛️ [useBloc] Updating adapter options:`, {
      hasDependencies: !!options?.dependencies,
      hasProps: !!options?.props,
      hasOnMount: !!options?.onMount,
      hasOnUnmount: !!options?.onUnmount,
    });
    adapter.options = options;
  }, [options]);

  // Register as consumer and handle lifecycle
  const mountEffectCount = useRef(0);
  useEffect(() => {
    mountEffectCount.current++;
    const effectStart = performance.now();
    const bloc = adapter.blocInstance;
    console.log(
      `⚛️ [useBloc] 🏔️ Mount effect triggered (run #${mountEffectCount.current}) for ${hookIdRef.current}`,
    );
    console.log(`⚛️ [useBloc] Bloc dependency: ${bloc._name} (${bloc._id})`);

    adapter.mount();

    console.log(
      `⚛️ [useBloc] ✅ Component mounted in ${(performance.now() - effectStart).toFixed(2)}ms`,
    );

    return () => {
      const unmountStart = performance.now();
      console.log(
        `⚛️ [useBloc] 🏚️ Unmount cleanup triggered for ${hookIdRef.current}`,
      );
      adapter.unmount();
      console.log(
        `⚛️ [useBloc] ✅ Component unmounted in ${(performance.now() - unmountStart).toFixed(2)}ms`,
      );
    };
  }, [adapter.blocInstance]);

  // Subscribe to state changes using useSyncExternalStore
  const subscribeMemoCount = useRef(0);
  const subscribe = useMemo(() => {
    subscribeMemoCount.current++;
    console.log(
      `⚛️ [useBloc] 🔔 Creating subscribe function (useMemo run #${subscribeMemoCount.current}) for ${hookIdRef.current}`,
    );

    let subscriptionCount = 0;

    return (onStoreChange: () => void) => {
      subscriptionCount++;
      console.log(
        `⚛️ [useBloc] 📡 Subscription created (#${subscriptionCount}) for ${hookIdRef.current}`,
      );

      const unsubscribe = adapter.createSubscription({
        onChange: () => {
          console.log(
            `⚛️ [useBloc] 🔄 Store change detected, triggering React re-render for ${hookIdRef.current}`,
          );
          onStoreChange();
        },
      });

      return () => {
        console.log(
          `⚛️ [useBloc] 🔕 Unsubscribing (#${subscriptionCount}) for ${hookIdRef.current}`,
        );
        unsubscribe();
      };
    };
  }, [adapter.blocInstance]);

  const snapshotCount = useRef(0);
  const serverSnapshotCount = useRef(0);

  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    // Get snapshot
    () => {
      snapshotCount.current++;
      const bloc = adapter.blocInstance;
      const state = bloc.state;
      console.log(
        `⚛️ [useBloc] 📸 Getting snapshot (#${snapshotCount.current}) for ${hookIdRef.current}`,
      );
      return state;
    },
    // Get server snapshot (same as client for now)
    () => {
      const bloc = adapter.blocInstance;
      serverSnapshotCount.current++;
      const state = bloc.state;
      console.log(
        `⚛️ [useBloc] 🖥️ Getting server snapshot (#${serverSnapshotCount.current}) for ${hookIdRef.current}`,
      );
      return state;
    },
  );

  // Create proxies for fine-grained tracking (if enabled)
  const stateMemoCount = useRef(0);
  const finalState = useMemo(() => {
    stateMemoCount.current++;
    const memoStart = performance.now();
    console.log(
      `⚛️ [useBloc] 🎭 Creating state proxy (useMemo run #${stateMemoCount.current}) for ${hookIdRef.current}`,
    );
    console.log(`⚛️ [useBloc] Dependencies changed:`, {
      rawStateChanged: true,
      dependenciesChanged: stateMemoCount.current === 1 ? 'initial' : 'changed',
    });

    const proxyState = adapter.getProxyState(rawState);

    console.log(
      `⚛️ [useBloc] ✅ State proxy created in ${(performance.now() - memoStart).toFixed(2)}ms`,
    );
    return proxyState;
  }, [rawState]);

  const blocMemoCount = useRef(0);
  const finalBloc = useMemo(() => {
    blocMemoCount.current++;
    const memoStart = performance.now();
    console.log(
      `⚛️ [useBloc] 🎯 Creating bloc proxy (useMemo run #${blocMemoCount.current}) for ${hookIdRef.current}`,
    );

    const proxyBloc = adapter.getProxyBlocInstance();

    console.log(
      `⚛️ [useBloc] ✅ Bloc proxy created in ${(performance.now() - memoStart).toFixed(2)}ms`,
    );
    return proxyBloc;
  }, [adapter.blocInstance]);

  // Track component unmount
  useEffect(() => {
    return () => {
      console.log(
        `⚛️ [useBloc] 💀 Component fully unmounting - ${hookIdRef.current}`,
      );
      console.log(`⚛️ [useBloc] Final statistics:`, {
        totalRenders: renderCount.current,
        totalSnapshots: snapshotCount.current,
        totalServerSnapshots: serverSnapshotCount.current,
        optionsChanges: optionsChangeCount.current,
        mountEffectRuns: mountEffectCount.current,
        subscribeMemoRuns: subscribeMemoCount.current,
        stateMemoRuns: stateMemoCount.current,
        blocMemoRuns: blocMemoCount.current,
      });
    };
  }, []);

  // Mark consumer as rendered after each render
  useEffect(() => {
    console.log(
      `⚛️ [useBloc] 🎨 Marking consumer as rendered after render #${renderCount.current}`,
    );
    adapter.updateLastNotified(componentRef.current);
  });

  // Log final hook return
  console.log(
    `⚛️ [useBloc] 🎁 Returning [state, bloc] for render #${renderCount.current} of ${hookIdRef.current}`,
  );
  console.log(`⚛️ [useBloc] Hook execution summary:`, {
    hookId: hookIdRef.current,
    renderNumber: renderCount.current,
    bloc: adapter.blocInstance._name,
    hasDependencies: !!options?.dependencies,
    snapshotsTaken: snapshotCount.current,
    serverSnapshotsTaken: serverSnapshotCount.current,
  });

  return [finalState, finalBloc];
}

export default useBloc;
