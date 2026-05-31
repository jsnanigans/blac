/**
 * Re-render attribution helpers.
 *
 * Mirrors (approximately) the engine's path intersection: a consumer wakes when
 * one of its watched paths is the same as, an ancestor of, or a descendant of a
 * changed path. Segment-aware so `'item'` does not match `'items'`.
 */

/** True when `a` equals `b` or is a (dotted) segment-ancestor of `b`. */
const isAncestorOrSelf = (a: string, b: string): boolean =>
  a === b || b.startsWith(a + '.');

/** True when watched path `w` overlaps changed path `c` in either direction. */
const pathsOverlap = (w: string, c: string): boolean =>
  isAncestorOrSelf(w, c) || isAncestorOrSelf(c, w);

/**
 * Did a consumer watching `watched` re-render given the change touched
 * `changed`? `'all'` on either side matches everything.
 */
export function consumerWoke(
  watched: string[] | 'all',
  changed: string[] | 'all' | undefined,
): boolean {
  if (changed === undefined) return false;
  if (watched === 'all' || changed === 'all') return true;
  if (watched.length === 0 || changed.length === 0) return false;
  for (const w of watched) {
    for (const c of changed) {
      if (pathsOverlap(w, c)) return true;
    }
  }
  return false;
}

/**
 * The subset of `watched` paths that overlap the `changed` set — i.e. the
 * specific paths responsible for this consumer's re-render. Returns an empty
 * set when nothing matched, and matches everything in `watched` when `changed`
 * is `'all'`.
 */
export function matchedPaths(
  watched: string[] | 'all',
  changed: string[] | 'all' | undefined,
): ReadonlySet<string> {
  if (watched === 'all' || changed === undefined) return new Set();
  if (changed === 'all') return new Set(watched);
  const out = new Set<string>();
  for (const w of watched) {
    if (changed.some((c) => pathsOverlap(w, c))) out.add(w);
  }
  return out;
}
