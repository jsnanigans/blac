# 01 — `PathSet` + `PathSetSpace`

**Phase:** 1 (parallel — owns disjoint files from other Phase 1 tasks)
**Model:** Sonnet 4.6
**Effort:** low (small surface, but the `ALL_PATHS` sentinel and `Space` contracts need care)
**Estimated touch:** 2 files

---

## Goal

Implement the `PathSet` representation, helpers (`emptyPathSet`, `pathSetUnion`, `pathSetEquals`), and the `PathSetSpace: Space<PathSet>` engine binding.

`PathSet` is the `Region` type for the structural instantiation of `@dirtytalk/engine`. A `DirtyChannel<PathSet>` will mark/flush these sets; subscribers will intersect their own `PathSet` against the dirty set to decide whether to fire.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "PathId interning" (representation choice) and § "Single-consumer skip" (the `allPathsSentinel` semantics).
2. `dirtytalk/01-engine.md` § "Layer 2 — `Space<Region>`" — the contract `PathSetSpace` must satisfy.
3. `packages/dirtytalk-engine/src/space.ts` — the `Space<R>` interface.
4. `packages/dirtytalk-structural/src/path-set.ts` — current stub.
5. `packages/dirtytalk-structural/src/types.ts` — `PathId = number`.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/path-set.ts        (replace stub body)
packages/dirtytalk-structural/src/path-set.test.ts   (create)
```

**Do not touch:** anything else. In particular, don't reach into `path-interner.ts` (parallel task) or `tracker.ts` / `diff.ts` (Phase 2).

---

## Spec

### Types

```ts
import type { PathId } from './types';
import type { Space } from '@dirtytalk/engine';

