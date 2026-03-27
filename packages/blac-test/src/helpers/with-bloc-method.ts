import {
  type StateContainerConstructor,
  ensure,
} from '@blac/core';

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
