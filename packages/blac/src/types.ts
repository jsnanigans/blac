export type BlocClassNoParams<B> = new (args: never[]) => B;
export type BlocClass<B> = new (...args: never[]) => B;
