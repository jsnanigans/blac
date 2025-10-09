import {
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateInstanceIdFromProps,
} from '@blac/core';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

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
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B> {
  // Create a unique identifier for this hook instance
  const renderCount = useRef(0);
  renderCount.current++;

  // Create component ref - this persists across React strict mode remounts
  // because the object itself stays in memory even when the component unmounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Get component name for debugging
  const componentName = useRef<string>('');
  if (!componentName.current) {
    // Try to get component name from stack trace
    try {
      const error = new Error();
      const stack = error.stack || '';
      const lines = stack.split('\n');

      // Look for React component in stack - try multiple patterns
      for (let i = 2; i < lines.length && i < 15; i++) {
        const line = lines[i];

        // Pattern 1: "at ComponentName" or "at Object.ComponentName"
        let match = line.match(/at\s+(?:Object\.)?([A-Z][a-zA-Z0-9_$]*)/);

        // Pattern 2: Look for component files like "ComponentName.tsx"
        if (!match) {
          match = line.match(/([A-Z][a-zA-Z0-9_$]*)\.tsx/);
        }

        // Pattern 3: Look for render functions
        if (!match) {
          match = line.match(/render([A-Z][a-zA-Z0-9_$]*)/);
          // keep as-is; no additional processing
        }

        if (
          match &&
          match[1] !== 'Object' &&
          !match[1].startsWith('use') &&
          !match[1].startsWith('Use')
        ) {
          componentName.current = match[1];
          break;
        }
      }

      // If still no name, try to get it from the bloc constructor name
      if (!componentName.current) {
        const blocName = blocConstructor.name;
        if (blocName && blocName !== 'Object') {
          // Remove 'Cubit' or 'Bloc' suffix to guess component name
          componentName.current =
            blocName.replace(/(Cubit|Bloc)$/, '') || 'Component';
        } else {
          componentName.current = 'Component';
        }
      }
    } catch {
      componentName.current = 'Component';
    }
  }

  // Pass through options
  const normalizedOptions = options;

  // Generate instance id from static props if needed
  const instanceKey = useMemo(() => {
    if (normalizedOptions?.instanceId) {
      return normalizedOptions.instanceId;
    }
    if (normalizedOptions?.staticProps) {
      return generateInstanceIdFromProps(normalizedOptions.staticProps) || null;
    }
    return null;
  }, [normalizedOptions?.instanceId, normalizedOptions?.staticProps]);

  // Create a stable instance ID for isolated blocs that persists across strict mode remounts
  // We store it on the componentRef object itself, which persists in memory
  const base = blocConstructor as unknown as { isolated?: boolean };
  if (base.isolated && !normalizedOptions?.instanceId && !componentRef.current.__blocInstanceId) {
    // Generate once and store on the object - this persists even through React strict mode unmount/remount
    componentRef.current.__blocInstanceId = `component-${Math.random().toString(36).slice(2, 11)}`;
  }
  const stableInstanceRef = componentRef.current.__blocInstanceId || null;

  // Track adapter creation - recreate when instanceId/staticProps change
  const adapter = useMemo(() => {
    const newAdapter = new BlacAdapter<B>(
      {
        componentRef: componentRef,
        blocConstructor,
      },
      {
        instanceId: normalizedOptions?.instanceId,
        dependencies: normalizedOptions?.dependencies,
        staticProps: normalizedOptions?.staticProps,
        onMount: normalizedOptions?.onMount,
        onUnmount: normalizedOptions?.onUnmount,
      },
    );

    // Set component name for rerender logging
    if (componentName.current) {
      newAdapter.setComponentName(componentName.current);
    }
    return newAdapter;
  }, [blocConstructor, instanceKey]); // Recreate adapter when instance key changes

  // Reset tracking at the start of each render to ensure we only track
  // properties accessed during the current render
  adapter.resetTracking();

  // Notify plugins about render
  adapter.notifyRender();

  // Update adapter options when they change (except instanceId/staticProps which recreate the adapter)
  const optionsChangeCount = useRef(0);
  useEffect(() => {
    optionsChangeCount.current++;
    adapter.options = {
      instanceId: normalizedOptions?.instanceId,
      dependencies: normalizedOptions?.dependencies,
      staticProps: normalizedOptions?.staticProps,
      onMount: normalizedOptions?.onMount,
      onUnmount: normalizedOptions?.onUnmount,
    };
  }, [
    adapter,
    normalizedOptions?.dependencies,
    normalizedOptions?.onMount,
    normalizedOptions?.onUnmount,
  ]);

  // Register as consumer and handle lifecycle
  const mountEffectCount = useRef(0);
  useEffect(() => {
    mountEffectCount.current++;
    adapter.mount();

    return () => {
      adapter.unmount();
    };
  }, [adapter]);

  // Subscribe to state changes using useSyncExternalStore
  const subscribeMemoCount = useRef(0);
  const subscribe = useMemo(() => {
    subscribeMemoCount.current++;
    let _subscriptionCount = 0;

    return (onStoreChange: () => void) => {
      _subscriptionCount++;
      const unsubscribe = adapter.createSubscription({
        onChange: () => {
          onStoreChange();
        },
      });

      return () => {
        unsubscribe();
      };
    };
  }, [adapter]);

  const snapshotCount = useRef(0);
  const serverSnapshotCount = useRef(0);

  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    // Get snapshot
    () => {
      snapshotCount.current++;
      const bloc = adapter.blocInstance;
      const state = bloc.state;
      return state;
    },
    // Get server snapshot (same as client for now)
    () => {
      const bloc = adapter.blocInstance;
      serverSnapshotCount.current++;
      const state = bloc.state;
      return state;
    },
  );

  // Create proxies for fine-grained tracking (if enabled)
  const stateMemoCount = useRef(0);
  const finalState = useMemo(() => {
    stateMemoCount.current++;
    // Always return the proxy - it will handle whether to actually proxy or not
    const proxyState = adapter.getStateProxy();
    return proxyState;
  }, [rawState, adapter]);

  const blocMemoCount = useRef(0);
  const finalBloc = useMemo(() => {
    blocMemoCount.current++;
    const proxyBloc = adapter.getBlocProxy();
    return proxyBloc;
  }, [adapter]);

  // Log final hook return
  return [finalState, finalBloc];
}

export default useBloc;
