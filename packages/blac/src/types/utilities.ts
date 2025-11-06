import type { StateContainer } from '../core/StateContainer';

export type ExtractState<T> = T extends StateContainer<infer S> ? S : never;

export type ExtractConstructorArgs<T> = T extends new (...args: infer P) => any
  ? P
  : never[];

export type BlocConstructor<TBloc extends StateContainer<any>> = (new (
  ...args: any[]
) => TBloc) & {
  resolve(instanceKey?: string, ...args: any[]): TBloc;
  get(instanceKey?: string): TBloc;
  getSafe(
    instanceKey?: string,
  ): { error: Error; instance: null } | { error: null; instance: TBloc };
  release(instanceKey?: string): void;
  isolated: boolean;
  keepAlive: boolean;
};
