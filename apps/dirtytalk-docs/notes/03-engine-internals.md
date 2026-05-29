# Engine internals — `@dirtytalk/engine`

## `Space<Region>` — the algebra you implement

```ts
interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;            // accumulate dirty marks
  intersects(interest: Region, dirty: Region): boolean; // delivery predicate
}
```

Contracts (the engine relies on these):

- `union(empty(), r)` ≡ `r`.
- `intersects(empty(), _)` ≡ `false`.
- Both **pure** — no side effects, stable output for stable input.

The engine ships **no concrete Space**. That lives in the consuming library
(structural's `PathSetSpace`, insomni's `RectSpace`).

## `DirtyChannel<Region>` — the flush algorithm

Source: `dirty-channel.ts`. The behaviour that matters:

- **Marks coalesce.** `mark(r)` does `accumulated = union(accumulated, r)` and
  requests a flush only if one isn't already scheduled. Ten marks in a window →
  one flush.
- **Interest is a thunk, evaluated at flush time** — *not* at subscribe time.
  Subscribers can move/resize/reconfigure between flushes and the channel picks
  up the new interest automatically. Snapshot at subscribe and you miss updates.
- **Empty fast-path.** If the accumulated region is empty at flush, the
  subscriber loop is skipped entirely. Consumers may rely on "no callback fires
  for a no-op flush" (`dirty-channel.ts:80`).
- **Subscriber list is snapshotted at flush start** (`Array.from(...)`,
  line 87). Subscribers added *during* a flush do **not** run this cycle — they
  see the next one. Unsubscribed entries are skipped via an `alive` flag checked
  on the entry, not the map (line 95), so mid-flush unsubscribe is safe.
- **Re-entrant marks defer.** A `mark()` from inside a callback lands in the
  freshly-reset `accumulated` and schedules the *next* flush — never an infinite
  loop, bounded work per tick (lines 43–55, 122–125).
- **Error isolation.** A throwing interest thunk is treated as "no interest this
  flush" and recorded; a throwing callback is recorded and the flush continues.
  After all callbacks: one error re-throws as-is, multiple wrap in an
  `AggregateError` (lines 99–134).

### Flush sequence (annotated)

1. Snapshot `accumulated` into `dirty`; reset `accumulated = empty()`; clear
   `scheduled`.
2. If `isEmpty(dirty)` → return (no callbacks).
3. Set `flushing = true`.
4. Snapshot subscriber list.
5. For each *alive* entry: eval interest thunk → if `intersects(interest,
   dirty)` → run callback. Collect errors, don't abort.
6. `flushing = false`.
7. If re-entrant marks left `accumulated` non-empty → schedule next flush.
8. Throw collected errors (single or `AggregateError`).

## Schedulers — *when* the flush runs

Source: `scheduler.ts`. `request(flush)` must be idempotent within a window.

| Scheduler            | Flushes when                                | Use |
| -------------------- | ------------------------------------------- | --- |
| `SyncScheduler`      | immediately on `request`                    | tests, sync-emit compatibility |
| `ManualScheduler`    | when you call `.pump()`                      | tests, replay, SSR |
| `MicrotaskScheduler` | end of current microtask queue (`queueMicrotask`) | blac default |
| `RAFScheduler`       | next `requestAnimationFrame`, **falls back to `setTimeout(_, 16)`** when rAF is absent (Node) | insomni |

Notes:

- `MicrotaskScheduler` and `RAFScheduler` both expose `cancel()` for teardown;
  `SyncScheduler` needs none.
- `RAFScheduler` detects rAF availability once at construction
  (`scheduler.ts:80`), so it works transparently under Node test runners.

## Primitives — `Signal<T>` / `Observable<T>`

For one-off observable values that don't need channel ceremony. Synchronous
notify, `Object.is` equality short-circuit (override via the 2nd ctor arg),
`.peek()` reads without subscribing. Import from `@dirtytalk/engine/primitives`
if that's all you need. Coalescing is the channel's job, not the signal's.
