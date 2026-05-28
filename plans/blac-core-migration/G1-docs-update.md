# G1 — Update `apps/docs` for new API

**Phase:** G (parallel after F3; safe alongside G0, G4)
**Model:** Sonnet 4.6
**Effort:** low (prose + code samples)
**Estimated touch:** ~15-30 MDX/markdown/source files

---

## Goal

`apps/docs` hosts the user-facing documentation. After the migration, code samples and prose referencing the old API are wrong. Update:

1. Code samples using `dependencies` → `select`.
2. Prose mentioning `tracked()` (deleted) — either remove or rewrite to `trackRender` mention.
3. Plugin documentation reflecting the new `(prev, next, paths)` event signature.
4. `@blac/adapter` references — gone.
5. Add a migration guide page (one new MDX) summarizing the breaking changes.

---

## Inputs — read these first

1. `apps/docs/src/**` and any content directories (MDX, markdown).
2. `apps/docs/package.json`.
3. `plans/blac-core-migration/README.md` — for the decision summary that goes into the migration guide.
4. `~/.claude/CLAUDE.md` — commit format.

---

## What to change

1. **Code samples** — exhaustively migrate.
2. **API reference pages** — update signatures.
3. **Plugin authoring guide** — new event payload.
4. **New page: `migration-from-v1.mdx`** (or whatever fits the docs layout). Summarize:
   - `dependencies` → `select`
   - `tracked()` removed
   - `@blac/adapter` removed
   - Plugin event signature change
   - `onSystemEvent('stateChanged')` once-per-flush
   - Per-class interner

---

## Owned files (write set)

```
apps/docs/src/**
apps/docs/content/**            (or wherever MDX lives — adjust to actual layout)
apps/docs/package.json          (only if dep ranges need updating)
```

**Do not touch:** any package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - F3 has committed.

2. **Implement.**
   - Walk through each docs page; update API examples.
   - Add the migration guide.
   - Update any TOC or sidebar to include the new page.

3. **Verify.**
   - `vp run typecheck` from `apps/docs/`.
   - `vp run lint`.
   - `vp run build` — docs build must succeed.

4. **Test.**
   - Visual smoke-test: `vp run dev`, click through a few pages, confirm code samples render.

5. **Commit.**

   ```
   docs(docs): update for new @blac/core API + migration guide
   ```

   Body:
   ```
   - Code samples migrated to `select` / `trackRender`.
   - Plugin authoring guide updated for new event payload.
   - New migration guide at <path>.
   ```

---

## Acceptance criteria

- [ ] All in-docs code samples typecheck (if a sample is in a `.mdx` file that compiles to JSX, the build catches errors).
- [ ] Migration guide page exists and lists the locked decisions.
- [ ] Docs build succeeds.
- [ ] No reference to `@blac/adapter` or `tracked()` remains in any docs page.

---

## Pitfalls

- **MDX code blocks aren't typechecked by default.** Visual review is your gate. Use a one-screenshot smoke test to confirm renders are sane.
- **Sidebar/TOC plumbing** varies by docs framework. If you're adding a new page, find the actual sidebar config; don't assume it auto-discovers.
- **Don't rewrite all docs.** Scope: update what's wrong, add the migration page. Don't refactor doc structure.
- **`vp run build`** for docs apps can be slow; tolerate up to a few minutes.
