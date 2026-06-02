# A0 — Resolve `apps/preact-examples` broken workspace ref

**Phase:** A0 (sequential — **must commit first**; blocks every subsequent agent)
**Model:** Sonnet 4.6
**Effort:** low (mechanical)
**Estimated touch:** 1 package (delete) or ~5 files (rewire)

---

## Goal

`apps/preact-examples/package.json` depends on `@blac/preact`, which does not exist in this workspace. As a result, `vp install` at repo root fails. Every prior phase of the structural plan had to work around this with manual symlinks. **This task removes the workaround** by either deleting the broken app or rewiring it to a real dependency.

---

## Inputs — read these first

1. `apps/preact-examples/package.json` — confirm the broken `@blac/preact` dep.
2. `apps/preact-examples/src/**` — survey what the app actually does. If it's a stub or unused, delete. If it's a real demo, rewire.
3. `pnpm-workspace.yaml` — workspace member list.
4. `~/.claude/CLAUDE.md` — commit format.
5. `AGENTS.md` — `vp` command usage.

---

## Decision — pick one, defend it

**Default: delete.** Unless you find substantive Preact-specific demos that aren't covered by `apps/examples/`, delete the app and remove it from `pnpm-workspace.yaml`.

**Alternative: rewire.** If demos are non-trivial:

- Repoint `@blac/preact` → `@blac/react` (Preact ships with `preact/compat` aliasing in Vite/Vitest).
- Add a Vite alias in the app's config: `react` → `preact/compat`, `react-dom` → `preact/compat`.
- Confirm `vp run build` succeeds.

**Either way:** `vp install` must succeed at repo root after your commit.

---

## Owned files (write set)

```
apps/preact-examples/**         (delete entirely OR edit package.json + vite config)
pnpm-workspace.yaml             (only if removing app)
```

**Do not touch:** any other package or app.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean. If dirty, stop.
   - `vp install` at repo root — reproduce the failure; capture the error.
   - Inspect `apps/preact-examples/src/` — count files, check for real demos.

2. **Implement.**
   - Delete path: `rm -rf apps/preact-examples`, edit `pnpm-workspace.yaml` to remove the entry.
   - Rewire path: edit `apps/preact-examples/package.json` to swap `@blac/preact` for `@blac/react` (workspace:\*), add `preact` + `preact/compat` aliasing in `vite.config.ts`. Update imports in `src/`.

3. **Verify.**
   - `vp install` at repo root — must succeed.
   - If rewired: `vp run build` from `apps/preact-examples/` must succeed.

4. **Test.**
   - If rewired: `vp run dev` (just smoke; don't leave running). Stop after first successful render.
   - If deleted: verify no other file references `apps/preact-examples`. `grep -r "preact-examples" --include="*.json" --include="*.ts" --include="*.md"` should return only this plan directory.

5. **Commit.**
   - Delete: `chore(preact-examples): remove broken workspace member`
   - Rewire: `fix(preact-examples): swap @blac/preact for @blac/react via preact/compat alias`

No co-author. No body unless rewire path needs to explain the alias.

---

## Acceptance criteria

- [ ] `vp install` at repo root succeeds after the commit.
- [ ] `pnpm-workspace.yaml` reflects the actual workspace.
- [ ] No file references the removed app (if deleted).
- [ ] No reference to `@blac/preact` remains anywhere.

---

## Pitfalls

- **Don't delete the directory but leave it in `pnpm-workspace.yaml`** — pnpm will still try to resolve it.
- **`vp install` may cache lockfile state.** If it still complains after your edit, delete `node_modules` at the root and retry once. Don't commit `pnpm-lock.yaml` changes that aren't yours — only commit lockfile changes derived from your `package.json` edits.
- **Don't rewire if it's a stub.** Skim `src/` first. A "Hello World" Preact stub is not worth keeping.
