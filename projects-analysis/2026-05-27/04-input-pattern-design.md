# Designing the "inputs" pattern for BlaC v2

**Date:** 2026-05-27
**Context:** Follow-up to [`03-synthesis-and-recommendations.md`](./03-synthesis-and-recommendations.md) §3 P0. How do we give blocs external data (props/refs/config/args) in a way that is **useful, safe, and ergonomic** — without the hand-rolled `setProps` crutch?

> **Decisions locked (2026-05-27).** See §7 for the reasoning these resolve:
>
> 1. **Keying:** default instance identity = **structural hash of `args`** (atomFamily/queryKey style). Distinct args ⇒ distinct instances; override race impossible by construction. `static key` overrides for non-serializable args.
> 2. **Construction:** keep the **zero-arg `new Type()` invariant**; the framework calls **`init(args)`** once before the first state snapshot.
> 3. **Live shared data (category C):** **events/messages** (`cubit.send(...)` / a method called from one effect), not a provider-owned `inputs` slot. Simpler; ownership is by convention — see the §4 Primitive 2 caveat.

---

## 1. The concern, stated precisely

> Multiple `useBloc(SameCubit, …)` consumers each want to set input props. Because the cubit is a **singleton**, only the first consumer's data reaches construction; later consumers then **override** each other's props. I tried an `owner: true` flag so only one consumer may write — but the API was odd, it had no type safety, and runtime-only checks aren't good enough.

This is exactly right, and it's worth naming _why_ the singleton + setProps combination is unsafe:

- **Last-writer-wins races** — N consumers, N different prop values, the instance holds whichever wrote last. Non-deterministic across mount order and re-render order.
- **No revert semantics** — when the consumer that "won" unmounts, its props linger on the shared instance for everyone else.
- **Writes happen during render** — `bloc.props = props` emits/mutates while React is rendering → StrictMode double-invoke, concurrent tearing, stale closures.
- **The `owner` flag is the right instinct on the wrong surface** — ownership is real, but a runtime boolean on one of N _identical_ hook calls can't be type-checked and can't prevent two callers both claiming it.

The grounding facts in BlaC today ([`useBloc.ts:153-161`](../../packages/blac-react/src/useBloc.ts), [`StateContainerRegistry.ts:191`](../../packages/blac-core/src/core/StateContainerRegistry.ts)):

- Instances are created **lazily** by `new Type()` — **zero-arg, no factory seam** — keyed by `instanceKey`.
- `instanceKey` resolves: explicit `instanceId` → `autoInstance` (`useId()`) → `<BlocProvider>` context → `'default'`.
- Per-consumer **refcounting** already exists (`acquire`/`release` with a `refId`).
- `BlocProvider` today **only injects an `instanceId`** into context — it does not create, own, or configure the instance.

So the rails for keyed instances and provider scoping already exist. What's missing is (a) data reaching construction, and (b) a single-owner surface for live data.

---

## 2. The reframe: "inputs" is three different needs

The whole problem dissolves once you stop treating "inputs" as one thing. There are three, with different lifetimes and different ownership rules:

| #                          | Need                                                      | Lifetime                 | Example                           | Ownership question                                     |
| -------------------------- | --------------------------------------------------------- | ------------------------ | --------------------------------- | ------------------------------------------------------ |
| **A. Identity inputs**     | distinguish _which_ instance                              | defines the instance     | `userId` for a `UserCardCubit`    | none — different value ⇒ different instance            |
| **B. Construction inputs** | build the instance / seed initial state                   | set **once** at creation | initial config, repository handle | one creator; immutable after                           |
| **C. Live inputs**         | data from React that **changes** over the instance's life | tracks a parent value    | a changing `slides[]`, `theme`    | **one writer** — this is the only place the race lives |

**The override race only exists in cell C, and only when the instance is shared.** A and B never race: differing values just mean different instances or are fixed at birth. So the design strategy is:

1. Make A and B first-class so most "inputs" stop being category C at all.
2. For the genuine category C residual, enforce a **single writer structurally** (via the type system), not with a runtime flag.

---

## 3. Prior art — how the field solves this

