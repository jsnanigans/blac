# 01 — Rect geometry helpers

**Phase:** 1 (parallel — owns disjoint files from other Phase 1 tasks)
**Model:** Haiku 4.5
**Effort:** low (pure geometry)
**Estimated touch:** 2 files

---

## Goal

Implement the four `Rect` helper functions: `rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`. Pure functions, no I/O, no allocation beyond return values.

---

## Inputs — read these first

1. `dirtytalk/02-insomni.md` § "RectSpace" and § "Bounds tracking" — context for how these helpers are used.
2. `packages/dirtytalk-spatial/src/types.ts` — `Rect` definition.
3. `packages/dirtytalk-spatial/src/rect.ts` — current stub.
4. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/src/rect.ts        (replace stub body)
packages/dirtytalk-spatial/src/rect.test.ts   (create)
```

**Do not touch:** `rect-space.ts` (parallel task), anything else.

---

## Spec

`Rect` is `{ x, y, w, h }` where `(x, y)` is the top-left corner and `w`, `h` are width/height in CSS pixels. `w >= 0`, `h >= 0`. Rects with `w === 0` or `h === 0` are degenerate (zero area).

### `rectOverlaps(a, b)`

Returns `true` if the two rects share at least one interior point. Touching edges (e.g., `a.x + a.w === b.x`) is **not** an overlap — open-interval semantics.

```ts
export const rectOverlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
```

Standard AABB test. Strict inequality so touching is not overlap.

### `rectEquals(a, b)`

```ts
export const rectEquals = (a: Rect, b: Rect): boolean =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
```

Strict equality on all four fields. No epsilon tolerance — rect math is exact in our domain.

### `unionRects(rects)`

Returns the bounding rect that contains all input rects. Empty input → zero-area rect at origin.

```ts
export const unionRects = (rects: readonly Rect[]): Rect => {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].w;
  let maxY = rects[0].y + rects[0].h;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i];
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};
```

### `rectClamp(inner, outer)`

Returns the intersection of `inner` and `outer`. If they don't overlap, returns a zero-area rect at the clamped position (`x`/`y` may be either rect's coords; document as undefined behaviour at zero area).

```ts
export const rectClamp = (inner: Rect, outer: Rect): Rect => {
  const x1 = Math.max(inner.x, outer.x);
  const y1 = Math.max(inner.y, outer.y);
  const x2 = Math.min(inner.x + inner.w, outer.x + outer.w);
  const y2 = Math.min(inner.y + inner.h, outer.y + outer.h);
  return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
};
```

`Math.max(0, ...)` ensures non-negative dimensions even when the rects are disjoint.

---

## Tests — `src/rect.test.ts`

Required cases:

### `rectOverlaps`

1. Overlapping rects → `true`.
2. Disjoint rects (clearly separated) → `false`.
3. Touching edges (right edge of A = left edge of B) → `false`.
4. Identical rects → `true`.
5. One rect fully inside the other → `true`.
6. Zero-area rect (w=0 or h=0) → `false` for any other rect (even containing).

### `rectEquals`

7. Identical rects → `true`.
8. Rects differing in any one field → `false`.

### `unionRects`

9. Empty array → `{x:0,y:0,w:0,h:0}`.
10. Single rect → equal to that rect.
11. Two disjoint rects → bounding box covers both.
12. Two overlapping rects → bounding box.
13. Three rects → still correct.

### `rectClamp`

14. Inner fully inside outer → inner unchanged (by value).
15. Inner partially outside outer → clipped to overlap.
16. Inner fully outside outer → zero-area result.
17. Inner equals outer → equal result.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (or only contains commits from parallel Phase 1 tasks).
   - Phase 0 commit `chore(dirtytalk-spatial): scaffold package` in log.

2. **Implement.** Replace stub. ~30 lines including the bodies above.

3. **Verify.** From `packages/dirtytalk-spatial/`: `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/rect.test.ts` — passes.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-spatial): implement Rect geometry helpers
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] All four functions implemented per spec.
- [ ] All 17 test cases pass.
- [ ] `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **Open-interval overlap.** Touching edges → no overlap. Easy to get wrong with `<=`. The renderer cares: a 0px-overlap region has zero pixels to paint, so it's correct to call it "not overlapping."
- **Don't allocate inside hot helpers if avoidable.** `rectOverlaps` and `rectEquals` are pure boolean returns — fine. `unionRects` and `rectClamp` allocate one rect — also fine. Don't over-optimise by mutating an input.
- **No NaN handling.** If a caller passes NaN, the result is undefined and that's the caller's bug. Don't write `Number.isFinite` checks — they're noise.
- **`unionRects` empty case returns origin rect.** The spec's `RectSpace.empty()` calls this (or a similar primitive). Returning `null`/`undefined` would force every caller to defend; returning a zero-area rect is universally safe.
- **Don't add a `rectArea`, `rectInflate`, or `rectScale` helper preemptively.** Out of scope. Add when a real call site needs it.
