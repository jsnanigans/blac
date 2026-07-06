# Investigation: Verify testing-utilities feedback claims

## Bottom Line
**Root Cause**: N/A (verification task, not a bug) — the feedback's premise that testing docs "don't exist" is itself outdated; dedicated docs already ship at `apps/web-docs/src/content/docs/testing/{overview.mdx,core.md,react.md}`.
**Fix Location**: N/A
**Confidence**: High

## What's Happening
Feedback report `blac-feedback/03-registry-test-utilities.md` claims 9 `@blac/core/testing` exports and 2 `@blac/react/testing` exports exist, and that none of it is documented. All 11 exports are verified PRESENT with matching signatures. However the "no docs" claim is false: a full three-page Testing section already exists on the docs site, covering every export, ordering pitfalls, and cleanup semantics — so this is not the docs gap the feedback describes.

## Export Inventory

| Export | Verdict | Signature (file:line) |
|---|---|---|
| `createTestRegistry()` | PRESENT | `packages/blac-core/src/testing.ts:21` `(): StateContainerRegistry` |
| `withTestRegistry(fn)` | PRESENT | `packages/blac-core/src/testing.ts:25` `<T>(fn: (registry) => T): T` |
| `blacTestSetup()` | PRESENT | `packages/blac-core/src/testing.ts:55` `(): void` (installs `beforeEach`/`afterEach`) |
| `registerOverride(BlocClass, instance, args?)` | PRESENT | `packages/blac-core/src/testing.ts:68` matches exactly |
| `overrideEnsure(BlocClass, instance, fn, args?)` | PRESENT | `packages/blac-core/src/testing.ts:83` matches exactly |
| `createCubitStub(BlocClass, options?)` | PRESENT | `packages/blac-core/src/testing.ts:120`; `CubitStubOptions` (`state?, methods?, args?, deps?`) at line 101 matches claim |
| `withBlocState(BlocClass, state, args?)` | PRESENT | `packages/blac-core/src/testing.ts:165` matches exactly |
| `withBlocMethod(BlocClass, methodName, impl, args?)` | PRESENT | `packages/blac-core/src/testing.ts:191` matches exactly |
| `flush()` | PRESENT | `packages/blac-core/src/testing.ts:213` `(): Promise<void>` |
| `renderWithBloc(ui, { bloc, args?, ...stubOpts })` | PRESENT | `packages/blac-react/src/testing.ts:20` returns `RenderResult & { bloc: InstanceType<T> }` — matches claim |
| `renderWithRegistry(ui, setup)` | PRESENT | `packages/blac-react/src/testing.ts:54` matches exactly |

Subpath exports confirmed: `@blac/core/package.json:90` has `"./testing"`; `@blac/react/package.json` has `"./testing"` (both `import`/`require`, typed).

## Q1: Does `registerOverride` intercept every resolution shape?

Yes, mechanically uniform, with one real caveat. `registerOverride` writes into `instancesByConstructor.get(Type).set(key, {instance, refs})` via `insertInstance` (`StateContainerRegistry.ts:162`). Every resolution path reads the **same map**:
- `ensure()` → `registry.ensure(Type, key, args)` (`registry/ensure.ts:11-18`)
- `acquire()` → `registry.acquire(Type, key, opts)` → `instances.get(resolvedKey)` (`StateContainerRegistry.ts:269-325`)
- `depend().track()` / `.untracked()` → both call `resolve()` → `this._registry.ensure(Type, key, effectiveArgs)` (`StateContainer.ts:315-329`)

All four converge on `resolveKey` + the same `Map`, so an override is seen by any of them **once it's registered in the currently-active registry**.

**Caveat**: `StateContainer.ts:264` — `private _registry = getRegistry();` is captured **once, at construction time**, as a field initializer. A dependent bloc instance created *before* `withTestRegistry`/`registerOverride` swaps in the test registry keeps its `_registry` reference pointed at the old registry — its `depend()` calls will never see the override, even though the key matches. This is exactly the ordering hazard the feedback worried about; it's mitigated by scoping (construct the consumer *inside* `withTestRegistry`/after `registerOverride`), not eliminated by construction. `apps/web-docs/.../testing/core.md:439-442` already states this explicitly under "Common mistakes": *"Overriding a dependency after the dependent bloc has already read it... register the override before you ensure the dependent bloc."*

## Q2: Does `withTestRegistry` auto-clear overrides at scope exit?

Yes, but by discarding the whole registry object, not by clearing an override list. `withTestRegistry` (`testing.ts:25-51`) calls `setRegistry(previous)` on the sync-return, promise-resolve, promise-reject, and thrown-sync-error paths. Once `previous` is restored, the test registry (and everything `insertInstance`/`registerOverride` wrote into it) becomes unreachable — `getRegistry()` no longer points to it. `blacTestSetup()` (`testing.ts:55-64`) uses the identical swap-in-`beforeEach`/swap-back-in-`afterEach` pattern. Confirmed empirically in `packages/blac-core/src/testing.args-deps.test.ts:134-148`.

## Q3: Where is testing documented today?

Not just present — thorough. `apps/web-docs/src/content/docs/testing/overview.mdx`, `core.md`, and `react.md` document all 11 exports with signatures, decision tables, and "Common mistakes" callouts (including the exact `depend()`-ordering hazard from Q1). `packages/blac-core/README.md:242` also lists `@blac/core/testing` — "Test utilities" — in its Subpath Exports table, though that's a one-line pointer, not a walkthrough. Neither README has README-level worked examples (the walkthroughs live on the docs site instead).

The feedback's specific supporting claim — *"`packages/blac-compat/src/index.ts` in this repo already imports `registerOverride`"* — is **false in the current tree**: `packages/blac-compat/` does not exist (deleted in the 2026-06-06 legacy purge). That evidence line is stale.

## Docs Gap Findings

There is no gap of the kind described. The feedback report's own title ("Surface the shipped testing utilities... discoverability, not a missing feature") is half right — the API is complete and correct — but its call to action ("a short Testing section... would likely have prevented us from writing the hand-rolled version") describes something that already exists in full on the docs site. The residual, if any, is narrower: whether `apps/web-docs/testing/*` is linked prominently enough from the package README's quick-start (README only has the one-line Subpath Exports mention) or from `apps/docs` (VitePress, not checked here) — not that testing docs are absent.

## Next Steps
1. Report back to whoever filed the feedback that the docs-gap premise is outdated — point them at `apps/web-docs/src/content/docs/testing/`.
2. If discoverability from the package README is still a concern, consider a one-line link from `packages/blac-core/README.md`'s Subpath Exports row (and blac-react's README) to `/testing/overview` rather than writing new doc content.
3. No source changes needed; no action needed on the `blac-compat` claim beyond noting it's stale.
