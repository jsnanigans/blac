# Investigation: @blac/lit still-open render/re-render perf (2026-07-12)

## Bottom Line
**Root Cause**: The headline O(N) fan-out is CLOSED (per-tick memo + `noChange` + path-reg + `depend().track()` all landed). Remaining wins are a per-flush O(total-bindings) channel scan, and a few constant-factor recompute allocations.
**Fix Location**: `dirty-channel.ts:104-139` (scan) + `binding-session.ts:205-211` / `live.ts:132-159` (compute alloc)
**Confidence**: High (static verification against current source + perf-budget gate)

## Already Fixed (do NOT re-report)
Per-tick memo `binding-session.ts:186-199`; skip re-register on unchanged path set `:241-247,353-359`; `ComponentDirective` returns `noChange` `component.ts:178`; cross-bloc `depend().track()` reactive via `onDepHandle`/`reconcileDeps` `binding-session.ts:264-386`; consumer-path registration `:488-495`; `$`-proxy bindingMeta `live.ts:156`. Gated by `perf-budget.test.ts` (update ≤20, swap/select/remove ≤5 recomputes; register ≤ recompute).

## Still-Open Findings (priority order)

**1. DirtyChannel scans EVERY subscriber per flush — O(total live bindings)/op.**
`dirty-channel.ts:104` does `Array.from(#subscribers.values())` then evaluates `interest()`+`intersects()` for all of them. Each blac-lit binding is one subscriber (`binding-session.ts:431`); N rows × 2 = ~2N subscribers on the singleton bloc channel. A single-row op still allocates a 2N array and does ~2N intersect checks even though recompute is now O(changed). *Change*: per-bloc-instance binding hub in blac-lit — one channel subscription, `pathId → bindings` buckets, dispatch by dirty ids. *Impact*: High for large lists (removes the last O(N)/op ceiling). *Risk/Effort*: High/Large — new stateful layer, must preserve register/subscribe/unregister + leak.test gates, and fit the **3 kB brotli** size-limit (`package.json:50-58`). Engine-side alternative touches `@blac/core`/`@blac/react` — larger blast radius.

**2. `$` static-path bindings still do a full `trackRender` proxy pass per recompute.**
`bloc.$.a.b` builds a reduce reader (`live.ts:135-137`) that runs through `trackRender` in `computeCurrent` (`binding-session.ts:205`) to rediscover a statically-known path. *Change*: fast-path known `$` paths — read the leaf directly, register/expand the interned path once, skip the proxy alloc + tracked read. *Impact*: Medium (only `$`-path holes). *Risk/Effort*: Medium/Medium (must reproduce ancestor-watch expansion without the tracker; adds code vs size budget).

**3. `computeCurrent` allocates dep scratch (`Map`+array) on every recompute even with no deps.**
`binding-session.ts:209-211` allocates `pendingDeps`/`pendingTracked` unconditionally; `reconcileDeps` iterates empty maps. *Change*: lazily allocate only when `onDepHandle` fires. *Impact*: Low (GC/alloc on hot path). *Risk/Effort*: Low/Small.

**4. Fresh reader arrow defeats the per-tick memo for non-component bindings.**
`live.ts:72` / `control-flow.ts:54` pass a NEW `(state,b)=>this.readFn(...)` arrow each `render()`, so the memo's `reader===lastReader` check (`binding-session.ts:188`) never hits on a parent re-commit. Currently masked because component rows return `noChange`; bites bindings re-committed by a non-component parent. *Change*: stable bound reader field. *Impact*: Low-Medium. *Risk/Effort*: Medium — CORRECTNESS: a stable arrow hides a genuine selector swap under an unchanged snapshot; must also invalidate memo when `readFn` changes. Do NOT do naively.

**5. `EachDirective.computeKeys` is O(N) and runs on render AND every apply.**
`control-flow.ts:58,63,88-99` builds a full key `Set` (+`isDisjoint` O(N)) each list update, purely for orphan-marker turnover detection, stacking on `repeat`'s own O(N). *Change*: skip when no turnover possible / reuse prior set. *Impact*: Low (constant factor on already-O(N) reorder). *Risk/Effort*: Low/Small — keep the turnover teardown (leak.test gate).

## Next Steps
1. Profile finding #1 in the demo before building the hub (reports defer it pending measurement); confirm it beats the 3 kB budget.
2. Land #3 and #5 as safe constant-factor wins first.
3. Treat #4 as correctness-sensitive; add a memo-invalidation-on-readFn-change test if pursued.
