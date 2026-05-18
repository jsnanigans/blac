/**
 * v1 `BlacEvent` alias. v1's event-driven `Bloc` is not used in app code, so
 * this is a structural placeholder for type imports only.
 */
export type BlacEvent<T extends string = string, P = unknown> = {
  type: T;
  payload?: P;
};
