# BlaC v2 real-world usage analysis — `user-fe-reviews`

Date: 2026-05-27
Subject repo: `/Users/brendanmullins/Projects/user-fe-reviews`
v2 libs under study: `@blac/core@^2.0.13`, `@blac/react@^2.0.13`
Goal: extract usage patterns, workarounds, and pain points to feed back into the libraries.

---

## Overview — scale of usage, shim vs direct

This repo is a pnpm monorepo mid-migration from BlaC v0 (`blac@^0.4.1`) and v1 (in-repo `blac-next`/`blac-react`, now deleted) onto v2. A compat shim (`@9amhealth/blac-compat`) bridges the gap. The migration is deliberately phased: **`packages/shared` is the v2-native frontier; the two apps (`user-app`, `pmp`) are still overwhelmingly on the shim.**

Import-surface counts (grep, excluding node_modules):

| Import source | Files | What it means |
|---|---|---|
| `@9amhealth/blac-compat` | 325 | Shim — the dominant surface. v0/v1 idioms preserved. |
| `from "blac-next"` | 216 | v1 name, aliased to the shim via package.json. |
| `from "blac"` (v0) | 63 | v0 name, aliased to the shim. |
| `from "@blac/react"` (direct v2) | 18 | Genuine v2 React usage — almost all in `packages/shared`. |
| `from "@blac/core"` (direct v2) | 18 | Genuine v2 core usage — almost all in `packages/shared`. |

API-call frequency (the real tell of which idioms are alive):

| API | Count | Verdict |
|---|---|---|
| `Blac.getBloc(...)` | 445 | The dominant lookup. v1 idiom, routed through shim. |
| `ensure(...)` (v2) | 20 | Genuine v2 lookup; clustered in `TaskList*` + `pickerUtils` + tourGuide. |
| `acquire(...)` (v2) | 0 | Unused. |
| `this.depend(Other)` (v2 cross-bloc dep) | **0** | **Never used anywhere.** The headline v2 ergonomic feature is dead on arrival here. |
| `watch(...)` (v2 external observe) | 0 in app code | The 9 hits are all `wcl` Lit decorators / form `watch`, not blac. |
| `static keepAlive = true` | 39 | Legacy static form. |
| `static isolated = true` | 10 | Legacy static form. |
| `@blac({...})` decorator | **0** | The advertised v2 decorator config is never used; everyone uses the static. |
| `instanceId:` in `useBloc` | 43 | Primary per-instance scoping mechanism. Healthy adoption. |
| `dependencies:` selector in `useBloc` | 0 in app code | Manual re-render selectors essentially unused; they lean on auto-tracking. |

**Bottom line on shim vs direct:** the v2-native surface that actually exercises the new APIs is small (`packages/shared`, ~30 files). The apps use v2 only transitively through the shim, where everything still looks like v1 (`Blac.getBloc`, `static keepAlive`, `useBloc({ props })`). When evaluating "v2 idioms," `packages/shared` is the only honest signal, and even there several v1 reflexes survive.

---

## Good patterns (genuine, clean v2 usage)

### G1 — `instanceId` from a prop-derived key for per-instance scoping
`apps/user-app/src/ui/components/TaskList/TaskList.tsx:87-93`
```ts
// Distinct list per program set — two <TaskList> mounts with different
// programs need independent state.
const instanceId = programs.join(",");
const [{ loading, displayTasks }, bloc] = useBloc(TaskListBloc, { instanceId });
```
Clean: explicit, documented, no provider needed. This is the v2 scoping story working as intended.

### G2 — `useId()` for anonymous per-mount instances
`packages/shared/src/molecule/FileUploadBox/useFileUploadState.ts:6-7`, `packages/shared/src/atom/wheelpicker/WheelPicker.tsx:36-37`
```ts
const uid = useId();
const contextId = pickerId ?? uid;
const [, bloc] = useBloc(WheelPickerBloc<T>, { instanceId: contextId, ... });
```
The idiomatic replacement for v1 `static isolated`. `pickerId ?? useId()` lets a caller share an instance by id or fall back to a private one. Good.

