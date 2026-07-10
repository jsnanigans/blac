# Complex Investigation: @blac/lit — leaked bloc refs for `component()` used as a `repeat`/`each` item root

## Bottom Line
**Root Cause**: A `component()` renders as a top-level lit-html `AsyncDirective` (`ComponentDirective`). When such a component is the direct item of `each`/`repeat`, lit-html 3.3.3 clears the removed item part with `isClearingValue=true`, which by design does **not** call the item-root directive's `disconnected()`. `ComponentDirective.disconnected()` therefore never runs on row removal, so `releaseAcquired()` never releases the registry ref (`getRegistry().acquire(..., countRef:true, refId)`) each row took via `ctx.use(...)`. Every create/clear cycle leaks one ref-map entry per row, unbounded.
**Fix Location**: `packages/blac-lit/src/component.ts:464-468` (the `component()` factory returning the bare directive) — teardown code at `component.ts:340-354` and `:405-420` is correct but is never invoked in this scenario.
**Confidence**: High (reproduced against the exact installed lit-html 3.3.3 with happy-dom).

## Investigation Findings & Hypothesis

### The lifecycle chain (per benchmark row)
`apps/lit-demo/src/benchmark/benchmark.ui.ts:157-162` renders rows via:
```
each(select(b, s => s.data), (item) => BenchmarkRow({ id: item.id }), (item) => item.id)
```
`each` (`control-flow.ts:17-27`) → `repeat(arr, key, renderItem)`. `renderItem` returns `BenchmarkRow({id})`, i.e. a `ComponentDirective` **directive-result placed directly at the repeat item root**.

Inside the row body (`benchmark.ui.ts:44-45`): `ctx.use(BenchmarkBloc)` → `ComponentDirective.acquireView` (`component.ts:227-260`) → `getRegistry().acquire(BenchmarkBloc, key, { countRef:true, refId })` with a **unique monotonic `refId`** (`blac-lit@N`, `component.ts:14-15`). The matching release lives only in `releaseAcquired()` (`component.ts:405-420`), which is called only from `disconnected()` (`:340-354`) and `teardownIdentity()` (`:356-372`).

