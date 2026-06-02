# 01 — `RectSpace`

**Phase:** 1 (parallel — owns disjoint files from other Phase 1 tasks)
**Model:** Sonnet 4.6
**Effort:** low (small surface; `Space` contracts need care)
**Estimated touch:** 2 files

---

## Goal

Implement `RectSpace: Space<DirtyRegion>` — the engine binding for the spatial package. `DirtyRegion = readonly Damage[]` for v1 (plain array; spatial-index optimisation is v2).

Hot operations: `union` (called per `mark`), `intersects` (called per (subscriber, flush) pair). Both should be cheap; `intersects` is `O(|interest| × |dirty|)` for v1 — acceptable for ≤~100 entries per frame.

---

## Inputs — read these first

1. `dirtytalk/02-insomni.md` § "RectSpace" — full spec.
2. `dirtytalk/01-engine.md` § "Layer 2 — `Space<Region>`" — interface contract.
3. `packages/dirtytalk-engine/src/space.ts` — `Space<R>` shape.
4. `packages/dirtytalk-spatial/src/types.ts` — `Rect`, `Damage`, `DamageKind`, `DirtyRegion`.
5. `packages/dirtytalk-spatial/src/rect-space.ts` — current stub.
6. `~/.claude/CLAUDE.md` — commit format.

**Note on cross-Phase-1 dependency:** `RectSpace.intersects` needs `rectOverlaps`. Since both `rect.ts` and `rect-space.ts` are Phase 1 parallel tasks, **import the helper anyway** — the stub already exists with a `throw`. Your tests will fail until `01-rect` lands, which is fine: the contract is that all Phase 1 commits land before Phase 2 starts.

If `01-rect` has landed by the time you run, your tests pass. If not, your tests fail with "rectOverlaps: not implemented" — which is the correct signal that you're racing the other Phase 1 agent. Two options:

- **Wait** for the other agent's commit before running tests (preferred — it's a Phase 1 parallel task, both should finish before Phase 2).
- Implement `intersects` inline (inlined AABB test) and add a TODO to swap it once `rect.ts` lands.

Prefer waiting. The Phase 1 trio is meant to finish closely together.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/src/rect-space.ts        (replace stub body)
packages/dirtytalk-spatial/src/rect-space.test.ts   (create)
```

**Do not touch:** `rect.ts` (parallel task), anything else.

---

## Spec

### Implementation

```ts
import type { Space } from '@dirtytalk/engine';
import type { Damage, DirtyRegion } from './types';
import { rectOverlaps } from './rect';

export const RectSpace: Space<DirtyRegion> = {
  empty: () => [] as const,

  isEmpty: (r: DirtyRegion): boolean => r.length === 0,

  union: (a: DirtyRegion, b: DirtyRegion): DirtyRegion => {
    if (a.length === 0) return b;
    if (b.length === 0) return a;
    return [...a, ...b];
  },

  intersects: (interest: DirtyRegion, dirty: DirtyRegion): boolean => {
    if (interest.length === 0 || dirty.length === 0) return false;
    for (const i of interest) {
      for (const d of dirty) {
        if (rectOverlaps(i.rect, d.rect)) return true;
      }
    }
    return false;
  },
};
```

### Notes

- `empty()` returns `[] as const` — the cast is for the readonly contract; the actual array is a fresh allocation each call (so re-mark callers don't share an aliased empty array). Actually `[] as const` creates a fresh array each call — confirmed by TS semantics.
- `union` short-circuits when either operand is empty by returning the **other operand directly** (not a copy). This is safe because `DirtyRegion = readonly Damage[]` — nobody mutates. If you ever switch to a mutable `Damage[]`, this short-circuit aliases and must be replaced with a copy.
- `intersects` doesn't care about `DamageKind` — only `rect` overlap. Two `'paint'` damages and a `'paint'` interest intersect via geometry; a `'data'` damage in the same rect also "intersects" geometrically. Kind filtering is the render pipeline's job, not the space's.
- Don't allocate inside `intersects` (just iterate).

---

## Tests — `src/rect-space.test.ts`

Required cases:

1. `empty()` returns an empty array.
2. `empty()` returns a fresh array on each call (no shared reference). `expect(RectSpace.empty()).not.toBe(RectSpace.empty())`.
3. `isEmpty(empty())` is `true`.
4. `isEmpty([damage(...)])` is `false`.
5. `union(empty(), r)` equals `r` (by value). For the v1 short-circuit, `expect(RectSpace.union([], r)).toBe(r)` — same reference is allowed.
6. `union(r, empty())` equals `r`.
7. `union(a, b)` with two non-empty arrays produces a concatenated array of length `a.length + b.length`.
8. `union` does not mutate inputs.
9. `intersects(empty(), r)` is `false` for any `r` (including non-empty).
10. `intersects(r, empty())` is `false`.
11. `intersects` of overlapping single-damage arrays → `true`.
12. `intersects` of disjoint single-damage arrays → `false`.
13. `intersects` of multi-damage arrays where exactly one pair overlaps → `true`.
14. `intersects` of multi-damage arrays where no pair overlaps → `false`.
15. `intersects` doesn't care about `DamageKind` — same-rect, different-kind damages still intersect.

Helper:

```ts
const damage = (
  x: number,
  y: number,
  w: number,
  h: number,
  kind: DamageKind = 'paint',
): Damage => ({ rect: { x, y, w, h }, kind });
```

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - Phase 0 commit in log.
   - `feat(dirtytalk-spatial): implement Rect geometry helpers` ideally also in log. If not, see "Note on cross-Phase-1 dependency" above — prefer to wait.

2. **Implement.** Replace stub. ~25 lines.

3. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/rect-space.test.ts` — passes.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-spatial): implement RectSpace
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `RectSpace` exported, satisfies `Space<DirtyRegion>` contract.
- [ ] All 15 test cases pass.
- [ ] `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **`union([], r)` returning `r` directly is OK only because `DirtyRegion` is readonly.** If a future change drops the `readonly`, this becomes an aliasing bug. Leave a `// safe under DirtyRegion = readonly Damage[]` comment to flag.
- **Don't dedupe overlapping damage entries in `union`.** That's a spatial-index optimisation for v2. v1 spec is "union concatenates."
- **Don't filter by `DamageKind` in `intersects`.** Kind is a render-pipeline concern; geometric intersection is symmetric across kinds.
- **Don't import `rectOverlaps` lazily** to "work around" the stub-throw. If it throws, your test fails — that's the signal to wait for `01-rect`.
- **Don't allocate a `Set<Damage>` inside `intersects` for perf.** N is small (≤~100); the O(N²) is fine. v2's occupancy grid is the right place to bring asymptotic improvements.
