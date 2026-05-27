---
task: 02-core-init-construction
phase: 1
parallel_safe: false
serial_group: core
model: sonnet
effort: medium
depends_on:
  - 01-core-generics
files:
  - packages/blac-core/src/core/StateContainer.ts
  - packages/blac-core/src/core/StateContainerRegistry.ts
  - packages/blac-core/src/registry/acquire.ts
  - packages/blac-core/src/registry/ensure.ts
  - packages/blac-core/src/core/StateContainer.init.test.ts  # (new)
---

# 02 — `init(args)` lifecycle + construction threading

## Goal

Keep zero-arg `new Type()`, but let the registry pass `args` to a new **`init(args)`** lifecycle method called **once per instance, immediately after construction and before the first state snapshot**. This is how a bloc receives its construction/identity data without a constructor param.

## Approach

1. **`StateContainer.ts`** — add an overridable lifecycle hook (default no-op):
   ```ts
   /** Called once after construction with the args passed at acquire time, before first snapshot.
    *  Override to seed args-derived state (via this.emit(...)) or kick off loads. */
   protected init(_args: Args): void {}
   ```
   - Note `init` may `this.emit(...)` to set args-derived initial state: it runs before any subscriber/listener exists, so the emit is safe and flash-free. Document this in the JSDoc. (Static initial state still comes from the subclass `state` field / `super(initialState)`.)
   - Expose an internal invoker the registry calls (so `init` can stay `protected`): reuse the existing `initConfig(config)` step (`StateContainer.ts:88-101`) by giving it the args, OR add a sibling internal method. Cleanest: extend `StateContainerConfig` (`StateContainer.ts:9-13`) with an optional `args` and call `this.init(config.args as Args)` at the END of `initConfig` (after equality/registry wiring at ~:96-100). Guard so `init` is invoked exactly once.

2. **`StateContainerRegistry.ts`** — thread `args` through `acquire` (`:150`):
   - Add `args?: unknown` to the `acquire` options bag (`{ canCreate, countRef, refId, args }`).
   - At construction (`:191-192`): keep `const instance = new Type();` then pass args into the config so `initConfig` runs `init`:
     ```ts
     const instance = new Type() as InstanceType<T>;
     instance.initConfig({ instanceId: instanceKey, args });   // was { instanceId: instanceKey }
     ```
   - **Only on first creation.** When an existing entry is returned (`:174-182`), `init` must NOT re-run. (Task 03 adds the dev-warn when a returning consumer's args mismatch; here just ensure no re-init.)

3. **`registry/acquire.ts`** (`:4-14`) — add an `args` parameter and forward it into the options bag:
   ```ts
   export function acquire<T extends StateContainerConstructor>(
     BlocClass: T, instanceKey?: string, refId?: string, args?: ExtractArgs<T>,
   ): InstanceType<T> {
     return getRegistry().acquire(BlocClass, instanceKey, { canCreate: true, countRef: true, refId, args });
   }
   ```
4. **`registry/ensure.ts`** (`:4-9`) — accept optional `args` and forward (`ensure` is the bloc-to-bloc / `depend` path; args usually absent, so keep optional).

### Subtleties
- `init` runs after `initConfig` has set `instanceId`/`name`/`equality`, so those are available inside `init`.
- Do not call `init` from the `StateContainer` constructor — subclass fields (`state = …`) aren't initialized until after `super()` returns, and the registry hasn't wired the instance yet.
- `Args = void` blocs: `init(undefined)` — the default no-op ignores it.

## Check (before editing)
```fish
grep -n "new Type()\|initConfig" packages/blac-core/src/core/StateContainerRegistry.ts
grep -n "initConfig\|StateContainerConfig\|init" packages/blac-core/src/core/StateContainer.ts
grep -n "getRegistry().acquire" packages/blac-core/src/registry/acquire.ts
```
Confirm: `new Type()` is called with no args (~:191), `initConfig({ instanceId: instanceKey })` follows (~:192), and there is no `init(` lifecycle method yet. STOP if `init` already exists.

## Implement
1. Add `init(args)` hook + invoke once from `initConfig` (config carries `args`).
2. Thread `args` through `registry.acquire` options and `new Type()` + `initConfig({..., args})`.
3. Add `args` param to `registry/acquire.ts` and `registry/ensure.ts` wrappers.
4. Ensure existing-instance returns do not re-run `init`.

## Test
`packages/blac-core/src/core/StateContainer.init.test.ts`:
```ts
import { acquire, clearAll } from '../registry';
import { Cubit } from './Cubit';

class Loader extends Cubit<{ id: string | null }, { id: string }> {
  state = { id: null as string | null };
  initialized = 0;
  protected init(args: { id: string }) { this.initialized++; this.emit({ id: args.id }); }
}

afterEach(() => clearAll());

it('calls init once with args, before first read, and seeds state', () => {
  const a = acquire(Loader, 'k1', 'r1', { id: 'abc' });
  expect(a.state.id).toBe('abc');
  expect(a.initialized).toBe(1);
});

it('does not re-init when the same key is acquired again', () => {
  const a = acquire(Loader, 'k2', 'r1', { id: 'x' });
  const b = acquire(Loader, 'k2', 'r2', { id: 'y' });
  expect(a).toBe(b);
  expect(b.initialized).toBe(1);   // not re-run
});
```

## Verify
```fish
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- StateContainer.init
pnpm --filter @blac/core lint
```

## Commit
```
feat(core): add init(args) lifecycle and thread construction args
```
Body: Registry passes acquire-time `args` to a new `init(args)` hook run once before first snapshot; constructor stays zero-arg.

## Checklist
- [x] `init(args)` hook + once-only invocation from `initConfig`
- [x] `args` threaded through registry `acquire` + `new Type()` path
- [x] `acquire`/`ensure` wrappers accept `args`
- [x] no re-init on existing-instance return
- [x] tests pass; typecheck & lint clean
- [x] committed with Completion filled

## Completion
**Commit SHA:** (to be filled after commit)
**Files touched:** 5 — `packages/blac-core/src/core/StateContainer.ts`, `packages/blac-core/src/core/StateContainerRegistry.ts`, `packages/blac-core/src/registry/acquire.ts`, `packages/blac-core/src/registry/ensure.ts`, `packages/blac-core/src/core/StateContainer.init.test.ts` (new)
**Typecheck result:** clean (0 errors)
**Test result:** 571 passed (2 new: "calls init once with args, before first read, and seeds state", "does not re-init when the same key is acquired again")
