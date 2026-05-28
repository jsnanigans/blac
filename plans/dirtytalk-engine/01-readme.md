# 01 — Write the package README

**Phase:** 1 (parallel — runs after Phase 0)
**Model:** Haiku 4.5
**Effort:** low (prose)
**Estimated touch:** 1 file

---

## Goal

Author `packages/dirtytalk-engine/README.md` — the package's published documentation. Audience: a library author considering the engine for their own dirty-tracking layer. Not consumer end-users; not maintainers.

---

## Inputs — read these first

1. `dirtytalk/00-overview.md` — high-level "why this exists, who it's for."
2. `dirtytalk/01-engine.md` — the canonical surface description.
3. `dirtytalk/02-insomni.md` and `dirtytalk/03-blac.md` — at least skim the "Today's problem" + "Design overview" sections of each to understand the two motivating consumers.
4. `packages/blac-core/README.md` — house style for tone, code-block formatting, badge handling. **Match the tone, not the content.**
5. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files

```
packages/dirtytalk-engine/README.md   (CREATE)
```

## Do not touch

Everything else under `packages/dirtytalk-engine/`. Other Phase 1 agents are writing source.

---

## Required sections

Roughly this outline, in this order. Trim/merge where it makes the prose tighter — don't pad.

1. **Title + one-line tagline.** `# @dirtytalk/engine` → "A reactive dirty-tracking and notification engine. Zero deps, pluggable space, pluggable scheduler."
2. **Why this exists.** Two paragraphs max. The "diff at the source, not at the consumer" insight from `00-overview.md`. Name the two motivating consumers (insomni's rect damage, blac's path-set diff) so the reader understands the shape.
3. **What's in the box.** Bullet list of the four exported pieces: `Signal`/`Observable`, `Space<Region>` interface, `Scheduler` interface + four impls, `DirtyChannel<Region>`. Each bullet one sentence.
4. **Install.** `pnpm add @dirtytalk/engine` (and note: also published under the `./primitives` subpath if you only want `Signal`).
5. **Quick example.** A ~25-line snippet showing all three layers working together. Use a tiny "set of strings" Space so the example is self-contained and doesn't pull in domain types. Show: create a Space, create a DirtyChannel with `SyncScheduler`, subscribe with a thunk, mark a region, observe the callback fire.
6. **Primitives — `Signal<T>`.** API table or short prose. 8–10 lines. Snippet showing `new Signal(0)`, subscribe, set value, equality short-circuit.
7. **The `Space<Region>` interface.** Show the interface verbatim. Note: this package provides NO concrete Space implementations — those live in consuming libraries. Point readers to insomni's `RectSpace` and blac's `PathSetSpace` as examples.
8. **The `Scheduler` interface + provided impls.** Table:
   | Scheduler | When it flushes | Used by |
   | `SyncScheduler` | Immediately on `request` | Tests, sync emit mode |
   | `ManualScheduler` | When `pump()` is called | Tests, replay, SSR |
   | `MicrotaskScheduler` | End of current microtask | blac default |
   | `RAFScheduler` | Next `requestAnimationFrame` (or `setTimeout(_,16)` fallback) | insomni |
9. **`DirtyChannel<Region>`.** Short. Link to "Behaviour notes" section below. Show one snippet with `mark` + `subscribe`.
10. **Behaviour notes.** Bullet the load-bearing contracts:
    - Marks coalesce within a flush window. One flush per scheduler tick.
    - Interest is a **thunk**, re-evaluated each flush — subscribers can move/resize/reconfigure freely.
    - Re-entrant `mark` from inside a subscriber callback defers to the next flush. No infinite loops.
    - Subscriber errors are collected; the flush runs to completion; an `AggregateError` is thrown at the end (or a single error re-thrown if only one).
    - Subscribe/unsubscribe during flush is safe. New subscribers see the next flush, not the current one. Removed subscribers stop being called immediately.
11. **What it is not.** Reuse the bullet list from `01-engine.md` § "What's NOT in the engine," lightly reworded. (Not auto-tracked computeds. Not effects. Not glitch-free graphs. Etc.)
12. **License.** `MIT — see LICENSE.`

---

## Style notes

- Tone matches the design notes: confident, terse, no marketing fluff. The README is a tool for evaluators, not a brochure.
- Use fenced TypeScript code blocks. Run `prettier` mentally — 2-space indent, single quotes, trailing semicolons (matches the rest of the monorepo).
- No emojis. No badges (none of the other packages have them; don't be the first).
- Don't link to URLs that may not exist. Link to other files in this repo using relative paths (e.g. `../insomni/README.md` once it exists, but if it doesn't, omit the link).
- Keep total length under ~250 lines.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** `git status` clean. `ls packages/dirtytalk-engine/README.md` ENOENT.
2. **Implement.** Write the README.
3. **Verify.** Spot-check rendering by `cat`ting the file. Run `vp run format:check` from inside the package (oxfmt won't touch `.md` but make sure nothing else got modified accidentally).
4. **Test.** N/A — no code in this task.
5. **Commit.**

   ```
   docs(dirtytalk-engine): add package README
   ```

   No co-author.

---

## Acceptance criteria

- [ ] `packages/dirtytalk-engine/README.md` exists and matches the outline.
- [ ] All code snippets are valid TypeScript (compile mentally — there's no need to actually compile them).
- [ ] No file outside the owned set is modified.
- [ ] Length under 250 lines.

---

## Pitfalls

- **Don't document features that aren't in the package.** No `Computed`, no `Effect`, no `Selector`. The "What it is not" section exists precisely to head off this confusion.
- **Don't reference unfinished consumer-side code.** Insomni and blac don't yet use this engine — describe them as the motivating use cases, not as live integrations.
- **Don't invent API.** The surface is exactly what `01-engine.md` § "API sketch" says. If something seems missing, that's intentional.
