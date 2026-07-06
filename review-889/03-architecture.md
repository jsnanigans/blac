# Architecture

## A1 · The engine abstraction is earning its keep — keep it small

`engine/src/space.ts`, `dirty-channel.ts` — the `Space<Region>` algebra + `DirtyChannel` + pluggable `Scheduler` is a genuinely clean kernel: two very different consumers (path sets, damage rects) reuse it without contortions, re-entrant marks are handled correctly (snapshot-reset-recheck), and subscriber isolation is right. The findings against it (E1–E3) are all *edge contracts*, not design flaws. Resist growing it; the additions it actually needs are an error seam (E2), channel disposal (E3), and multi-client-safe schedulers (E1) — all boundary hardening, not features.

## A2 · The source-side/consumer-side split has one leak, and T1 is it

The design puts *interest* on subscribers (pull thunks) and *precision* on sources (value-filtered marks). `patch()` honors it: marks are computed from the mutation alone, valid for any audience. `emit()` breaks it by borrowing the consumer registry (skeleton) to compute marks — an optimization that changes *observable semantics* for non-registered subscribers (T1). The rule worth writing down in `container.ts`: **marks must be a function of (prev, next, mutation), never of who is subscribed**; consumer knowledge may only *narrow delivery*, never *narrow marking*. The skeleton diff is fine as a delivery filter; it's wrong as the sole mark source.

## A3 · Ancestor-watch is clever but now lives in three places

The two-lane trick (normal ids vs `\0a:` ancestor ids) is implemented in: the interner (sentinel lanes), `changedPathsFromPatch` (emitting ancestor marks), `_refineAncestorMarks` (replacing them with precise leaf marks), **and** re-implemented downstream in blac's `expandWithAncestors` (consumer-side interest expansion, `blac-react/useBloc.ts:682`). Consumer-side expansion + source-side refinement are overlapping solutions to the same miss (atomic parent replacement vs descendant readers); each covers cases the other doesn't, and neither file mentions the other. Worth one design note documenting which mechanism is authoritative for which subscriber class (registered consumers → refinement; raw leaf-interest subscribers → must expand themselves), or promoting expansion into `structural` so the contract has one home.

## A4 · Two React integrations, one maintained

`structural/src/react-hook.ts` (`useStructural`) is a frozen early draft of what `@blac/react`'s `useBloc` became: no dep sessions, no select mode, no ancestor expansion, same mount-gap bug (T6), dead option types. It has zero consumers in the repo, ships on a public subpath (`@dirtytalk/structural/react`, react as optional peer), and will drift further. Either delete the subpath (S-list) or explicitly reposition it as the minimal reference binding — in which case it should at least share the mount-gap fix.

## A5 · Per-class static interner couples instances invisibly

`container.ts:64-76` — interners key by constructor via a static WeakMap. Consequences worth stating in the class doc: (a) path ids are comparable across *instances* of a class but not across classes; (b) one instance's pathological key growth degrades every instance (T9); (c) two copies of the structural module (see A6) have independent interner registries, but since ids always travel with a container reference this is safe today — an invariant worth a comment, because it's load-bearing and non-obvious.

## A6 · Correction to review-884 A1: `ALL_PATHS` is dual-copy-safe; the rest mostly is too

`path-set.ts:4-6` uses `Symbol.for('@dirtytalk/structural/ALL_PATHS')` — the global symbol registry — so two module instances of structural share the sentinel. Review-884 A1 overstated that hazard: identity checks on `ALL_PATHS` survive duplication. What remains true: duplicated copies get separate interner statics (safe per A5) and duplicated *engine* copies would matter only if a channel and its subscriber disagreed on `Space` (they can't — the space rides the channel). The A1 recommendation stands for hygiene (one copy via core re-exports) but the severity is lower than 884 implied. ✔ nice defensive choice with `Symbol.for`.

## A7 · Spatial's coordinate model is implicit

Everything — bounds, damage, clipping, hit-testing — assumes one absolute coordinate space with no transforms, no local coordinates, no scroll offsets. That's a legitimate v1 scope, but it's nowhere stated, and half the API reads as if nodes were hierarchical in *space* (parent/child, `clipsOverflow`) when they're hierarchical only in *paint order and clipping*. A `types.ts` doc block ("all rects are root-absolute CSS pixels; reparenting does not translate bounds") prevents the obvious consumer mistake. Transforms, if they come, want to enter at `_clipRect`/`hitTest`/`markDamaged` simultaneously — worth designing before external adoption hardens the absolute model.

## A8 · Packaging notes

- All three `package.json`s list `"LICENSE"` in `files`, but none of the three package dirs contains a LICENSE file (`license: MIT` field only). npm skips missing entries silently — either add the file or drop the entry.
- `dirtytalk-structural` `typesVersions` maps a `core` subpath that doesn't exist in `exports` — dead mapping, remove.
- `space.ts` doc references "insomni" (external project codename) — if these packages are public, the stray reference is confusing; name the *kind* of consumer instead ("a canvas renderer").
- Engine has no dependencies at all and structural depends only on engine — good; keep spatial's dependency arrow (engine only) as-is rather than letting it grow structural imports.
