export type AsyncState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: unknown };

export const idle = <T>(): AsyncState<T> => ({ status: 'idle' });
export const loading = <T>(data?: T): AsyncState<T> => ({
  status: 'loading',
  data,
});
export const success = <T>(data: T): AsyncState<T> => ({
  status: 'success',
  data,
});
export const failure = <T>(error: unknown, data?: T): AsyncState<T> => ({
  status: 'error',
  error,
  data,
});

export type DataOf<A> = [A] extends [AsyncState<infer T>] ? T : never;

/** Keys of `S` whose value is an {@link AsyncState}. */
export type SlotKey<S> = {
  [K in keyof S]: S[K] extends AsyncState<any> ? K : never;
}[keyof S];
