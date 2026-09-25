/**
 * Build an instance id: `${prefix}:${affix}` when an affix is given (the
 * registry passes the instance key), otherwise `${prefix}:${timestamp}_${random}`.
 *
 * Ids are not unique: same-named classes share an id for the same affix, and
 * the lazy `$blac.id` of an unregistered instance is always `${prefix}:main`.
 *
 * @example
 * ```ts
 * generateSimpleId('CounterBloc', 'default'); // "CounterBloc:default"
 * generateSimpleId('CounterBloc'); // "CounterBloc:1698765432100_a3k9d7f2q"
 * ```
 */
export function generateSimpleId(prefix: string, affix?: string): string {
  if (affix) {
    return `${prefix}:${affix}`;
  }
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}:${timestamp}_${random}`;
}
