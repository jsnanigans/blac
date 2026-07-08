# Investigation: Perf opportunities in @blac/core and @blac/react

## Bottom Line
Five new, non-catalogued perf opportunities found beyond the known R2-R6/D2 items (mount-gap, refcount leaks, watch() leak — this last one, `R5`, already appears fixed in current `watch.ts`). Top win: `PluginManager` allocates a full context object (12 closures) per plugin per flush instead of once per flush.

## Known items (from existing reports, not re-listed as new)
- R2/T6: passive-effect mount gap (useBloc.ts, react-hook.ts).
- R3/R4: refcount double-count / abandoned-render leak (useBloc.ts memo + layout effect).
- R5: watch() args-drop/leak — **verified already fixed** in current `watch.ts` (has `args` on `BlocRef`, `countRef:true`+`refId` in `resolveBloc`).
- R6: `onHydrationChange` dead hook — **verified already wired** in current `PluginManager.ts:241-251` / `StateContainer.ts:683`.
- D2: default (no-`select`) proxy is a fresh object every render by design; stabilizing needs a `@dirtytalk/structural` API change (tracker-level, out of blac-core/react scope).
- dirtytalk-structural phase1/3 report: `PathInterner.ancestorIds()` cache-invalidation bug (correctness, not raised again here).

## New Opportunities

**BC1 — PluginManager builds a fresh PluginContext (12 closures) per plugin per dispatch, not per dispatch**
`packages/blac-core/src/plugin/PluginManager.ts:308-322` (`dispatchStateChange`) and `:332-352` (`notifyPlugins`) call `this.buildContext(container)` *inside* the `for (const {plugin, config} of this.plugins.values())` loop. `buildContext` (`:362-447`) is pure per-container — identical for every plugin in the same dispatch — so this allocates N contexts (each ~12 arrow-function closures) instead of 1, on every emit flush when any plugin is installed (dev/devtools). Severity: per-emit hot when plugins are installed. Effort: S (hoist the `buildContext` call above the loop). Risk: low — no plugin should depend on distinct context identity per callback. Independently shippable, no observable API change.

**BR1 — `expandWithAncestors` re-derives ancestor ids from raw strings every commit, uncached**
`packages/blac-react/src/useBloc.ts:783-806`, called from the layout effect (`:493-496`, `:525`) on every render commit. Walks each leaf path with `lastIndexOf('.')`/`slice()` and calls `interner.internAncestor(ancestor)`, which allocates a new `` `${SENTINEL}${path}` `` string every call even on cache hits (`path-interner.ts:63-68`). Duplicates work the interner already memoizes elsewhere (`lookupSegments`/`ancestorIds`) but doesn't reuse. Severity: per-render hot for auto-tracking consumers with nested paths. Effort: M — needs a memoized ancestor-watch-id cache (new interner field, mirrors existing `_ancestorTarget`/`_ancestorIds`) or a local per-pathId cache in `blac-react`. Risk: medium — the sibling `ancestorIds` cache had a real invalidation bug (see dirtytalk-structural-phase1-phase3-verify.md); any new cache here needs the same invalidation care. Touches `@dirtytalk/structural` (adjacent package).

**BR2 — Dep reconcile pass always re-walks + recomputes interest, even when unchanged**
`packages/blac-react/src/useBloc.ts:509-553`, inside the unconditional layout effect. Every commit iterates `subs`/`session` and recomputes `expandWithAncestors` per surviving dep even when the dep set and its paths are identical to last render. Severity: per-render hot for consumers using cross-bloc deps. Effort: S/M (short-circuit when session is unchanged from last commit). Risk: low, independently shippable.

**BR3 — `ownArgsKey`/`providerArgsKey` JSON.stringify runs unconditionally every render**
`packages/blac-react/src/useBloc.ts:130-141`. No reference-equality fast path before stringifying `ownArgs`/`providerArgs`; for nontrivial args objects this is wasted serialization on every render, not just identity-changing ones. Effort: S (cache `{ref, key}` in a `useRef`, skip stringify when `Object.is` holds). Risk: very low.

**BC2 — `watch()` installs one unscoped global `disposed` listener per target, for its whole lifetime**
`packages/blac-core/src/watch/watch.ts:275-286`. Each watched target adds a `registry.on('disposed', ...)` listener that fires (and does a `container !== instances[index]` check) on **every** container disposal app-wide, not just its own target. With many concurrent `watch()` calls plus high dispose churn elsewhere, cost is O(active watchers × app-wide disposals). Fix needs either a public per-instance dispose hook or class-scoped dispose dispatch — a design decision, not a drop-in patch. Flag: would add public surface.

## Ranked by impact ÷ effort
1. **BC1** — High impact, S effort, no behavior change. Ship first.
2. **BR3** — Low-medium impact, S effort, trivial cache. Ship alongside BC1.
3. **BR2** — Medium impact, S/M effort, needs a short-circuit check.
4. **BR1** — Medium-high impact, M effort, touches an adjacent package + needs invalidation care.
5. **BC2** — Low-medium impact but scales badly with churn; L effort/needs a design decision (new public API). Flag for maintainer discussion, don't just patch.

## Next Steps
1. Hoist `buildContext()` above the plugin loop in both `dispatchStateChange` and `notifyPlugins` (BC1).
2. Add a `Object.is`-gated cache for `ownArgsKey`/`providerArgsKey` (BR3).
3. Add a cheap "session unchanged" short-circuit to the dep-reconcile effect (BR2).
4. Design a memoized ancestor-watch-id cache in `PathInterner`, informed by the existing `ancestorIds` invalidation bug, before touching `expandWithAncestors` (BR1).
5. Bring BC2 to the maintainer as an API-design question before any implementation.
