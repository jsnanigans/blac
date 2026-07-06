# API Design · Missing Features · Simplification

## API design issues (D)

### D1 · engine · The `Scheduler` contract is under-specified where it bites
`scheduler.ts:1-4` — `request(flush)` semantics (may it hold several? must it dedupe? is an instance shareable?) are undocumented, and the four implementations answer differently (`SyncScheduler` shareable, the rest single-slot → E1). Either specify "one channel per scheduler instance" in the interface doc + assert, or fix the implementations to hold a set. Also `cancel()` is optional and cancels *everything* — no handle to cancel one request; fine for single-slot, incoherent if schedulers become shareable.

### D2 · engine · No error seam anywhere in the notification path
Channel flush throws into the scheduler context (E2); `Signal` throws at the writer (E4). Embedders need `new DirtyChannel(space, scheduler, { onError })` (and blac would plumb `configureBlac({ onError })` straight into it — review-884 F9 depends on this).

### D3 · structural · `subscribe` exists twice on the container surface
`container.ts:202-204` exposes `container.subscribe(...)` as a pass-through of `container.channel.subscribe(...)`, and `channel` is also public. Two spellings of the same operation with no guidance; blac uses `channel.subscribe` in some places and the pass-through in others. Pick one (keep `channel` public for `mark`-side composition, or keep the pass-through and make `channel` internal).

### D4 · structural · `patch` cannot delete a key
`deepMerge` treats `undefined` as a value (`container.ts:350-361`); there is no way to remove a property via patch — `patch({ draft: undefined })` leaves an own `draft: undefined` key, which also survives in diff semantics. Either document "patch cannot delete; use emit" or support a `DELETE` sentinel.

### D5 · structural · `update(fn)` silently no-ops on in-place mutation
`container.ts:190-192` — `update(s => { s.count++; return s })` returns the same reference; `emit`'s `Object.is` short-circuit swallows it with no signal. A dev-mode check (freeze the state handed to `fn`, or compare a cheap dirty-bit) would convert the most common newcomer mistake from "nothing happens" into an error.

### D6 · structural · `TRACK_ARRAY_ITERATION` is a compile-time constant with a shipped dead half
`tracker.ts:17` — always `true`; the `false` branches (coarse pinning) are unreachable but shipped and must be kept mentally in sync. Either make it a real `trackRender` option (there are legit consumers for coarse mode — big arrays where per-index paths explode the interner, see T9) or delete the fallback branches.

