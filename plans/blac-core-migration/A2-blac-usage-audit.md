# A2 — Audit `@blac/*` usage across the workspace

**Phase:** A (parallel after A0; safe alongside A1, A3)
**Model:** Haiku 4.5
**Effort:** low (read-only; greps + a Markdown writeup)
**Estimated touch:** 1 file (new)

---

## Goal

Produce `plans/blac-core-migration/_audit.md` — a single ground-truth document that lists every consumer of `@blac/core`, `@blac/react`, `@blac/adapter`, and the unsupported `@blac/core/tracking` subpath inside this workspace. This audit feeds Phase C/D decisions: which internal symbols can be deleted, which renames affect which files, which apps need updates in Phase G.

**Read-only task.** No code edits, no commits to package source. The only write is the audit Markdown file.

---

## Inputs — read these first

1. `packages/blac-core/src/index.ts` — public surface.
2. `packages/blac-adapter/src/index.ts` — adapter surface (slated for deletion).
3. `packages/blac-compat/src/index.ts` — compat surface (untouched; included in audit anyway).
4. `packages/blac-react/src/index.ts` — React surface.
5. This plan's README (`plans/blac-core-migration/README.md`) — decisions to validate against the audit.
6. `~/.claude/CLAUDE.md` — commit format.

---

## What the audit must cover

For each downstream package and app, produce one section listing:

### Section template

```md
## <package or app path>

### Imports from `@blac/core`
- <symbol> — used in `<file>:<line>` for `<purpose, 1 sentence>`
- ...

### Imports from `@blac/core/tracking`
- <symbol> — ...

### Imports from `@blac/adapter`
- <symbol> — ...

### Imports from `@blac/react`
- <symbol> — ...

### Imports from `@blac/compat`
- <symbol> — ...

### Notes
- <anything surprising — e.g. uses an `@internal` export like `EMIT`, monkey-patches a registry method, relies on `tracked()` directly>
```

### Targets to audit

```
apps/examples
apps/devtools-extension
apps/perf
apps/docs
apps/preact-examples         (if A0 didn't delete it)
packages/devtools-connect
packages/devtools-ui
packages/logging-plugin
packages/plugin-persist
packages/blac-compat         (for completeness)
packages/blac-react          (for completeness — it's getting rewritten in D0)
```

### Cross-cutting findings (one final section)

```md
## Cross-cutting findings

### `dependencies` option on `useBloc`
- N callsites total, listed by file path.
- Sample patterns: ...
- Migration risk: low / medium / high

### `tracked()` standalone API
- N callsites total.
- Recommendation: delete / port

### `watch()`
- N callsites.

### `@internal` symbols leaking (EMIT, APPLY_DEPS, REMOVE_DEPS_OWNER)
- ...

### Plugin event consumers
- Which plugins register what handlers; what shape they expect.

### `BlocProvider` + `instanceId` callsites
- ...

### `@blac/adapter` direct consumers (besides @blac/react)
- ...
```

---

## Owned files (write set)

```
plans/blac-core-migration/_audit.md     (new)
```

**Do not touch:** any source file. Any package config. Anything outside the audit doc.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (relative to A0).
   - `grep` / `rg` available — use `rg` for speed.

2. **Implement.**
   - Run targeted greps for each `@blac/*` import:
     ```fish
     rg "from ['\"]@blac/core['\"]" --type ts --type tsx
     rg "from ['\"]@blac/core/tracking['\"]" --type ts --type tsx
     rg "from ['\"]@blac/adapter['\"]" --type ts --type tsx
     rg "from ['\"]@blac/react['\"]" --type ts --type tsx
     rg "from ['\"]@blac/compat['\"]" --type ts --type tsx
     ```
   - For each match, note the symbol and the file:line.
   - For `useBloc` callsites specifically, grep for `dependencies:` and `tracked(` to find migration hotspots.
   - Write the audit doc with one section per target.

3. **Verify.**
   - The doc compiles in a Markdown preview without broken links.
   - Every section listed under "Targets" is present in the doc, even if the section is empty (just write `*(no `@blac/*` imports found)*`).

4. **Test.**
   - No tests. This is a documentation task.

5. **Commit.**

   ```
   docs(blac-core-migration): add usage audit
   ```

   No body.

---

## Acceptance criteria

- [ ] `_audit.md` exists in this plan directory.
- [ ] Every target listed in "Targets to audit" has a section.
- [ ] Every cross-cutting finding listed is addressed.
- [ ] No source file was modified.
- [ ] `dependencies` on `useBloc` callsites have an explicit count.
- [ ] `tracked()` callsites have an explicit count.

---

## Pitfalls

- **Don't include `**/node_modules`.** Use `rg`'s default exclusions or `--type-add`.
- **`@blac/core/tracking` is a deep import** — some tools may resolve it via `tsconfig` paths. Search both as a string match and inside `tsconfig*.json`.
- **`@internal` exports** — `EMIT`, `APPLY_DEPS`, `REMOVE_DEPS_OWNER` are exported but marked internal. Grep these symbol names directly, not just the import string.
- **Don't editorialize in the audit.** State facts. The "Migration risk" line in cross-cutting findings is the only place for judgment, and even there it should be one word + a one-clause justification.