Every mature state library has hit this exact wall. They converge on a small set of orthogonal mechanisms.

### Jotai `atomFamily` / Recoil parameterized atoms — _inputs are identity_

`atomFamily((param) => atom(...))` memoizes by `param`. Same param → same atom; different param → different atom. The parameter **is** the key.
→ **Lesson:** if the input defines the instance, fold it into identity and the race is gone by construction. (Category A.)

### TanStack Query `queryKey` — _identity key + dedup + refcount_

`useQuery({ queryKey: ['user', id], queryFn })`. The key is identity; N components with the same key share one cache entry and one in-flight request; different keys are independent; refcount + `gcTime` disposes unused entries. Inputs flow through the `queryFn` **closure**, never by mutation. When options differ between same-key callers, they're expected to be consistent (and React Query warns).
→ **Lesson:** serializable key = identity; data flows by closure/creation, not mutation; refcount handles lifecycle; _same key ⇒ inputs must agree, warn otherwise._

### XState v5 `input` vs events — _immutable creation input, events for change_

An actor is spawned with `input` **once**; `input` is immutable for the actor's life. To change anything afterward you **send events**. Distinct from `context` (mutable state).
→ **Lesson:** sharply separate "data to construct" (immutable, category B) from "data that changes" (category C → messages). Don't let one API serve both.

### flutter*bloc (BlaC's namesake) — \_Provider creates, events feed*

`BlocProvider(create: (_) => MyBloc(repo))` constructs the bloc **with constructor args** and scopes it to a subtree; descendants read via `context.read/watch`; runtime data flows in as **events** (`bloc.add(...)`). Per-item blocs get their own provider. There is no "many widgets set props on one bloc" because creation args are set once at the provider and everything else is an event.
→ **Lesson:** the namesake's answer is exactly **constructor args at a Provider + events for the rest + scoping by Provider** — precisely what v2's zero-arg rule removed.

### Zustand — _store-per-component via context + effect sync_

Module-singleton stores take inputs from module scope. For per-component props, the documented pattern is: create the store in a context provider, and a single `useEffect` syncs props via `store.setState`. The provider is the lone writer.
→ **Lesson:** when props must be live, put the store behind a provider and let **the provider** (one node) sync them.

### MobX local stores — _one store, one syncing reaction_

`useLocalObservable` + a single effect/reaction to sync props. Again: one owner syncs.

### React itself — _controlled vs uncontrolled_

`defaultValue` (uncontrolled: initial only) vs `value`+`onChange` (controlled: parent owns). This is the same dichotomy as category B vs C.

**Synthesis.** Nobody endorses "any consumer mutates a shared singleton's props." The universal answers are: **(1) make identity-defining inputs part of the key; (2) supply construction data once at creation; (3) route live changes through a single owner (a Provider) or through events.**

---

## 4. Proposed design for BlaC

A two-primitive model that maps cleanly onto the existing registry/provider rails and resolves each category with type-level safety.

### Primitive 1 — `args`: typed creation data that participates in identity (covers A + B)

Let blocs declare an `Args` type. `args` are passed at the call site, fed to a framework-called **`init(args)`** (the zero-arg `new Type()` invariant is preserved), and **derive the instance key** by default.

```ts
class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  //                                  ^state          ^Args (new 2nd type param)
  state = { loading: true, user: null };

  // called once by the framework right after construction, before the first snapshot.
  // args available here → correct initial state, no flash.
  init(args: { userId: string }) {
    void this.load(args.userId);
  }

  // optional: how args map to identity. DEFAULT = stable structural hash of args.
  // only needed for non-serializable args (refs/functions/class instances).
  static key = (a: { userId: string }) => a.userId;
}
```

```tsx
// args is REQUIRED and typed when Args != void; a TYPE ERROR if omitted or wrong-shaped.
const [state, cubit] = useBloc(UserCardCubit, { args: { userId } });
```

Why this is safe and ergonomic:

