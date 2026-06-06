# M2c — Port `devtools-ui` live-instance reads to `$blac`

**Wave:** 2 (parallel — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** low
**Estimated touch:** 1–2 files, ~4 sites

---

## Goal

`@blac/devtools-ui` works almost entirely off serialized `InstanceMetadata` DTOs (no migration), but a handful of sites hold **live bloc instances** — notably `DevToolsSearchBloc` reading `instance.name` / `instance.createdAt`. Port only those.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions ("DTO fields don't migrate").
2. `packages/devtools-ui/src/blocs/DevToolsSearchBloc.ts` — `instance.name` (~lines 54–55), `b.instance.createdAt` (~line 64). Determine whether `instance` here is a live `StateContainer` or a DTO — if DTO, this task is a no-op for that site.
3. `packages/devtools-ui/src/blocs/DevToolsInstancesBloc.ts`, `src/DraggableOverlay.tsx`, `src/components/StateViewer.tsx` — confirm their `createdAt`/`instanceId` reads are DTO fields (expected: yes → no change).
4. `packages/blac-core/src/core/meta.ts` — the new surface.

---

## Spec

- Live-instance reads only: `instance.name` → `instance.$blac.name`, `instance.createdAt` → `instance.$blac.createdAt`, etc.
- Everything reading `InstanceMetadata` / serialized snapshot objects stays untouched.
- If the sweep finds **zero** genuine live-instance reads, commit nothing — report "no-op, all DTO" instead of inventing changes.

---

## Owned files (write set)

```
packages/devtools-ui/src/**
```

**Do not touch:** any other package. devtools-connect is M2b's.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` — else **stop**). Write set clean.
2. **Implement.** Classify each hit from `rg -n '\.name\b|\.createdAt\b|\.instanceId\b|\.isDisposed\b' packages/devtools-ui/src --glob '!*.test.*'` as live vs DTO; port live ones only.
3. **Verify.** From `packages/devtools-ui/`: `vp run typecheck && vp run lint && vp run format:check`.
4. **Test.** `vp run test` — green.
5. **Commit** (only if changes were made):

   ```
   refactor(devtools-ui): read identity via $blac
   ```

---

## Acceptance criteria

- [ ] Every hit classified (live vs DTO) — note the classification in the final report.
- [ ] Live reads ported; DTO reads untouched.
- [ ] Package tests green.

---

## Pitfalls

- devtools-ui's own blocs are themselves Cubits — `this.state.instances` entries may be DTOs even when the variable is called `instance`. Type-check the receiver, don't pattern-match the name.
- The auto-track subscription rules (project memory): reads inside bloc getters affect tracking. You're renaming property paths read off **other** objects, not state paths — but if any migrated read happens inside a tracked getter, confirm the relevant test still passes.
- `git add` explicit paths only.
