# Shared conventions — the agent contract

Every subagent working this plan MUST follow this file. Paste the **Agent
contract** + **Token & font name contract** sections into the subagent prompt
alongside its task brief.

---

## Agent contract — the self-contained cycle

Run all five steps. Do not skip verify/test. Do not expand scope beyond your
task's declared file list.

1. **CHECK**
   - `git status` — confirm you are on branch `feat/web-docs-midnight-risograph`
     and the tree is clean enough to start. Never work on `main`.
   - Read this file + your task brief + the files you will touch.
   - Confirm prior-phase outputs you depend on exist (the brief lists them). If a
     dependency is missing, stop and report — do not improvise it.

2. **IMPLEMENT**
   - Edit only the files in your task's declared list. If you discover you need a
     file outside it, stop and report rather than silently widening scope.
   - Match the surrounding code style (the current `theme.css` / `demos.css`
     comment density and tone). All color/font values come from the token
     contract below — **no raw hex or font names outside `tokens.css` / the
     `@font-face` file**.

3. **VERIFY** (scoped to web-docs only — never run repo-wide tooling)
   ```fish
   pnpm --filter @blac/web-docs typecheck   # = astro check
   pnpm --filter @blac/web-docs build        # = strict check-snippets.mjs build
   ```
   Both must exit 0. The strict build fails on any broken `twoslash` snippet or
   page render error — treat a red build as a hard stop.

4. **TEST**
   - web-docs is an **app**, not a package: there is **no vitest suite here**, and
     the root `test`/`lint`/`typecheck` scripts only target `./packages/*`. **Do
     not add vitest tests for CSS/theme work, and do not run repo-wide `pnpm test`
     / `pnpm lint`.** The strict build in step 3 IS the integration test (it
     type-checks every snippet and renders every page).
   - Format gate (oxfmt via `vp`), from repo root:
     ```fish
     vp run -F '@blac/web-docs' format:check   # if unwired, fall back: pnpm format:check
     vp run -F '@blac/web-docs' format         # auto-fix, then re-run :check
     ```
   - If your task adds an Astro component with real logic (not just markup/CSS), a
     single lightweight render assertion is allowed but not required.

5. **COMMIT** (see commit protocol below)
   - Stage **only your task's files** by explicit path. Commit. Tick your box in
     `TODO.md` (that tick can ride in the same commit).

---

## Commit protocol (no worktrees → shared git index)

All agents share one working copy. To keep concurrent commits from corrupting
the index:

- **Stage explicitly, never `git add -A` / `git add .`** — list your task's paths:
  ```fish
  git add apps/web-docs/src/styles/tokens.css plans/midnight-risograph/TODO.md
  ```
- If `.git/index.lock` exists (a sibling agent is mid-commit), wait ~2s and retry
  the commit; do not delete the lock.
- One commit per task (squash your own intermediate work first if needed).
- **Commit message format** (no ticket — branch carries none):
  ```
  <type>(web-docs): <subject ≤50 chars, imperative>
  ```
  e.g. `feat(web-docs): add midnight-risograph color tokens`. Add a 72-col
  wrapped body only if the diff isn't self-explanatory.

---

## Hard guardrails (from repo + user rules — non-negotiable)

- **No** `git push`, `pull`, `merge`, `rebase`, `stash`, or `--no-verify`. Ever.
- **No** coauthor / "Generated with" trailers in commit messages.
- **No** worktrees.
- **No** repo-wide test/lint/typecheck runs — always `--filter @blac/web-docs`.
- **No** unsolicited dev servers / watch processes. The strict `build` is the only
  long-running command you run, and it is explicitly authorized as the verify gate.
- Shell is **fish** — write all commands in fish syntax.
- Don't touch files outside `apps/web-docs/**` and `plans/midnight-risograph/TODO.md`.

---

## Token & font name contract

These names are fixed so parallel agents agree. `tokens.css` (T1.1) defines the
values; everyone else only *references* the `--blac-*` / `--sl-*` vars.

### Color tokens (defined in `src/styles/tokens.css`)

**Dark — canonical (`:root`):**
```
--blac-bg:        #1a1714   /* warm charcoal, the dim study */
--blac-surface:   #221e1a
--blac-surface-2: #2b2620
--blac-ink:       #ece4d4   /* warm off-white body text */
--blac-ink-dim:   #b3a994
--blac-sage:      #a7bcaa
--blac-dusty:     #8fa9c4   /* PRIMARY accent */
--blac-lavender:  #c4b8d4
--blac-ink-a:     #8fa9c4   /* riso plate A (dusty blue) */
--blac-ink-b:     #e08a7a   /* riso plate B (warm coral) — overprints A */
```

**Light — companion (`:root[data-theme='light']`):**
```
--blac-bg:        #f7f1e3   /* cream paper */
--blac-surface:   #efe7d4
--blac-ink:       #2a2622
--blac-ink-dim:   #6b6354
/* accents reused, darkened where needed for AA contrast (T5.2 audits) */
```

Map these onto Starlight's contract (at least): `--sl-color-accent`,
`--sl-color-accent-low`, `--sl-color-accent-high`, `--sl-color-bg`,
`--sl-color-bg-nav`, `--sl-color-text`, `--sl-color-white`, `--sl-color-black`,
and the `--sl-color-gray-1..6` ramp. Also redefine `--blac-gradient` as a
two-ink overprint gradient (plate A → plate B). The demos read `--sl-*`, so
correct mapping re-skins them for free.

### Font tokens

```
--blac-font-display : 'Fraunces', Georgia, serif        /* variable showpiece */
--blac-font-body    : 'Hanken Grotesk', system-ui, sans-serif
--blac-font-mono    : (leave Starlight / Expressive Code default)
```

Recommended faces (both **OFL / open-license**, both **variable**):
- **Display: Fraunces** — has `wght`, `opsz`, `SOFT`, `WONK` axes; literally built
  to morph and get inky/expressive. Perfect for the variable-font showpiece.
- **Body: Hanken Grotesk** (variable `wght`) — warm, highly readable humanist
  sans. (A serif body like *Newsreader* is an acceptable alt if the font agent
  prefers fuller cozy-reading warmth — note the choice in the commit body.)

Self-host + subset both; `font-display: swap`; provide fallback metric overrides
(`size-adjust` / `ascent-override`) to avoid layout shift.

### Stylesheet load order (registered in `astro.config.mjs` `customCss`)

```
'./src/styles/fonts.css'    // @font-face (T1.2)
'./src/styles/tokens.css'   // colors + type scale (T1.1 / T1.2)
'./src/styles/riso.css'     // print primitives (T2.1)
'./src/styles/chrome.css'   // Starlight chrome polish (T3.1)
```
Keep the existing `theme.css` only if still needed; otherwise migrate its few
rules into the files above and drop it (note the removal in your commit).

### Starlight component overrides (registered via `starlight({ components: {…} })`)

```
PageTitle : './src/components/overrides/PageTitle.astro'   (T3.2)
Footer    : './src/components/overrides/Footer.astro'      (T3.3)
Hero      : './src/components/overrides/Hero.astro'        (T4.1)
```
Reference: Starlight component-override docs + its default component as the
starting point — override surgically, keep accessibility/landmarks intact.
