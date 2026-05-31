import { Cubit } from './core/Cubit';
import { StateContainerRegistry } from './core/StateContainerRegistry';
import { APPLY_DEPS } from './core/symbols';
import { ensure, getRegistry, setRegistry } from './registry';
import { resolveInstanceKey } from './registry/acquire';
import type {
  ExtractArgs,
  ExtractDeps,
  ExtractState,
  StateContainerConstructor,
} from './types/utilities';

/** Synthetic owner id used by test helpers for pre-wired deps. */
const TESTING_DEPS_OWNER = 'testing-deps';

declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;

// --- createTestRegistry + withTestRegistry ---

export function createTestRegistry(): StateContainerRegistry {
  return new StateContainerRegistry();
}

export function withTestRegistry<T>(
  fn: (registry: StateContainerRegistry) => T,
): T {
  const previous = getRegistry();
  const testRegistry = createTestRegistry();
  setRegistry(testRegistry);
  try {
    const result = fn(testRegistry);
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          setRegistry(previous);
          return value;
        },
        (error) => {
          setRegistry(previous);
          throw error;
        },
      ) as T;
    }
    setRegistry(previous);
    return result;
  } catch (error) {
    setRegistry(previous);
    throw error;
  }
}

// --- blacTestSetup ---

export function blacTestSetup(): void {
  let savedRegistry: StateContainerRegistry;
  beforeEach(() => {
    savedRegistry = getRegistry();
    setRegistry(new StateContainerRegistry());
  });
  afterEach(() => {
    setRegistry(savedRegistry);
  });
}

// --- registerOverride + overrideEnsure ---

export function registerOverride<T extends StateContainerConstructor>(
  BlocClass: T,
  instance: InstanceType<T>,
  args?: ExtractArgs<T>,
): void {
  const registry = getRegistry();
  const key = resolveInstanceKey(BlocClass, args);
  registry.insertInstance(
    BlocClass,
    key,
    instance,
    new Map([['testing-override', 1]]),
  );
}

export function overrideEnsure<T extends StateContainerConstructor, R>(
  BlocClass: T,
  instance: InstanceType<T>,
  fn: () => R,
  args?: ExtractArgs<T>,
): R {
  return withTestRegistry(() => {
    registerOverride(BlocClass, instance, args);
    return fn();
  });
}

// --- createCubitStub ---

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export interface CubitStubOptions<T extends StateContainerConstructor> {
  state?: ExtractState<T> extends Record<string, any>
    ? Partial<ExtractState<T>>
    : ExtractState<T>;
  methods?: Partial<
    Record<MethodKeys<InstanceType<T>>, (...args: any[]) => any>
  >;
  /**
   * Args to pass to init(). If the bloc's Args type is not void, supplying
   * args here causes initConfig({ args }) to be called so init() runs.
   */
  args?: ExtractArgs<T> extends void ? never : ExtractArgs<T>;
  /**
   * Deps slice to pre-wire via the core [APPLY_DEPS] path (synthetic owner
   * "testing-deps"), so onDepsChanged fires during tests.
   */
  deps?: Partial<ExtractDeps<T>>;
}

export function createCubitStub<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: CubitStubOptions<T>,
): InstanceType<T> {
  const instance = new BlocClass() as InstanceType<T>;

  // Run init() if args are supplied — goes through the same initConfig path
  // that the registry uses, so lifecycle hooks fire correctly.
  if (options?.args != null) {
    instance.initConfig({ args: options.args });
  }

  if (options?.state != null) {
    if (instance instanceof Cubit) {
      const currentState = instance.state;
      if (
        typeof currentState === 'object' &&
        currentState !== null &&
        typeof options.state === 'object' &&
        options.state !== null
      ) {
        instance.patch(options.state as any);
      } else {
        instance.emit(options.state as any);
      }
    }
  }
  if (options?.methods) {
    for (const [key, impl] of Object.entries(options.methods)) {
      if (typeof impl === 'function') {
        (instance as any)[key] = impl;
      }
    }
  }

  // Pre-wire deps via the core merge path so onDepsChanged fires in tests.
  if (options?.deps != null) {
    (instance as any)[APPLY_DEPS](TESTING_DEPS_OWNER, options.deps);
  }

  return instance;
}

// --- withBlocState ---

export function withBlocState<T extends StateContainerConstructor>(
  BlocClass: T,
  state: ExtractState<T> extends Record<string, any>
    ? Partial<ExtractState<T>>
    : ExtractState<T>,
  args?: ExtractArgs<T>,
): InstanceType<T> {
  const instance = ensure(BlocClass, { args });
  if (instance instanceof Cubit) {
    const currentState = instance.state;
    if (
      typeof currentState === 'object' &&
      currentState !== null &&
      typeof state === 'object' &&
      state !== null
    ) {
      instance.patch(state as any);
    } else {
      instance.emit(state as any);
    }
  }
  return instance;
}

// --- withBlocMethod ---

export function withBlocMethod<T extends StateContainerConstructor>(
  BlocClass: T,
  methodName: keyof InstanceType<T>,
  impl: (...args: any[]) => any,
  args?: ExtractArgs<T>,
): InstanceType<T> {
  const instance = ensure(BlocClass, { args });
  (instance as any)[methodName] = impl;
  return instance;
}

// --- flushBlocUpdates ---

/**
 * Drain pending microtasks so any channel-flushed effects (subscribe()
 * listeners, `onSystemEvent('stateChanged')` handlers, plugin hooks) run
 * before the next assertion.
 *
 * The default `MicrotaskScheduler` coalesces emits within a tick; tests
 * that emit and then assert on listener side-effects need `await flush()`
 * (or its alias `flushBlocUpdates()`) between the two.
 */
export async function flush(): Promise<void> {
  // queueMicrotask wins the race against the channel's own queued flush —
  // we resolve after the channel has drained its current pending flush.
  await Promise.resolve();
  await Promise.resolve();
}

/** @deprecated Alias for `flush()`. */
export async function flushBlocUpdates(): Promise<void> {
  await flush();
}
