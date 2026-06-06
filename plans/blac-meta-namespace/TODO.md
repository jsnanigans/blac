# `$blac` migration — dispatch TODO

Working checklist for driving agents. Full contract: [README.md](./README.md). Each agent gets exactly one task file as its prompt and runs `check → implement → verify → test → commit` on the current branch (**no worktrees, no branching, no stash, no --no-verify**).

## Wave 1 — keystone (sequential)

- [x] **M0** — [`M0-core-meta.md`](./M0-core-meta.md) · **Opus 4.8 · high** · `general-purpose` · committed `293f6d53`
      `$blac` meta + legacy delegates on StateContainer. Nothing else starts until this commits.

## Wave 2 — ports (ALL parallel after M0 commits; disjoint write sets)

Launch in a single message as concurrent agents:

- [x] **M1** — [`M1-core-internals-port.md`](./M1-core-internals-port.md) · Sonnet 4.6 · medium · `general-purpose` · `9735da94`
- [x] **M2a** — [`M2a-plugin-persist-port.md`](./M2a-plugin-persist-port.md) · Sonnet 4.6 · low · `quick-build` · `9b34547c`
- [x] **M2b** — [`M2b-devtools-connect-port.md`](./M2b-devtools-connect-port.md) · Sonnet 4.6 · medium · `general-purpose` · `a89a3989`
- [x] **M2c** — [`M2c-devtools-ui-port.md`](./M2c-devtools-ui-port.md) · Sonnet 4.6 · low · `quick-build` · `c44f18c2`
- [x] **M2d** — [`M2d-edge-packages-check.md`](./M2d-edge-packages-check.md) · Haiku 4.5 · low · `general-purpose` · `4bf0f514` (note: real initConfig site was blac-core/src/testing.ts)
- [x] **M3** — [`M3-core-tests-port.md`](./M3-core-tests-port.md) · Sonnet 4.6 · medium · `general-purpose` · `4c47f774` (first attempt died on API error; clean retry)
- [x] **M4** — [`M4-apps-docs-sweep.md`](./M4-apps-docs-sweep.md) · Sonnet 4.6 · low · `quick-build` · `a1205da7` + `411e4644`

## Wave 3 — removal (sequential, gated on ALL of Wave 2)

- [x] **M5** — [`M5-legacy-removal.md`](./M5-legacy-removal.md) · Sonnet 4.6 · medium · `general-purpose` · `a98329a0`
      Breaking commit + changeset landed. Compat green without edits.

## Dispatch snippet

```ts
Agent({
  subagent_type: "<from list above>",
  model: "opus" | "sonnet" | "haiku",
  description: "blac-meta: <task id>",
  prompt: <contents of the task file>,
})
```

After each wave: update the README status board, skim each agent's report for escalations (compat failure, straggler overflow, DTO ambiguity) before launching the next wave.
