import {
  ALL_PATHS,
  type PathInterner,
  type PathSet,
} from '@dirtytalk/structural';

/**
 * Add an ancestor-watch id for every ancestor of every tracked leaf, so a
 * `patch` that replaces a parent atomically (e.g. the array `items`) wakes a
 * consumer that read a child (`items.length`).
 *
 * Ancestor-watch ids only match marks the source emits for atomic
 * replacements, never a plain-object pulse-up: `{'user.email'}` does not wake
 * when a sibling `user.name` changes. The `''` root is never added; a root
 * change already marks `ALL_PATHS`.
 *
 * Returns `paths` itself when no leaf has an ancestor.
 */
export function expandWithAncestors(
  paths: PathSet,
  interner: PathInterner,
): PathSet {
  if (paths === ALL_PATHS) return ALL_PATHS;
  const leafPaths = paths as Set<number>;
  let expanded: Set<number> | undefined;
  for (const id of leafPaths) {
    const watch = interner.ancestorWatchIds(id);
    if (watch.length === 0) continue;
    expanded ??= new Set<number>(leafPaths);
    for (let i = 0; i < watch.length; i++) expanded.add(watch[i]);
  }
  return expanded ?? paths;
}
