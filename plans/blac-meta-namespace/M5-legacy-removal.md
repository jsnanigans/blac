# M5 — Remove the legacy identity surface (BREAKING)

**Wave:** 3 (sequential — only after EVERY Wave-2 task has committed)
**Model:** Sonnet 4.6
**Effort:** medium
**Estimated touch:** 2–4 files + repo-wide verification

---

## Goal

Delete the deprecated delegates from `StateContainer`, leaving `$blac` as the single reserved meta name. This is the breaking commit (major bump on `@blac/core` at ship time).

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — status board: M0–M4 all checked. If any is unchecked, **stop**.
2. `packages/blac-core/src/core/StateContainer.ts` — the deprecated block (getters/setters, hydration methods, legacy `initConfig`).
3. `packages/blac-core/src/__tests__/legacy-deprecation.test.ts` — M3's pin file, deleted here.

---

## Spec

1. **Zero-ref sweep first** (gate before deleting anything):

   ```
   rg -n '\.(instanceId|isDisposed|hydrationStatus|hydrationError|isHydrated|changedWhileHydrating|beginHydration|applyHydratedState|finishHydration|failHydration|waitForHydration|initConfig)\b' packages apps --glob '!node_modules' --glob '!dist' --glob '!*.d.ts'
   ```

   plus a receiver-aware pass for `.name`/`.debug`/`.createdAt`/`.dependencies` on bloc instances. Every remaining hit must be a DTO field, the deprecation pin file, or plan-folder prose. **Trivial stragglers (≤5 sites): port them in this task** (note each in the commit body). More than that: stop and report — a Wave-2 task under-delivered.

2. **Delete** from `StateContainer.ts`: all deprecated getters/setters/methods, the deprecation-warn helper, legacy `initConfig`. Keep `[INIT_CONFIG]`, `$blac`, the clobber guard.
3. **Delete** `legacy-deprecation.test.ts`.
4. **Optionally extend the clobber guard**: dev-only warn when a subclass declares own properties named `name`/`debug`/`instanceId` etc.? **No — do not add this.** Freeing those names for userland is the point of the migration. The guard stays `$blac`-only.
5. **size-limit**: re-run `vp run size`; if M0 bumped the budget, restore or lower it to the new actual.
6. **Changeset**: add a changeset (major, `@blac/core`) summarizing the breaking change with the legacy→new mapping table. Follow existing changeset file conventions in `.changeset/`.

---

## Owned files (write set)

```
packages/blac-core/src/core/StateContainer.ts
packages/blac-core/src/core/symbols.ts                      (only if a legacy alias lives there)
packages/blac-core/src/__tests__/legacy-deprecation.test.ts (delete)
packages/blac-core/package.json                             (size-limit restore only)
.changeset/*.md                                             (new changeset)
+ ≤5 straggler sites (port-in-place, documented)
```

**Do not touch:** anything else.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** Status board complete; `git status` clean; `git log --oneline -10` shows all Wave-2 commits.
2. **Implement.** Sweep → port stragglers → delete surface → changeset.
3. **Verify.** From `packages/blac-core/`: `vp run typecheck && vp run lint && vp run format:check && vp run size`. From every package whose straggler you ported: `vp run typecheck`.
4. **Test.** `vp run test` in `packages/blac-core/`, `packages/blac-react/`, `packages/blac-compat/`, and any straggler package — all green. If blac-compat fails here (it imports the removed surface), **report**: the compat decision (patch vs pin to old core version) is the user's, not yours.
5. **Commit.** Only owned files (+ documented stragglers):

   ```
   feat(blac-core)!: remove legacy identity members
   ```

   Body: mapping table summary, straggler list, size delta. Wrap at 72.

---

## Acceptance criteria

- [ ] `StateContainer`'s reserved instance names are exactly: `$blac` + `state/emit/patch/update/args/deps/depend/subscribe/dispose/onSystemEvent/channel` (+ inherited StructuralContainer surface).
- [ ] Zero-ref sweep documented in the final report (counts per category).
- [ ] core, react, compat (or escalation), straggler packages: tests green.
- [ ] Changeset present; size-limit budget reflects reality.

---

## Pitfalls

- **blac-compat is the likeliest casualty** — it intentionally wraps old API. Its failure here is a *report*, not a fix.
- d.ts rollup: api-extractor's public trim — confirm `BlacMeta`/`BlacHydration` survive in `dist/index.d.ts` after a scoped `vp run build` of blac-core **only if** the build script is the established way to check (no repo-wide builds).
- A subclass is now free to declare `name`/`debug`/etc. — make sure no removed getter remains on the prototype to fight it (check `Object.getOwnPropertyNames(StateContainer.prototype)` in the meta test if in doubt).
