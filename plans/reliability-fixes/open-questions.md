# Open Questions — reliability fixes (review-884 + review-889 recommended set)

Scope: R1/T1, R2(+T6), R3, R4, R5, R6, E1. All confirmed against source by recon
(`reports/recon-structural-engine.md`, `reports/recon-usebloc.md`,
`reports/recon-watch-plugin.md`).

Only genuine forks are listed. Everything else has one correct answer and is
settled in the plan.

---

## Q1 — R3/R4 (`useBloc` ref-count leaks): minimal vs unified fix

R3 (memo re-runs re-acquire same refId) and R4 (acquire during abandoned render
leaks) share a root cause: ownership `acquire(countRef:true)` runs in the render
phase (`useBloc.ts:184`, deps `:596-603`).

- **Recommended default — Option B (unified):** in render only *ensure* (create,
  `countRef:false`); take the ref in a `useLayoutEffect` keyed on `[bloc, instanceKey]`;
  acquire deps in the reconcile layout-effect. Fixes R4 and makes R3 moot in one
  change. Concurrent-React correct. Blast radius: memo return + one new layout
  effect + reconcile pass + the `:596` dep guard.
- Option A (minimal): fix R3 only — use the resolved instance key as the memo dep
  so it can't diverge (~3 lines). Leaves R4's abandoned-render leak unfixed.

Recon note: Option A would be largely rewritten by B later; codebase already
targets concurrent React.

**Answer:**

---

## Q2 — R2/T6 (mount gap): recheck-after-subscribe vs useSyncExternalStore

Subscription happens in a passive effect with no post-subscribe recheck; emits
between the render read and the effect are lost.

- **Recommended default — recheck-after-subscribe:** after `channel.subscribe(...)`
  in the effect, compare live `bloc.state` against the render snapshot (or a version
  counter); if advanced, `force()`. Smallest change that closes R2 + T6. Applies to
  both `useBloc.ts` and `dirtytalk-structural/react-hook.ts`.
- Option — adopt `useSyncExternalStore` for the wake signal (keep the tracking proxy
  for interest): also fixes state tearing, but is a larger rewrite of the subscription
  plumbing; select-mode needs `useSyncExternalStoreWithSelector` with a cached array
  snapshot. Composes with Q1-Option B.

**Answer:**

---

## Q3 — R5 (`watch()`): full-ref (keep-alive) vs documented-borrow

`watch()` today `ensure`s instances with zero refs (leak), drops `args`
(`init(undefined)`), and goes silent if the instance is disposed elsewhere. The
args-drop fix is unconditional. The lifecycle fix is a real semantic choice:

- **Recommended default — full-ref:** `watch` acquires a real ref for its lifetime
  (released in the returned cleanup) and subscribes `registry.on('disposed')` to
  resubscribe/teardown. Means **`watch()` now keeps its target bloc alive** until the
  watcher is disposed — observable behavior change, but removes the silent-death bug.
- Option — documented-borrow: keep zero-ref semantics, only fix args-drop, and
  document that `watch` does not keep the instance alive + handle dispose by
  invoking the callback/erroring. Smaller behavior change; the silent-death class of
  bug is only mitigated, not removed.

**Answer:**

---

## Q4 — R6 (`onHydrationChange`): wire up vs delete

Documented plugin hook (README + web-docs) that is never dispatched.

- **Recommended default — wire up:** 3-file mirror of `depsChanged`
  (registry event union + emit in `StateContainer.setHydrationStatus` + dispatch in
  `PluginManager`). Makes the documented feature real.
- Option — delete the dead hook + remove it from README/web-docs. Only if hydration
  plugin notifications are not wanted.

**Answer:**

---

## Q5 (FYI, not blocking) — E1 is latent

E1 (shared-scheduler deadlock) is **not triggered today** — every call site
constructs a fresh scheduler. It's a latent bug in a publicly-exported primitive.
Default: include the fix (cheap: `Set<()=>void>` drain-all; one existing test
expectation updates). Say so if you'd rather defer it.

**Answer:**
