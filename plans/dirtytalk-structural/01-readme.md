# 01 — Package README

**Phase:** 1 (parallel — owns only `README.md`)
**Model:** Haiku 4.5
**Effort:** low (prose)
**Estimated touch:** 1 file

---

## Goal

Replace the placeholder `packages/dirtytalk-structural/README.md` with the package's real README. Should explain what the package is, why it exists, the core API surface, and a quickstart example. Match the tone and structure of `packages/dirtytalk-engine/README.md`.

---

## Inputs — read these first

1. `packages/dirtytalk-engine/README.md` — match this tone, length, and structure.
2. `dirtytalk/03-blac.md` — full spec of the structural instantiation.
3. `dirtytalk/00-overview.md` § "The core insight" — the cross-cutting framing.
4. `plans/dirtytalk-structural/README.md` — package decision summary.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/README.md
```

**Do not touch:** anything else. In particular, don't edit `src/*` — those are owned by other agents (potentially running in parallel).

---

## Required sections

Match engine README structure. Minimum sections:

1. **Title + one-line tagline.** `# @dirtytalk/structural` + one sentence: "Path-based dirty-tracking instantiation of the @dirtytalk/engine, for state containers and structural data."
2. **Why this exists.** Two paragraphs:
   - The shared cross-cutting framing (paraphrase `00-overview.md`: both insomni and structural ask "what changed, who cares, when" — structural answers in path-set terms).
   - The problem this solves vs the per-consumer-tracker approach: N consumers × per-emit walks → 1 walk per emit + N cheap intersections.
3. **What's in the box.** Bullet list:
   - `StructuralContainer<S>` — the base class. State, channel, observed skeleton.
   - `PathInterner` — per-class string↔ID interning.
   - `PathSet` + `ALL_PATHS` sentinel + `PathSetSpace`.
   - `trackRender` — Proxy-based per-consumer path recorder.
   - `diffAlongSkeleton`, `pathsFromPatch`, `getAt` — diffing helpers.
   - React adapter at `@dirtytalk/structural/react`: `useStructural`.
4. **Install.** `pnpm add @dirtytalk/structural @dirtytalk/engine` (engine is a runtime dep, but worth surfacing).
5. **Quick example — core (no React).** Show defining a `class CounterContainer extends StructuralContainer<{count: number}>`, instantiating, subscribing to its channel, calling `patch`/`emit`, observing the dirty set.
6. **Quick example — React.** `useStructural(container)` returning `[state, container]`. Show conditional read, illustrating that the per-consumer path set adapts per render.
7. **API surface — public exports.** Tabular list mapping export name → file/role.
8. **What it is not.** Mirror the engine's "What it is not" section: no auto-tracked computed values, no effects with cleanups, no virtual DOM, no scheduler opinions (re-uses the engine's scheduler), no mutation primitive (immutable updates only).
9. **License.** `MIT — see LICENSE.`

Keep it ≤ ~250 lines. Engine README is the size target.

---

## Tone and style rules

- No emoji.
- No "Welcome to …" or marketing fluff.
- Code blocks tagged with the right language (`ts`, `bash`, `json`).
- Don't reference `blac` or `insomni` by name. The package's identity is "structural" — abstracting away the host projects is the point.
- Examples must compile (mentally). Don't put in placeholder names like `<your container>`; write a complete `CounterContainer` example.
- Mention `ALL_PATHS` as a sentinel exactly once, with one sentence on when it's used (single-consumer skip, plus opt-in blanket interest).

---

## Cycle (check → write → verify → commit)

1. **Check.** `git status` clean. Phase 0 commit present.
2. **Write.** Replace `README.md`.
3. **Verify.**
   - `vp run format:check` from `packages/dirtytalk-structural/` (oxfmt formats markdown).
   - No typecheck/lint needed for prose-only changes, but the project's `format:check` includes markdown — that's the gate.
4. **Commit.**

   ```
   docs(dirtytalk-structural): write package README
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `README.md` covers all required sections.
- [ ] No `blac` / `insomni` references.
- [ ] Code examples are complete and syntactically correct.
- [ ] `vp run format:check` passes for the package.
- [ ] No changes outside `README.md`.

---

## Pitfalls

- **Don't write API docs that go stale.** Function signatures and parameter explanations belong in TSDoc comments on the source. The README is for _concepts and quickstarts._ If the same content lives in two places, the README will lie within a month.
- **Don't claim performance numbers you haven't measured.** "Cheap intersection vs N walks" is fine because it's algorithmic; "10× faster than X" is not.
- **Don't mention `@blac/core`** or the migration plan. This README is for users of the new package; the migration is internal project chronology.
- **Don't include an "Architecture" diagram in ASCII.** The engine README doesn't. Defer that to `dirtytalk/03-blac.md`.
- **Don't pad with FAQ.** Anything you'd put in an FAQ either belongs in TSDoc or means the design is unclear.