- **The override race is impossible.** Different `args` → different `key` → different instance. Same `args` → same instance, and the args are identical by definition. (Dev-warn if a second same-key caller passes args that _don't_ deep-equal the originals — the React Query rule.)
- **Type-safe, not runtime-checked.** `Args` is a generic param; the `useBloc` options type makes `args` required when `Args != void` and **forbidden** when `Args == void`. No `owner` boolean, no runtime guard.
- **Correct initial state on first render.** `args` are available synchronously inside `acquire` during render (`useMemo`); the framework calls `init(args)` immediately after `new Type()` and before the first snapshot, so state is seeded correctly — the concrete reason `onMount` is insufficient (it fires after first paint → flash/extra render).
- **Covers the bulk of `user-fe-reviews`.** Forms, file-upload, per-item cubits are conceptually _keyed or private_. Pair `args` with a per-mount instance for the private case:

```ts
// private instance, disposed on unmount, seeded with args — replaces setConfig/setRefs entirely
const [state, cubit] = useBloc(FileUploadCubit, {
  args: options,
  autoInstance: true,
});
```

- **Covers the ambient-singleton case (B).** A globally-shared, configure-once bloc declares `static key = () => 'default'`; all consumers share one instance, args set at first creation, dev-warn on mismatch. (This is the `CmsClient apiRoot` case.)

**Default keying (decided — structural hash):** when no `static key` is given, identity = `structuralHash(args)` (atomFamily/queryKey behaviour: distinct args ⇒ distinct instances). This is safe-by-default — the "first wins / others ignored" footgun is gone. Requires args to be serializable; non-serializable args (refs, functions, class instances) must provide an explicit `static key` or use a private instance (`autoInstance`).

### Primitive 2 — events/messages: live data via one owning effect (covers C)

For data that genuinely **changes over a shared instance's life** and must _not_ fork identity (a live `slides[]`, a `theme`), the owning component pushes changes through an **explicit method (event), called from a single effect** — the XState/flutter_bloc model. No `inputs` slot, no provider boundary.

```ts
class CarouselCubit extends Cubit<CarouselState> {
  // an ordinary method = the "event". Side-effect-free of render; safe to call from effects.
  slidesChanged(slides: Slide[]) {
    this.patch({ total: slides.length, slides });
  }
}
```

```tsx
function Carousel({ slides }: { slides: Slide[] }) {
  const [state, cubit] = useBloc(CarouselCubit, { args: { id } });

  // the OWNING component syncs the live value from one effect — never during render
  useEffect(() => {
    cubit.slidesChanged(slides);
  }, [cubit, slides]);

  return /* … */;
}
```

Why this was chosen over a provider-owned `inputs` slot:

- **It fixes the actual hazard.** The render-time-mutation problem (`bloc.props = props`) is gone: the call moves into an effect, explicit and named. This is the single biggest improvement over today's `setProps`.
- **No new ownership concept to learn.** It's just a method call — the same vocabulary as every other bloc action. No `BlocProvider bloc inputs`, no `onInputsChanged` lifecycle, no read-only-consumer typing rules.
- **Composes with keying.** Most "shared + live" cases are actually _keyed_ (Primitive 1 already separates them by `args`), so the residual that needs events is small.

**Caveat — ownership is by convention, not enforced (accepted tradeoff).** Unlike a provider-owned `inputs` slot, nothing at the type level stops _two_ components from both calling `cubit.slidesChanged(...)` from their own effects on the same shared instance — which reintroduces a last-writer-wins race for that field. Mitigations:

- In practice the keyed-`args` default (Primitive 1) routes most multi-consumer cases to _distinct_ instances, so a shared instance with two live writers is rare and usually a design smell.
- Document the convention crisply: _"one component owns the sync of any given live value."_
- Optional dev-mode guard: warn when the same event method is driven from >1 mounted consumer of the same instance within a tick (detects accidental multi-writer without runtime cost in prod).

**Deferred alternative — provider-owned `inputs`.** If the convention proves too loose in practice, the structurally-enforced version remains available: `<BlocProvider bloc={C} inputs={…}>` owns the instance and is the _only_ node that accepts `inputs`; descendant `useBloc(C)` calls are read-only (passing `inputs` there is a type error). That graduates `BlocProvider` from "injects an instanceId" to "owns + configures," and is the type-safe form of the original `owner` flag. Kept on the shelf, not built in round one.

### Why two distinct mechanisms, not one slot

`args` and events are the controlled/uncontrolled dichotomy:

- **`args`** = _uncontrolled with initial value_ (`defaultValue`): set at birth, immutable, identity-bearing. Change ⇒ new instance.
- **events** = _controlled_ (`value`/`onChange`): a parent owns the value and pushes updates via a method call; the instance is long-lived.

Collapsing them into one mutable slot is exactly what produced `setProps` — a thing that's neither clearly creation-time nor clearly owned. Keeping them distinct makes each one safe.

### Decision matrix (what to reach for)

|                              | Input defines identity (A) / set once (B)                           | Input is live & changing (C)                                                                                             |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Private to one component** | `useBloc(C, { args, autoInstance: true })`                          | `useBloc(C, { args, autoInstance: true })` + `cubit.xChanged(v)` from _that component's_ effect (single owner trivially) |
| **Shared across consumers**  | `useBloc(C, { args })` — args key the instance; **race impossible** | `cubit.xChanged(v)` from the **one owning component's** effect (convention; keying makes this case rare)                 |

The dreaded "N consumers overriding each other" was eliminated for the identity/creation cases by keying. For the residual live-shared cell it's held to a documented single-owner convention (with an optional dev-mode multi-writer warning); the structurally-enforced provider-owned `inputs` slot stays on the shelf if convention proves insufficient.

---

## 5. Safety details to get right

- **Construction timing.** `args` must be available synchronously at `acquire` time (during render's `useMemo`) so initial state is correct without a flash. The registry keeps `new Type()` ([`StateContainerRegistry.ts:191`](../../packages/blac-core/src/core/StateContainerRegistry.ts)) and calls `init(args)` immediately after, before the instance's first snapshot is read. `init` is invoked **once per instance** (on creation), not per consumer — later same-key consumers attach without re-running it (dev-warn if their `args` mismatch).
- **StrictMode / concurrent.** `init(args)` must be idempotent per key — the registry already dedupes by `instanceKey`, so a double-invoke returns the existing instance and must not re-run `init`. Side effects in `init` (`this.load()`) should be safe under the registry's refcount dedup, but this needs a test.
- **Event sync ordering.** Live values are pushed via a method called from a `useEffect` in the owning component — after commit, never during render. No mid-render emits. The `[cubit, value]` dep array bounds re-sync to actual changes. (Same shape as zustand/React Query effect-sync.)
- **Disposal.** `args`-keyed instances use the existing per-consumer refcount + grace/`keepAlive`. Stale keys (old `userId`s) GC like React Query's `gcTime` once the last consumer unmounts.
- **Equality for keys.** Default structural hash needs a documented contract (serializable args). Provide `static key` for everything else.

---

## 6. Recommendation

Build in this order:

1. **`args` with structural-hash identity-keying + `init(args)`** (Primitive 1) first — the higher-leverage half. It dissolves the override race for the common case (different args ⇒ different instance), restores correct initial state without breaking the zero-arg invariant, is fully type-safe, and replaces the majority of `setProps`/`setConfig`/`setRefs` sites in `user-fe-reviews`. It directly answers the stated concern: _the singleton-override problem only existed because identity-defining data wasn't part of identity._
2. **Events for live shared data** (Primitive 2) — an ordinary method called from one owning effect. Kills render-time mutation with no new ownership concept. Held to a single-owner convention + an optional dev-mode multi-writer warning.

Explicitly **reject**: a runtime `owner`/`writer` flag on `useBloc`, and any "last consumer's props win" _render-time_ mutation. **Keep on the shelf**: provider-owned `inputs` as the structurally-enforced fallback if the events convention proves too loose.

This matches where the field landed (atomFamily + queryKey for identity; XState/flutter_bloc events for change) and brings BlaC back in line with its own namesake.

---

## 7. Decisions (resolved 2026-05-27)

1. **Default keying:** ✅ **structural hash of `args`** when no `static key` (atomFamily/queryKey; safe-by-default, no footgun). Non-serializable args provide `static key` or use `autoInstance`.
2. **Construction mechanism:** ✅ **keep zero-arg `new Type()` + framework-called `init(args)`** before first snapshot. Preserves the v2 invariant; `init` runs once per instance.
3. **Live inputs surface:** ✅ **events/messages** (`cubit.xChanged(v)` from one owning effect). Provider-owned `inputs` deferred as a fallback.
4. **Same-key arg mismatch:** ✅ **dev-warn** (React Query precedent) — tolerates transient mismatches during prop transitions; never throws in prod.
5. **Non-serializable inputs:** ✅ **separate `deps` lane** (never keys), refs/callbacks/elements/handles; lazily read, per-consumer merged, live ([§8](#8-non-serializable-inputs-refs-callbacks-dom-elements), [§9](#9-dynamic-late-and-multi-source-deps)).
6. **`onDepsChanged(next, prev)`:** ✅ **included** — for wait-for-handle-then-init (canvas, RTE controller) and acquire/release edges ([§9](#9-dynamic-late-and-multi-source-deps)).
7. **Identity model:** ✅ **`args`-derived is the primary idiom** (meaningful value keys + feeds the bloc); **`static key` on the class** = explicit identity declaration; **`instanceId` is the escape hatch** ([§10](#10-identity-args-static-key-and-instanceid)).

---

## 8. Non-serializable inputs: refs, callbacks, DOM elements

The `args` lane is for **serializable identity/config data** — it both keys the instance and is structural-hashed. Refs, callbacks, functions, and DOM nodes **cannot live in that lane**: a fresh callback identity (or a changing `ref.current`) every render would either produce a new instance every render or make the hash unstable. So they need a **separate, non-keying lane**.

### The two-lane rule

| Lane       | Holds                                             | Keys identity?            | Lifetime                               | Example                                               |
| ---------- | ------------------------------------------------- | ------------------------- | -------------------------------------- | ----------------------------------------------------- |
| **`args`** | serializable primitives/plain data                | **yes** (structural hash) | once at `init`, immutable              | `userId`, `endpoint`, `filters`                       |
| **`deps`** | refs, stable callbacks, elements, class instances | **never**                 | live, merged per consumer, read lazily | `inputRef`, a `useCallback`'d handler, an `emblaApi`  |
| **events** | values that _change_ over time, or late-bound     | n/a                       | each effect run                        | a live `slides[]`, a callback computed after the call |

```ts
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string }, // args  → keys identity (synchronous at init)
  { inputRef?: RefObject<HTMLInputElement> } // deps  → injected, never keyed, read lazily
> {
  state: UploadState = { status: 'idle', uploadedId: null };

  init(args: { endpoint: string }) {
    // args ONLY — synchronous, drives initial state
    this.endpoint = args.endpoint;
  }

  openPicker() {
    this.deps.inputRef?.current?.click(); // read deps LAZILY, when the action runs (may be unset)
  }
}
```

```tsx
const inputRef = useRef<HTMLInputElement>(null);
// same endpoint → same instance, regardless of which ref/callback is passed.
const [state, cubit] = useBloc(FileUploadCubit, {
  args: { endpoint },
  deps: { inputRef },
});
```

This is the React Query split made explicit: `queryKey` (serializable identity) vs `queryFn` (a closure that can capture anything). We just name the closure-captured side `deps`.

> **Why a separate `deps` lane instead of `static key` subtracting fields from one big `args`?** Because a `useRef` is structurally `{ current: … }` — indistinguishable from intentional plain-object identity data. Auto-detecting "ref vs data" is unreliable, and forcing every consumer to write a `static key` to _exclude_ their refs is a footgun. Two typed lanes make the contract impossible to get wrong: if it's in `deps`, it never keys, full stop.

> **Why `deps` are NOT passed to `init` and are read lazily.** `init(args)` runs synchronously at creation, but `deps` are delivered after commit (§9), can change, and can come from multiple consumers — so they're never guaranteed present at `init`. The bloc reads `this.deps.x` lazily at action time and guards for absence. `args` stay the only synchronous-at-construction lane.

### What's safe to put in `deps`

- **`useRef` objects** — the _container_ is stable across renders; reading `.current` lazily inside actions always sees the current value. ✅
- **Stable callbacks** — `useCallback`'d handlers, or module-level functions. ✅
- **Long-lived external instances** — an Embla API, a map controller, a websocket. ✅

### The callback staleness gotcha — and the better pattern

A callback created **inline** (`onComplete={() => …}`) gets a new identity every render. If captured once in `init`, the bloc holds the _first_ closure forever → stale. Three ways to handle it, best first:

1. **Don't inject the callback at all — invert it (recommended, most blac-native).** Have the bloc expose _state_, and let the component call its own fresh callback in an effect. The bloc stays pure and decoupled; no staleness possible. This is the flutter_bloc `BlocListener` model.

   ```tsx
   const [{ uploadedId }] = useBloc(FileUploadCubit, { args: { endpoint } });
   useEffect(() => {
     if (uploadedId) onComplete(uploadedId); // always the current onComplete
   }, [uploadedId, onComplete]);
   ```

2. **Stabilize at the source** — wrap the handler in `useCallback` (or React 19 `useEffectEvent`) so it's safe to put in `deps`.

3. **Treat it as a live input** — push the latest callback via an event from one effect (`useEffect(() => cubit.setOnComplete(cb), [cb])`). Works, but couples the bloc to the consumer's render cycle; prefer (1).

**Guidance to document:** _blocs should rarely hold consumer callbacks._ Expose state/events and let React's render layer invoke callbacks with fresh closures. Reserve `deps` for genuinely stable handles (refs, controllers, stable callbacks).

### Resolved — keep `deps` a separate lane

✅ **Two lanes, not one `args` + `static key`.** Beyond the ref-looks-like-data footgun, the decisive reason is that a separate `deps` lane keeps `args` meaning _exactly one thing_: **the serializable, meaningful identity + config of the instance**. That crispness is what lets `args` cleanly subsume `instanceId` (see [§10](#10-identity-args-static-key-and-instanceid)) — if refs/callbacks were mixed into `args`, "args = identity" would be muddy (some args key, some don't). So separating `deps` is what _makes the args-as-identity story work_; the two decisions reinforce each other.

---

## 9. Dynamic, late, and multi-source deps

`useBloc` usually sits at the top of a component (its state/methods feed everything below), so deps are frequently **not available at the call site**, **change over time**, or are **contributed by several consumers at once**. The `deps` lane has to handle all three without becoming a render-time `setProps` footgun or a black box.

First, untangle the two problems hiding here:

- **Timing** — the dep is known only _after_ the `useBloc` call (computed below it, or arrives later).
- **Composition** — different consumers each own a _different slice_ of deps (A: the input ref; B: the form ref + submit handler).

These have different answers.

### Composition: `deps` is per-consumer, partial, and merged

Each consumer's `deps` object is **the complete declaration of that consumer's slice**. The library reconciles per consumer (it already mints a stable per-consumer id — `consumerIdRef`/`refId` in [`useBloc.ts:113-160`](../../packages/blac-react/src/useBloc.ts)) and maintains a shallow-merged combined view on `bloc.deps`:

```tsx
function AddressInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  useBloc(FormCubit, { args: { formId }, deps: { inputRef } });          // owns `inputRef`
}

function FormShell() {
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmit = useCallback(/* … */, [deps]);
  useBloc(FormCubit, { args: { formId }, deps: { formRef, onSubmit } }); // owns `formRef`, `onSubmit`
}
// bloc.deps === { inputRef, formRef, onSubmit } — assembled from both, same formId → same instance
```

Reconciliation rules (the whole "magic," statable in four lines — not a black box):

1. **Merge:** a consumer's keys are shallow-merged into `bloc.deps`.
2. **Per-owner diff:** keys a consumer _previously_ set but no longer includes are withdrawn; **other consumers' keys are untouched**. (Like reconciling a set of `<Context.Provider>`s — no "is `undefined` a delete?" ambiguity, because each owner declares its own complete slice.)
3. **Unmount:** a consumer's keys are removed when it unmounts. If it was the sole contributor of a key, `bloc.deps.key` becomes `undefined` → the bloc must guard (it already reads lazily).
4. **Sync timing:** applied in a **commit effect**, never during render. Shallow-diffed, so only real changes propagate.

**Collisions (two consumers set the same key):** dev-warn, last-commit wins — the same one-owner-per-key convention as the events lane (§4). Multi-source is for _different_ keys; two owners fighting over one key is a design smell the warning surfaces.

### Timing: where the dep isn't available at the call site

| Situation                                                                                                      | Answer                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Dep is a `useRef` / const creatable **above** `useBloc`                                                        | Hoist it above the call, pass via `deps`. The common case; trivial.                                                                         |
| Dep is computed **below** `useBloc` because it depends on the bloc's own state/methods (a real ordering cycle) | Don't try to pass it at the call. Bind it from an **effect** as an event: `useEffect(() => cubit.bindSubmit(onSubmit), [cubit, onSubmit])`. |
| Dep simply **changes** over time                                                                               | Same — it's a live input (§4 events lane).                                                                                                  |

The rule that keeps the API small and honest: **`deps` is declarative and for what you have at mount; anything late/dynamic/cyclic goes through an ordinary bloc method called from an effect.** We deliberately do _not_ add a generic imperative `cubit.setDeps(partial)` — it would invite render-time misuse and duplicate the events lane. A named method (`bindSubmit`) is self-documenting and type-safe; a generic partial setter is neither.

> **Partial updates** therefore exist at two granularities, both safe: _across consumers_, the per-owner merge composes slices; _within a consumer over time_, re-passing `deps` (or calling a bind-method) updates only what changed. No consumer can clobber another's slice, and nothing mutates during render.

### Reacting when a dep is wired — `onDepsChanged`

Lazy reads cover "use the handle when an action runs," but a large class of deps needs the inverse: **the bloc must act the moment a handle becomes available** (and tear down when it goes away). `onDepsChanged(next, prev)` fires after each merge (post-commit), giving the bloc that edge:

```ts
class CanvasRendererCubit extends Cubit<
  RenderState,
  { sceneId: string },
  {
    canvas?: HTMLCanvasElement; // arrives only once the <canvas> mounts
    controller?: RteController; // a class instance handed in from elsewhere
  }
> {
  onDepsChanged(next: this['deps'], prev: this['deps']) {
    if (next.canvas && next.canvas !== prev.canvas) {
      this.initRenderer(next.canvas); // wait for the canvas, THEN init GPU/render loop
    }
    if (!next.canvas && prev.canvas) {
      this.disposeRenderer(); // canvas unmounted → tear down
    }
    if (next.controller !== prev.controller) {
      this.bindController(next.controller);
    }
  }
}
```

This is the canonical answer to "we wait for a ref to a canvas to start rendering" or "we wait for a controller instance (RTE editor) to be passed in" — cases where the handle genuinely can't be an `arg` (non-serializable, created later) but the bloc must initialize the moment it lands. The hook receives `prev` so the bloc can diff which handle changed and run the matching setup/teardown. Blocs that don't declare it keep pure lazy-read deps — no cost, no required boilerplate.

> Pairs with disposal: `onDepsChanged(..., prev)` where a key went `undefined` is the "handle removed" signal; combined with the bloc's own `onSystemEvent('dispose')`, a renderer/controller has clean acquire-and-release edges without any consumer-side cleanup wiring.

### Edge cases

- **StrictMode double-invoke** — reconciliation is keyed by consumer id and idempotent; a double-mount re-applies the same slice.
- **Consumer remounts / key changes** — old slice withdrawn, new slice applied; combined view stays consistent.
- **Dep needed during construction** — not supported by design; that's what `args` (serializable, synchronous) is for. If a handle is genuinely required to build the bloc, reconsider whether it's really config.
- **No consumer provides a key yet** — `bloc.deps.key` is `undefined`; lazy reads guard. Actions that require it can early-return or queue.

### Resolved

- **`onDepsChanged` hook:** ✅ **included from the start.** The wait-for-handle-then-initialize pattern (canvas → start rendering, controller instance → bind) is common enough and can't be expressed any other way; lazy reads alone can't trigger setup. Optional to declare; zero cost when absent.

---

## 10. Identity: `args`, `static key`, and `instanceId`

Today identity is an **opaque `instanceId`** ([`useBloc.ts:153`](../../packages/blac-react/src/useBloc.ts)): you hand the registry a string/number and the bloc never sees it. That's backwards — in practice the id almost always _is_ a meaningful value (a `userId`, an `orgId`, a document id), and the bloc usually needs that value anyway. So you end up passing it twice: once as the opaque key, once again as data.

**`args` fixes this by making identity a function of meaningful input.** The value that distinguishes the instance _is_ the value the bloc uses. One source of truth, and the id is finally useful instead of arbitrary.

```ts
// before — id is opaque, and userId has to be threaded in a second time somehow
const [s, bloc] = useBloc(UserCardCubit, { instanceId: userId });

// after — the meaningful value keys the instance AND feeds the bloc
const [s, bloc] = useBloc(UserCardCubit, { args: { userId } });
```

### Resolving the "less explicit" worry

Deriving the key implicitly from `args` _can_ feel like action-at-a-distance ("why did I get a new instance?"). The fix is `static key` — it lives **on the class**, declared once, and reads as a plain statement of what identifies the bloc:

```ts
class DocumentCubit extends Cubit<
  DocState,
  { docId: string; readonly: boolean }
> {
  static key = (a: DocumentCubit['args']) => a.docId; // ← identity is the docId. Explicit, in one place.
  // `readonly` is config that rides along in args but does NOT fork the instance
}
```

So explicitness doesn't cost per-call verbosity: identity is stated once on the class, not repeated at every `useBloc`. When `static key` is absent, the default is the structural hash of all `args` (atomFamily/queryKey norm) — which is the right default _because_ `args` is serializable-only (the separate `deps` lane, §8, guarantees no ref/function ever lands here to destabilize the hash). This is the payoff of keeping the lanes separate.

### The layered identity model

| You want…                                                     | Use                              | Identity is                                        |
| ------------------------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| per-value instances keyed by a domain value (the common case) | `args` + (optional) `static key` | `static key(args)`, else structural hash of `args` |
| a private per-mount instance (no sharing)                     | `autoInstance: true`             | a `useId()` key                                    |
| a scope shared by a subtree                                   | `<BlocProvider instanceId>`      | the provider's id (inherited by descendants)       |
| an explicit key not derivable from args                       | `instanceId` (escape hatch)      | the literal id you pass                            |

`args`-derived identity becomes the idiom for meaningful per-value instances; `instanceId` stays as a lower-level override for the genuinely opaque/anonymous/scoped cases. They compose through the existing resolution order in [`useBloc.ts:153-158`](../../packages/blac-react/src/useBloc.ts) — `static key(args)` simply becomes another (high-priority) source feeding the same `instanceKey`.

### Precedence (proposed)

When more than one identity source is present, resolve in this order — explicit beats derived:

1. explicit `instanceId` on the call (hard override)
2. `autoInstance` / `static isolated` (forced per-mount)
3. `static key(args)` → else structural hash of `args`
4. `<BlocProvider>` context id
5. `'default'`

A dev-warn when both an explicit `instanceId` and keying `args` disagree (you're overriding the derived identity — usually a mistake).

### Resolved

- ✅ **`args`-derived identity is the primary idiom**; the meaningful value keys the instance and feeds the bloc (no double-threading).
- ✅ **`static key` on the class** is the explicit identity declaration — explicitness without per-call cost — and the answer to the "less explicit" concern.
- ✅ **`instanceId` stays** as the opaque/anonymous/scoped escape hatch, not the default path.
- ⏳ Minor sub-decision: also offer a declarative field-list sugar (`static key = ['docId']`) alongside the function form? Function is strictly more expressive (composite keys, transforms); field-list is more inspectable. Can add later.
