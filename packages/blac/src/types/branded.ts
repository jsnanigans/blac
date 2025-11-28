declare const brand: unique symbol;

/**
 * Utility type for creating branded/nominal types.
 * Prevents accidental type confusion between similar primitive types.
 * @template T - The base type
 * @template B - The brand identifier
 */
export type Brand<T, B> = T & { [brand]: B };

/**
 * Branded string type for type-safe IDs.
 * @template B - The brand identifier
 */
export type BrandedId<B> = Brand<string, B>;

/**
 * Branded string type for state container instance IDs
 */
export type InstanceId = Brand<string, 'InstanceId'>;

/**
 * Create a branded InstanceId from a string
 * @param id - The string ID to brand
 * @returns Branded InstanceId
 */
export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}