### G3 — `onMount: (b) => b.initWithProps(...)` — the sanctioned init pattern
`packages/shared/src/atom/wheelpicker/WheelPicker.tsx:39-42`, `packages/shared/src/atom/wheelpicker/PickerItem.tsx:31-41`, `packages/shared/src/molecule/autocomplete/Autocomplete.tsx:163`
```ts
const [, bloc] = useBloc(WheelPickerBloc<T>, {
  instanceId: contextId,
  onMount: (b) => b.initWithProps({ onChange, initialValue, parseValues })
});
```
This is exactly the pattern the migration team mandated (E4-rejected props-through-hook → explicit init). Where it's used it reads cleanly. Note it's paired with a follow-up `useEffect` for props that can *change* (e.g. `WheelPicker.tsx:44-48` `bloc.setEmblaRef`, `PickerItem.tsx:43-45` `bloc.setSlides`) because `onMount` is one-shot.

### G4 — `setProps` inside `useEffect` with full deps (the correct mutation discipline)
`apps/user-app/src/ui/components/TaskList/TaskList.tsx:95-115`
```ts
useEffect(() => {
  bloc.setProps({ programs, filterVisibleTasks, navigate, ... });
}, [bloc, programs, filterVisibleTasks, navigate, ...]);
```
Contrast with the render-time mutation anti-pattern (W2). This is how the rest of the codebase *should* push props, and proves the team knows the right shape — they just didn't apply it everywhere.

### G5 — `ensure(Other)` for synchronous cross-bloc reads in methods
`apps/user-app/src/ui/components/TaskList/TaskListBloc.ts:93,155,387`, `taskListHelpers.ts:306,422,535,570`
```ts
const taskManagementState = ensure(TaskManagementBloc);
```
Genuinely v2. But note this is the *non-reactive* path — see P1 (`this.depend` unused).

### G6 — `isDisposed` guards before post-await emits
`TaskListBloc.ts:97-99`, `AutoFormBloc.ts:196-198`
```ts
if (this.isDisposed) return;
```
Where present, this is the right guard for async-after-unmount. (Inconsistently applied — see W6.)

---

## Workarounds & anti-patterns

### W1 — Render-time `bloc.props =` mutation (the migration's #1 sin)
`packages/shared/src/atom/autoform/AutoForm.tsx:23`
```ts
const [{ validationErrors }, bloc] = useBloc(AutoFormBloc<S>, { instanceId: contextId });
bloc.props = props;   // ← mutating the bloc during render, every render
```
Also `packages/shared/src/atom/autoform/useAutoFormControls.tsx:23`.
**Why:** v2 dropped the `useBloc(C, { props })` slot, but AutoForm is the primary form solution and was migrated by the shortest path — just assign `props` onto the instance during render rather than wiring `onMount`/`useEffect`. **Why it's bad:** subscribers can receive emits during render; StrictMode/concurrent React double-invokes render; stale closures. This is the textbook reason v2 rejected props-through-hook — and the workaround reintroduces the exact hazard by hand.

### W2 — Render-time `cubit.set*()` calls (same sin, method flavor)
- `packages/shared/src/molecule/carousel/Carousel.tsx:66,68,73,82` — `cubit.setProps()`, `cubit.setEmblaApi()`, `cubit.setTotalSlides()`, `cubit.setSlideNames()` all called in the render body.
- `packages/shared/src/molecule/FileUploadBox/FileUploadBox.tsx:228` — `cubit.setRefs({ inputRef })` in render.
- `packages/shared/src/molecule/FileUploadBox/useFileUploadState.ts:8` — `cubit.setConfig(options)` in render.
**Why:** identical to W1 — push component-side data into the cubit, the v1 way (where `props` were re-synced every render). **Library implication:** v2 removed the prop slot but offered no *ergonomic* replacement for "data that changes every render and must reach the bloc." `onMount` is one-shot; the correct answer is a `useEffect`, but it's enough extra ceremony that devs default to the render-body shortcut. This is the single most repeated friction (5+ sites).

