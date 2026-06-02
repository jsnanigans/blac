# G4 — Smoke-test `@blac/compat` against the new core

**Phase:** G (parallel after F3; safe alongside G0, G1)
**Model:** Sonnet 4.6
**Effort:** low (run tests; possibly write a fix; otherwise just verify)
**Estimated touch:** 0 files (read-only) — or escalate

---

## Goal

Per Decision 11, `@blac/compat`'s existing tests at `packages/blac-compat/src/__tests__` are the gate that proves the v0/v1 facade still works against the new core. Run them. If they pass, commit nothing (just check the box). If they fail, **escalate**: do not patch compat in this task — create a follow-up.

---

## Inputs — read these first

1. `packages/blac-compat/src/__tests__/**`.
2. `packages/blac-compat/src/index.ts`.
3. `packages/blac-compat/package.json`.
4. `plans/blac-core-migration/README.md` — Decision 11.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - All previous phase commits in place.
   - `vp install` passes at root.

2. **Implement.**
   - **None.** This is a verification task. Do not edit `packages/blac-compat/src/`.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-compat/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` from `packages/blac-compat/`.
   - Capture full output.

5. **Commit.**
   - If everything passed: **no commit**. Update the status board entry in `plans/blac-core-migration/README.md` via a `docs(blac-core-migration): mark G4 compat smoke test green` commit.
   - If anything failed: **do not patch**. Write `plans/blac-core-migration/_compat-failures.md` listing each failure (file + test name + first error message + likely cause). Commit that doc:

     ```
     docs(blac-core-migration): record @blac/compat smoke-test failures
     ```

     Then escalate to the human reviewer; do not start any unplanned task.

---

## Acceptance criteria

**Happy path:**

- [ ] `vp run test` from `packages/blac-compat/` is fully green.
- [ ] Status board entry updated.

**Sad path (failures):**

- [ ] Failures documented at `plans/blac-core-migration/_compat-failures.md`.
- [ ] No source edits to `packages/blac-compat/`.
- [ ] Escalation flagged in the commit body and reported back.

---

## Pitfalls

- **Don't fix compat in this task.** Compat fixes are out-of-plan; they need explicit scoping and the user's approval before any edits.
- **Don't run the full repo test suite.** Scope to `packages/blac-compat/`.
- **Lint/typecheck failures aren't necessarily migration regressions.** If compat fails to build on its own, that's also a real signal — surface it the same way (escalate).
- **Tolerance for nondeterminism.** Microtask-coalescing tests may flake. If a test fails intermittently, re-run 3× before declaring failure.
