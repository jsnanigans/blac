# F3 — Update `devtools-ui` to display path-level changes

**Phase:** F (sequential — requires F2's commit; parallel-safe with F0, F1 once F2 is in)
**Model:** Sonnet 4.6
**Effort:** medium (UI updates to surface changed paths)
**Estimated touch:** 5-8 files

---

## Goal

`@blac/devtools-ui` is the in-app devtools panel. After F2 lands, every state-change message carries a `paths` field. Update the UI to:

1. Highlight changed paths in the state tree view.
2. Filter the diff/log view by changed-paths.
3. Migrate its internal blocs to the new `@blac/core` (rename `dependencies` → `select`, etc.).

---

## Inputs — read these first

1. `packages/devtools-ui/src/BlacDevtoolsUi.tsx`.
2. `packages/devtools-ui/src/DevToolsPanel.tsx`.
3. `packages/devtools-ui/src/blocs/{DevToolsInstancesBloc,DevToolsDiffBloc,DevToolsSearchBloc,DevToolsLogsBloc,DevToolsLayoutBloc}.ts`.
4. `packages/devtools-ui/src/components/**`.
5. `packages/devtools-connect/src/**` (after F2) — wire format.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### Wire format consumption

Read `paths: string[] | 'all'` from incoming messages. Display:

- If `'all'`: the existing "everything changed" indicator (or nothing — depends on UI).
- If `string[]`: highlight matching nodes in the state tree.

### Bloc updates

Each devtools-ui bloc (`DevToolsInstancesBloc`, `DevToolsDiffBloc`, etc.) probably uses `@blac/react`'s `useBloc`. After D0:

- `dependencies: ...` → `select: ...`
- Manual deps arrays → `select` returning array
- Anything that imports from `@blac/adapter` → import from `@dirtytalk/structural` or `@blac/core` instead

### UI components

`LogsView`, the diff tree, and instance list components likely show state shape. Add a `changedPaths` prop where it makes sense; highlight matching subtrees.

---

## Owned files (write set)

```
packages/devtools-ui/src/**
```

**Do not touch:** any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - F2 has committed. Wire format is the spec'd `{ paths, ... }`.

2. **Implement.**
   - Update incoming-message handler to extract `paths`.
   - Migrate each `useBloc({ dependencies })` to `useBloc({ select })`.
   - Wire `paths` into the diff/tree view.

3. **Verify.**
   - `vp run typecheck` from `packages/devtools-ui/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — green.
   - Smoke-test in `apps/devtools-extension` once G2 runs.

5. **Commit.**

   ```
   feat(devtools-ui): display path-level changes from new wire format
   ```

   Body:
   ```
   - Consumes paths field from devtools-connect (F2).
   - useBloc usages migrated from `dependencies` to `select` (D0).
   - Highlighted nodes in tree view reflect actual changed paths.
   ```

---

## Acceptance criteria

- [ ] Devtools-ui no longer uses `dependencies` option on `useBloc`.
- [ ] Incoming `paths` field is consumed.
- [ ] Tests green.
- [ ] Visual smoke-test deferred to G2 (devtools-extension end-to-end).

---

## Pitfalls

- **No live extension shell to test against here.** Unit-test where possible; full end-to-end is G2. Note any "needs G2 verification" cases in this commit's body.
- **`paths: 'all'` vs empty array**. Treat differently — `'all'` means "everything is dirty"; `[]` (which shouldn't happen post-flush but might) means "nothing".
- **Path strings format**. They're dotted (`users.5.email`). Build a tree-matcher that compares dotted prefixes, not exact strings, if highlighting parents.
- **Don't redesign the UI.** Add path-level info; don't reflow the panel layout. Scope creep.
- **`acquire` import from `@blac/core`**. Verify still works after C1. Should be a one-symbol no-op.
