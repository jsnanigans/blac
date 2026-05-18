# 03 — Risks and Edge Cases

These are the real sharp edges. Each is mapped to the phase that defuses it and the shim/extension that addresses it.

## R1. v0 `<BlocProvider bloc={…}>` scoping

**What it does today.** Three sites wrap subtrees in `<BlocProvider bloc={instance}>` to inject a *specific* cubit instance into descendants:

- `apps/user-app/src/ui/components/PaymentContext/PaymentContext.tsx`
- `apps/user-app/src/ui/components/QuestionnaireStep/QuestionnaireStep.tsx`
- `apps/pmp/src/ui/components/PharmacyInsuranceInformationDialog/PharmacyInsuranceInformationDialog.tsx`

**Why it's risky.** v2 has no Provider equivalent. Descendants currently do `useBloc(C)` and get back the *parent-provided* instance, not a registry singleton.

**Resolution.** Implement E1 (reduced): a React Provider that injects an `instanceId` into context, and a `useBloc` patch that reads the context when no `instanceId` is passed. Existing call sites use the same `<BlocProvider>` JSX through the shim. See `05-v2-extensions.md` E1 and `06-compat-shim-design.md`.

**Phase.** Phase 1 (shim) + Phase 2 (codemod points the import at the shim).

## R2. `static isolated = true` semantics

**What it does today.** 11 classes have `static isolated = true`. v1 generates a fresh instance per mount automatically.

**Why it's risky.** v2 has no class-level "isolated" — instance keying is per-call (`{ instanceId }`). A naïve drop will silently share state across mounts.

**Resolution.**
- Add E3 to v2 (`autoInstance: true` or detect `static isolated` on the class) so `useBloc(C)` auto-keys with `useId()`. See `05-v2-extensions.md` E3.
- The shim sets up the auto-instance behavior so app code keeps `static isolated = true` until Phase 3 cleanup.

**Phase.** E3 in Phase 0; shim in Phase 1.

## R3. `props` injection — v2 forbids it (per user)

**Decision made.** The user explicitly rejected re-introducing a `props` slot through `useBloc`. v2's design is intentional: props are messy through hook args, cause sync issues, and should be set with an explicit method.

**Required pattern.**

```ts
class MyCubit extends Cubit<State> {
  initWithProps(props: Props) {
    this.props = props;          // or whatever the cubit needs
  }
}

// component
const [state, bloc] = useBloc(MyCubit);
useEffect(() => { bloc.initWithProps(props); }, []);
```

**Why it's risky.**
- Today's mixed/v1 cubits that took `props` via `useBloc(C, { props })` or `Blac.getBloc(C, { props })` will silently lose their props during the shim phase. The shim **must** preserve v1 behavior or the codemod must rewrite call sites.
- We chose **option B**: the codemod injects the `useEffect(() => bloc.initWithProps(p), [])` pattern wherever it sees `useBloc(C, { props })`, and the cubit gets a generated `initWithProps` stub if it doesn't already have one. See `07-codemod-rules.md` Rule C-3.

**Phase.** Codemod in Phase 2. Cubits that *truly* needed constructor-time props get hand-fixed in Phase 3 — the codemod marks them with a TODO comment.

## R4. PMP scoped `{ id: userId }` pattern

**What it does today.** Heavy use in pmp of `Blac.getBloc(DataSourceUserDetailsCubit, { id: userId })`. Each user gets a fresh keyed instance.

**Why it's safe.** v2's `ensure(C, userId)` is the direct equivalent. The shim maps `Blac.getBloc(C, { id })` → `ensure(C, id)`.

**Caveat.** If any of these cubits *also* expect props at construction time (R3), the codemod must split the call into `ensure` + `initWithProps`.

**Phase.** Shim covers it in Phase 1; no app-code changes.

## R5. v2 auto-dispose vs v1 keep-alive

**What it does today.** 26 classes set `static keepAlive = true`.

**Why it's risky.** v2 ref-counts and disposes when refs hit 0. Without keep-alive carryover, navigating away from a route disposes global cubits (subscriptions, websocket, auth) and the next mount sees a fresh instance with empty state.

**Resolution.** E2 — v2 reads `static keepAlive` *as well as* the decorator. Implementation: a few lines in `register` / `ensure`. See `05-v2-extensions.md` E2.

**Phase.** E2 in Phase 0; otherwise app code keeps the static and works through the shim.

## R6. `Blac.getBloc(X)` inside cubit methods is a silent dependency

