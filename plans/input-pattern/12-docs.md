---
task: 12-docs
phase: 4
parallel_safe: true
serial_group: null
model: haiku
effort: low
depends_on:
  - 08-react-dev-warnings
files:
  - packages/blac-core/README.md
  - packages/blac-react/README.md
---

# 12 — Docs: core + react READMEs

## Goal

Document the new input API in both package READMEs so the major version ships with accurate docs. Source of truth: [`projects-analysis/2026-05-27/04-input-pattern-design.md`](../../projects-analysis/2026-05-27/04-input-pattern-design.md) — summarize, don't dump.

## Approach
Add/replace sections covering:
1. **The three lanes** table (args / deps / events).
2. **`args`**: typed, required when the bloc declares them, feeds `init(args)`, derives identity (different args → different instance). `static key` to control identity; structural-hash default; serializable only.
3. **`deps`**: refs/callbacks/handles; lazily read via `this.deps.x`; per-consumer merged; `onDepsChanged(next, prev)` for wait-for-handle init (canvas/controller). Multi-source merge + one-owner-per-key.
4. **events**: ordinary methods from one effect for live/late-bound values; the callback-inversion best practice (expose state, let React call the fresh callback).
5. **Identity**: `args`/`static key` replace opaque `instanceId` for meaningful cases; precedence list; `instanceId` is the escape hatch.
6. **Breaking changes** note: `dependencies` option renamed to `select`; zero-arg constructor + `init(args)`; no compat shim.

Also fix any pre-existing README inaccuracies you touch (the capabilities audit flagged phantom `update(fn)`/`lastUpdateTimestamp` and BlocConstructor static methods — only correct ones adjacent to what you're editing; don't expand scope).

## Check (before editing)
```fish
grep -n "useBloc\|instanceId\|dependencies\|## " packages/blac-react/README.md | head -40
grep -n "## " packages/blac-core/README.md | head -40
```

## Implement
Write the sections; use concise code blocks pulled from the design doc.

## Test
Docs only — no test. Confirm code blocks are syntactically valid TS/TSX by eye.

## Verify
No build needed. Optionally:
```fish
pnpm --filter @blac/core lint && pnpm --filter @blac/react lint
```
(README changes won't be linted; this just confirms nothing else broke.)

## Commit
```
docs(core,react): document args/deps/select input API
```
Body: README sections for the three input lanes, identity keying, onDepsChanged, and the breaking changes for the major version.

## Checklist
- [ ] three-lanes + args + deps + events + identity sections in both READMEs
- [ ] breaking-changes note (select rename, init(args))
- [ ] committed with Completion filled

## Completion
**Commit SHA:** (pending)
**Files touched:** 2 files (packages/blac-core/README.md, packages/blac-react/README.md)
**Typecheck result:** n/a (docs)
**Test result:** n/a (docs)
