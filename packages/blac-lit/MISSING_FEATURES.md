# `@blac/lit` — Missing Features & Known Limits

> Status: **audit** · Scope: gaps between `DESIGN.md`'s promised surface and what
> `src/` actually ships (as of `@blac/lit` 2.0.18), plus the architectural limits
> that block advanced use cases.

The runtime is deliberately tiny: every reactive primitive is a thin
`AsyncDirective` over one shared engine, `BindingSession`
(`src/internal/binding-session.ts`). That engine already multiplexes a **primary
container + arbitrary cross-bloc `depend()` targets**, does per-tick memoization,
and tears down transactionally. Most gaps below are therefore "add a directive
that reuses `BindingSession`," not "add new reactivity."

---

## 1. Shipped-vs-design gaps

These appear in `DESIGN.md` as if available; they are **not** in `src/`.

| Feature | Design ref | Reality |
| --- | --- | --- |
| **Getters as reactive reads** (`bloc.$$.completionPercent`) | §3.1, §6 "Deferred" | `$` reduces the access path over **state only** (`live.ts::reactive`); a getter name resolves to `state[name]` → `undefined`. Getters currently work **only** via `select(bloc, (_s, b) => b.getter)`. **Planned fix: a separate `$$` namespace — see Appendix.** |
| **Multi-source `select`** (`select([a.$.x, b.$.y], fn)`) | §3.2 | `select` is single-bloc: `select(bloc, readFn)` (`live.ts:113`). No combinator fuses two blocs into one Binding. |
| **`classes` / `styles`** helpers | §3.5, §6 "Deferred" | Not implemented; no `attrs.ts`; not exported. Use an attribute-position Binding (`class=${c.$.status}`) or lit's `classMap`/`styleMap` manually. |
| **Testing entry** (`@blac/lit/testing`) | §6 "Exports mirror `@blac/react`… a testing entry" | `package.json` exports only `"."`. No render helper, no flush/act util, no string snapshot. `__recomputeProbe` (`binding-session.ts:23`) is internal-only. |
| **`classes`/`styles` typed Binding maps** | §3.5 | — (blocked on the above) |

---

## 2. Multi-bloc reactivity

**What works.** Cross-bloc *reactive fusion inside a bloc* via
`this.depend(Other).track()` is fully supported — deps-of-deps, mutual cycles,
per-dep registry ref-counting, drop-on-unreach (`binding-session.ts:248–365`,
proven in `depend.test.ts`). The sanctioned way to combine two blocs today is a
third bloc that `depend`s on both and exposes a getter.

**What's missing.**

- **No component-level combinator.** `ctx.use(A)` + `ctx.use(B)` gives two
  independent handles; each `.$.x` read is its own hole. You cannot express
  `a.$.x + b.$.y` as a single reactive value without a `depend`-ing bloc.
- **Control flow is single-source.** `when` / `each` / `match` each take exactly
  one `Binding` (`control-flow.ts`). A predicate spanning two blocs needs a
  derived getter on a bloc; there's no `combine(...)` to feed them.

**Proposed:** `combine(...bindings, fn)` (and/or `select([...], fn)`). Each
`Binding` already carries `{ bloc, read }` via `getBindingMeta`, so `combine` can
hold N `BindingSession`s (one per input), have each `apply` write into a slot and
trigger the merged recompute. This transparently unlocks multi-bloc `when` / `each`
/ `match`, since those consume a Binding.

---

## 3. Async

There is **no async layer**. The entire story is convention:

```ts
// bloc owns { status: 'idle'|'loading'|'error'|'ready', data, error }
ctx.onMount(() => bloc.load());
match(bloc.$.status, { loading: …, error: …, ready: … });
```

Missing:

- No promise-aware binding / `resource(fetcher)` helper.
- No `{ loading, data, error }` triad helper.
- No suspense/fallback directive.
- No cancellation tied to `disconnected()` (an `onMount` cleanup can do it, but
  nothing assists).

**Design constraint:** goal #1 is "blac is the only source of truth." An async
*state primitive* therefore belongs in **core** (e.g. a `QueryCubit`/`AsyncCubit`
owning status + cancellation), with lit shipping only `resource(...)` sugar over
`match`. Decide before building where the state lives.

---

## 4. Effects & component-local derivation

- **`ctx.effect(bloc, fn)` is coarse only.** It subscribes to `ALL_PATHS`
  (`component.ts:368–377`) — re-fires on *any* change to the bloc, even though
  `BindingSession` already supports fine-grained path tracking. There is no
  effect that re-runs on just the paths `fn` reads.
- **No `ctx.computed(fn)`.** Component-local derived values must live on a bloc as
  a getter. (Once `combine` exists, `ctx.computed` is `combine` scoped to the
  component.)

**Proposed:** back `ctx.effect` with a `BindingSession` whose `apply` is `fn`
(fine-grained), keep coarse as an explicit opt-in; add `ctx.computed(fn) → Binding`.