### W3 — `useBloc(C, { props })` silently dropped → dead callbacks
`apps/user-app/src/ui/components/AppointmentScheduler/AppointmentScheduler.tsx:132-133`
```ts
] = useBloc(SchedulerBloc, {
  props: {                       // ← v2 useBloc has no `props` option
    onSelectDate: (date) => tracker.track(...),
    onAcceptReconnectProvider: ...,   // 11 tracker callbacks
    ...
  }
});
```
`SchedulerBloc` exposes `initWithProps` (`SchedulerBloc.tsx:203`) but **nobody calls it** — the consumer passes `props` to a hook that ignores the key. Result: all 11 scheduler tracker callbacks and `fetchPreviousProvider` are dead. **Library implication:** `useBloc`'s options object silently ignores unknown keys. A leftover `props:` from v1 compiles/runs and quietly does nothing. This is the most damaging failure mode of the prop-slot removal: it's not a type error, it's a silent runtime no-op. A dev-mode warning on unknown `useBloc` option keys would have caught this instantly.

### W4 — Triple/duplicate blac imports in one file
`apps/user-app/src/ui/components/AppointmentScheduler/AppointmentScheduler.tsx:4,7,11`
```ts
import { useBloc } from "@9amhealth/blac-compat";   // line 4
import { useBloc } from "@blac/react";              // line 7  (shadows line 4)
import { Blac } from "blac-next";                   // line 11
```
Two `useBloc` imports (one shadows the other) plus `Blac` from a third source, all in one component. A migration artifact, but it shows the cost of having three coexisting import names for the same logical library; nothing flags the collision.

### W5 — Direct field mutation via `Blac.getBloc` outside `patch`
`apps/user-app/src/ui/components/AppointmentScheduler/AppointmentScheduler.tsx:249`
```ts
Blac.getBloc(SchedulerBloc).reschedulingRequired = reschedulingRequired;
```
Reaches into the registry, grabs the bloc, and mutates a public field directly (no `patch`, no method). If the bloc isn't mounted this *creates a detached instance* and mutates that. **Library implication:** `getBloc`/`ensure` returning a fully-mutable instance invites this; there's no "you're mutating outside a state transition" guard.

### W6 — Hand-rolled cross-bloc reactivity via custom observer, not `depend`/`watch`
`apps/user-app/src/ui/components/TaskList/TaskListBloc.ts:89-103`
```ts
const taskManagementState = ensure(TaskManagementBloc);
this.removeTaskListChangedObserver = taskManagementState.addObserver(
  TaskObserverEvent.TASK_LIST_CHANGED,
  () => { if (this.isDisposed) return; this.updateTasksInList(); }
);
```
They re-derive on another bloc's change by subscribing to a *custom domain event* (`addObserver` + an enum) and storing the unsubscribe to call on dispose. This is exactly what `this.depend(TaskManagementBloc)` or `watch()` is meant to make automatic — but `depend` is used 0 times and `watch` 0 times in app code. **Library implication:** the v2 reactive-cross-bloc API is either undiscovered, under-documented, or not ergonomic enough; teams roll their own pub/sub on top of cubits instead.

### W7 — `props` slot re-implemented per-cubit as a public field
`apps/pmp/src/state/UserDetailsCubit.ts:73-77`, `packages/shared/src/atom/autoform/AutoFormBloc.ts:150`
```ts
public props: AutoFormProps<S> | null = null;        // AutoFormBloc
// ...
public readonly initWithProps = (userId: string) => { // UserDetailsCubit
  this.props = { userId } as Props;
  this.emit({ ...UserDetailsCubit.initialState });     // manual reset-on-reinit
  void this.fetchUserDetails(userId);
};
```
v2 `StateContainer` dropped the `P` generic, so every cubit that wants init data re-declares its own `props` field and an `initWithProps`. The shim's `BlocBase<S, P>` still carries `P`, so app cubits straddle both. **Library implication:** "props" is a near-universal need (most stateful cubits take *some* init data), yet v2 offers no first-class slot — so each cubit reinvents it, with subtly different shapes (`props = x` vs `setProps` vs `initWithProps`, idempotent or not, with or without a state reset). A blessed `init(data)` lifecycle hook with a typed payload would standardize this.

