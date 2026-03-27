import type {
  StateContainerConstructor,
  ExtractState,
} from '@blac/core';
import { Cubit } from '@blac/core';

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export interface CubitStubOptions<T extends StateContainerConstructor> {
  state?: ExtractState<T> extends Record<string, any>
    ? Partial<ExtractState<T>>
    : ExtractState<T>;
  methods?: Partial<Record<MethodKeys<InstanceType<T>>, (...args: any[]) => any>>;
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
