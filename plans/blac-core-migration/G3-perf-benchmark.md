# G3 — Define + run perf benchmarks; record before/after

**Phase:** G (sequential — runs last, after G0/G1/G2/G4 all commit)
**Model:** Opus 4.7
**Effort:** high (benchmark design + analysis; this is the win measurement)
**Estimated touch:** 3-5 files + 1 results doc

---

## Goal

`apps/perf` exists to measure blac's runtime perf. Per Decision 12, the migration's payoff target is "list of 100 items sharing one Cubit, measure emit→commit latency and ops/sec". This task:

1. Defines the benchmark scenarios.
2. Runs them against the **new** code (post-migration).
3. Records results in `plans/blac-core-migration/_perf-results.md`.
4. If a baseline pre-migration measurement exists (or can be reconstructed via `git stash` of the migration changes — **don't** actually stash; use a separate worktree-free strategy), records before/after.

---

## Inputs — read these first

1. `apps/perf/src/**` — current benchmark setup.
2. `apps/perf/package.json`.
3. `plans/blac-core-migration/README.md` — Decision 12.
4. `dirtytalk/03-blac.md` § "Today's problem" — describes the workload that motivated this migration.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Benchmark scenarios

### Scenario 1: N consumers, single Cubit

- One Cubit holding `{ items: Item[] }` where `items.length === 100`.
- N `useBloc` consumers, each subscribing to one `items[i]` field.
- Emit a state change updating `items[5].name`.
- Measure: time from `emit` call to all N consumers' callbacks completing.
- Run for N ∈ {1, 10, 50, 100, 500}.

### Scenario 2: Throughput

- Same Cubit and consumers.
- Loop 1000 emits in a tight loop.
- Measure: total wall-clock time.

### Scenario 3: Consumer churn

- 100 consumers mounting then unmounting.
- Measure: total mount+unmount time.

### Scenario 4: Microtask-coalescing win

- Synchronous burst of 100 `emit` calls.
- Measure: how many flushes happened.

---

## Results doc shape

Create `plans/blac-core-migration/_perf-results.md`:

```md
# blac-core migration perf results

Date: <YYYY-MM-DD>
Machine: <hardware brief>
Node version: <x>
Branch: <current branch name>

## Scenario 1 — N consumers, single emit

| N consumers | Before (ms) | After (ms) | Delta |
| ----------- | ----------- | ---------- | ----- |
| 1           | ...         | ...        | ...   |
| 10          | ...         | ...        | ...   |
| 50          | ...         | ...        | ...   |
| 100         | ...         | ...        | ...   |
| 500         | ...         | ...        | ...   |

## Scenario 2 — Throughput (1000 emits)

...

## Scenario 3 — Consumer churn (100 mount + unmount)

...

## Scenario 4 — Microtask coalescing

Synchronous burst of 100 emit calls:

- Before: N flushes
- After: N flushes
- (Expected: After = 1, Before = 100)

## Analysis

<1-2 paragraphs: did we hit the goal? Where did we under-perform? Surprises?>
```

### Baseline (before) data

If the user kept a pre-migration tag or branch, check out the perf app from that tag and re-run. Note in the doc which baseline you used.

If no clean pre-migration data exists, mark "Before" cells with "n/a (no baseline)" and ship the After numbers only.

---

## Owned files (write set)

```
apps/perf/src/**                                         (new or updated benchmarks)
apps/perf/package.json                                   (only if deps need updating)
plans/blac-core-migration/_perf-results.md               (new)
```

**Do not touch:** any package; any other app.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - All prior G-phase tasks have committed.
   - F-phase committed.
   - Branch is on the new code (verify by checking the commits in `git log`).

2. **Implement.**
   - Add or update benchmark scenarios.
   - Use `performance.now()` for timing.
   - Average over N runs (default 5) and report median.

3. **Verify.**
   - `vp run typecheck` from `apps/perf/`.
   - `vp run lint`.
   - `vp run build`.

4. **Test.**
   - Run the benchmarks. Capture output.
   - Write results to `_perf-results.md`.

5. **Commit.**

   ```
   perf(perf): benchmark blac-core migration; record results
   ```

   Body:

   ```
   - Added 4 benchmark scenarios per migration plan G3.
   - Results in plans/blac-core-migration/_perf-results.md.
   - Headline: <one-line summary of the win or absence thereof>.
   ```

---

## Acceptance criteria

- [ ] `_perf-results.md` exists with all 4 scenarios filled in.
- [ ] Each scenario has at least N=100 result for "After".
- [ ] Analysis section is concrete (numbers, not platitudes).
- [ ] Benchmark code is reproducible (`vp run benchmark` or equivalent script).

---

## Pitfalls

- **GC and JIT warmup** dominate single runs. Run each scenario 10× and discard the first 3. Median the rest.
- **`performance.now()` resolution** in Node is sub-ms; trust it. In browsers it's coarse-grained (~100µs) for security — node is the right environment.
- **Microtask scheduling** in Node runs at the end of every PromiseJob batch. Benchmark code that uses `setImmediate` for batching may interact oddly — use `queueMicrotask` directly.
- **Don't claim wins without baseline numbers.** If you don't have pre-migration data, say so honestly in the doc.
- **Don't gate the merge on perf**. If perf is _worse_, escalate — write a follow-up task. Don't loosen the success criteria; record the truth.
- **Single-consumer skip** in structural means N=1 scenario won't show a clean win. The win shape is "constant time as N grows" not "always faster than before". Document this explicitly.
