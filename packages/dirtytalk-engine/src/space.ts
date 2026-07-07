/**
 * The algebra of "what changed" and "what I care about."
 *
 * Both are values of type `Region`. Implementations live in consuming
 * libraries (e.g. RectSpace in a canvas renderer, PathSetSpace in blac).
 *
 * Contracts:
 *   - `union(empty(), r)` equals `r`.
 *   - `intersects(empty(), _)` returns false.
 *   - All operations must be pure: same inputs, same output, no side effects.
 */
export interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;
  intersects(interest: Region, dirty: Region): boolean;
}
