import { ensure } from '../registry';
import type {
  StateContainerConstructor,
  StateContainerInstance,
} from '../types/utilities';
import { BLAC_DEFAULTS } from '../constants';
import {
  createState,
  startTracking,
  stopTracking,
  createTrackingProxy,
  type TrackingProxyState,
} from '../tracking/tracking-proxy';
import { DependencyManager } from '../tracking/dependency-manager';
import { resolveDependencies } from '../tracking/resolve-dependencies';

const STOP: unique symbol = Symbol('watch.STOP');

const BLOC_REF_MARKER = Symbol('BlocRef');

/**
 * Reference to a specific bloc instance by class and instance ID.
 */
export interface BlocRef<T extends StateContainerConstructor> {
  [BLOC_REF_MARKER]: true;
  blocClass: T;
  instanceId: string;
}

/**
 * Create a reference to a specific bloc instance.
 *
 * @example
 * ```ts
 * watch(instance(UserBloc, 'user-123'), (userBloc) => {
 *   console.log(userBloc.state.name);
 * });
 * ```
 */
export function instance<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceId: string,
): BlocRef<T> {
  return {
    [BLOC_REF_MARKER]: true,
    blocClass: BlocClass,
    instanceId,
  };
}

function isBlocRef(
  input: unknown,
): input is BlocRef<StateContainerConstructor> {
  return (
    typeof input === 'object' && input !== null && BLOC_REF_MARKER in input
  );
}

type BlocInput = StateContainerConstructor | BlocRef<StateContainerConstructor>;

type ExtractInstance<T> =
  T extends BlocRef<infer C>
    ? InstanceType<C>
    : T extends StateContainerConstructor
      ? InstanceType<T>
      : never;

type ExtractInstances<T extends readonly BlocInput[]> = {
  [K in keyof T]: ExtractInstance<T[K]>;
};

type StopSymbol = typeof STOP;

/**
 * Watch function signature for single bloc.
 */
export interface WatchSingleFn {
  <T extends StateContainerConstructor>(
    bloc: T | BlocRef<T>,
    callback: (bloc: InstanceType<T>) => void | StopSymbol,
  ): () => void;

  STOP: StopSymbol;
}

/**
 * Watch function signature for multiple blocs.
 */
export interface WatchMultipleFn {
  <T extends readonly BlocInput[]>(
    blocs: T,
    callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
  ): () => void;

  STOP: StopSymbol;
}

/**
 * Combined watch function type.
 */
export interface WatchFn extends WatchSingleFn {
  <T extends readonly BlocInput[]>(
    blocs: T,
    callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
  ): () => void;
}

function resolveBloc(input: BlocInput): StateContainerInstance {
  if (isBlocRef(input)) {
    return ensure(input.blocClass, input.instanceId);
  }
  return ensure(input, BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY);
}

function isArray(input: unknown): input is readonly BlocInput[] {
  return Array.isArray(input);
}

/**
 * Watch one or more blocs for state changes.
 * Automatically tracks state property and getter accesses.
 *
 * @example Single bloc
 * ```ts
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   console.log(userBloc.state.name);
 *   console.log(userBloc.fullName); // getter also tracked
 * });
 * ```
 *
 * @example Multiple blocs
 * ```ts
 * const unwatch = watch(
 *   [UserBloc, SettingsBloc] as const,
 *   ([userBloc, settingsBloc]) => {
 *     console.log(userBloc.state.name, settingsBloc.state.theme);
 *   }
 * );
 * ```
 *
 * @example With specific instance
 * ```ts
 * const unwatch = watch(
 *   instance(UserBloc, 'user-123'),
 *   (userBloc) => {
 *     console.log(userBloc.state.name);
 *   }
 * );
 * ```
 *
 * @example Stop watching from callback
 * ```ts
 * const unwatch = watch(UserBloc, (userBloc) => {
 *   if (userBloc.state.done) {
 *     return watch.STOP;
 *   }
 * });
 * ```
 */
function watchImpl<T extends StateContainerConstructor>(
  bloc: T | BlocRef<T>,
  callback: (bloc: InstanceType<T>) => void | StopSymbol,
): () => void;

function watchImpl<T extends readonly BlocInput[]>(
  blocs: T,
  callback: (blocs: ExtractInstances<T>) => void | StopSymbol,
): () => void;

function watchImpl(
  blocsOrBloc: BlocInput | readonly BlocInput[],
  callback: (blocsOrBloc: any) => void | StopSymbol,
): () => void {
  const isSingle = !isArray(blocsOrBloc);
  const inputs = isSingle ? [blocsOrBloc] : blocsOrBloc;

  const instances = inputs.map(resolveBloc);

  const tracker: TrackingProxyState = createState();
  const proxiedInstances = instances.map((inst) =>
    createTrackingProxy(inst, tracker),
  );

  const externalDepsManager = new DependencyManager();

  let disposed = false;
  let isRunning = false;
  let pendingRerun = false;
  const primarySubscriptions: (() => void)[] = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    primarySubscriptions.forEach((unsub) => unsub());
    externalDepsManager.cleanup();
  };

  const runCallback = () => {
    if (disposed) return;

    if (isRunning) {
      pendingRerun = true;
      return;
    }
    isRunning = true;

    startTracking(tracker);

    let result: void | StopSymbol;
    try {
      const arg = isSingle ? proxiedInstances[0] : proxiedInstances;
      result = callback(arg);
    } finally {
      const externalDeps = new Set<StateContainerInstance>();
      for (const inst of instances) {
        const deps = stopTracking(tracker, inst);
        for (const dep of deps) {
          externalDeps.add(dep);
        }
        for (const dep of resolveDependencies(inst)) {
          externalDeps.add(dep);
        }
      }

      for (const inst of instances) {
        externalDeps.delete(inst);
      }

      externalDepsManager.sync(externalDeps, runCallback);
      isRunning = false;
    }

    if (result === STOP) {
      cleanup();
      return;
    }

    if (pendingRerun) {
      pendingRerun = false;
      runCallback();
    }
  };

  const onChange = () => {
    if (disposed) return;
    runCallback();
  };

  for (const inst of instances) {
    primarySubscriptions.push(inst.subscribe(onChange));
  }

  runCallback();

  return cleanup;
}

export const watch: WatchFn = Object.assign(watchImpl, { STOP }) as WatchFn;
