# DevTools Improvements — TODO

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

One-time setup:

- [ ] `git checkout -b feat/devtools-improvements`

---

## Phase 0 — Contracts & shared primitives (blocks Phase 1+)

- [ ] **0** Shared `CopyButton` + clipboard util, all new wire/UI types, all new
      layout-bloc state. → `phase-0-contracts.md` · Sonnet · effort: low

## Phase 1 — Parallel lanes (start after 0; run concurrently)

- [ ] **1A** Backend component-label enrichment (parse stack traces in plugin).
      → `phase-1a-backend-labels.md` · Sonnet · effort: medium · changeset ✔
- [ ] **1C** Instance list: sort dropdown + quick-filter toggles + copy-id.
      → `phase-1c-instance-list.md` · Sonnet · effort: medium · changeset ✔
- [ ] **1D** Logs: fold consecutive events + expand callstack + copy event.
      → `phase-1d-logs.md` · Sonnet · effort: medium · changeset ✔
- [ ] **1E** Insights: `all`-watcher over-render flag + high-consumer-count.
      → `phase-1e-insights.md` · Haiku · effort: low · changeset ✔

## Phase 2 — Detail-panel integration (after 1A; owns StateViewer)

- [ ] **2** Copy buttons, collapse/expand-all, consumer-vs-ref count, Debug Info
      (`createdFrom`), Ref Holders section (with labels from 1A).
      → `phase-2-detail-panel.md` · Sonnet · effort: medium-high · changeset ✔

## Phase 3 — Path churn heatmap (after 2; also edits StateViewer)

- [ ] **3** Per-path churn bloc + routing feed + `PathChurnView` + StateViewer
      insertion. → `phase-3-path-churn.md` · Sonnet · effort: medium-high · changeset ✔

---

### Dependency notes

- **0 blocks everything** (owns shared types + layout state + CopyButton).
- **1A → 2**: Phase 2's Ref Holders section renders `componentLabel`; the UI reads
  it as an optional field, so Phase 2 can build before 1A lands (graceful empty),
  but reviewing them together is cleaner.
- **2 → 3**: both edit `StateViewer.tsx`; run 3 only after 2 commits.
- 1C / 1D / 1E are independent of each other and of 1A.
