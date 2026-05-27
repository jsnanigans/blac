---
task: 03-core-identity-keying
phase: 1
parallel_safe: false
serial_group: core
model: sonnet
effort: medium
depends_on:
  - 02-core-init-construction
files:
  - packages/blac-core/src/constants.ts
  - packages/blac-core/src/utils/static-props.ts
  - packages/blac-core/src/utils/structural-key.ts  # (new)
  - packages/blac-core/src/decorators/blac.ts
  - packages/blac-core/src/core/StateContainerRegistry.ts
  - packages/blac-core/src/utils/structural-key.test.ts  # (new)
  - packages/blac-core/src/core/StateContainerRegistry.keying.test.ts  # (new)
---

# 03 — Identity keying: `static key` + structural hasher

## Goal

Derive an instance key from `args` so distinct args ⇒ distinct instances (atomFamily/queryKey model). Default = structural hash of `args`; override via `static key = (args) => string`. A returning consumer whose args don't match the existing instance's args → **dev-warn**.

## Approach

1. **`utils/structural-key.ts`** (new) — deterministic, order-independent hash of serializable args:
   ```ts
   /** Stable string key for serializable args. Sorts object keys so {a,b} === {b,a}.
    *  Throws (dev) if it meets a function / non-plain object — those belong in `deps`. */
   export function structuralKey(args: unknown): string {
     return JSON.stringify(args, function (_k, v) {
       if (typeof v === 'function') throw new Error('[blac] args must be serializable; put refs/callbacks in `deps`');
       if (v && typeof v === 'object' && !Array.isArray(v)) {
         return Object.keys(v).sort().reduce((o, k) => { (o as any)[k] = (v as any)[k]; return o; }, {});
       }
       return v;
     });
   }
   ```
   - `void`/`undefined` args → return the default key sentinel (so no-args blocs stay on `'default'`). Decide: `structuralKey(undefined)` → `'default'`.

2. **`constants.ts`** — add `KEY: 'key'` to `BLAC_STATIC_PROPS` (`:26-49`).

3. **`utils/static-props.ts`** — add a reader mirroring `getClassEquality` (`:71-76`):
   ```ts
   export function getClassKey(Type: unknown): ((args: any) => string) | undefined {
     return getStaticProp(Type, BLAC_STATIC_PROPS.KEY, undefined);
   }
   ```

4. **`decorators/blac.ts`** — add a `key` option to `BlacOptions` union (`:8-17`) and set `target[BLAC_STATIC_PROPS.KEY] = options.key` (`:43-51`). (Static class field `static key = …` works without the decorator too — the reader handles both.)

5. **`StateContainerRegistry.ts` `acquire`** — compute the key when `instanceKey` is omitted but `args` are present:
   - Change `instanceKey` from a parameter-default `'default'` to resolve inside the body (the report notes the default is currently a param default at `:152`).
   - Resolution: `instanceKey ?? (Type.key ? Type.key(args) : args !== undefined ? structuralKey(args) : DEFAULT_INSTANCE_KEY)`.
   - **Arg-mismatch dev-warn:** store the creating `args` on the entry (`InstanceEntry` at `:17-22`, add `args?`). When a later `acquire` returns an existing entry (`:174-182`) with a different `structuralKey(args)` than stored, `console.warn` in dev (gate on `process.env.NODE_ENV !== 'production'`). Never throw.

### Subtleties
- Explicit `instanceKey` always wins (the React precedence layer in task 06 passes it down for `instanceId`/`autoInstance`/context). Registry only *derives* when none is given.
- Keep the orphan-cleanup loop (`:333`) and all other `instanceKey` default sites working — only `acquire`'s default becomes computed; `borrow`/`ensure`/`release`/`getRefCount` keep `'default'` defaults (they look up, don't create from args).
- Hash stability: sort keys; arrays keep order; primitives pass through. Document that args must be JSON-serializable.

## Check (before editing)
```fish
grep -n "BLAC_STATIC_PROPS" packages/blac-core/src/constants.ts
grep -n "getClassEquality\|getStaticProp" packages/blac-core/src/utils/static-props.ts
grep -n "instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY\|new Type()\|InstanceEntry" packages/blac-core/src/core/StateContainerRegistry.ts
```
Confirm there is no `KEY`/`getClassKey`/`structuralKey` yet and `acquire`'s `instanceKey` is a parameter default. STOP if `static key` handling already exists.

## Implement
1. Add `structuralKey` util.
2. `BLAC_STATIC_PROPS.KEY` + `getClassKey`.
3. `key` option on the `blac()` decorator union.
4. Registry: derive `instanceKey` from `Type.key(args)`/`structuralKey(args)`; store creating args on the entry; dev-warn on mismatch.

## Test
`structural-key.test.ts`: order-independence (`{a:1,b:2}` === `{b:2,a:1}`), distinct values → distinct keys, throws on function, `undefined` → default sentinel.

`StateContainerRegistry.keying.test.ts`:
```ts
class UserCard extends Cubit<{}, { userId: string }> { state = {}; }
class Doc extends Cubit<{}, { docId: string; readonly: boolean }> {
  state = {}; static key = (a: { docId: string }) => a.docId;
}
it('distinct args → distinct instances; same args → shared', () => {
  expect(acquire(UserCard, undefined, 'r', { userId: 'a' }))
    .not.toBe(acquire(UserCard, undefined, 'r', { userId: 'b' }));
  expect(acquire(UserCard, undefined, 'r', { userId: 'a' }))
    .toBe(acquire(UserCard, undefined, 'r2', { userId: 'a' }));
});
it('static key ignores non-identity args', () => {
  expect(acquire(Doc, undefined, 'r', { docId: 'd1', readonly: true }))
    .toBe(acquire(Doc, undefined, 'r2', { docId: 'd1', readonly: false }));
});
it('warns (no throw) on same-key arg mismatch', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  acquire(Doc, undefined, 'r', { docId: 'd2', readonly: true });
  acquire(Doc, undefined, 'r2', { docId: 'd2', readonly: false }); // same key d2, diff args... readonly excluded → no warn
  // construct a real mismatch via UserCard with explicit same key:
  acquire(UserCard, 'fixed', 'r', { userId: 'x' });
  acquire(UserCard, 'fixed', 'r2', { userId: 'y' });
  expect(spy).toHaveBeenCalled();
});
```
(Adjust the mismatch case to whatever cleanly produces a same-key/different-args situation given your implementation.)

## Verify
```fish
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- structural-key
pnpm --filter @blac/core test -- StateContainerRegistry.keying
pnpm --filter @blac/core lint
```

## Commit
```
feat(core): derive instance identity from args (static key + structural hash)
```
Body: Default identity = structural hash of args; `static key`/`blac({key})` overrides; dev-warn on same-key arg mismatch.

## Checklist
- [ ] `structuralKey` util + tests
- [ ] `BLAC_STATIC_PROPS.KEY` + `getClassKey`
- [ ] `key` decorator option
- [ ] registry derives key from args; stores args; dev-warns on mismatch
- [ ] tests pass; typecheck & lint clean
- [ ] committed with Completion filled

## Completion
**Commit SHA:**
**Files touched:**
**Typecheck result:**
**Test result:**