### D7 · structural · `useStructural`'s types are vestigial
`react-hook.ts:7-16` — `UseStructuralOptions = { select?: never }` (an option that must not be passed) and `UseStructuralResult` (a hand-rolled tuple interface the function doesn't even use — it returns `readonly [S, C]`). Both exported. Delete or finish (see A4 / S-list).

### D8 · spatial · Untyped seams force casts inside the package itself
- `Damage.node?: unknown` (`types.ts:21`) — `_renderFrame` immediately casts (`scene-root.ts:127`). Type it `SceneNode` (spatial owns both sides) or make `Damage` generic.
- `paint(layer: unknown)` — every renderer implementation casts per call. Make `SceneNode`/`SceneRoot`/`Renderer2D` generic over a `TLayer`.
- `SceneRoot.bounds` is a public mutable field whose direct assignment skips damage (only `setBounds` repaints) — S1-adjacent trap; make `bounds` readonly-public with `setBounds` the only writer.

### D9 · spatial · Damage/interest can't express "non-spatial" concerns
`DamageKind` rides rects, but `data` damage is not really spatial (S1.2), and interest can't say "any damage of kind X regardless of rect". `RectSpace.intersects` compares rects only — `kind` is carried but never consulted in the algebra. Either fold kind into intersection (interest entries match kind + rect) or route data/layout outside the rect space; the current shape means kind-only observers must use a fake full-bounds rect.

### D10 · all three · Version 0.0.x with public, documented API
web-docs document these packages as public API (`apps/web-docs/.../dirtytalk/*`), but engine/structural/spatial sit at 0.0.x with breaking-change license. If external consumption is intended (docs suggest it), the contracts hardened by this review (Scheduler exclusivity, marking invariant, coordinate model) should be written *before* 0.1.0 freezes expectations.

---

## Missing features (F)

F1 · **engine** · `flushSync()` / `drain()` on `DirtyChannel` — tests everywhere (blac's `flush()` helper does `await Promise.resolve()` twice and hopes) need a deterministic drain; `ManualScheduler` exists but requires owning the scheduler from the start.

F2 · **engine** · Channel `dispose()` (unsubscribe-all + `scheduler.cancel()`); prerequisite for S8 and blac container teardown.

F3 · **structural** · Object-enumeration tracking (`ownKeys`/`has` traps → pin object path) — the record-keyed-by-id state shape is currently untrackable (T4).

F4 · **structural** · A `raw(proxyOrValue)` unwrap helper + `isTracked(v)` — the escape hatch for identity comparisons and for storing values outside the render (T5). Cheap: one WeakMap.

F5 · **structural** · Map/Set support — currently leaves (documented), so any change requires replacing the collection; even coarse "pin on method access" tracking (mirroring arrays-before-iteration-tracking) would make `Map` state usable.

F6 · **structural** · Replay-on-subscribe option (`subscribe(interest, cb, { immediate: true })`) — both React layers hand-roll first-render seeding and both got the mount gap wrong (T6, 884-R2); an engine/structural-level answer fixes it once.

F7 · **structural** · Glob/pattern per-path equality — `StructuralContainerOptions.equality` takes exact dotted strings only and the doc promises patterns as follow-up; array-index paths (`items.3.price`) make exact-string config useless for the main use case (per-element custom equality).

F8 · **spatial** · Scene lifecycle: `SceneRoot.destroy()` (F2 consumer), `releaseCapture(pointerId)`, pointer enter/leave synthesis, and a `hitTest` visibility/interactivity predicate (`node.hitTestable = false`).

F9 · **spatial** · Damage coalescing at flush (merge overlapping/duplicate rects before renderer + cull) — pairs with P2/P3; renderers currently each reimplement or ignore it.

F10 · **spatial** · Transforms/local coordinates — or an explicit decision not to (A7). Everything downstream (charting marks, nested scrollables) hinges on which way this goes.

F11 · **structural** · Interner introspection for leak diagnostics (`interner.size` exists — expose per-class sizes via a debug helper) — makes T9 observable; pairs with review-884 F10's leak report.

---

## Simplify / remove (S)

S1 · **engine `Signal`/`Observable`** — zero consumers in the repo (devtools, plugins, blac, spatial all unaffected). It's also the only thing in engine with opinionated error semantics (E4). Remove from the public barrel (keep in git history until a consumer materializes) — engine then exports exactly its kernel: Space, Scheduler×4, DirtyChannel.

S2 · **structural `/react` subpath (`useStructural`)** — unused, feature-frozen, carries a known bug (T6) and dead types (D7). Delete the subpath, drop the react peer dependency entirely; `@blac/react` is the maintained binding. (If kept as a reference implementation, fix T6 and delete D7's vestiges.)

S3 · **`pathsFromPatch`** (`diff.ts:91-116`) — exported, but the only in-repo caller is its own test; `changedPathsFromPatch` superseded it. Remove from the barrel (or mark `@internal`) — it's also a footgun, since it marks value-unchanged paths.

S4 · **`TRACK_ARRAY_ITERATION` false-branches** — per D6, delete or promote to an option; don't keep a dead compile-time fork.

S5 · **Dead tracker binding block** (`tracker.ts:198-210`) — unreachable (T7); delete + fix the docstring, or make it reachable intentionally.

S6 · **`typesVersions` `core` mapping** in structural's package.json — maps a subpath that doesn't exist in `exports`; remove.

S7 · **`getConsumerPaths` live-map return** (`container.ts:127-129`) — devtools-only API returning the mutable internal map (same pattern flagged as 884-A5). Return `ReadonlyMap` is already the type — but it's the *live* object; document it as live-and-do-not-mutate or copy. If nothing uses it yet, drop it until devtools need it.

S8 · **Spatial package status** — no in-repo consumer besides docs (the external consumer appears to be "insomni", referenced in engine docs). Not a deletion candidate if that consumer is real, but worth an explicit README note about maturity + the A7 coordinate-model decision, so the API doesn't fossilize by accident while unwatched.

S9 · **`FrameTiming.paintedNodes` vs docs** — minor: the field is documented as "the headline cost signal", but with `fullFrame = false` and only top-level culling it counts *top-level* survivors only; deep scenes mostly paint via one surviving child. Either walk-count in `paint()` implementations (out of scope for the lib) or soften the doc.
