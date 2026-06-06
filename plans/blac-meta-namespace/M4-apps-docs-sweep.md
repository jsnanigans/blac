# M4 — Sweep apps + web-docs onto `$blac`

**Wave:** 2 (parallel — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** low
**Estimated touch:** ~6–8 files across apps, plus docs content

---

## Goal

Port user-facing code (examples, devtools-extension panel, perf app if hit) and documentation content off the legacy surface. These are also the **reference usage** users copy — they must model the post-M5 API.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions + mapping table (M1's spec).
2. Known live-read sites:
   - `apps/examples/src/examples/10-input-pattern/CanvasCubit.ts` (~lines 72, 128): `this.isDisposed` → `this.$blac.disposed`.
   - `apps/examples/src/messenger/services/WebSocketMock.ts` (~lines 269, 298): `channel.instanceId` / `u.instanceId` → `.$blac.id`.
   - `apps/examples/src/examples/06-db-persist/PersistenceStatus.tsx` (~lines 59, 90): `waitForHydration()` → `$blac.hydration.wait()`, `hydrationStatus` → `$blac.hydration.status`.
   - `apps/examples/src/__tests__/testing-utils/` incl. `cubit-stub.test.ts` (~lines 152–154): `stub.isDisposed` → `stub.$blac.disposed` (and the stub helper itself if it fakes the member).
   - `apps/devtools-extension/src/panel/index.tsx` (~lines 47, 66, 130): classify — `inst.isDisposed`/`d.instanceId` may be DTOs from devtools-connect messages (then: no change) or live instances (then: port).
3. Docs: `rg -n 'instanceId|isDisposed|hydrationStatus|waitForHydration|beginHydration|\.createdAt' apps/web-docs/src/content --type md --type mdx` plus twoslash/code-fence snippets.

---

## Spec

- Apply the standard mapping to live-instance reads in app code.
- devtools-extension: DTO classification first; port only live reads.
- web-docs: update prose and code snippets that reference moved members; add/adjust any API-reference page mentioning them. Docs build is the typecheck for twoslash snippets — broken snippets fail the build.
- Examples are pedagogical: where a snippet exists purely to demo a moved member (e.g. PersistenceStatus showing `hydrationStatus`), present the `$blac.hydration` form as the canonical API.

---

## Owned files (write set)

```
apps/examples/src/**
apps/devtools-extension/src/**
apps/perf/src/**                  (only if the sweep finds hits)
apps/web-docs/src/content/**
```

**Do not touch:** any `packages/**` file, app configs/package.json.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` — else **stop**). Write set clean.
2. **Implement.** Apps first, then docs. Sweep: `rg -n '\.(instanceId|isDisposed|createdAt|hydrationStatus|waitForHydration|beginHydration|initConfig)\b' apps --glob '!node_modules' --glob '!dist'`.
3. **Verify.**
   - `apps/examples/`: `vp run typecheck && vp run lint && vp run format:check` (scripts as available in that package).
   - `apps/devtools-extension/`: same, as available.
   - `apps/web-docs/`: the package's build/check script for content (twoslash strict build) — run only if docs content changed and a scoped script exists; otherwise typecheck what's typecheckable and note it.
4. **Test.** `apps/examples/`: `vp run test` (covers the cubit-stub tests) — green.
5. **Commit.** Two commits if both areas changed, only owned files:

   ```
   refactor(apps): port examples and devtools-extension to $blac
   ```

   ```
   docs(web-docs): document $blac meta namespace
   ```

---

## Acceptance criteria

- [ ] No live-instance legacy reads remain under `apps/` (DTO sites classified and noted).
- [ ] Examples tests green; examples still typecheck.
- [ ] Docs snippets reference `$blac` forms; twoslash snippets compile.

---

## Pitfalls

- **WebSocketMock's `u.instanceId`** — confirm `u` is a live bloc and not a plain user record; messenger code mixes both.
- Examples use the custom RouterBloc + shared components (project memory) — don't restructure anything; rename reads only.
- devtools-extension panel data likely arrives as serialized messages → mostly DTO, mostly no-op. Classify before editing.
- No dev servers, no builds beyond the scoped verify steps above.
- `git add` explicit paths only.