---

## 5. Testability

Weakest area for advanced adoption.

- No test entry point; `package.json` exports only `"."`.
- No render helper — tests must `mount()` into a happy-dom container and assert on
  real DOM (`reactive.test.ts`).
- No public flush/act utility (tests import `flush` from `@blac/core/testing`).
- No DOM-free string snapshot of a component's output; a `component` factory can't
  be exercised without a live `ChildPart`.
- The perf probe `__recomputeProbe` is internal — useful for asserting "no O(N)
  recompute" but not exported.

**Proposed:** `@blac/lit/testing` with `renderComponent(factory(args)) → {
container, html(), query(), flush(), unmount() }`, a `flush()` that drains the
binding tick, a DOM-free snapshot, and a public re-export of `__recomputeProbe`.

---

## 6. Error handling

- No error-boundary directive. A throw in a component body / read propagates to
  lit's `render`. (The transactional rollback in `component.ts:212` and
  `binding-session.ts::detachAfterFailure` give a clean base to build one:
  `boundary(() => child, (err) => fallback)`.)

---

## 7. Larger, roadmap-only

- **`BlacElement`** — Custom Element base + Shadow DOM encapsulation
  (`DESIGN.md` §7.3, deferred). Functional `component()` only today.
- **SSR** — no `@lit-labs/ssr` integration; reactive holes + acquire/release have
  no server story (`DESIGN.md` §7.4, open).

---

## Priority

1. **Reactive getters via `$$`** (Appendix) — small, high value; the tracking
   machinery already exists.
2. **`combine` / multi-source `select`** — unlocks multi-bloc reads *and* control
   flow.
3. **Fine-grained `ctx.effect` + `ctx.computed`.**
4. **`@blac/lit/testing` entry.**
5. `classes` / `styles`; error boundary.
6. `BlacElement`; SSR.

---

## Appendix — Reactive getters via a `$$` namespace (design)

**Decision:** getters get a **separate `$$` proxy**, not a merged `$`. `$` stays
state-only and fully type-guaranteed; `$$` is best-effort sugar for derived reads.
Rationale below.

**The machinery already tracks getters.** In `BindingSession.computeCurrent` the
reader is invoked as `reader(tracked.value, trackedBloc(source, tracked.value,
onDepHandle))` (`binding-session.ts:205`). When a reader reads `b.total`, the
`trackedBloc` proxy runs the getter with itself as receiver, so `this.state.x`
resolves to the **tracking** state proxy (deps recorded) and
`this.getOther.track()` routes through `onDepHandle` (cross-bloc deps recorded).
Proven end-to-end in `depend.test.ts` via `select(combined, (_s, b) => b.total)`.

**Why `$$` beats merging into `$`.** A merged `$` must answer "state key or
getter?" per access — exactly the question TypeScript cannot answer (a `get x()`
and a field `x` are the same type member; there is no `IsGetter`). Merging forced a
runtime classifier + dev-throw and left type↔runtime divergences. Splitting
dissolves the question:

- **`$`** = `select(bloc, s => s.key)` — state path, unchanged, guaranteed types.
- **`$$`** = `select(bloc, (_s, b) => b.key)` — read the member off the *tracked*
  bloc. Uniform: no classifier, no state lookup, no probe.

**Runtime.** Add a `$$` branch in `makeHandle` (`component.ts:74`) returning a
`reactiveGetters(bloc)` proxy that mirrors `reactive()` (chaining, `.map`, symbol
passthrough, bindingMeta mirror at `live.ts:156`) but whose terminal read is
`(_s, b) => rest.reduce((o, k) => o?.[k], b[head])`. Reducing further segments
needs no extra tracking — the getter's own deps are recorded when `b[head]` runs.

**Misuse is benign — `$$` never throws.** A data field → a valid but static Binding
(never updates). A method (function-valued member) → in **dev only**,
`console.warn` (`process.env.NODE_ENV !== 'production'`, folds out of prod) then
still returns the inert Binding. Every type/runtime mismatch degrades gracefully
instead of crashing — the core advantage over the merge.

**Types (best-effort autocomplete, no correctness stakes).** Add `$$:
ReactiveGetters<T>` to `BlocView<T>`; leave `$`'s type untouched.
`ReactiveGetters<T>` maps the **readonly, non-function, non-state** instance keys
to `Binding<ReturnType>`, using (a) `[DEP_BRAND]` exclusion to drop `depend()`
handles and (b) readonly-detection (the `IfEquals` trick) so only get-only
accessors surface, plus `Omit` of the base `StateContainer`/`Cubit` surface.
Residual edges are **benign** (both are harmless because `$$` never throws):

- readonly non-state **data field** → false positive → a static binding;
- getter **with a setter** → false negative → fall back to `select`.

Keep `ReactiveGetters` internal (no `index.ts` export).
