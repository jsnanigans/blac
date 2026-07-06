# No composite/predicate-based disposal

**Impact: Medium** — auto-dispose only understands a single resolved
registry key at a time. Any Cubit whose lifetime should be tied to a
*composite* scope (e.g. "all instances belonging to workspace X," "everything
tied to user Y, across several different Cubit classes") has no supported
way to express that, so codebases either over-use `keepAlive` to opt out of
auto-dispose entirely, or write bespoke disposal-sweeping code.

## What consumers do instead

**Blanket `keepAlive` opt-outs.** We found `static keepAlive = true` (or the
equivalent `@blac({ keepAlive: true })` decorator — both ship) on roughly 25+
Cubit classes across our codebase — far more than the number of
*genuinely* global, app-lifetime singletons. Most of these aren't opting out
of disposal because they should truly live forever; they're opting out
because blac's default (dispose when the last subscriber unsubscribes) is
too aggressive for state that should outlive a single component's mount but
still eventually go away — there's no middle option between "dispose
immediately when unobserved" and "never auto-dispose."

**Manual `_dispose()` overrides purely to unwind workarounds.** ~15 sites in
our codebase override `_dispose()` for no reason other than to clean up the
manual subscriptions from report #2 (since `depend()` has no auto-cleanup
path for non-render subscriptions today) — e.g.:

```ts
_dispose(): void {
  this.managerUnsub?.();
  this.mainRouterUnsub?.();
  super._dispose(); // easy to forget — and if you do, teardown silently
                     // doesn't happen, since blac only calls the lifecycle
                     // hook, not a base implementation automatically
}
```

One file in our codebase has a comment explicitly warning future editors
that forgetting `super._dispose()` here silently skips observer teardown —
a footgun that a first-class subscription API (report #2) would remove by
construction, since it could track and clean up its own subscriptions
without the consumer needing to remember anything.

**Bespoke scoped-disposal sweep functions.** Where a Cubit's real intended
scope is composite — e.g. "belongs to workspace `W`, for user `U`" — and the
registry only stores one flat key per instance, consumers write their own
sweep logic to find and dispose all matching instances when the scope ends:

```ts
// Reconstructed, generic version of a real file in our codebase
function disposeWorkspaceScopedCubits(workspaceId: string): void {
  // forEach + manual filtering because the registry only exposes per-class
  // primitives (getAll/forEach/clear/release) — there's no way to
  // query/dispose "everything keyed under workspace W" as a group, across
  // classes, in one call.
  forEach(RouterCubit, (router) => {
    if (router._id === workspaceId) {
      release(RouterCubit, { args: /* this router's args */ ..., forceDispose: true });
    }
  });
  // ...repeated per Cubit class that's scoped to a workspace
}
```

This has to be re-written per Cubit class that participates in the scope
(even though `forEach`/`release`/`clear` exist per-class, nothing composes
them across classes), has to be called from exactly the right place when the
scope ends (nothing enforces it), and silently does nothing if a new Cubit
class is added to the scope later and someone forgets to add it here — one
of our own code comments flags this exact class of Cubit as "KNOWN
TECH-DEBT: not registered in the scoped-cubit list, relies on auto-dispose
instead" — i.e., the workaround itself has a known gap. Even with the real
per-class primitives in hand, there is still no single call that disposes
"everything tagged workspace:W," full stop — you must enumerate every
participating class yourself.

## Suggested API

Give the registry a first-class notion of a disposal group/tag, independent
of any single Cubit's resolved key:

```ts
class RouterCubit extends Cubit<RouterState> {
  init = (workspaceId: string) => {
    this.registerLifecycleTag(`workspace:${workspaceId}`);
  };
}

// wherever the workspace scope ends:
Blac.disposeTag(`workspace:${workspaceId}`);
// disposes every instance (of any Cubit class) that registered this tag,
// regardless of its own resolved key.
```

Alternatively (or additionally), a predicate-based sweep on the registry
directly, so consumers don't need `getAll` + `release`/`clear` and manual
filtering per class:

```ts
Blac.disposeWhere(RouterCubit, (instance) => instance._id === workspaceId);
```

Either shape removes the need to hand-write a sweep function per scoped
Cubit class, removes the "forgot to register this new class in the scoped
list" failure mode, and gives `keepAlive` a real alternative for the common
"lives longer than one subscriber, but not forever" case — a Cubit could use
a lifecycle tag instead of `keepAlive: true` and get disposed deterministically
when its actual owning scope ends, rather than either right away or never.

## Relationship to report #5

If `depend()`/`getBloc` ship the explicit `instanceKey` option proposed in
report #5, tagging becomes even more natural — the same explicit key used for
identity resolution could double as (or be combined with) the disposal tag,
so a scoped Cubit's identity and its lifecycle group are expressed with one
concept instead of two unrelated ones.
