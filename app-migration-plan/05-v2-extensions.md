# 05 — v2 Extensions

These are the changes proposed against this repo (`/Users/brendanmullins/Projects/blac`) before any user-fe migration starts. User decisions are noted inline.

> **Status (2026-05-18).** E1, E2, E3 are all landed on `main` (`ea04a518`).
> See per-section "Landed in" pointers below.

## E1 — `BlocProvider` for instance-id context (REDUCED, APPROVED — LANDED)

**Original proposal.** A Provider that supplies a _specific_ cubit instance to its subtree.

**User's reshape.** Smaller and cleaner: a Provider that puts an `instanceId` into React context. The `useBloc` hook reads the context when no `instanceId` is given by the caller.

### API

```tsx
// @blac/react

export function BlocProvider({
  instanceId,
  children,
}: {
  instanceId: string;
  children: React.ReactNode;
}): JSX.Element;

// hook reads context if option not given
useBloc(C); // uses context instanceId if any
useBloc(C, { instanceId: 'override' }); // explicit wins over context
```

### Implementation sketch

```tsx
// packages/blac-react/src/BlocProvider.tsx
import { createContext, useContext } from 'react';

const InstanceIdContext = createContext<string | undefined>(undefined);

export function BlocProvider({ instanceId, children }) {
  return (
    <InstanceIdContext.Provider value={instanceId}>
      {children}
    </InstanceIdContext.Provider>
  );
}

export function useInstanceIdFromContext(): string | undefined {
  return useContext(InstanceIdContext);
}
```

In `useBloc.ts`, before `acquire(...)`:

```ts
const ctxInstanceId = useInstanceIdFromContext();
const instanceKey =
  options?.instanceId !== undefined
    ? String(options.instanceId)
    : ctxInstanceId;
```

### Why this is enough for user-fe

The 3 existing `<BlocProvider bloc={instance}>` sites in user-fe don't need the _instance_ to be passed — they need descendants to look up the same logical cubit by id. The shim translates v0's API:

```tsx
// v0 user code (unchanged)
<BlocProvider bloc={paymentCubit}>...</BlocProvider>
```

The shim's `BlocProvider` derives an instance id from the bloc instance (e.g., the instance's `instanceId` after ensuring it in the registry under a stable key), then renders v2's `BlocProvider` with that id. Descendants' `useBloc(PaymentCubit)` reads the context and picks the right instance.

### Tests

- Provider sets context; nested `useBloc` resolves to same instance.
- Explicit `instanceId` in `useBloc` overrides context.
- Sibling subtree without provider gets default instance.
- Unmount cleans up the ref (ref-count drops).

### Estimate

~half a day including tests.

### Landed in

- `packages/blac-react/src/BlocProvider.tsx` — `BlocProvider`, `useInstanceIdFromContext`.
- `packages/blac-react/src/useBloc.ts` — reads context as the final fallback after explicit `instanceId` and auto-keying.
- Index re-exports in `packages/blac-react/src/index.ts`.
- Tests: `packages/blac-react/src/__tests__/BlocProvider.test.tsx` (8 tests).
- Precedence resolved: explicit `instanceId` > `autoInstance` / `static isolated` > context > default key.

---

## E2 — Honor `static keepAlive` in addition to `@blac({ keepAlive })` (APPROVED — LANDED)

**Why.** user-fe has 26 classes with `static keepAlive = true`. Asking the codemod to also convert these to a decorator is _possible_, but the decorator transform requires TS config changes and the static is harmless to read.

### API

No new API. Behavior change in the registry only: when looking up `keepAlive`, the registry checks both the decorator metadata _and_ `(Class as any).keepAlive === true`.

### Implementation sketch

Wherever the decorator's keepAlive flag is read today (likely a `Symbol.for('blac:keepAlive')` lookup or a WeakMap), add a fallback:

```ts
function isKeepAlive(Class: StateContainerConstructor): boolean {
  return (
    decoratorKeepAlive(Class) === true || (Class as any).keepAlive === true
  );
}
```

### Tests

- A class with `static keepAlive = true` is not disposed when refs hit zero.
- The decorator still works.
- A class without either is disposed normally.

### Estimate

~2 hours including tests.

### Landed in

- Already supported when audited: `isKeepAliveClass` in `packages/blac-core/src/utils/static-props.ts` reads `(Class as any).keepAlive`, and the `@blac/core` decorator sets exactly that static property. So `class X { static keepAlive = true }` and `@blac({ keepAlive: true })` are equivalent at the registry layer (`packages/blac-core/src/core/StateContainerRegistry.ts:328`).
- Parity documented by 2 new tests in `packages/blac-core/src/decorators/blac.test.ts` ("static property parity (E2)").
- `isKeepAliveClass` is now publicly exported from `@blac/core` for adapters that want to read it directly.

