import type { BlocBase } from "./BlocBase";

export type BlocClassNoParams<B> = new (args: never[]) => B;
export type BlocClass<B> = new (...args: never[]) => B;
export type ValueType<B extends BlocBase<any>> = B extends BlocBase<infer U>
  ? U
  : never;
