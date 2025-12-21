import { ensure, getRegistry } from '../registry';
import type {
  StateContainerConstructor,
  StateContainerInstance,
} from '../types/utilities';
import { BLAC_DEFAULTS } from '../constants';
import {
  WaitUntilTimeoutError,
  WaitUntilAbortedError,
  WaitUntilDisposedError,
} from './errors';
import {
  createUnifiedTrackerState,
  startUnifiedTracking,
  stopUnifiedTracking,
  createTrackingProxy,
  type UnifiedTrackerState,
} from '../tracking/create-tracking-proxy';
import { DependencySubscriptionManager } from '../tracking/dependency-subscription-manager';

export interface WaitUntilOptions {
  instanceId?: string;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Wait until a condition is met on a bloc instance.
 * Returns the bloc instance when the predicate returns true.
 * Automatically tracks dependencies accessed in the predicate.
 *
 * @example
 * ```ts
 * // Wait for bloc state to be ready
 * const userBloc = await waitUntil(UserBloc, (bloc) => bloc.state.isAuthenticated);
 *
 * // Wait using a getter
 * const userBloc = await waitUntil(UserBloc, (bloc) => bloc.isReady);
 * ```
 */
export function waitUntil<T extends StateContainerConstructor>(
  BlocClass: T,
  predicate: (bloc: InstanceType<T>) => boolean,
  options?: WaitUntilOptions,
): Promise<InstanceType<T>>;

/**
 * Wait until a condition is met on a selected value from a bloc.
 * Returns the selected value when the predicate returns true.
 * Automatically tracks dependencies accessed in selector and predicate.
 *
 * @example
 * ```ts
 * // Wait for layout to be set and get it directly
 * const layout = await waitUntil(
 *   LayoutBloc,
 *   (bloc) => bloc.state.currentLayout,
 *   (layout) => layout !== null
 * );
 *
 * // Using a getter as selector
 * const user = await waitUntil(
 *   UserBloc,
 *   (bloc) => bloc.currentUser,
 *   (user) => user !== null
 * );
 * ```
 */
export function waitUntil<T extends StateContainerConstructor, TSelected>(
  BlocClass: T,
  selector: (bloc: InstanceType<T>) => TSelected,
  predicate: (selected: TSelected) => boolean,
  options?: WaitUntilOptions,
): Promise<TSelected>;

export function waitUntil<T extends StateContainerConstructor, TSelected>(
  BlocClass: T,
  selectorOrPredicate:
    | ((bloc: InstanceType<T>) => TSelected)
    | ((bloc: InstanceType<T>) => boolean),
  predicateOrOptions?: ((selected: TSelected) => boolean) | WaitUntilOptions,
  maybeOptions?: WaitUntilOptions,
): Promise<InstanceType<T> | TSelected> {
  const isSimpleForm = typeof predicateOrOptions !== 'function';

  if (isSimpleForm) {
    const predicate = selectorOrPredicate as (bloc: InstanceType<T>) => boolean;
    const options = predicateOrOptions as WaitUntilOptions | undefined;
    return waitUntilSimple(BlocClass, predicate, options);
  } else {
    const selector = selectorOrPredicate as (bloc: InstanceType<T>) => TSelected;
    const predicate = predicateOrOptions as (selected: TSelected) => boolean;
    const options = maybeOptions;
    return waitUntilSelector(BlocClass, selector, predicate, options);
  }
}

function waitUntilSimple<T extends StateContainerConstructor>(
  BlocClass: T,
  predicate: (bloc: InstanceType<T>) => boolean,
  options?: WaitUntilOptions,
): Promise<InstanceType<T>> {
  const {
    instanceId = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    timeout,
    signal,
  } = options ?? {};

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WaitUntilAbortedError());
      return;
    }

    const bloc = ensure(BlocClass, instanceId) as InstanceType<T>;

    if (bloc.isDisposed) {
      reject(new WaitUntilDisposedError(BlocClass.name));
      return;
    }

    const tracker: UnifiedTrackerState = createUnifiedTrackerState();
    const proxiedBloc = createTrackingProxy(bloc, tracker);
    const externalDepsManager = new DependencySubscriptionManager();

    const runPredicate = (): boolean => {
      startUnifiedTracking(tracker);
      try {
        return predicate(proxiedBloc);
      } finally {
        const deps = stopUnifiedTracking(tracker, bloc);
        for (const dep of tracker.getterTracker.externalDependencies) {
          deps.add(dep);
        }
        deps.delete(bloc);
        externalDepsManager.sync(deps, checkCondition, bloc);
      }
    };

    if (runPredicate()) {
      resolve(bloc);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let unsubscribeDispose: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortHandler: (() => void) | null = null;

    const cleanup = () => {
      unsubscribe?.();
      unsubscribeDispose?.();
      externalDepsManager.cleanup();
      if (timeoutId) clearTimeout(timeoutId);
      if (abortHandler && signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    function checkCondition() {
      try {
        if (runPredicate()) {
          cleanup();
          resolve(bloc);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    }

    unsubscribe = bloc.subscribe(checkCondition);

    unsubscribeDispose = getRegistry().on('disposed', (instance) => {
      if (instance === bloc) {
        cleanup();
        reject(new WaitUntilDisposedError(BlocClass.name));
      }
    });

    if (timeout !== undefined) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new WaitUntilTimeoutError(timeout));
      }, timeout);
    }

    if (signal) {
      abortHandler = () => {
        cleanup();
        reject(new WaitUntilAbortedError());
      };
      signal.addEventListener('abort', abortHandler);
    }
  });
}

