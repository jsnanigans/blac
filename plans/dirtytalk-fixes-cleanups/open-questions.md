# Open Questions — dirtytalk fixes & cleanups

Scope input: "plan out all recommended fixes and cleanups" (from review-889 +
recon). Already-shipped items (T1, E1 slot→Set, T6 mount-gap) are **excluded** —
verified fixed in source. Remaining open findings drive this plan.

Genuine forks only. Each has a recommended default applied if left unanswered.

---

## Q1 — Spatial package (S1–S9, A7/A8): fix, delete, or leave?

`@dirtytalk/spatial` has **zero in-repo consumers** and several real bugs (S1
zero-area bounds silently disables rendering; S3 cross-node `batch()` no-ops;
S4 stages run per-damage-entry not per-node; S5 pointer capture survives detach).
It's beta and unused.

- **Recommended default — leave as-is (out of scope).** Don't fix, don't delete.
  Unused + beta = lowest priority; deletion is a separate product call.
- Option B — fix the reliability bugs (S1, S3, S4, S5). ~1 extra phase, medium risk.
- Option C — delete the package entirely (drop from workspace, docs). Aggressive.

**Answer:**

---

## Q2 — Unused public surface: how aggressive a cleanup?

Three unused exports (zero non-test / non-doc callers, confirmed by grep):

| Item | Where | Note |
|------|-------|------|
| `Signal` / `Observable` | `engine/index.ts:1-2`, `primitives.ts` | only export with opinionated throw-at-writer semantics (E4) |
| `pathsFromPatch` | `structural/index.ts:16`, `diff.ts` | superseded by `changedPathsFromPatch`; footgun (marks unchanged paths) |
| `useStructural` (`/react` subpath) | `structural/react.ts`, `react-hook.ts` | frozen early draft of `useBloc`; **T6 fix just applied here** |

- **Recommended default:** Remove `Signal`/`Observable` + `pathsFromPatch` from the
  **barrels only** (keep source files in git history; mark `pathsFromPatch`
  `@internal`). **Keep** the `/react` subpath as-is — its T6 fix was just invested,
  cost to keep is near-zero. Lowest-risk, reversible.
- Option B — also **delete** the `/react` subpath: remove `react.ts`/`react-hook.ts`
  (+ tests), drop the `./react` export, `typesVersions.react`, and the optional
  `react` peer dep; scrub the api-reference doc. Fully removes unused surface but
  discards the recent T6 work and is a bigger breaking change.
- Option C — physically delete all three (source + tests), not just de-barrel.

**Answer:**

---

## Q3 — T5 (sub-proxy identity/derived-array leaks): how far to fix?

`TRACK_ARRAY_ITERATION=true` binds array methods to the proxy for per-index
tracking — which is *exactly* what hands sub-proxies to user callbacks
(`items.find(x => x === raw)` never matches) and leaks proxies into `.slice()`/
`.filter()`/`.map()` results. Auto-unwrapping would fight the per-index feature.

- **Recommended default:** Add a `proxy → target` WeakMap + export a public
  `raw(v)` unwrap helper; document the two hazards prominently in `tracker.ts` /
  README. No behavior change to tracking. Escape hatch, not a silent auto-fix.
- Option B — additionally extend the raw-bound method list (`find`, `findIndex`,
  `some`, `every`, `findLast`) so identity-predicate callbacks compare raw — but
  this *loses* per-index tracking for those methods (coarsens to the array path).
  Correctness-over-precision tradeoff.
- Option C — docs only, no `raw()` helper.

**Answer:**

---

## Q4 — P1 (single-consumer `ALL_PATHS` shortcut): fix now or defer?

`container.ts:141` skips the diff for ≤1 registered consumer and wakes on *every*
change — pessimizing the common one-consumer topology, and it's what masked T1.
The T1 root-sentinel fix now makes "diff whenever skeleton non-empty; ALL_PATHS
only for zero consumers" safe.

- **Recommended default — fix now.** It touches the just-fixed `emit()` but the
  change is bounded and the regression tests from T1 cover the wake paths.
- Option B — defer to a separate perf pass (keeps this plan reliability/cleanup only).

**Answer:**

---

## Q5 — E2 error seam: scope of the `onError` wiring?

Channel flush rethrows subscriber errors into the microtask/RAF context with no
seam (E2); E1's drain loops also lack per-fn isolation (build-log). blac would
eventually plumb `configureBlac({ onError })` into it (review-884 F9).

- **Recommended default:** Add optional `onError` to `DirtyChannel` constructor
  (engine) + per-fn try/catch → `AggregateError` isolation in the three scheduler
  drains; forward `onError` through `StructuralContainerOptions`. **Leave blac
  `configureBlac` wiring (F9) and spatial forwarding out of scope.**
- Option B — also wire `configureBlac({ onError })` in blac-core (crosses into
  blac; larger blast radius).
- Option C — engine-only (DirtyChannel + drains), no StructuralContainer forward.

**Answer:**
