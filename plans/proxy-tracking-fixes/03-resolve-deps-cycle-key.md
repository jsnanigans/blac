---
task: 03-resolve-deps-cycle-key
phase: 1
parallel_safe: true
model: haiku
effort: low
depends_on: []
files:
  - packages/blac-core/src/tracking/resolve-dependencies.ts
  - packages/blac-core/src/tracking/resolve-dependencies.test.ts (new if absent)
---

# 03 — `resolveDependencies` cycle key must use class reference, not `Type.name`

## Bug

`packages/blac-core/src/tracking/resolve-dependencies.ts:20`:

```ts
const visitKey = `${Type.name}::${key}`;
if (visited.has(visitKey)) continue;
```

`Type.name` is **not** unique:

- Minified production builds collapse class names (every class becomes `e`, `t`, etc.).
- Two classes legitimately named the same in different modules collide.

Either case causes BFS to incorrectly mark a dep as "visited" and skip its real subtree, missing transitive dependencies. Components subscribed via `ExternalDepsManager` then fail to re-render on changes from the skipped blocs.

## Fix

Key the visited set by the constructor reference itself, scoped per instanceKey:

```ts
const result = new Set<StateContainerInstance>();
const visited = new Map<StateContainerConstructor, Set<string>>();
const queue: StateContainerInstance[] = [bloc];
let head = 0;

while (head < queue.length) {
  const current = queue[head++];
  for (const [Type, key] of current.dependencies) {
    let keys = visited.get(Type);
    if (!keys) {
      keys = new Set();
      visited.set(Type, keys);
    }
    if (keys.has(key)) continue;
    keys.add(key);

    const dep = getRegistry().ensure(Type, key);
    result.add(dep);
    if (dep.dependencies.size > 0) {
      queue.push(dep);
    }
  }
}

result.delete(bloc);
return result;
```

Now the visited set is a `Map<constructor, Set<instanceKey>>`. Two different classes with the same `.name` are distinct keys; two different instances of the same class with different keys are also distinct.

## Check (before editing)

```sh
grep -rn "resolveDependencies\|Type.name" packages/blac-core/src
```

Confirm the only relevant `Type.name` use is in `resolve-dependencies.ts`. Other matches in tests/utility logging are fine.

## Implement

1. Rewrite `resolveDependencies` per the fix.
2. Import `StateContainerConstructor` from `../types/utilities` if not already imported.

## Test

Add `packages/blac-core/src/tracking/resolve-dependencies.test.ts` (or co-locate with an existing test file if one already covers `resolveDependencies`):

```ts
import { describe, expect, it } from 'vitest';
import { Cubit } from '../core/Cubit';
import { resolveDependencies } from './resolve-dependencies';
import { getRegistry } from '../registry/config';

describe('resolveDependencies — cycle key collisions', () => {
  it('distinguishes classes with the same name in different scopes', () => {
    function makeNamed(name: string) {
      const klass = class extends Cubit<{ n: number }> {
        constructor() {
          super({ n: 0 });
        }
      };
      Object.defineProperty(klass, 'name', { value: name });
      return klass;
    }
    const A = makeNamed('Foo');
    const B = makeNamed('Foo');

    class Root extends Cubit<{ n: number }> {
      getA = this.depend(A);
      getB = this.depend(B);
      constructor() {
        super({ n: 0 });
      }
    }
    const root = getRegistry().ensure(Root);
    const deps = resolveDependencies(root);
    // both A's and B's instances must appear; pre-fix only one would.
    const classes = new Set(Array.from(deps).map((d) => d.constructor));
    expect(classes.size).toBe(2);
  });
});
```

Adjust the imports/instantiation if `getRegistry().ensure` or `depend` need different signatures. The intent: confirm that two same-named classes both appear in the resolved set.

## Verify

```sh
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- resolve-dependencies
```

## Commit

```
fix(core): key resolveDependencies visited set by constructor
```

Body (optional): "`Type.name` collides under minification and across modules; switch to a `Map<constructor, Set<key>>` so transitive dependencies are not skipped in production builds."

## Checklist

- [ ] `resolveDependencies` uses `Map<constructor, Set<key>>` for visited set.
- [ ] New regression test passes.
- [ ] No other `Type.name` cycle keys in the codebase (re-run grep after).
- [ ] Typecheck passes.
- [ ] Committed.

## Completion

**Commit SHA:** 437b93db
**Files touched:**

- packages/blac-core/src/tracking/resolve-dependencies.ts
- packages/blac-core/src/tracking/getter-tracker.test.ts
  **Typecheck result:** PASS (pnpm --filter @blac/core typecheck)
  **Test result:** PASS (521 tests passed in getter-tracker.test.ts, including new regression test)
