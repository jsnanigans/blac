# BlaC v2 — Cross-Project Synthesis & Library Recommendations

**Date:** 2026-05-27
**Inputs:** [`00-library-capabilities.md`](./00-library-capabilities.md), [`01-user-fe-reviews-analysis.md`](./01-user-fe-reviews-analysis.md), [`02-phylon-analysis.md`](./02-phylon-analysis.md)
**Subjects:** `@blac/core` + `@blac/react` v2.0.x, as consumed by `user-fe-reviews` (mid-migration, compat shim) and `phylon` (clean-slate v2).

> The two projects are almost perfect opposites in how they use BlaC, which makes their **agreements** strong signals.
>
> - **user-fe-reviews**: many short-lived, prop-driven, per-instance cubits (forms, schedulers, file upload, carousels). ~99% still on the v1 compat shim; `packages/shared` is the only honest v2 surface.
> - **phylon**: 21 long-lived global-singleton cubits in a dependency DAG, wired with `this.depend()` + module-level `watch()`. No props, no scoped instances. Direct v2, no shim.
>
> Where a friction point shows up in **both** — despite opposite architectures — it's a real library problem, not a project quirk.

---

## 1. The headline finding

BlaC v2 made a deliberate, correct design decision — **zero-arg constructors + the proxy auto-tracker** — but shipped it **without the ergonomic companions that decision requires**. The result is the same in both codebases: developers reintroduce the exact hazards v2 was meant to remove, just by hand.

Three things, in priority order:

1. **There is no first-class way to feed external data into a bloc** (props that change over time, refs, config, args). This is the #1 documented pain point in user-fe-reviews and the root cause of most of its CRITICAL migration findings.
2. **There is no derived/computed-state primitive.** Both projects hand-roll memoized derivation with manual identity guards.
3. **`watch()` is not lifecycle-bound**, so every long-lived bloc that observes another copy-pastes subscription-cleanup boilerplate (phylon) or reaches for a custom event bus instead (both).

Everything else is either a discoverability problem (the feature exists, nobody used it) or a smaller polish item.

---

## 2. Two buckets: "didn't know it existed" vs "doesn't exist"

A surprising amount of friction is **discoverability**, not capability. Before building anything, these should be documented, surfaced in types, and warned about at runtime.

### 2a. Already solved — the consumers just didn't use it

| Capability that exists                                                                             | Evidence it's unknown/unused                                                                                                                                              | What to do                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`this.depend(Other)`** cross-bloc deps                                                           | user-fe-reviews: **0 uses** across 400+ cubit-lookup sites; they hand-roll observer subscriptions (`TaskListBloc.ts:89-103`). phylon: uses it heavily and it works great. | Pure discoverability gap. Document as THE cross-bloc pattern; show the before/after vs manual subscriptions.                                                 |
| **`dependencies:` selector** in `useBloc`                                                          | **0 uses in both projects.** phylon reaches for `{ autoTrack: false }` instead; user-fe-reviews distrusts it (documented risk R8).                                        | Re-document with a crisp "use this when auto-track over-renders" recipe. Investigate _why_ it's distrusted (see §4).                                         |
| **Hydration API** (`beginHydration`/`applyHydratedState`/`waitForHydration`)                       | phylon rolled its own `localStorage` in `LayoutCubit`.                                                                                                                    | The API is SSR-persistence-shaped, not "persist this cubit to localStorage." Either document the localStorage recipe or add a persistence helper (see §3.6). |
| **`testing` entry points** (core + react: `renderWithBloc`, `createCubitStub`, `withBlocState`, …) | phylon: **0 test files import `@blac`**; the gnarly `AnnotationsCubit` merge logic is untested.                                                                           | Discoverability. README needs a "Testing" section with the recipe; the entry points are invisible right now.                                                 |
| **`useBloc` `onMount`/`onUnmount`**                                                                | Underused; user-fe-reviews mutates in render body instead.                                                                                                                | Document as the sanctioned init channel — but note it's insufficient for _changing_ props (see §3.1).                                                        |
| **`watch(instance(C, id))`** for named instances                                                   | Unused; `watch(BareClass)` only resolves the `default` instance — a silent footgun if you have named instances.                                                           | Document; consider a dev warning when watching a class that has only named instances.                                                                        |

### 2b. Doesn't exist — genuine gaps (see §3 for proposals)