### W8 — `static keepAlive`/`static isolated` over the decorator (100% of the time)
39 × `static keepAlive = true`, 10 × `static isolated = true`, **0** × `@blac({...})`.
**Why:** the migration team explicitly chose to honor the statics (extension E2/E3) precisely because the decorator "requires TS config changes and the static is harmless to read" (`05-v2-extensions.md`). **Library implication:** the decorator config API is, in practice, the road not taken. If statics are how real codebases configure blocs, the decorator is documentation/marketing surface that isn't load-bearing — worth knowing when prioritizing.

### W9 — `bloc.<publicField> = x` inside `useEffect` for non-serializable handles
`packages/shared/src/atom/wheelpicker/PickerItem.tsx:59` — `itemBloc.emblaApi = emblaApi;`
Embla API objects, refs, etc. can't live in `state` (not serializable, shouldn't trigger emits), so they're stashed as public mutable fields on the bloc. Done in `useEffect` so it's not the W2 anti-pattern, but it shows state-vs-non-reactive-handle is a real distinction the library doesn't model (there's `state` and then there's "everything else I hang off the instance").

### W10 — Unresolved merge conflict straddling the exact migration seam
`packages/shared/src/molecule/scheduler/SchedulerBloc.tsx:166-183` (live in the working tree)
```
<<<<<<< HEAD
    this.log("constructor", "Initializing SchedulerBloc");
=======
    if (props) { this.validateCallbacks(props); this.callbacks = props; }
    ... if (props?.appointmentType && !isDeprecated...) void this.fetchPreviousProvider(...)
>>>>>>> release
```
The conflict is *between the v2 zero-arg constructor (HEAD) and the v1 constructor-takes-props (release)*. The zero-arg-constructor constraint is colliding with branches that still construct with props — a concrete, ongoing merge cost of the constraint.

---

## Pain points / unmet needs (ranked)

1. **No ergonomic "props that change over time" channel.** The single biggest source of friction. Removing the `props` hook slot was principled, but the only sanctioned replacement (`onMount` one-shot + manual `useEffect` for updates) is verbose enough that devs default to render-body mutation (W1, W2) — reintroducing the very hazard the removal was meant to prevent. Appears 5+ times in `packages/shared` alone. **Suggestion:** a first-class, declarative props channel — e.g. `useBloc(C, { props, onPropsChange })` that internally does the `useEffect` and calls a typed `bloc.onProps(next)` hook — would remove the temptation entirely while preserving the "no construction-time props" rule.

2. **`useBloc` silently ignores unknown option keys → dead code.** The scheduler's 11 dead callbacks (W3) are a runtime no-op, not a type error, because a stale `props:` key was dropped silently. **Suggestion:** dev-mode `console.warn` on unrecognized `useBloc` option keys (cheap; would have caught this and likely others).

3. **Cross-bloc reactive deps (`this.depend`) are unused — 0 sites.** Either undiscovered or not ergonomic. Teams hand-roll observer subscriptions (W6) or do non-reactive `ensure().state` reads (G5) that don't re-derive. This is a flagship v2 feature getting zero traction in a 400+-cubit-call codebase. **Suggestion:** investigate discoverability/docs; consider whether `depend` integrates with `useBloc` re-rendering the way devs expect (the W6 pattern suggests they want "when Other changes, recompute my state").

4. **No guard against mutating a bloc outside a state transition.** `getBloc(C).field = x` (W5) and `bloc.props = x` (W1) are trivially writable. The library hands back a fully mutable instance. **Suggestion:** in dev, freeze/trap public field writes that bypass `patch`/`emit`, or at least the `state` object (the migration doc notes v2 `state` is `Readonly<S>` at the type level but nothing enforces it at runtime for sibling fields).

5. **"props" need is near-universal but unmodeled, so it's reinvented per-cubit (W7).** Three different shapes coexist (`props =`, `setProps`, `initWithProps`), some idempotent, some resetting state. No convention emerges because the library offers no anchor.

6. **The decorator config API has 0 adoption (W8); statics won 100%.** Not a bug, but a signal about which surface to invest in / document as the real path.

7. **`onMount` one-shot semantics force a second `useEffect` for changing props.** Every "init + keep-in-sync" cubit needs *two* mechanisms (G3 + the follow-up effect). The two-step dance is itself friction that pushes people toward the render-body shortcut.

