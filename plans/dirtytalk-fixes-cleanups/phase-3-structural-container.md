# Phase 3 — Structural container: P1 emit + onError forward (Unit B)

**Goal:** `emit()` diffs whenever ≥1 consumer is registered (ALL_PATHS only for
zero consumers), so a lone auto-track consumer wakes only on its tracked paths;
`StructuralContainer` forwards an `onError` option to its channel.

**Parallel:** **after Phase 2** (needs `DirtyChannel`'s `onError` option type).
Disjoint from Phase 1's files (`container.ts` vs `tracker.ts`/`index.ts`). One
agent, tasks sequential.

**Owner:** quick-build, **sonnet/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- Phase 2 committed/applied: `rg -n 'onError' packages/dirtytalk-engine/src/dirty-channel.ts` → present.
- Current emit shortcut at `container.ts:141` (`_consumerPaths.size <= 1` → ALL_PATHS) and the T1 root-sentinel branch at `:161-167` — both must be preserved/adjusted, not removed.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| B1 | **P1** — change the `emit` branch (`container.ts:141`): use `ALL_PATHS` **only** when `_consumerPaths.size === 0`. For `size >= 1`, run `diffAlongSkeleton` and **keep** the empty-diff→`rootId()` root-sentinel branch (`:161-167`) so off-skeleton changes still wake ALL_PATHS subscribers (blac bridge, plugins, watch) while registered leaf consumers stay asleep. Update the `:142-144` comment. | `container.ts` | sequential | Phase 2 | quick-build (sonnet/high) | sync final response | A single auto-track consumer + emit changing an untracked field → consumer's leaf interest does **not** intersect, but the root-sentinel wakes an ALL_PATHS subscriber; a change to the consumer's tracked field still wakes it. Zero-consumer emit still uses ALL_PATHS. |
| B2 | **E2 forward** — add `onError?: (err: unknown) => void` to `StructuralContainerOptions`; pass `{ onError }` as the 3rd arg to `new DirtyChannel(...)` at its construction site (`container.ts:~89`). No behavior change when unset. | `container.ts` | sequential | B1, Phase 2 | quick-build (sonnet/high) | sync final response | `StructuralContainerOptions.onError` exists and reaches the channel ctor; unset → identical current behavior. |
| B3 | **Tests** — extend `container.test.ts`: single-consumer precise wake (untracked change → consumer asleep, ALL_PATHS subscriber wakes; tracked change → consumer wakes); `onError` option forwarded (a throwing subscriber routes to the container's `onError` instead of throwing). | `container.test.ts` | sequential | B1,B2 | quick-build (sonnet/high) | sync final response | New P1 + onError-forward cases; `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff` on `container.ts`: ALL_PATHS gated on `size === 0`; root-sentinel branch intact; `onError` plumbed.
- `rg -n 'ALL_PATHS' packages/dirtytalk-structural/src/container.ts` → only zero-consumer + comment.
- Cross-check no blac-react test hard-asserts single-consumer wakes on *every* change (flag for validation if found).

## Commit (orchestrator)

Batch with Phase 1 into `fix(structural): …` or a dedicated
`fix(structural): diff single-consumer emit + forward onError`. Subagent does not commit.

## Done-check

- [ ] P1: lone consumer wakes only on tracked paths; ALL_PATHS subscribers still wake via root-sentinel; zero-consumer path unchanged.
- [ ] E2 forward: `StructuralContainerOptions.onError` reaches the channel.
- [ ] T1 empty-diff→`rootId()` branch preserved.