- First-class props/args/config channel for blocs.
- Derived/computed/selector primitive with memoization.
- Lifecycle-bound `this.watch(...)` (auto-cleanup on dispose).
- Transient event/command channel (not retained state).
- Actions-only / no-subscribe handle.
- Dev-mode warning for unknown `useBloc` option keys.
- Deep/non-plain state tracking (Map/Set/Date/class instances).

---

## 3. Recommendations (prioritized)

Priority = (frequency across both projects) × (friction removed) ÷ (implementation cost). Each item lists the **evidence**, a **proposed API**, and **why now**.

---

### 🔴 P0 — A first-class "inputs" channel for blocs

**Problem.** v2 requires zero-arg constructors, but real blocs need external data: form props, refs, config, route params, parent-derived values. With no sanctioned channel, developers do the worst thing — **mutate the bloc during render**:

- `user-fe-reviews`: `bloc.props = props` (`AutoForm.tsx:23`), `cubit.setProps/setEmblaApi/setTotalSlides/setSlideNames(...)` in render (`Carousel.tsx:66-82`), `cubit.setRefs({inputRef})` (`FileUploadBox.tsx:228`), `cubit.setConfig(options)` (`useFileUploadState.ts:8`).
- The "props" concept is reinvented in **3 incompatible shapes** (`props =`, `setProps`, `initWithProps`) — some idempotent, some that reset state (`UserDetailsCubit.ts:73`, `AutoFormBloc.ts:150`).
- `onMount` only fires once, so it can't track _changing_ props; devs add a second `useEffect` to re-sync, find it verbose, and fall back to render-mutation.

This reintroduces exactly the hazard the prop-slot removal was meant to prevent: emits during render, stale closures, StrictMode/concurrent flakiness.

**Proposal — a typed, reactive `inputs` slot.** Model "data flowing in from React" as a first-class concept distinct from state:

```ts
class CarouselCubit extends Cubit<CarouselState> {
  // declared inputs; framework keeps them in sync, fires a hook on change
  declare inputs: { slides: Slide[]; emblaApi: EmblaApi | null };

  onInputsChanged(next: this['inputs'], prev: this['inputs']) {
    if (next.slides !== prev.slides) this.patch({ total: next.slides.length });
  }
}
```

```tsx
const [state, cubit] = useBloc(CarouselCubit, { inputs: { slides, emblaApi } });
// library diffs inputs, updates cubit.inputs, calls onInputsChanged — never during render
```

Key properties: synced in a layout effect (not render), shallow-diffed, available synchronously inside methods via `this.inputs`, and **read-only from the component side**. This single feature dissolves the largest cluster of anti-patterns in user-fe-reviews and removes `setProps`/`setRefs`/`setConfig` entirely.

**Why now:** it's the documented #1 sin, it's actively shipping bugs (see P1), and it blocks the migration from finishing cleanly.

---

### 🔴 P0 — A computed/derived-state primitive

**Problem.** Neither project has a clean way to express "state derived from other state (or other blocs), memoized." Today the options are:

- Plain getters — re-evaluated on _every_ change-check, no memoization.
- `dependencies:` selector — disables auto-track, distrusted, unused.

So both hand-roll it:

- **phylon**: "derived cubit" = subscribe-to-everything + per-field identity guards (`SceneCubit.ts:50-60` `lastPushedAnalysis`) + manual `recompute()` calls peppered after every mutator (`AnnotationsCubit.ts:257,265,297…`). Forget a `recompute()` and the derived value is silently stale.
- **user-fe-reviews**: derived calculations leak into components (the very thing their CLAUDE.md bans), or into ad-hoc cubit getters.

**Proposal — declarative computed values with dependency tracking + memoization:**

```ts
class SceneCubit extends Cubit<SceneState> {
  // recomputes only when tracked reads change; memoized by reference
  readonly visibleNodes = this.computed(() => {
    const { nodes } = this.depend(TreeCubit)();
    return nodes.filter((n) => n.visible);
  });
}
```

The computed reuses the proxy tracker that already powers per-consumer re-renders, so deps are discovered automatically — no manual `recompute()`, no `lastPushed*` guards. This deletes a large class of phylon boilerplate and gives user-fe-reviews the "derived state belongs in the cubit" primitive its conventions demand.

**Why now:** both projects independently reinvented this; it's the second-most-repeated pattern after init.

---

### 🔴 P0 — Lifecycle-bound `this.watch(...)`

**Problem.** `watch()` (and observing other blocs in general) is **not bound to the observer's lifecycle**. In phylon, every derived cubit copy-pastes the same block:

