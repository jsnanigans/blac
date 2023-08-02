import { Bloc } from "./Bloc";
import { BlocBase } from "./BlocBase";
import { Cubit } from "./Cubit";

export type BlocClassNoParams<B> = new (args: never[]) => B;
// export type BlocConstructor<T> = typeof BlocBase<T>["constructor"];
export type BlocBaseAbstract = typeof Bloc<any, any> | typeof Cubit<any>;
export type BlocConstructor<B> = new (...args: never[]) => B;
export type ValueType<B extends BlocBase<any>> = B extends BlocBase<infer U>
  ? U
  : never;
