/**
 * Branded types for type-safe IDs
 * These types ensure that IDs can't be accidentally mixed up
 */

/**
 * Helper type for cases where any object type is acceptable
 * Used sparingly only where type cannot be more specific
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export type AnyObject = any;

/** Unique symbol for branding */
declare const brand: unique symbol;

/** Type branding utility */
export type Brand<T, B> = T & { [brand]: B };

/** Generic branded ID type */
export type BrandedId<B> = Brand<string, B>;

/** Branded instance ID type */
export type InstanceId = Brand<string, 'InstanceId'>;

/** Create an instance ID */
export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}
