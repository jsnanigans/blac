import { ensure } from '../registry';
import type { StateContainerConstructor } from '../types/utilities';
import { BLAC_DEFAULTS } from '../constants';
import {
  WaitUntilTimeoutError,
  WaitUntilAbortedError,
  WaitUntilDisposedError,
} from './errors';

export interface WaitUntilOptions {
  instanceId?: string;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Wait until a condition is met on a bloc instance.
 * Returns the bloc instance when the predicate returns true.
 *
 * @example
 * ```ts
 * // Wait for bloc to be ready
 * const userBloc = await waitUntil(UserBloc, (bloc) => bloc.state.isAuthenticated);
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
 *
 * @example
 * ```ts
 * // Wait for layout to be set and get it directly
 * const layout = await waitUntil(
 *   LayoutBloc,
 *   (bloc) => bloc.state.currentLayout,
 *   (layout) => layout !== null
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
  selectorOrPredicate: ((bloc: InstanceType<T>) => TSelected) | ((bloc: InstanceType<T>) => boolean),
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
  const { instanceId = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY, timeout, signal } = options ?? {};

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WaitUntilAbortedError());
      return;
    }

    const bloc = ensure(BlocClass, instanceId);

    if (bloc.isDisposed) {
      reject(new WaitUntilDisposedError(BlocClass.name));
      return;
    }

    if (predicate(bloc)) {
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
      if (timeoutId) clearTimeout(timeoutId);
      if (abortHandler && signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    unsubscribe = bloc.subscribe(() => {
      try {
        if (predicate(bloc)) {
          cleanup();
          resolve(bloc);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    unsubscribeDispose = bloc.onSystemEvent('dispose', () => {
      cleanup();
      reject(new WaitUntilDisposedError(BlocClass.name));
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
  const { instanceId = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY, timeout, signal } = options ?? {};

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WaitUntilAbortedError());
      return;
    }

    const bloc = ensure(BlocClass, instanceId);

    if (bloc.isDisposed) {
      reject(new WaitUntilDisposedError(BlocClass.name));
      return;
    }

    const selected = selector(bloc);
    if (predicate(selected)) {
      resolve(selected);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let unsubscribeDispose: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortHandler: (() => void) | null = null;

    const cleanup = () => {
      unsubscribe?.();
      unsubscribeDispose?.();
      if (timeoutId) clearTimeout(timeoutId);
      if (abortHandler && signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    unsubscribe = bloc.subscribe(() => {
      try {
        const value = selector(bloc);
        if (predicate(value)) {
          cleanup();
          resolve(value);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    unsubscribeDispose = bloc.onSystemEvent('dispose', () => {
      cleanup();
      reject(new WaitUntilDisposedError(BlocClass.name));
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
