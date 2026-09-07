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

  /**
   * Optional accumulate-in-place variant of `union`, and the **one documented
   * exception** to the purity contract above: it MAY mutate and return `acc`.
   *
   * `DirtyChannel` calls this only for its private accumulator, which it owns
   * outright and replaces with a fresh `empty()` before handing the previous
   * value to subscribers — so no caller can observe the mutation.
   *
   * Implement it when `union` allocates: accumulating N same-tick marks with a
   * copying `union` is O(N²) in total copying, which an in-place add makes
   * O(N). `b` must NOT be mutated. When absent, the channel falls back to
   * `union`, so implementing it is purely an optimization.
   */
  unionInto?(acc: Region, b: Region): Region;
}
