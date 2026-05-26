---
task: 06-strip-dep-tracking-from-connect
lane: C (connect package)
parallel_safe: true # runs in parallel with Lane B
model: sonnet
effort: medium
depends_on: []
---

# 06 — Strip dependency-edge tracking from `@blac/devtools-connect`

Remove the plugin's tracking of which blocs depend on which other blocs. We keep **consumer** and **ref-holder** tracking (React components / refs holding the bloc) because the UI will surface those as counts. We delete the cross-bloc dep edges entirely.

This task is safe to run **in parallel with Lane B** because it lives in a different package. The UI tasks (`04`) already drop the import path; even if `04` hasn't run yet, removing the `dependencies` payload from emitted events is a non-breaking field removal (the UI tolerates a missing optional field).

## What stays

- `consumers: { count, items }` tracking (React component subscriptions).
- `refHolders: { count, items }` tracking (manual `acquire`/release patterns).
- Anything used for the instance list display.

## What goes

- `dependencyEdgesByFrom` map and all reads/writes.
- The `buildDependencyFieldMap` / dependency-probing logic (the eval-like `value.call(instance)` code in `enumerateGetters` that exists specifically to discover deps — confirm by reading; getter enumeration for general state introspection stays).
- The `dependencies` field on emitted events (`createInstanceData`, `instance-created`, `state-changed`).
- `getDependencyGraph` method (and any exported helpers that serve only the graph).
- The `DependencyEdge` type if no consumer outside the graph uses it.

## Files to edit

- `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts`:
  - Delete `dependencyEdgesByFrom` field (~line 44).
  - Delete `this.dependencyEdgesByFrom.clear()` in cleanup (~line 130).
  - Delete the dep-edge merge in event emission (~lines 164–171). The `dependencies: instanceEdges` ternary goes away.
  - Delete `this.dependencyEdgesByFrom.delete(data.id)` in dispose handling (~line 240).
  - Delete the `getDependencyGraph()` method (or whatever returns `Array.from(this.dependencyEdgesByFrom.values()).flat()` — ~line 370).
  - Delete `captureDependencyEdges` / the method that reads `instance.dependencies` and writes to the map (~lines 703–735, contains "Capture dependency edges from an instance's dependencies map" comment).
  - Delete the final-sync `dependencies: instanceEdges` push (~lines 840–855).
  - Memory-leak fix is moot now (the map is gone) — note in commit body that this also resolves the leak called out in the review.
- `packages/devtools-connect/src/types/index.ts`:
  - Delete `DependencyEdge` type if unreferenced elsewhere.
  - Delete the `dependencies?: DependencyEdge[]` field from `InstanceData` (or whichever type carries it).
  - Delete any `GET_DEPENDENCY_GRAPH` message type from the message union if present.
- `packages/devtools-connect/src/index.ts` — remove any re-export of the deleted types/helpers.
- `packages/devtools-connect/src/getters/enumerateGetters.ts` — if there is dep-probing logic specifically for building the graph (the `value.call(instance)` eval-like path was flagged in the review), delete it. Keep getter enumeration for normal state introspection. If you're unsure whether a path is dep-only or general, **read the test file** (`enumerateGetters.test.ts`) to decide, and keep anything the tests assert on.

## Check (before editing)

```sh
grep -rn "DependencyEdge\|dependencyEdges\|getDependencyGraph\|captureDependencyEdges\|GET_DEPENDENCY_GRAPH" packages/devtools-connect
```

Every hit should be something this task removes (except the test files — see Test step).

## Test

- Update `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.test.ts` and `DevToolsBrowserPlugin.consumers.test.ts` — delete any test cases that assert on dep edges, `dependencies` payload field, or `getDependencyGraph`. Keep consumer/ref-holder tests.
- Update `enumerateGetters.test.ts` — delete dep-probing tests; keep general getter enumeration tests.
- After edits, run:

```sh
pnpm --filter @blac/devtools-connect test
```

All remaining tests must pass.

## Verify

```sh
pnpm --filter @blac/devtools-connect typecheck
pnpm --filter @blac/devtools-connect test
```

## Commit

```
refactor(devtools-connect): drop bloc-to-bloc dependency tracking
```

Body:

```
Removes dependencyEdgesByFrom map, getDependencyGraph(), and the
dependency probing path in enumerateGetters. Consumer and ref-holder
tracking is unchanged. Also resolves the unbounded-growth leak on
dispose (map is gone).
```

## Checklist

- [ ] `dependencyEdgesByFrom` and all its read/write sites deleted.
- [ ] `getDependencyGraph()` deleted.
- [ ] `dependencies` field removed from `InstanceData` / event payloads.
- [ ] `DependencyEdge` type deleted (or note why it had to stay).
- [ ] Dep-probing path in `enumerateGetters` removed; general getter enumeration intact.
- [ ] Tests updated; all package tests pass.
- [ ] Typecheck passes.
- [ ] Committed.

## Completion

(Agent fills in after committing.)
