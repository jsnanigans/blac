import { Cubit } from './core/Cubit';
import {
  type InstanceEntry,
  StateContainerRegistry,
} from './core/StateContainerRegistry';
import { ensure, getRegistry, setRegistry } from './registry';
import type {
  ExtractState,
  StateContainerConstructor,
} from './types/utilities';

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

const DEFAULT_KEY = 'default';

export function registerOverride<T extends StateContainerConstructor>(
  BlocClass: T,
  instance: InstanceType<T>,
  instanceKey: string = DEFAULT_KEY,
): void {
  const registry = getRegistry();
  const existing = registry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: false,
  });
  if (existing !== instance && !existing.isDisposed) {
    existing.dispose();
  }
  const instancesMap = registry.getInstancesMap(BlocClass);
  const entry: InstanceEntry<InstanceType<T>> = { instance, refCount: 1 };
  instancesMap.set(instanceKey, entry);
}

export function overrideEnsure<T extends StateContainerConstructor, R>(
  BlocClass: T,
  instance: InstanceType<T>,
  fn: () => R,
  instanceKey: string = DEFAULT_KEY,
): R {
  return withTestRegistry(() => {
    registerOverride(BlocClass, instance, instanceKey);
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
}

export function createCubitStub<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: CubitStubOptions<T>,
): InstanceType<T> {
  const instance = new BlocClass() as InstanceType<T>;
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
  return instance;
}

// --- withBlocState ---

export function withBlocState<T extends StateContainerConstructor>(
  BlocClass: T,
  state: ExtractState<T> extends Record<string, any>
    ? Partial<ExtractState<T>>
    : ExtractState<T>,
  instanceKey?: string,
): InstanceType<T> {
  const instance = ensure(BlocClass, instanceKey);
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
  instanceKey?: string,
): InstanceType<T> {
  const instance = ensure(BlocClass, instanceKey);
  (instance as any)[methodName] = impl;
  return instance;
}

// --- flushBlocUpdates ---

export async function flushBlocUpdates(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
