import BlocBase from "./BlocBase";

export type ValueType<T extends BlocBase<any>> = T extends BlocBase<infer U>
  ? U
  : never;

export type BlocClass<T> = new (...args: never[]) => T;

export type BlocHookData<T extends BlocBase<any>> = [
  value: ValueType<T>,
  instance: T
];

export interface BlocOptions {
  persistKey?: string;
  persistData?: boolean;
}

export interface ChangeEvent<T> {
  currentState: T;
  nextState: T;
}

export interface TransitionEvent<T, E> {
  currentState: T;
  event: E;
  nextState: T;
}
