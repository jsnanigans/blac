/**
 * Branded types for type-safe IDs and versions
 * These types ensure that IDs and versions can't be accidentally mixed up
 */

/** Unique symbol for branding */
declare const brand: unique symbol;

/** Type branding utility */
export type Brand<T, B> = T & { [brand]: B };

/** Generic branded ID type */
export type BrandedId<B> = Brand<string, B>;

/** Branded subscription ID type */
export type SubscriptionId = BrandedId<'SubscriptionId'>;

/** Branded instance ID type */
export type InstanceId = Brand<string, 'InstanceId'>;

/** Branded version number type */
export type Version = Brand<number, 'Version'>;

/** Branded generation number type */
export type Generation = Brand<number, 'Generation'>;

/** Create a subscription ID */
export function subscriptionId(id: string): SubscriptionId {
  return id as SubscriptionId;
}

/** Create an instance ID */
export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}

/** Create a version number */
export function version(v: number): Version {
  return v as Version;
}

/** Create a generation number */
export function generation(g: number): Generation {
  return g as Generation;
}

/** Increment a version */
export function incrementVersion(v: Version): Version {
  return version(v + 1);
}

/** Increment a generation */
export function incrementGeneration(g: Generation): Generation {
  return generation(g + 1);
}
