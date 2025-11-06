declare const brand: unique symbol;

export type Brand<T, B> = T & { [brand]: B };
export type BrandedId<B> = Brand<string, B>;
export type InstanceId = Brand<string, 'InstanceId'>;

export function instanceId(id: string): InstanceId {
  return id as InstanceId;
}
