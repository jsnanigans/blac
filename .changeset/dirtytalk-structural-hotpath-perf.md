---
"@dirtytalk/structural": patch
---

Two internal hot-path rewrites, no public shape change:

- `PathInterner.ancestorIds` memo is now length-versioned instead of fully
  cleared on every `intern()` — a cached entry recomputes only when it is
  re-queried after the interner has grown, moving the cost from O(all
  cached entries) per intern to O(1) amortized per read. A dev-only
  warning fires once when an interner crosses 5000 paths (unbounded
  dynamic keys). Staleness guarantees are identical.
- `deepMerge` now clones lazily: the merged object is created only on the
  first actually-changed key, and a fully no-op merge returns the target
  by reference, preserving reference identity for unchanged state.