function waitUntilSelector<T extends StateContainerConstructor, TSelected>(
  BlocClass: T,
  selector: (bloc: InstanceType<T>) => TSelected,
  predicate: (selected: TSelected) => boolean,
  options?: WaitUntilOptions,
): Promise<TSelected> {
  const {
    instanceId = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    timeout,
    signal,
  } = options ?? {};

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WaitUntilAbortedError());
      return;
    }

    const bloc = ensure(BlocClass, instanceId) as InstanceType<T>;

    if (bloc.isDisposed) {
      reject(new WaitUntilDisposedError(BlocClass.name));
      return;
    }

    const tracker: UnifiedTrackerState = createUnifiedTrackerState();
    const proxiedBloc = createTrackingProxy(bloc, tracker);
    const externalDepsManager = new DependencySubscriptionManager();

    const runSelector = (): { value: TSelected; matches: boolean } => {
      startUnifiedTracking(tracker);
      try {
        const value = selector(proxiedBloc);
        const matches = predicate(value);
        return { value, matches };
      } finally {
        const deps = stopUnifiedTracking(tracker, bloc);
        for (const dep of tracker.getterTracker.externalDependencies) {
          deps.add(dep);
        }
        deps.delete(bloc);
        externalDepsManager.sync(deps, checkCondition, bloc);
      }
    };

    const initial = runSelector();
    if (initial.matches) {
      resolve(initial.value);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let unsubscribeDispose: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortHandler: (() => void) | null = null;

    const cleanup = () => {
      unsubscribe?.();
      unsubscribeDispose?.();
      externalDepsManager.cleanup();
      if (timeoutId) clearTimeout(timeoutId);
      if (abortHandler && signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    function checkCondition() {
      try {
        const result = runSelector();
        if (result.matches) {
          cleanup();
          resolve(result.value);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    }

    unsubscribe = bloc.subscribe(checkCondition);

    unsubscribeDispose = getRegistry().on('disposed', (instance) => {
      if (instance === bloc) {
        cleanup();
        reject(new WaitUntilDisposedError(BlocClass.name));
      }
    });

    if (timeout !== undefined) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new WaitUntilTimeoutError(timeout));
      }, timeout);
    }

    if (signal) {
      abortHandler = () => {
        cleanup();
        reject(new WaitUntilAbortedError());
      };
      signal.addEventListener('abort', abortHandler);
    }
  });
}
