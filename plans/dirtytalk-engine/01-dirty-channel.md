# 01 — Implement `DirtyChannel<Region>`

**Phase:** 1 (parallel — runs after Phase 0)
**Model:** Opus 4.7
**Effort:** high (subtle semantics; snapshot + re-entrancy + error aggregation)
**Estimated touch:** 2 files

---

## Goal

Replace the stubbed `DirtyChannel<Region>` in `src/dirty-channel.ts` with the real implementation. Add focused unit tests in `src/dirty-channel.test.ts` covering all the subtle behaviours called out in the spec.

This is the load-bearing piece of the engine. Every contract bullet in the spec must hold; the consuming libraries depend on these guarantees.

---

## Inputs — read these first

1. `dirtytalk/01-engine.md` § **Layer 4 — `DirtyChannel<Region>`** (the canonical spec).
2. `dirtytalk/01-engine.md` § **Decisions** (re-entrancy, error handling, etc).
3. `packages/dirtytalk-engine/src/dirty-channel.ts` — current stub (Phase 0).
4. `packages/dirtytalk-engine/src/space.ts` — the `Space<R>` interface you'll be generic over.
5. `packages/dirtytalk-engine/src/scheduler.ts` — the `Scheduler` interface. (You do not depend on any concrete impl; you can use a hand-rolled `SyncScheduler`-shaped stub in tests if 01-schedulers hasn't merged yet.)
6. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files

```
packages/dirtytalk-engine/src/dirty-channel.ts        (REPLACE stub body)
packages/dirtytalk-engine/src/dirty-channel.test.ts   (CREATE)
```

## Do not touch

```
packages/dirtytalk-engine/src/primitives.ts
packages/dirtytalk-engine/src/scheduler.ts
packages/dirtytalk-engine/src/space.ts          (interface is final)
packages/dirtytalk-engine/src/index.ts
packages/dirtytalk-engine/package.json
```

If you find you need to widen the `Space<R>` interface or change `Scheduler`, **stop and report**. Those signatures are locked by Phase 0.

---

## API (final)

```ts
class DirtyChannel<Region> {
  constructor(space: Space<Region>, scheduler: Scheduler);
  mark(r: Region): void;
  subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void;
}
```

---

## Behaviour spec (mirror of 01-engine.md, restated for precision)

### State

The channel owns:

- `space: Space<Region>` (immutable after construction).
- `scheduler: Scheduler` (immutable after construction).
- `accumulated: Region` — initialised to `space.empty()`; reset to `empty()` at the start of each flush.
- `scheduled: boolean` — true iff a flush has been requested but not yet drained.
- `subscribers` — registration-ordered collection of `{ interest, cb }` entries with a notion of "alive" so unsubscribe during flush takes effect immediately. A plain `Map<id, entry>` works; iterate `Array.from(map.values())` on flush.
- `flushing: boolean` — true while running subscriber callbacks. Used to defer re-entrant `mark` to next flush.

### `mark(r)`

1. **Re-entrant case:** if `flushing` is true (mark called from inside a subscriber callback during this channel's own flush), accumulate into a `nextAccumulated` buffer (i.e., into the post-flush `accumulated`). The current flush does not see this region. Implementation hint: keep one `accumulated` field but only request the scheduler again on the _next_ mark after `flushing` clears. Either approach is fine — describe yours in a code comment.
2. **Normal case:**
   - `accumulated = space.union(accumulated, r)`.
   - If `!scheduled`, set `scheduled = true` and call `scheduler.request(() => this.#flush())`. Pass a bound reference so the scheduler holds a stable function.

### `flush()` (private)

1. Snapshot: `const dirty = accumulated; accumulated = space.empty(); scheduled = false;`.
2. **Early-out:** if `space.isEmpty(dirty)`, return. No subscribers run.
3. Set `flushing = true`.
4. Snapshot the subscriber list: `const live = Array.from(subscribers.values())`.
5. For each `entry` in `live` **in registration order**:
   - If the entry was unsubscribed since the snapshot, skip it. (Check via a flag set on the entry, not by re-querying the map — the map could be mutated by a callback's `subscribe`.)
   - Evaluate `const interest = entry.interest()`. Wrap in try/catch — if the thunk throws, treat as if `intersects` returned false but record the error.
   - If `space.intersects(interest, dirty)`, call `entry.cb(dirty)`. Wrap in try/catch — record any throw.
6. Clear `flushing`.
7. **Subscribers added during flush** are NOT in the `live` snapshot, so they don't run this cycle. They will run on the next flush.
8. **Errors:** if zero recorded, return normally. If exactly one, re-throw it. If 2+, throw `new AggregateError(errors, 'DirtyChannel: subscriber errors during flush')`.
9. **Re-entrant marks during this flush** — handled by `mark`'s `flushing` branch above. After `flushing` is cleared, the next `mark` (or a deferred-then-scheduled flush at the end of flush) will request a new window.
   - Simpler implementation: at the very end of `flush`, after clearing `flushing`, check if `!space.isEmpty(accumulated)` (i.e., re-entrant marks did accumulate). If so, set `scheduled = true` and `scheduler.request(this.#boundFlush)`. This guarantees the deferred work runs on the next scheduler tick.

### `subscribe(interest, cb)`

- Generate a unique id (counter is fine), insert `{ interest, cb, alive: true }` into the subscribers map.
- Return an unsubscribe function. On call:
  - If already unsubscribed, no-op.
  - Set `alive = false`.
  - Remove from the map.
  - Idempotent — calling twice is a no-op.

### `interest` is a thunk

- Evaluated **at most once per flush per subscriber**, lazily, only when the subscriber is about to be considered. Do not cache across flushes.
- A thunk that throws is treated as "no interest this flush" plus an error recorded for aggregation. Don't crash the whole flush.

### `cb` receives `dirty`

- The payload is the accumulated region for this flush (the snapshot taken in step 1). Subscribers may inspect it; the channel doesn't care.

---

## Tests — `src/dirty-channel.test.ts`

Build a tiny `NumberBitsetSpace` test-double for `Space<number>` where regions are JS numbers used as bitsets:

```ts
const NumberBitsetSpace: Space<number> = {
  empty: () => 0,
  isEmpty: (r) => r === 0,
  union: (a, b) => a | b,
  intersects: (i, d) => (i & d) !== 0,
};
```

This is enough to exercise every code path without depending on insomni/blac concretions.

For scheduling, build a hand-rolled `ManualScheduler`-shaped test scheduler **inline in the test file** — do NOT import from `./scheduler` (it's owned by a sibling agent and may or may not be implemented yet when you run). Inline version:

```ts
class TestScheduler {
  private pending: (() => void) | null = null;
  request(flush: () => void) {
    this.pending = flush;
  }
  pump() {
    const f = this.pending;
    this.pending = null;
    f?.();
  }
  get isPending() {
    return this.pending != null;
  }
}
```

This isolates this task from the schedulers task.

Required cases (each its own `it(...)`):

### Construction & basic marking

1. **Empty mark deduces no schedule.** Constructing the channel does not call `scheduler.request`. After construction, `isPending` is false.
2. **`mark` triggers one schedule.** `channel.mark(0b001)` → `scheduler.isPending` becomes true.
3. **Repeated marks before flush coalesce into one schedule.** Three `mark`s → `request` called once on the scheduler. (Use a spy.)

### Flush behaviour

4. **Flush calls subscribers with the union.** Subscribers with interest `0b001` and `0b010` after `mark(0b001); mark(0b010)` → first subscriber receives `0b011`; second also receives `0b011`.
5. **Subscribers whose interest does not intersect are NOT called.** Interest `0b100`, dirty `0b011` → cb never invoked.
6. **Empty dirty → no subscribers run.** Subscribe, never mark, pump → cb not called.
7. **Registration order.** Three subscribers all interested; assert call order matches subscribe order.
8. **Accumulated resets after flush.** Mark + pump + (no new mark) + pump → cb runs once total.

### Lazy interest thunk

9. **Interest evaluated lazily.** Pass `interest: vi.fn(() => 0b001)`; construction + mark + no pump → `interest` not called. After pump → called exactly once.
10. **Interest re-evaluated each flush.** Two pumps with one mark each → interest fn called twice. Changing what `interest` returns between flushes correctly switches whether the subscriber gets notified.

### Subscribe / unsubscribe

11. **Unsubscribe before flush.** Subscribe → unsubscribe → mark → pump → cb never called.
12. **Unsubscribe is idempotent.** Calling unsub twice does not throw and does not affect other subscribers.
13. **Unsubscribe DURING flush, before this subscriber's turn.** First subscriber's cb unsubscribes the third subscriber. After flush completes, only the first and second cbs ran; third did not.
14. **Subscribe DURING flush** — the new subscriber does NOT run in the current flush. A subsequent mark + pump runs it.

### Re-entrancy

15. **`mark` during flush defers to next flush.** Subscriber A's cb calls `channel.mark(0b100)`. The current flush completes. After: a new flush is scheduled. Pumping it runs A and any other interested subscribers with dirty `= 0b100`.
16. **Re-entrant mark + no further mark + pump:** the re-entrant mark's flush fires on next pump.
17. **Re-entrant mark in a subscriber that throws** still defers correctly (the channel doesn't lose the mark just because the cb errored).

### Errors

18. **One subscriber throws.** Error is re-thrown after all subscribers run. Subsequent subscribers still get called.
19. **Two subscribers throw.** `AggregateError` thrown after flush. Both inner errors are present in `.errors`.
20. **Interest thunk throws.** That subscriber's cb is not called. Error contributes to the aggregate / single-error rule. Other subscribers proceed.

### Sanity

21. **`isEmpty` short-circuit.** Pump with no marks → no subscribers consulted (interest fn not even called). This is the empty fast-path.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** `git status` clean. `cat packages/dirtytalk-engine/src/dirty-channel.ts` shows stub.
2. **Implement.** Replace stub. Write tests with the inline test space + scheduler.
3. **Verify.** From inside `packages/dirtytalk-engine/`: `vp run typecheck && vp run lint`.
4. **Test.** `vp run test src/dirty-channel.test.ts` — every case passes.
5. **Commit.**

   ```
   feat(dirtytalk-engine): implement DirtyChannel with re-entrancy + error aggregation
   ```

   Body (wrap at 72) is helpful here — note the subtle decisions (snapshot subscribers, defer re-entrant marks, AggregateError on multi-throw). No co-author.

---

## Acceptance criteria

- [ ] No `throw new Error('not implemented')` left in `dirty-channel.ts`.
- [ ] All 21 test cases pass.
- [ ] `vp run typecheck` and `vp run lint` pass.
- [ ] No file outside the owned set is modified.
- [ ] The test file does NOT import from `./scheduler` or `./primitives` — only `./space` (interface) and the public `./dirty-channel`. This keeps the task hermetic.

---

## Pitfalls (read these — they're where this task gets hard)

- **Snapshot the subscribers, not the map.** Mutating the underlying map during iteration is a bug. `Array.from(map.values())` once, then iterate.
- **"Alive" flag, not "removed from snapshot."** Unsubscribing during flush must take effect for not-yet-visited entries. Marking the entry dead and checking `entry.alive` per iteration step is the standard pattern.
- **Interest thunk per subscriber per flush.** Not per `mark`. Not cached. Recompute on each flush.
- **Re-entrant mark must NOT pollute the current flush's snapshot.** The current flush's `dirty` was snapshotted at step 1; later `mark`s go into the (already-reset) `accumulated`.
- **Empty fast-path matters.** A flush with `isEmpty(dirty) === true` must skip the subscriber loop entirely. This is the documented contract; consumers may rely on "no callback firing for no-op flushes."
- **`AggregateError` is ES2021** — supported by the project (`target: "es2021"` in `tsconfig.base.json`). Use it directly.
- **Don't use `Set<entry>` for subscribers** — you need stable ids for unsubscribe + ordering, and `Set` ordering by reference is fine but reasoning about deletion-during-iteration is harder. A `Map<id, entry>` with a monotonic counter is cleaner.
- **Don't import the `SyncScheduler`/`MicrotaskScheduler` in tests.** Hermetic isolation: inline a `TestScheduler` so this task's tests pass even if `01-schedulers` is still in flight.
- **Bound flush reference.** Pass the same function reference each `scheduler.request(...)` — `() => this.#flush()` allocated once in the constructor (e.g. `this.#boundFlush = () => this.#flush()`). Avoids GC churn and helps schedulers that key on identity (none of ours do, but it's cheap defensive coding).