8. **Three coexisting import names (`blac`, `blac-next`, `@blac/react`) with nothing flagging duplicate `useBloc` imports (W4).** Migration-specific, but the lack of any collision signal made a shadowed import survive code review.

---

## Notable quotes from their migration docs

On the props decision (the root of pain point #1), from `05-v2-extensions.md:192-193` (E4 REJECTED), quoting the library author:
> "this is a hard no, the new v2 design is to not pass the constructor params through the hook like consumers at all, instead it requires to add something like `const b = useBloc(C); useEffect(() => b.initWithProps(props), [])` or similar."
> Reason: "Hook-passed props are messy and cause sync issues — when props change, the bloc is already constructed and the caller has to remember to re-sync."
*(The codebase proves the second sentence true in both directions: devs forget to re-sync, AND they reach for render-body mutation to avoid the ceremony.)*

On the migration being half-done by the shortcut, from `todos-blac-migration-shared.md:5`:
> "The migration is **half-done**: imports and zero-arg constructors landed, but the v1 idiom of 'mutate props onto the cubit during render' was preserved everywhere instead of moving to `onMount: initWithProps`. That single shortcut is the root cause of most CRITICAL findings."

On the dead scheduler callbacks (W3), from `todos-blac-migration-shared.md:15`:
> "`setProps` is defined, but `useBloc(SchedulerBloc, {…})` never calls it. **All 11 tracker callbacks** ... are silently dead."

On the `generateSimpleId` instance-key collision, from `CONTINUE-HERE.md:136`:
> "`generateSimpleId('X', 'main')` is *not* unique. A freshly-constructed `new MyCubit()` has `instanceId === 'MyCubit:main'`, identical across instances until `initConfig()` runs ... The shim's `BlocProvider` uses `React.useId()` instead of trusting `inst.instanceId` for this reason."
*(Library implication: default instance keys aren't unique pre-registration; an easy footgun for anyone constructing instances directly.)*

On `clear()` vs v0 disposal, from `CONTINUE-HERE.md:144`:
> "`clear(BlocClass)` is not the same as v0's `disposeBloc(bloc)`. v2's `clear()` calls `instance.dispose()` on *every* instance of the type ... Tests that simulate disposal mid-flight will see 'Cannot emit state from disposed container'."

On the `dependencies`/`dependencySelector` semantic trap, from `03-risks-and-edge-cases.md:96-101` (R8):
> "v2 `dependencies: fn` *disables* auto-tracking. Any place that implicitly relied on proxy reads firing re-renders will subtly stop re-rendering when only `dependencies` is provided."
*(This likely explains pain point #3's mirror: app code uses 0 `dependencies` selectors — they don't trust them, leaning entirely on auto-tracking.)*

On a public-getter name collision, from `CONTINUE-HERE.md:142`:
> "v2 `StateContainer.dependencies` is a public getter. Any v0 cubit that exposed an instance field named `dependencies` collides with it. WithAuthCubit was renamed (`authDeps`) for this reason."
*(Library implication: v2's public surface (`dependencies`, `state`, `props`-by-convention, `instanceId`) reserves common names that domain cubits naturally want.)*

---

## Appendix — files read

- `packages/shared/src/atom/autoform/AutoForm.tsx`, `AutoFormBloc.ts`
- `packages/shared/src/atom/wheelpicker/WheelPicker.tsx`, `PickerItem.tsx`
- `packages/shared/src/molecule/scheduler/SchedulerBloc.tsx` (+ unresolved conflict)
- `packages/shared/src/molecule/carousel/Carousel.tsx`
- `packages/shared/src/molecule/FileUploadBox/FileUploadBox.tsx`, `useFileUploadState.ts`
- `apps/user-app/src/ui/components/AppointmentScheduler/AppointmentScheduler.tsx`
- `apps/user-app/src/ui/components/TaskList/TaskList.tsx`, `TaskListBloc.ts`
- `apps/pmp/src/state/UserDetailsCubit.ts`
- Migration docs: `todos-blac-migration-shared.md`, `blac-migration/README.md`, `CONTINUE-HERE.md`, `migration-plan/01,02,03,05,09,10`, `CLAUDE.md`