```ts
private unsubs: Array<() => void> = [];
// ... push watch() teardowns into unsubs ...
onSystemEvent("dispose") { this.unsubs.forEach(u => u()); }
```

with an explicit `// or it throws` comment (`MissingAttrsCubit.ts:32-36`) and `isDisposed` guards in every callback. This is phylon's single most-repeated boilerplate. In user-fe-reviews the same need shows up as hand-rolled subscribe-and-store-unsubscribe (`TaskListBloc.ts:89-103`).

**Proposal — `this.watch(...)` on `StateContainer`** that registers the teardown internally and runs it on dispose, with the callback automatically skipped after disposal:

```ts
class MissingAttrsCubit extends Cubit<S> {
  init() {
    this.watch(SceneCubit, (state) => this.patch({ missing: compute(state) }));
    // no unsubs[], no onSystemEvent('dispose'), no isDisposed guard
  }
}
```

Note: `this.depend(Other)` already handles the _reactive read_ case cleanly. `this.watch` covers the _imperative side-effect on change_ case (e.g. "when scene changes, re-upload GPU buffers"). Both should be lifecycle-bound and documented as a pair.

**Why now:** pure boilerplate elimination, low implementation cost, removes a documented correctness footgun ("or it throws").

---

### 🟠 P1 — Dev-mode warning for unknown `useBloc` options (and bloc mutation outside transitions)

**Problem.** `useBloc` **silently ignores unknown option keys.** In user-fe-reviews this shipped a real bug: `AppointmentScheduler.tsx:132` still passes the v1 `{ props: {...} }` slot; v2 drops it with no error, so **11 scheduler tracker callbacks are dead at runtime** (`SchedulerBloc.tsx:191`). No type error, no warning, no signal.

Relatedly, nothing stops `Blac.getBloc(X).field = y` (`AppointmentScheduler.tsx:249`) — mutating a bloc outside a state transition, which can even create a detached instance.

**Proposal:**

1. Warn (dev only) when `useBloc` receives an option key not in the known set. Cheap; catches an entire class of silent migration breakage.
2. Consider `exactOptionalPropertyTypes`-style typing so a stray `props` key is a _type_ error, not just a runtime warning.
3. (Stretch) Dev-mode `Object.freeze`/Proxy guard on state read outside a transition, pointing users at `emit`/`patch`/inputs.

**Why now:** trivially cheap, and it directly prevents the "dead callbacks that pass type-check" failure mode that the silent-option-drop created.

---

### 🟠 P1 — Transient event / command channel

**Problem.** BlaC only models **retained state**. When one part of the app needs to _command_ another ("focus the search box", "reveal this attribute"), there's no channel — so phylon bypasses blac entirely with `window` CustomEvents (`phylon:focus-search`, `phylon:reveal-attribute`, `phylon:reveal-style-section`). user-fe-reviews has the mirror image: domain-event subscriptions hand-rolled on top of cubits (`TaskListBloc.ts`).

**Proposal — a one-shot effect/command emitter** distinct from state, that React can subscribe to without it becoming part of the re-render surface:

```ts
class SearchCubit extends Cubit<S> {
  focusRequested = this.signal(); // transient, not retained
  requestFocus() {
    this.focusRequested.emit();
  }
}
```

```tsx
useBlocEffect(
  SearchCubit,
  (c) => c.focusRequested,
  () => inputRef.current?.focus(),
);
```

This keeps imperative coordination inside the blac graph (debuggable, testable) instead of escaping to the global event bus.

**Why now:** both projects route around the library for this; phylon's escape hatch (global `window` events) is un-debuggable and un-testable.

---

### 🟠 P1 — Actions-only / no-subscribe handle

**Problem.** Components that only _call methods_ still subscribe to the full state and re-render on every change. phylon's workaround is to make `{ autoTrack: false }` the **default** on most `useBloc` calls — effectively turning off the headline tracking feature app-wide and overloading it to mean both "don't subscribe" and "I read deep state the tracker can't see."

**Proposal — an explicit actions accessor** that subscribes to nothing:

```ts
const annotations = useBlocActions(AnnotationsCubit); // methods only, zero subscription
annotations.addAnnotation(...);
```

Making intent explicit lets `autoTrack` go back to meaning what it should, and removes the "autoTrack:false as a blunt instrument" smell.

**Why now:** phylon has inverted the library's headline default; that's a strong signal the no-subscribe case needs first-class support.

---

### 🟡 P2 — Deeper/non-plain state tracking

