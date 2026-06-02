# F2 — Update `devtools-connect` for new plugin event + path-level forwarding

**Phase:** F (parallel after E0; safe alongside F0, F1; F3 depends on this commit)
**Model:** Sonnet 4.6
**Effort:** medium (signature update + new wire format for paths)
**Estimated touch:** 4-5 files

---

## Goal

`@blac/devtools-connect` is the bridge between the in-app plugin and the external devtools UI. It forwards state changes over a message channel (extension bridge, postMessage, etc.). With C2's new `paths: PathSet` payload, the wire format should carry the **changed paths** so the devtools UI can highlight only what changed.

This task updates:

1. The browser plugin's `onStateChange` signature.
2. The wire format / message protocol to include a `paths: string[]` field (decoded names, not raw IDs — easier for the extension UI).
3. Any helper functions for state snapshotting.

F3 (devtools-ui) consumes the new wire format.

---

## Inputs — read these first

1. `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts`.
2. `packages/devtools-connect/src/getters/enumerateGetters.ts` (and `.test.ts`).
3. `packages/devtools-connect/src/**` — full layout.
4. `packages/blac-core/src/plugin/BlacPlugin.ts` (after C2).
5. `packages/dirtytalk-structural/src/index.ts` — `ALL_PATHS`, `PathSet`, `PathInterner`.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### Wire format additions

The current message for a state change probably looks like:

```ts
{
  type: ('state', instanceId, name, state);
}
```

Add:

```ts
{ type: 'state', instanceId, name, state, prev?, paths: string[] | 'all' }
```

- `paths` is `'all'` when `PathSet === ALL_PATHS`.
- Otherwise it's an array of decoded path strings (use `container.interner.lookup(id)`).
- `prev` is the previous state object. Useful for diff visualization. **Optional** — add if today's message already includes it.

### Plugin signature

```ts
onStateChange(ctx, prev, next, paths: PathSet): void {
  const decoded = paths === ALL_PATHS
    ? 'all'
    : Array.from(paths).map(id => ctx.container.interner.lookup(id));
  this.transport.send({
    type: 'state',
    instanceId: ctx.container.instanceId,
    name: ctx.container.name,
    state: next,
    prev,
    paths: decoded,
  });
}
```

### Coordination with F3

F3 (devtools-ui) reads `msg.paths` to highlight changed paths in the UI tree. F2 sets the protocol; F3 honors it.

If F3 needs a different shape (e.g. `paths: { id: number, name: string }[]`), F2 ships the more verbose form. Default to the spec above unless F3 ships first and dictates otherwise.

---

## Owned files (write set)

```
packages/devtools-connect/src/**
```

**Do not touch:** any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - E0 committed; `@blac/adapter` is gone.
   - F0, F1 may or may not be committed; F2 is parallel-safe with them.

2. **Implement.**
   - Update `DevToolsBrowserPlugin.onStateChange` signature.
   - Decode paths.
   - Update transport/message protocol.
   - Update enumeration/snapshot helpers if they touch the changed payload.

3. **Verify.**
   - `vp run typecheck` from `packages/devtools-connect/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — existing tests adjusted; add at least one test for the new `paths` wire field.

5. **Commit.**

   ```
   feat(devtools-connect): forward PathSet over devtools wire
   ```

   Body:

   ```
   - DevToolsBrowserPlugin.onStateChange aligned with @blac/core C2.
   - Wire messages now include `paths: string[] | 'all'` field.
   - F3 (devtools-ui) consumes the new field.
   ```

---

## Acceptance criteria

- [ ] `onStateChange` accepts `paths: PathSet`.
- [ ] Wire message includes the decoded `paths` field.
- [ ] All tests green.
- [ ] Wire format documented in a code comment near the message-builder function.

---

## Pitfalls

- **Wire format versioning.** If the protocol has a version field, bump it. If not, document the breaking change in the commit body — F3 must consume the new shape.
- **`PathInterner.lookup`** returns the string. `paths.size` may be large; for diagnostics-only consumers, capping at e.g. 64 entries with a `...truncated` marker may be wise. Implement only if there's evidence today's protocol caps.
- **`ctx.container.name` vs `ctx.container.constructor.name`**: structural's `StructuralContainer` doesn't carry a `name` field. `StateContainer` (after C0) does — verify.
- **`instanceId` post-migration**. C0 should preserve `instanceId`. If not, this task needs to know.
- **Don't ship JSON-serialized state if it contains non-serializable values.** Today's `state` field probably already handles this; preserve whatever serialization the plugin does.
