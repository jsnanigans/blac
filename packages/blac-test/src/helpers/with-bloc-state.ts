import {
  type StateContainerConstructor,
  type ExtractState,
  Cubit,
  ensure,
} from '@blac/core';

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