### Why teardown never fires for rows
lit-html removes a repeat item via `removePart(part)` → `part._$clear()`
(`node_modules/.pnpm/lit-html@3.3.3/.../directive-helpers.js:172-175`,
`.../lit-html.js:1117-1127`):
```
_$clear(start, from) { this._$notifyConnectionChanged?.(false, true, from); ... }
```
The hard-coded second argument is `isClearingValue=true`. In
`notifyChildPartConnectedChanged` (`.../async-directive.js:109-136`) the
`isClearingValue` branch only walks the part's **committed value** (the row's
`TemplateInstance` and its nested directives) — it deliberately skips the
directive sitting on the clearing part itself (documented at
`async-directive.js:94-100`: "any directive on this ChildPart that produced a
value that caused the clear operation is not disconnected").

Consequence:
- Nested directives inside the row (`select` class + label `BindDirective`s,
  `pulse`) **do** get `disconnected()` → their `BindingSession.disconnect()`
  (`binding-session.ts:70-73`) unsubscribes the channel and calls
  `unregisterConsumer` (`container.ts:273-276`). No leak there.
- The row-root `ComponentDirective.disconnected()` is **never called** → its
  `releaseAcquired()` never runs → the `refId` acquired by `ctx.use` is never
  released.

### Empirical proof (installed lit-html 3.3.3 + happy-dom)
Reproductions run under `node`:

1. Top-level `AsyncDirective` per `repeat` item, remove all items:
   `disconnected` fired **0** times (expected N). Both a full key-swap
   (benchmark `run()` uses ever-incrementing ids, so every key is new) and a
   clear-to-empty produced 0 disconnects.
2. Same directive but with a **nested** child `AsyncDirective`: nested
   `disconnected` fired 3/3, top-level fired **0/3**. Confirms the split: nested
   cleans up, item-root leaks.
3. Fix validation: wrapping the directive as `html`${top(id)}`` (so a
   `TemplateInstance`, not the directive, is the item root) → top-level
   `disconnected` fired **3/3**.

### Leak amplifier in core
`packages/blac-core/src/core/StateContainerRegistry.ts:27-28` stores refs as
`InstanceEntry.refs: Map<string, number>` keyed by `refId`. Because every row
uses a fresh `refId` and never releases, this Map grows by one entry per row and
is never pruned — an unbounded, ever-growing Map across repeated
create/clear/re-create cycles. The registry even anticipates exactly this bug:
`assertRefLimit` (`StateContainerRegistry.ts:245-259`, invoked at `:330-331`)
throws when distinct live refs exceed `maxRefsPerInstance`, with the message
"references are acquired without a matching release ... leaking refs that keep
the instance alive forever." A long/repeated benchmark run will eventually trip
this guard.

Severity note: in the benchmark the acquired bloc is the shared page
`BenchmarkBloc` singleton, so only the `refs` Map entries leak (the instance
stays alive anyway). But the same pattern with a **non-singleton** bloc used via
`component(SomeBloc, …)` or `ctx.use(SomeBloc, { args })` at a `repeat` item root
would keep every per-row instance's refcount above zero forever — leaking the
entire bloc instance plus its state and subscriptions.

### Why "Patches Δ = 2× rows" (2000 for 1000 rows)
This is a `pulse` **instrumentation artifact**, not blac-lit double-patching.
`apps/lit-demo/src/dev/pulse.ts:41-56` observes each label `<td>` with
`{childList, characterData, attributes, subtree:true}` and does
`devStats.bumpPatch(mutations.length)` — it counts **every raw `MutationRecord`**,
not logical updates. Creating one row produces ~2 observed DOM records in the
`<td>` subtree per created row.

I traced the binding side and confirmed the value is applied exactly once per
create: `BindDirective.render` (`live.ts:46-54`) → `session.compute` sets
`snapshot`, then `connect()` → `attach()`; the gap-close recompute at
`binding-session.ts:132-135` runs only when `trackable.state !== this.snapshot`,
which is false during the emit-driven creation (state captured == live state).
So there is **no redundant reactive flush** from `@blac/lit`; the 2× is the
`MutationObserver` counting more than one DOM record for the single text commit
(childList + the surrounding node bookkeeping under a `subtree` observer).
Confidence: High that it is not a blac double-patch; Medium on the exact second
record — confirm in a real browser by logging `MutationRecord.type` in
`pulse.onMutations`.

## Evidence & Diagnostics
- **Key Trace**: `packages/blac-lit/src/component.ts:340-354` / `:405-420` — correct release path, only reachable via `disconnected()`/`teardownIdentity()`.
- **Key Trace**: `packages/blac-lit/src/component.ts:464-468` — `component()` factory returns the bare `ComponentDirective` result, so a `component()` used at a `repeat` item root becomes the item-root directive lit refuses to disconnect.
- **Key Trace**: `node_modules/.pnpm/lit-html@3.3.3/node_modules/lit-html/development/lit-html.js:1117-1118` — `_$clear()` calls `_$notifyConnectionChanged(false, true)`; `.../async-directive.js:109-136` + `:94-100` — `isClearingValue=true` skips the item-root directive.
- **Key Trace**: `packages/blac-core/src/core/StateContainerRegistry.ts:27-28,245-259,330-331` — per-`refId` `refs` Map (unbounded growth) + the ref-leak guard that this bug will eventually trip.
- **Diagnostic output** (`node` + happy-dom, lit-html 3.3.3):
  - `repeat` item = bare AsyncDirective, remove all: `disconnects: 0`.
  - nested child directive: `nestDisc: 3`, `topDisc: 0`.
  - directive wrapped in `html`` `` at item root: `topDisc: 3`.
- **Confirmed non-leak paths**: nested `select`/`when`/`each`/`match` bindings and `pulse` disconnect correctly (`binding-session.ts:151-173` unsubscribes + `unregisterConsumer`; `pulse.ts:80-85` disconnects observer + cancels animation). `model` (`forms.ts:92-121`) has symmetric add/removeEventListener + session connect/disconnect. `mount.ts` uses a container-keyed `WeakMap` with `releaseOwner` on unmount. Module-level counters (`component.ts:14`, `binding-session.ts:12`) and `pureReferences` `WeakMap` (`component.ts:75`) are not growth sources for the benchmark.

## Recommended Mitigations
1. **(Primary) Make `component()` never render as a bare item-root directive.**
   In `component.ts:464-468`, return the directive wrapped in a template so lit
   sees a `TemplateInstance` at the item root and disconnection propagates into
   the nested `ComponentDirective`. Validated: `html`${componentDirective(def,
   args, key)}`` restores `disconnected()` (3/3 in repro). Verify this does not
   regress the render-once identity/caching or `.local()` behavior, and add a
   test asserting `getRegistry` ref count returns to baseline after an
   `each` list is cleared.
2. **(Alternative/belt-and-suspenders) Do teardown outside the directive's own
   `disconnected()`.** Since nested directives *do* disconnect reliably, attach
   a nested disposable (a tiny child `AsyncDirective` or a `bind` whose
   `disconnected` releases refs) so ref release is driven by a node that lit
   always disconnects. Prefer option 1; this is a fallback if wrapping is
   undesirable.
3. **Add a regression test** using happy-dom: render an `each` of a
   `component(SomeBloc)` row, snapshot registry ref count / `entry.refs.size`,
   clear the list, and assert the count returns to baseline (currently it grows
   by one per row). The three repros in this investigation are a ready template.
4. **Confirm the 2× patches label** by logging `MutationRecord.type` in
   `pulse.onMutations` in a real browser; expected to show it is DOM-record
   counting, not a second blac apply. No blac change needed for correctness.
5. **Audit sibling entry points** for the same "bare directive at a
   removable-part root" shape: `component().local()` (`component.ts:466-467`) and
   any `when`/`match` branch or `each` item that returns a `component()` result
   directly rather than wrapped in `html`` `` — same leak class.