**What it does today.** ~398 call sites. About half are inside other cubits' methods (e.g., `UserCubit` calls `Blac.getBloc(LoadingCubit).start(...)`).

**Why it's risky (after migration).** In v2 those should ideally be `this.depend(LoadingCubit)` so the registry can track the link for cleanup. If we only shim `Blac.getBloc` → `ensure`, we keep the same behavior but forgo the cleanup upside.

**Resolution.** Two-stage:
1. Phase 1 shim keeps `Blac.getBloc` semantics. Code keeps working unchanged.
2. Phase 3 lint rule (E7) flags `Blac.getBloc` inside `StateContainer` subclasses and prompts conversion to `this.depend(...)`.

**Phase.** Shim now, lint later.

## R7. The debug `BlocObserver` in `user-app/state.ts`

**What it does today.** `user-app/src/state/state.ts` constructs `new BlocObserver({ onChange: ... })` and passes it to `BlacReact`. Logs every state change when `sessionStorage.debugModeActive` is set.

**Resolution.** Port to a `BlacPlugin` once and install via `getPluginManager()`. Single-file change.

**Phase.** Done as part of the Phase 1 shim — the shim's `BlacReact` constructor accepts the v0 `BlocObserver` and adapts it into a plugin internally.

## R8. `dependencySelector` (v1) → `dependencies` (v2)

**What it does today.** v1 `useBloc(C, { dependencySelector: fn })` is an optimization hint — proxy auto-tracking remains active.

**Why it's risky.** v2 `dependencies: fn` *disables* auto-tracking. Any place that implicitly relied on proxy reads firing re-renders will subtly stop re-rendering when only `dependencies` is provided.

**Resolution.** Codemod rule: rewrite `dependencySelector` → `dependencies`, but **also** emit a comment annotation `// migrated from dependencySelector — verify re-render behavior` so reviewers see it. The hand-cleanup pass in Phase 3 either removes the comment after audit or switches to default auto-track.

**Phase.** Codemod Rule C-5.

## R9. Tests that `vi.spyOn(Blac, 'getBloc')`

**What it does today.** Tests stub `Blac.getBloc` to return mock instances.

**Why it's risky.** After Phase 1, `Blac.getBloc` is implemented inside the compat shim. `vi.spyOn` still works (it's a real method on a real object), but the underlying registry is v2. Tests that depend on the v1 registry's reset semantics may misbehave.

**Resolution.**
- The shim's `Blac.getInstance().resetInstance()` clears the v2 registry.
- Add `blacTestSetup()` to the global test setup so each test starts clean.
- Prefer `registerOverride()` for new tests.

**Phase.** Phase 1 (shim) — test infra change in `vitest-setup.ts`.

## R10. `packages/shared` must move with the apps

**What it does today.** `@9amhealth/shared` exports v1 cubits used by both apps. Apps import them and call `useBloc` on them through their own `state.ts`.

**Why it's risky.** If shared is on v2 but the apps still expect v1, the imported class is not what the app's registry recognizes. And vice versa.

**Resolution.** The shim package becomes the *only* `blac-next` / `@blac/react` in the workspace (via `pnpm` aliases). Shared keeps importing those names; they now resolve to the shim. No code change in shared during Phase 1.

In Phase 3, migrate shared first (smallest workspace, all v1), then pmp, then user-app.

**Phase.** Phase 1 alias swap; Phase 3 hand-cleanup starts with shared.

---

## Risk priority matrix

| # | Risk | Likelihood | Blast radius | Defused by |
|---|---|---|---|---|
| R3 | Silent props drop | High | Medium | Codemod C-3 + hand fixups |
| R5 | keepAlive lost | High | High | E2 |
| R2 | isolated semantics | High | Medium | E3 |
| R1 | BlocProvider gone | Certain (3 sites) | Low (small surface) | E1 (reduced) |
| R8 | `dependencies` subtly diff | Medium | Low (most paths use default tracking) | Codemod C-5 + audit |
| R9 | Test mock breakage | Medium | Low (tests fail loudly) | `blacTestSetup` + spyOn still works |
| R7 | Debug observer | Low | Low | One-time port |
| R10 | Shared/apps drift | Low if aliased | High | Workspace alias swap |
| R4 | Scoped lookup | None (1:1 map) | — | Shim maps directly |
| R6 | Implicit deps | None during shim; opportunity for Phase 3 | — | Lint rule E7 |