---

## E3 — `static isolated` / `autoInstance: true` for per-mount instances (APPROVED — LANDED)

**Why.** user-fe has 11 classes with `static isolated = true` that today get a fresh instance per mount. We want to preserve this without rewriting every call site.

### API (two surfaces, both supported)

```ts
// Option A — class declares it
class MyBloc extends Cubit<State> {
  static isolated = true; // legacy form; still respected
}
// useBloc(MyBloc) auto-keys with useId()

// Option B — caller opts in
useBloc(MyBloc, { autoInstance: true });
// auto-keys with useId() at this call site only
```

If both are present, behaves the same — auto-keyed per mount.

### Implementation sketch

In `useBloc.ts`:

```ts
const isolatedByClass = (BlocClass as any).isolated === true;
const autoInstance = options?.autoInstance ?? isolatedByClass;

const reactId = React.useId(); // always called — hook rules
const effectiveInstanceId =
  options?.instanceId !== undefined
    ? String(options.instanceId)
    : autoInstance
      ? reactId
      : ctxInstanceIdFromContext; // E1
```

### Tests

- `static isolated` class: two sibling components mount → two different instances, two states.
- `autoInstance: true` per call: same result.
- Without either: shared instance under default key.
- Unmount disposes (unless keepAlive).

### Estimate

~half a day including tests.

### Landed in

- `packages/blac-core/src/constants.ts` — `BLAC_STATIC_PROPS.ISOLATED = 'isolated'`.
- `packages/blac-core/src/utils/static-props.ts` — `isIsolatedClass(Type)` helper, exported from the package root.
- `packages/blac-react/src/types.ts` — new option `autoInstance?: boolean` on `UseBlocOptions`.
- `packages/blac-react/src/useBloc.ts` — `React.useId()` is always called; the resolved `instanceKey` uses it whenever `autoInstance: true` or `static isolated = true`. Explicit `instanceId` still wins; otherwise the context id from E1 is the final fallback.
- Tests: `packages/blac-react/src/__tests__/useBloc.autoInstance.test.tsx` (9 tests covering sibling isolation, dispose-on-unmount, keepAlive interaction, autoInstance per call, explicit-override precedence).

---

## E4 — Constructor-arg / props through `useBloc` (REJECTED)

**User quote.** _"this is a hard no, the new v2 design is to not pass the constructor params through the hook like consumers at all, instead it requires to add something like `const b = useBloc(C); useEffect(() => b.initWithProps(props), [])` or similar."_

**Reason.** Hook-passed props are messy and cause sync issues — when props change, the bloc is already constructed and the caller has to remember to re-sync.

**Required pattern documented in `03-risks-and-edge-cases.md#r3`.** Cubits that need init data must expose an explicit init method (`initWithProps`, `init`, `bootstrap`, etc.). The component pairs `useBloc(C)` with `useEffect(() => bloc.initWithProps(p), [])`.

**Codemod responsibility.** Rule C-3 (see `07-codemod-rules.md`) auto-rewrites v1 call sites and stubs an `initWithProps` method on cubits that didn't already have one. Hand cleanup in Phase 3 finalizes the cubit's init API.

---

## E5 — v1 test-mock adapter (DEFERRED)

`vi.spyOn(Blac, 'getBloc')` keeps working through the shim because `Blac.getBloc` is a real method on the real shim object. No adapter needed for Phase 1.

For new tests, prefer `registerOverride()` directly. Document this in `08-testing-strategy.md`.

---

## E6 — Dual-registry boot warning (DEFERRED)

Useful as a Phase 1 sanity check, but the workspace alias swap should make dual-registry impossible. Add only if Phase 1 surfaces issues.

---

## E7 — ESLint rule: ban `Blac.getBloc` inside `StateContainer` (DEFERRED to Phase 3)

Push developers toward `this.depend()`. Implement once Phase 3 starts so the rule's noise doesn't drown out the migration PRs.

---

## Total v2 work before Phase 1 can begin

E1 + E2 + E3 ≈ **1.5–2 engineer-days**, tests included.

> **Done.** All three landed in commit `ea04a518` on `main`. 24 new tests added (2 core + 9 + 8 + the existing keepAlive tests still passing). v2 is ready for the `packages/blac-compat` shim to consume.
