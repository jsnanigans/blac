declare const brand: unique symbol;

/**
 * Nominal type helper, preventing accidental confusion between similar
 * primitive types.
 * @typeParam T - The base type
 * @typeParam B - The brand identifier
 */
export type Brand<T, B> = T & { [brand]: B };

/**
 * Branded string type for type-safe IDs.
 * @typeParam B - The brand identifier
 */
export type BrandedId<B> = Brand<string, B>;

/** Branded string type for state container instance IDs. */
export type InstanceId = Brand<string, 'InstanceId'>;

export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}
