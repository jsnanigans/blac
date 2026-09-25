import type { Cubit } from './core/Cubit';
import { getStateChangeCount } from './core/StateContainer';
import { StateContainerRegistry } from './core/StateContainerRegistry';
import { APPLY_DEPS, INIT_CONFIG } from './core/symbols';
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
  let testRegistry: StateContainerRegistry;
  beforeEach(() => {
    savedRegistry = getRegistry();
    testRegistry = createTestRegistry();
    setRegistry(testRegistry);
  });
  afterEach(() => {
    testRegistry.clearAll();
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
  /** Args passed to init(). */
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
  instance[INIT_CONFIG]({ args: options?.args });

  if (options?.state != null) {
    applyState(instance, options.state);
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
  applyState(instance, state);
  return instance;
}

// emit/patch are protected on StateContainer; Cubit only makes them public.
function applyState(instance: object, state: unknown): void {
  const target = instance as Cubit<any>;
  if (
    typeof target.state === 'object' &&
    target.state !== null &&
    typeof state === 'object' &&
    state !== null
  ) {
    target.patch(state);
  } else {
    target.emit(state as any);
  }
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

// --- flush ---

/**
 * Drain pending microtasks so any channel-flushed effects (channel
 * subscribers, `onSystemEvent('stateChanged')` handlers, plugin hooks) run
 * before the next assertion.
 *
 * The default `MicrotaskScheduler` coalesces emits within a tick; tests
 * that emit and then assert on subscriber side-effects need `await flush()`
 * between the two. A subscriber can emit again, so this keeps draining
 * until a round passes with no new state change.
 */
export async function flush(): Promise<void> {
  for (let i = 0; i < MAX_FLUSH_ROUNDS; i++) {
    const before = getStateChangeCount();
    // The second tick lets microtasks queued by the drain itself (registry
    // `stateChanged` delivery) run too.
    await Promise.resolve();
    await Promise.resolve();
    if (getStateChangeCount() === before) return;
  }
  throw new Error(
    `[blac] flush(): state was still changing after ${MAX_FLUSH_ROUNDS} rounds`,
  );
}

const MAX_FLUSH_ROUNDS = 100;
