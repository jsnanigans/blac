# Docs Revamp — Progress Tracker

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[H]` waiting on human gate
· `[D]` deferred. Model/effort in parens. Parallel group in brackets.

## Done (committed)
- [x] Tier 0 guardrails (Twoslash, size-limit, link-check, lastUpdated)
- [x] Tier 1 quick wins (useSyncExternalStore fix, logo, surface tracked.md)
- [x] 0.5 Sandpack spike — scaffolded + browser-verified
- [x] 2.1 `<BlacSandpack>` wrapper
- [x] 2.4 Comparison · 2.5 TypeScript + core/types · 2.6 SSR · 2.7 Async

## Phase 1 — Sandpack close-out
- [x] 1.A Embed demo on landing page (Haiku/med) [P1] — f6d16a8d
- [x] 1.B Embed demo on useBloc page (Haiku/med) [P1] — 85cc20fb
- [H] 1.C Remove spike page (Haiku/low) — gated on browser re-check of 1.A/1.B

## Phase 2 — Content & trust  ✅ COMPLETE
- [x] 2.14 Changelog page (Sonnet/high) [P2a] — 9ab80443
- [x] 2.15 Versioning & Stability (Sonnet/high) [P2a] — cad9c544
- [x] 2.12 channel.subscribe reference (Opus/high) [P2a] — e4b69f65
- [x] 2.13 Compat-shim honesty fix (Sonnet/high) [P2a] — 2514f5b2
- [x] 2.11 High-demand recipes (Sonnet/high) [P2b] — 18b9dc0c (7 files under guide/recipes/)
- [x] 2.10 Co-located troubleshooting (Sonnet/med) [P2b] — b9d3d7c7 (5 pages)
- [x] 2.W Wire phase-2 pages (Haiku/med) [serial] — 106dde9d

## Phase 3 — Reference template + rollout  ✅ COMPLETE
- [x] 3.T Define template + convert cubit.md (Opus/high) [gate] — 8a27f845
- [x] 3.R1 Rollout core lifecycle (Sonnet/med) [P3] — db5b6c2f (instance-mgmt, system-events)
- [x] 3.R2 Rollout core comms/tracking (Sonnet/med) [P3] — 8380a3c3 (bloc-comm, watch, tracked)
- [x] 3.R3 Rollout react pages (Sonnet/med) [P3] — c77ce39d (use-bloc, dep-tracking, performance)

## Phase 4 — Visual & interactive  (authoring ✅)
- [x] 2.9 DevTools/logging prose + captions (Sonnet/med) — 509793e1
- [x] fix: dropped unresolved <img> refs — 0c082727 (VitePress FAILS build on
      missing <img>/asset; pending screenshots are callouts, no <img>)
- [H] 2.9 Capture screenshots/GIF (human) — files: devtools-instances/-state-diff/
      -event-log/-logging-console.png in apps/docs/public/, then re-add <img>
- [x] 3.11 Before/after perf demo (Sonnet/high) — 68a7b6a3 + [H] browser check
- [x] 3.5 Playground page (Sonnet/med) — 9b3ee9ab + [H] browser check
- [x] 3.6 Showcase gallery (Sonnet/high) — 113dfe76 (messenger cut) + [H] browser check
- [ ] 4.W Wire playground + showcase → folded into final combined wiring

## Phase 5 — Tier 3 differentiators  ✅ COMPLETE
- [x] 3.1 End-to-end Tutorial (Opus/high) — fe27d7b8 + [H] browser check (Sandpack checkpoints)
- [x] 3.2 Internals chapter (Opus/high) — d1e403ca
- [x] 3.3 Integrations tree: nextjs/remix/rn/outside-react (Sonnet/high) — 1efafcb5
- [x] 3.7 Coming-from flutter-bloc/zustand/redux (Sonnet/high) — 2e0967e8 (+1cadfc36 fmt)
- [x] 3.9 Plugin recipes catalog (Sonnet/med) — 98cc6042
- [x] 3.10 llms.txt / llms-full.txt (Haiku/med) — bd20299c (hand-generated; regenerate on content change)
- [~] 3.4 Auto-API reference — SKIPPED (core/types.md covers it); removed stale
      docs:api promise from readme — fa6bd05c
- [~] 3.8 Unified sidebar — DEFERRED (optional polish; current per-section sidebars work)
- [x] 5.W/45.W Wire all phase 4-5 pages (Sonnet) — 8b8704c2

## Outstanding human gates (browser / capture — cannot be done headlessly)
- [H] 1.C delete sandpack-spike.md after verifying demo on / and /react/use-bloc
- [H] 2.9 capture 4 DevTools/logging screenshots → apps/docs/public/, re-add <img>
- [H] Browser-verify Sandpack on: /react/performance, /playground, /showcase,
      /guide/tutorial (checkpoints) — CDN install + live re-render behavior

## Deferred
- [D] 2.3 Mermaid — plugin is VitePress-1.x-only; revisit via custom client-only
  `<Mermaid>` component only.
