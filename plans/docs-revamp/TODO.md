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

## Phase 4 — Visual & interactive
- [ ] 2.9 DevTools/logging prose + captions (Sonnet/med) [split]
- [H] 2.9 Capture screenshots/GIF (human)
- [ ] 3.11 Before/after perf demo (Sonnet/high) [P4] + [H] browser check
- [ ] 3.5 Playground page (Sonnet/med) [P4] + [H] browser check
- [ ] 3.6 Showcase gallery (Sonnet/high) [P4] + [H] browser check
- [ ] 4.W Wire playground + showcase (Haiku/med) [serial, last]

## Phase 5 — Tier 3 differentiators
- [ ] 3.1 End-to-end Tutorial (Opus/high) + [H] browser check
- [ ] 3.2 Internals chapter (Opus/high)
- [ ] 3.3 Integrations tree: nextjs/remix/rn/outside-react (Sonnet/high) [P5a]
- [ ] 3.7 Coming-from flutter-bloc/zustand/redux (Sonnet/high) [P5a]
- [ ] 3.9 Plugin recipes catalog (Sonnet/med) [P5b]
- [ ] 3.10 llms.txt / llms-full.txt (Haiku/med) [P5b]
- [ ] 3.4 Auto-API reference — OPTIONAL, evaluate vs core/types.md (likely skip)
- [ ] 3.8 Unified sidebar — OPTIONAL, run alone after all wiring (Sonnet/med)
- [ ] 5.W Wire phase-5 pages (Haiku/med) [serial, last]

## Deferred
- [D] 2.3 Mermaid — plugin is VitePress-1.x-only; revisit via custom client-only
  `<Mermaid>` component only.
