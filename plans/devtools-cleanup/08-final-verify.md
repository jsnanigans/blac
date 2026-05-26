---
task: 08-final-verify
lane: all (cross-package)
parallel_safe: false
model: sonnet
effort: low
depends_on:
  [
    01-delete-popup,
    02-delete-pip,
    03-delete-callstack,
    04-delete-dependency-graph,
    05-delete-performance-panel,
    06-strip-dep-tracking-from-connect,
    07-instance-insights,
  ]
---

# 08 — Final verification pass

Make sure the three packages still compose. No code changes expected; if something needs fixing, do it as a tightly scoped follow-up commit and document what was wrong.

## Steps

1. **No stale references** — sanity grep across the workspace:

   ```sh
   grep -rn "DependencyGraph\|DevToolsDependencyBloc\|DependencyEdge\|PerformancePanel\|DevToolsMetricsBloc\|PictureInPicture\|isPiPSupported\|CallStackView\|source-map-js\|@xyflow\|elkjs\|popup\|InstanceMetrics" \
     packages/devtools-ui packages/devtools-connect apps/devtools-extension
   ```

   Expected: zero hits in source files. Hits in `dist/`, `node_modules/`, or CHANGELOG/README from prior versions are fine — note them but don't touch.

2. **Typecheck all three packages:**

   ```sh
   pnpm --filter @blac/devtools-ui typecheck
   pnpm --filter @blac/devtools-connect typecheck
   pnpm --filter @blac/devtools-extension typecheck
   ```

3. **Run package tests:**

   ```sh
   pnpm --filter @blac/devtools-connect test
   pnpm --filter @blac/devtools-ui test
   ```

4. **Lockfile** — `pnpm install` (without `--frozen-lockfile`) to refresh the lockfile now that `@xyflow/react`, `elkjs`, and `source-map-js` are gone. Confirm only those entries (and their transitives) disappear; nothing else should change.

   ```sh
   pnpm install
   git diff pnpm-lock.yaml
   ```

5. **Bundle-size spot check** (optional, only if quick): if `vite-plus` exposes a size report, capture before/after numbers for `@blac/devtools-ui`. Otherwise skip; the goal is a smaller `dist/`, but we don't need a precise number to land this work.

6. **Manual smoke (do not start dev servers automatically — ask the user before doing this)**: if the user has not asked for a manual smoke, **stop** at step 5 and report. The "no unsolicited background runs" rule applies.

## What to fix here vs. send back

- Typecheck error caused by a missed export removal → fix here in a small commit (`chore(devtools-ui): drop stale re-export missed in 04`).
- Test failure in a kept feature → fix the test if it was asserting a removed behavior; otherwise stop and report.
- A grep hit that reveals a real consumer outside the three packages — **stop and report**. Do not edit other packages from this task.

## Commit

Only commit if you had to fix something. Use a scoped conventional commit (`chore(devtools-ui): ...`). If nothing needed fixing, no commit; just update this file's Completion section with the verification results.

## Checklist

- [ ] Stale-reference grep is clean across the three packages.
- [ ] All three packages typecheck.
- [ ] Connect and UI tests pass.
- [ ] Lockfile refreshed and contains no surprise diffs.
- [ ] Any fix-up commits are noted below.
- [ ] Verification results recorded in Completion.

## Completion

(Agent fills in: typecheck result per package, test result per package, lockfile diff summary, any fix-up commits.)
