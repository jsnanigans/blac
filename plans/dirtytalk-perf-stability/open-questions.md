# Open Questions — dirtytalk perf & stability (P4, P5, T9, E3)

Genuine forks only. Each has a recommended default applied if left unanswered.

---

## OQ1 — T9 (interner growth): how far beyond the already-shipped minimal fix?

Discovery during planning: the review's "minimal, reversible fix" —
`interner.size` as a devtools/leak-report surface — **already exists**.
`PathInterner.get size()` was part of the original scaffold
(`git log packages/dirtytalk-structural/src/path-interner.ts` → commit
`252069f8`, "implement PathInterner") and is already asserted on by
`path-interner.test.ts:45`, `path-interner.test.ts:76-77`,
`diff.test.ts:214,238`, and `container.test.ts:460`. Nothing to build for the
minimal ask (Phase 1 only adds a doc cross-reference).

The real open question is the *deeper* mitigation the review also floated:
per-class interners are append-only and shared across all instances of a
class — state with unbounded dynamic keys (`items.<uuid>.name`) grows the
interner for the life of the app.

- **Recommended default — DEFER.** No per-instance interners, no LRU, no
  compaction in this pass. Per-instance interners lose cross-instance id
  comparability (flagged as a real cost in review-889 A5) — nothing today
  relies on that comparability, but it's a design commitment worth its own
  discussion, not a bundled perf-pass line item. `interner.size` is now
  documented as the diagnostic surface; revisit if it shows growth mattering
  in practice (devtools panel, a leak report, or a bug report).
- Option B — per-instance interners now. Removes the sharing/growth risk
  entirely but is a bigger, riskier change (touches `getInternerFor`'s
  per-class `WeakMap`, every call site that assumes interner identity is
  stable across instances) — the kind of change that deserves its own plan.
- Option C — add LRU/compaction to the existing per-class interner (evict
  paths unreferenced by any live consumer's skeleton). Bounds growth without
  changing the sharing model, but compaction correctness (id reuse safety,
  in-flight `PathId`s held by callers) is nontrivial and not worth rushing
  into this bounded pass.

**Answer:**

---

## OQ2 — P4's ancestor/parent lookup: live on `PathInterner` or a separate structure?

The fix needs, per skeleton leaf id, the set of already-interned ancestor
path ids (to turn `_refineAncestorMarks`'s string `startsWith` scan into
integer/hash lookups).

- **Recommended default — on `PathInterner`.** It already owns `intern`,
  `internAncestor`, `lookup`, `isAncestorId`, `rootId`/`isRootId` — every
  other "structural fact about an id" lives here, and `ancestorIds`/
  `ancestorTargetId` need direct access to `_map`/`_paths`/`lookupSegments`
  internals to memoize correctly. A separate structure would need a 1:1
  lifecycle tied to the interner anyway (same per-class `WeakMap` scoping),
  adding indirection with no isolation benefit.
- Option B — a separate `AncestorIndex` class, constructed alongside each
  `PathInterner` (e.g., `StructuralContainer.getInternerFor` returns a pair,
  or the index wraps the interner via composition). More modular / smaller
  single-class surface area, but duplicates the per-class caching lifecycle
  `PathInterner` already has, and needs its own access to interner internals
  (defeating some of the encapsulation gain) or a widened `PathInterner`
  public API to feed it.

**Answer:**

---

## OQ3 — E3: should `StructuralContainer` get a teardown hook, or engine-only?

`StructuralContainer` has no `dispose`/`teardown`/`destroy` today (confirmed:
zero hits). E3's own finding text explicitly names it as one of the
embedders that "can't cleanly kill a channel."

- **Recommended default — yes, add it (Phase 3).** A minimal
  `StructuralContainer.dispose()` that forwards to
  `this.channel.dispose()` is one method, additive, no behavior change when
  unused, and directly closes the gap the finding calls out at the layer
  where most consumers actually hold a reference (they rarely hold the raw
  `DirtyChannel`). Scope stays narrow: no clearing of `_consumerPaths`/
  `_skeleton`, no `disposed` guards on `emit`/`patch` — those are a separate,
  larger "can a disposed container still be mutated" design question.
- Option B — engine-only, no forward. Keeps this pass entirely inside
  `@dirtytalk/engine`, zero risk to the just-hardened `container.ts`
  (P4/P5 land there this same pass). Leaves the actual embedder-facing gap
  open until a future pass explicitly designs container-level teardown
  (including whether `emit`/`patch` should throw/no-op after dispose, and
  whether `react-hook.ts`'s cleanup effect should call it).

**Answer:**
