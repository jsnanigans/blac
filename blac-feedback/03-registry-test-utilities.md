# Surface the shipped testing utilities (they exist but are undiscoverable)

**Impact: Low-medium** — v2 already ships exactly the reset-registry and
mock-a-dependency utilities we were about to ask for. The residual issue is
discoverability, not a missing feature: teams (including us) still hand-roll
the manual reset/spy dance because the README's quick-start path doesn't
surface the testing entry point.

## Correcting the premise

`@blac/core` exports a `./testing` subpath, and `@blac/react` exports its own
`./testing` subpath that builds on it:

- **`@blac/core/testing`**: `createTestRegistry()`, `withTestRegistry(fn)`,
  `blacTestSetup()`, `registerOverride(BlocClass, instance, args?)`,
  `overrideEnsure(BlocClass, instance, fn, args?)`, `createCubitStub(BlocClass,
  { state?, methods?, args?, deps? })`, `withBlocState(BlocClass, state,
  args?)`, `withBlocMethod(BlocClass, methodName, impl, args?)`, `flush()`
  (drains microtasks so channel/`onSystemEvent` effects run before
  assertions).
- **`@blac/react/testing`**: `renderWithBloc(ui, { bloc, args?, state?,
  methods?, deps? })` (returns `RenderResult & { bloc }`) and
  `renderWithRegistry(ui, setup)`.

`registerOverride` is documented as "the v2 way to inject a specific instance
into the registry" — precisely the "mock what a dependency resolves to" need
we were about to ask for. `createCubitStub` covers partial state + mocked
methods + pre-wired deps in one call.

Notably, `packages/blac-compat/src/index.ts` in this repo **already imports
`registerOverride` from `@blac/core/testing`** — so part of this module is
already in active use in our own codebase, which makes "no test utilities
exist" an indefensible claim on our part.

## What consumers still do instead (the real residual)

Because none of this is surfaced in the README's quick-start or test-focused
docs, test files across our codebase still reinvent the same two things by
hand:

**Reset between tests:**

```ts
const resetState = (): void => {
  vi.restoreAllMocks();
  Blac.getInstance().resetInstance();
  localStorage.clear();
};

beforeEach(resetState);
afterEach(resetState);
```

**Mocking a dependency**, by monkey-patching `getBloc` directly:

```ts
const realGetBloc = Blac.getInstance().getBloc.bind(Blac.getInstance());
vi.spyOn(Blac.getInstance(), "getBloc").mockImplementation(
  ((blocClass: unknown, options?: { id?: string }) => {
    if (blocClass === SomeDependencyCubit) {
      return someStub;
    }
    return realGetBloc(blocClass as never, options as never);
  }) as typeof Blac.prototype.getBloc
);
```

This has the same fragility we'd expect a manual reset/spy dance to have:
because `resetInstance()` clears the registry, a `getBloc(X)` call made
*before* the reset and a spy set up *after* it can end up pointing at two
different instances of the same class unless the test is careful about
ordering. One of our test files has a comment explicitly calling this out:

```ts
// A spy on X must target the SAME instance the registry resolves to
// post-resetInstance(), or assertions silently check the wrong object.
```

`withTestRegistry`/`registerOverride` are designed to sidestep exactly this
class of ordering bug (an override is registered once, into a registry
scoped to the test), but nothing in the README's test-oriented sections
points a reader there.

## Suggested fix

1. **Document these prominently**, with a direct before/after: hand-rolled
   `resetInstance()` + `getBloc` spy → `withTestRegistry(...)` +
   `registerOverride(...)`. A short "Testing" section in the main README
   (not just relying on the package existing) would likely have prevented us
   from writing the hand-rolled version at all.
2. **Confirm and document the override's coverage.** If `registerOverride`
   already intercepts every resolution shape (`ensure`/`acquire`,
   `depend().track()`, `depend().untracked()`) regardless of the args/key
   used to resolve, and `withTestRegistry` auto-clears overrides at scope
   exit, that removes the ordering fragility above by construction — it just
   needs to be stated explicitly so consumers can rely on it instead of
   re-deriving the guarantee empirically.

## Why this matters

This is now a docs/DX report, not a missing-feature one. The two-line reset
helper and the spy-based mock are a boilerplate tax teams pay purely because
they don't know `@blac/core/testing` and `@blac/react/testing` exist. A
prominent "here's the officially supported way" section would likely
eliminate most of the hand-rolled variants we found, with no library changes
required.