**Problem.** The proxy tracker only sees plain objects/arrays (capped at depth 10) and returns Map/Set/Date/class instances **raw** — reads through them aren't tracked, and `_`/`$$`-prefixed keys are silently untracked. This is part of _why_ phylon defaults to `autoTrack: false`: it reads deep nested objects the tracker can't follow.

**Proposal.** At minimum, document the boundaries loudly (a "what auto-track can and can't see" table). Better: support Map/Set tracking, and dev-warn when a tracked read crosses into an untrackable value so `autoTrack:false` becomes an informed choice, not a guess.

**Why now:** it's the hidden reason behind phylon's tracking opt-out; fixing perception here may recover the feature's adoption.

---

### 🟡 P2 — Persistence helper

**Problem.** phylon hand-rolls `localStorage` read/write in `LayoutCubit`. The hydration API exists but is shaped for SSR, not "persist this cubit."

**Proposal.** A small opt-in persistence plugin/mixin: `@blac({ persist: 'phylon-layout' })` or a `persist(key)` helper that serializes state on change and rehydrates on construct. Could be built on the existing plugin system (which neither project uses — see §5).

---

### 🟢 P3 — Correctness/doc fixes (do these regardless)

These are outright defects surfaced by the capabilities audit; cheap and confidence-building:

1. **README documents `update(fn)` and `lastUpdateTimestamp` that don't exist** in the implementation. Remove or implement.
2. **`BlocConstructor` types static `acquire`/`borrow`/`ensure`/`release` that aren't implemented** — `MyBloc.acquire()` type-checks but throws at runtime. Remove from the type or implement.
3. **`@blac()` options are mutually exclusive** (`keepAlive` + `equality` can't combine). Either document the constraint or allow combination.
4. **`borrow`/`ensure`/`acquire` semantics differ subtly** (ref vs no-ref, throw vs create); `depend` + orphan-cleanup can dispose a dependency out from under you. Document the table; consider a dev warning on the dispose-while-depended case.

---

## 4. The `dependencies:` paradox — worth a dedicated investigation

The manual `dependencies:` selector is the library's intended answer to "auto-track over-renders," yet it has **zero uses in either project**, and both independently route around it (phylon → `autoTrack:false`, user-fe-reviews → documented distrust, risk R8). That's not an accident.

**Hypotheses to test:**

- Does providing `dependencies:` disable auto-track entirely (all-or-nothing), making it feel risky?
- Are the docs/examples missing, so nobody reaches for it?
- Is the failure mode (forget a field → missed re-render) too punishing vs auto-track's "just works"?

Resolving this likely improves adoption more than any new feature, because the capability already exists.

---

## 5. Unused subsystems (capability that's invisible)

Across **both** projects, these ship in the library but see ~zero adoption:

- **Plugin system** (`getPluginManager`, `BlacPlugin`, 7 hooks) — 0 uses. Yet it's the natural foundation for persistence (§3.6), devtools, and logging.
- **Registry API** (`acquire`/`borrow`/`borrowSafe`/`getRefCount`/…) — used only indirectly via the shim.
- **`@blac()` decorator** — everyone uses `static keepAlive`/`static isolated` instead; the decorator form is effectively dead.
- **Devtools / `excludeFromDevTools`** — unused.
- **`tracked()` / `createTrackedContext()`** — unused outside the library.

Recommendation: either promote these (docs + examples) or treat their non-adoption as evidence to trim API surface. A library with this many invisible exports is hard to learn, which compounds every discoverability problem above.

---

## 6. Suggested roadmap

| Phase                             | Items                                                                                                   | Theme                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **1 — Stop the bleeding**         | P3 doc/type fixes; P1 unknown-option warning                                                            | Cheap correctness; prevents silent bugs |
| **2 — Close the big gaps**        | P0 inputs channel; P0 lifecycle-bound `this.watch`                                                      | Kills the top anti-patterns             |
| **3 — Derivation & coordination** | P0 computed primitive; P1 transient signals; P1 actions-only                                            | Removes hand-rolled reactivity          |
| **4 — Discoverability**           | Docs for `depend`/`dependencies`/testing/hydration; the §4 investigation; trim or promote §5 subsystems | Recover features that already exist     |
| **5 — Polish**                    | P2 deep tracking; P2 persistence helper                                                                 | Long-tail friction                      |

**If only three things get built:** the **inputs channel**, the **computed primitive**, and **lifecycle-bound `this.watch`**. They map 1:1 onto the three most-repeated, cross-project anti-patterns and would let user-fe-reviews finish its migration without the render-mutation crutch.
