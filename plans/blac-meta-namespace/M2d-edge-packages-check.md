# M2d — Edge packages: blac-react testing port, logging-plugin + compat verification

**Wave:** 2 (parallel — after M0 commits)
**Model:** Haiku 4.5
**Effort:** low
**Estimated touch:** 1 file edited, 2 packages verified read-only

---

## Goal

Three small jobs:

1. `packages/blac-react/src/testing.ts` — the cubit-stub helper calls legacy `initConfig` (see comment ~line 30). Port it to the `[INIT_CONFIG]` symbol.
2. `packages/logging-plugin` — verify it has **no** live-instance reads of the legacy surface (expected: it consumes plugin event payloads/DTOs only). No edits expected.
3. `packages/blac-compat` — read-only smoke: run its existing tests against the M0 core. If they fail, **stop and report** (do not patch compat — that escalates as a fresh task).

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions.
2. `packages/blac-react/src/testing.ts` — the `initConfig` call site.
3. `packages/blac-core/src/core/symbols.ts` — `INIT_CONFIG` export (M0).
4. `packages/logging-plugin/src/**` — sweep target.
5. `packages/blac-compat/src/__tests__/**` — the smoke gate.

---

## Spec

- `testing.ts`: `stub.initConfig(...)` → `stub[INIT_CONFIG](...)`, importing `INIT_CONFIG` from `@blac/core`. Nothing else changes.
- logging-plugin: `rg -n '\.(name|debug|instanceId|createdAt|isDisposed|hydrationStatus|initConfig)\b' packages/logging-plugin/src --glob '!*.test.*'` — classify every hit (expected: all DTO/payload fields). Edit only if a genuine live-instance read appears.
- blac-compat: run tests only. Zero source edits under any outcome.

---

## Owned files (write set)

```
packages/blac-react/src/testing.ts
packages/logging-plugin/src/**      (expected: no changes)
```

**Do not touch:** blac-compat sources, blac-react's other files (`useBloc.ts` etc.), any test file (M3 owns tests), any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n 'INIT_CONFIG' packages/blac-core/src/core/symbols.ts` — else **stop**). Write set clean.
2. **Implement.** The `testing.ts` one-liner; logging-plugin sweep (likely no-op).
3. **Verify.** From `packages/blac-react/`: `vp run typecheck && vp run lint && vp run format:check`. Same from `packages/logging-plugin/` if edited.
4. **Test.**
   - `packages/blac-react/`: `vp run test` — green.
   - `packages/logging-plugin/`: `vp run test` — green.
   - `packages/blac-compat/`: `vp run test` — record pass/fail; on fail, report and stop (still commit the testing.ts port if its own package is green).
5. **Commit.** Only owned files:

   ```
   refactor(blac-react): use INIT_CONFIG symbol in testing stub
   ```

---

## Acceptance criteria

- [ ] `testing.ts` uses `[INIT_CONFIG]`; blac-react suite green.
- [ ] logging-plugin sweep documented (hit classification in final report); tests green.
- [ ] blac-compat smoke result reported (pass, or fail + escalation note). No compat edits.

---

## Pitfalls

- `INIT_CONFIG` is `@internal` — import it from `@blac/core`'s barrel like `APPLY_DEPS` is imported elsewhere in blac-react; if the export is missing, that's an M0 gap — report it, don't work around it.
- `git add` explicit paths only; Wave-2 siblings are committing concurrently.