export const ALL_PATHS: unique symbol = Symbol.for(
  '@dirtytalk/structural/ALL_PATHS',
);
export type AllPaths = typeof ALL_PATHS;
export type PathSet = Set<PathId> | AllPaths;
```

`ALL_PATHS` is a sentinel that means _"everything is dirty"_ — used by `emit`/`update` when there's a single consumer (skipping the source-diff is the win) and as a fast-path for any caller that wants to declare blanket interest.

### Helper functions

```ts
export const emptyPathSet = (): PathSet => /* fresh empty Set<PathId> */;
export const pathSetUnion = (a: PathSet, b: PathSet): PathSet => /* … */;
export const pathSetEquals = (a: PathSet, b: PathSet): boolean => /* … */;
```

**Behaviour:**

- `emptyPathSet()` returns a **new** empty `Set<PathId>` on every call. Never share an empty Set instance — callers may mutate.
- `pathSetUnion`:
  - If either operand is `ALL_PATHS`, result is `ALL_PATHS`.
  - Otherwise, returns a **new** `Set<PathId>` containing the union of the two sets. Never mutate inputs.
  - If both are empty, return a fresh empty set (don't return one of the inputs by reference; that violates "don't share").
- `pathSetEquals`:
  - `ALL_PATHS` equals only `ALL_PATHS`.
  - Two `Set<PathId>` instances are equal iff they have the same `size` and every element of one is in the other.
  - `ALL_PATHS` never equals an empty Set (semantically different: "everything" vs "nothing").

### `PathSetSpace: Space<PathSet>`

Must satisfy the contract in `dirtytalk/01-engine.md`:

```ts
export const PathSetSpace: Space<PathSet> = {
  empty: () => emptyPathSet(),

  isEmpty: (r: PathSet): boolean =>
    r !== ALL_PATHS && (r as Set<PathId>).size === 0,

  union: (a: PathSet, b: PathSet): PathSet => pathSetUnion(a, b),

  intersects: (interest: PathSet, dirty: PathSet): boolean => {
    if (interest === ALL_PATHS && dirty === ALL_PATHS) return true;
    if (interest === ALL_PATHS) return !PathSetSpace.isEmpty(dirty);
    if (dirty === ALL_PATHS) return !PathSetSpace.isEmpty(interest);
    // Both are Sets. Iterate the smaller, lookup in the larger.
    const [small, large] =
      (interest as Set<PathId>).size <= (dirty as Set<PathId>).size
        ? [interest as Set<PathId>, dirty as Set<PathId>]
        : [dirty as Set<PathId>, interest as Set<PathId>];
    for (const id of small) if (large.has(id)) return true;
    return false;
  },
};
```

`intersects` is the hot path — called once per (consumer, flush) pair. The `size`-based small/large pick keeps it `O(min(|a|, |b|))`.

---

## Tests — `src/path-set.test.ts`

Required cases:

### `emptyPathSet`

1. Returns a `Set<PathId>` (not `ALL_PATHS`) with `size === 0`.
2. Returns a **fresh** instance on each call (`expect(emptyPathSet()).not.toBe(emptyPathSet())`).

### `pathSetUnion`

3. Union of two disjoint sets contains all members of both, doesn't mutate inputs.
4. Union with empty equals the other (by value, not reference) and is a fresh Set.
5. Union with `ALL_PATHS` (either side) returns `ALL_PATHS`.
6. `ALL_PATHS` union `ALL_PATHS` returns `ALL_PATHS`.

### `pathSetEquals`

7. Two empty Sets are equal.
8. Same-content Sets (different instances) are equal.
9. Different-content Sets are not equal.
10. `ALL_PATHS` equals `ALL_PATHS`.
11. `ALL_PATHS` does **not** equal an empty Set.
12. `ALL_PATHS` does **not** equal a non-empty Set.

### `PathSetSpace`

13. `empty()` returns an empty `Set<PathId>`.
14. `isEmpty(empty())` is `true`.
15. `isEmpty(ALL_PATHS)` is `false`.
16. `isEmpty(new Set([1]))` is `false`.
17. `union(empty(), r)` equals `r` for both `r = Set` and `r = ALL_PATHS`.
18. `intersects(empty(), anything)` is `false`.
19. `intersects(Set, Set)` — overlapping returns `true`; disjoint returns `false`.
20. `intersects(ALL_PATHS, non-empty Set)` is `true`.
21. `intersects(ALL_PATHS, empty Set)` is `false`.
22. `intersects(ALL_PATHS, ALL_PATHS)` is `true`.
23. `intersects(non-empty Set, ALL_PATHS)` is `true`. (Symmetric.)

Use small numeric IDs (e.g. `1, 2, 3`) in tests — no need to use a `PathInterner`. That coupling lives in Phase 2.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (or only contains files owned by other Phase 1 tasks that haven't committed yet — see note below).
   - Phase 0 commit `chore(dirtytalk-structural): scaffold package` is in `git log`.

2. **Implement.** Replace the stub in `path-set.ts`. ~40 lines incl. types.

3. **Verify.**
   - From `packages/dirtytalk-structural/`: `vp run typecheck`, `vp run lint`, `vp run format:check`. All green.

4. **Test.**
   - `vp run test src/path-set.test.ts` — must pass.
   - `vp run test` — full package suite still green.

5. **Commit.**

   ```
   feat(dirtytalk-structural): implement PathSet + PathSetSpace
   ```

   No body. No co-author.

### Note on parallel Phase 1 execution

If another Phase 1 agent has committed (`feat(dirtytalk-structural): implement PathInterner` etc.) before you start, `git log` will show those commits and `git status` will still be clean. That's fine — proceed. If a parallel agent has uncommitted changes on the same checkout, **stop and report** rather than committing on top.

---

## Acceptance criteria

- [ ] `ALL_PATHS` exported as a `unique symbol`.
- [ ] `PathSet` type union of `Set<PathId>` and `AllPaths`.
- [ ] `emptyPathSet`, `pathSetUnion`, `pathSetEquals` implemented per spec.
- [ ] `PathSetSpace` satisfies `Space<PathSet>` contract from engine.
- [ ] All tests pass; `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **Don't share an empty Set across calls.** Callers may stash it and `.add` later. Each `emptyPathSet()` must allocate.
- **Don't mutate inputs in `union`.** Always allocate a fresh Set.
- **`ALL_PATHS` equality is identity (===)**, not structural. Use `Symbol.for(...)` so it survives bundling/duplication; comparing by reference is the simplest correct check.
- **`isEmpty(ALL_PATHS)` is `false`.** "All paths" is not empty. Get this wrong and the channel will short-circuit deliveries.
- **`intersects` small/large pick matters.** Don't iterate the larger Set. Tests don't catch this (correctness-equivalent), but the perf impact is real.
- **Don't pre-allocate** `pathSetUnion(empty, X)` to return `X` directly. That aliases — the next mutation of `X` would silently mutate the union too. Always copy.
- **Don't use `bigint` here.** Bitset perf upgrade is deferred (decision in `03-blac.md` § 1).
- **Don't import `PathId` from anywhere but `./types`.** It's the canonical home.
