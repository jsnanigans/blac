# dirtytalk benchmarks

Lightweight wall-clock benchmarks for `@dirtytalk/engine` and
`@dirtytalk/structural`, run with [`hyperfine`](https://github.com/sharkdp/hyperfine).

## Prerequisites

- `hyperfine` on PATH (`brew install hyperfine`)
- The target package's `dist/` must be **built** — benchmarks import the shipped
  output, not the source:

  ```fish
  pnpm --filter @dirtytalk/engine build
  pnpm --filter @dirtytalk/structural build
  ```

## Run

```fish
node benchmarks/run.mjs            # both packages
node benchmarks/run.mjs engine     # one package
node benchmarks/run.mjs structural --warmup 5 --runs 20
```

Each run writes a report to:

```
benchmarks/<package>/<version>-<date>-report.md
```

containing hyperfine's markdown table plus a header (version, git sha, branch,
node version, platform).

## How it works

`hyperfine` measures **whole-process** wall time. Each scenario script
(`scenarios/<package>/*.mjs`) runs a large **fixed** iteration count so the real
work dominates Node's startup overhead. Override the count for ad-hoc tuning:

```fish
node benchmarks/scenarios/structural/patch.mjs 1000000
```

This means the numbers are good for **version-over-version comparison on the
same machine**, not as absolute per-operation latencies.

## Scenarios

### `@dirtytalk/engine`
- `signal-set-notify` — `Signal.value` set + notify, 1 subscriber.
- `channel-broadcast` — `DirtyChannel` mark+flush, 100 subscribers all interested.
- `channel-selective` — mark+flush, 1000 subscribers, 1 intersects per mark.

### `@dirtytalk/structural`
- `patch` — `patch()` no-diff path.
- `emit-diff` — `emit()` diff-along-skeleton with 50 consumers.
- `track-render` — `trackRender` proxy recording of nested reads.
- `intern` — `PathInterner` steady-state interning.
