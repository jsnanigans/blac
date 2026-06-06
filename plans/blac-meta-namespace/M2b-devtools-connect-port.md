# M2b — Port `devtools-connect` live-instance reads to `$blac`

**Wave:** 2 (parallel — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** medium
**Estimated touch:** 2–3 files, ~10 sites

---

## Goal

`@blac/devtools-connect` reads identity off live bloc instances in several places — including untyped `(instance as Record<string, any>).instanceId` casts — and serializes them into DTOs for the devtools UI. Port the live reads to typed `$blac` access; leave every DTO/protocol field name unchanged.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions (esp. "DTO fields don't migrate" and the time-travel risk row).
2. `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts` — `(instance as Record<string, any>).instanceId` casts (~lines 242, 376), `instance.instanceId as string` reads (~lines 393, 428, 454), `inst.createdAt` (~lines 871–872), the time-travel command path (~line 122 — `cmd.instanceId` is a **protocol DTO field**, leave it).
3. `packages/devtools-connect/src/state/DevToolsStateManager.ts` — `instance.name` / `instance.createdAt` serialization (~lines 63, 69, 73).
4. `packages/blac-core/src/core/meta.ts` — the new surface.

---

## Spec

- Live-instance reads: `instance.name` → `instance.$blac.name`, `instance.instanceId` → `instance.$blac.id`, `instance.createdAt` → `instance.$blac.createdAt`, `instance.isDisposed` → `instance.$blac.disposed`, hydration getters → `instance.$blac.hydration.*`.
- **Delete the `as Record<string, any>` / `as string` casts** — `$blac` is fully typed; this port should leave the file more typed than it found it.
- **Protocol/DTO invariance:** every message field sent to the devtools UI keeps its current name (`instanceId`, `createdAt`, ...) and value. `cmd.instanceId` (incoming command), serialized `InstanceMetadata`, and anything in the wire format are DTOs — only the right-hand-side reads off live instances change.
- Time-travel matches incoming `cmd.instanceId` strings against live instances: the comparison becomes `instance.$blac.id === cmd.instanceId`. Values are identical strings, so matching behavior is unchanged — assert this in a test if one exists; add a minimal one if the matching path is untested.

---

## Owned files (write set)

```
packages/devtools-connect/src/**
```

**Do not touch:** any other package. devtools-ui is M2c's.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` — else **stop**). Write set clean.
2. **Implement.** Apply the mapping; sweep with `rg -n 'as Record<string, any>|instanceId as string|\.createdAt\b|\.isDisposed\b|hydration' packages/devtools-connect/src --glob '!*.test.*'` until only DTO fields remain.
3. **Verify.** From `packages/devtools-connect/`: `vp run typecheck && vp run lint && vp run format:check`.
4. **Test.** `vp run test` — green.
5. **Commit.** Only owned files:

   ```
   refactor(devtools-connect): read identity via $blac
   ```

---

## Acceptance criteria

- [ ] Zero `as Record<string, any>` identity casts remain.
- [ ] Wire/DTO field names and values unchanged (devtools-ui consumes them unmodified).
- [ ] Time-travel instance matching works (test evidence).
- [ ] All package tests green.

---

## Pitfalls

- The same identifier (`instanceId`) appears as live read, wire field, and command field within single functions — migrate **only the live reads**; read each site's receiver carefully.
- Note from the DevTools audit (project memory): `instance-updated` events are rAF-coalesced and tests await a macrotask — don't disturb event timing while renaming.
- Test imports from `'vite-plus/test'`. `git add` explicit paths only.
