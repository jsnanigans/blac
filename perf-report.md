# React State Management Benchmarks

## Overview

Benchmarks comparing three React state management libraries:

- **Blac**
- **Zustand**
- **Redux Toolkit**

---

## Scorecard

| Library       | Wins    | Slow (>1.5x)    | Geometric Mean |
| ------------- | ------- | --------------- | -------------- |
| Blac          | 7 wins  | 8 slow (>1.5x)  | 4.51x          |
| Zustand       | 15 wins | 1 slow (>1.5x)  | 1.04x          |
| Redux Toolkit | 2 wins  | 14 slow (>1.5x) | 3.35x          |

---

## Blac Action Items

### Critical (>2x slower)

| Operation                | Result                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| derived state read       | Blac is 190.0x slower than Zustand (19.0ms vs 100µs) — Gap: 18.9ms per operation   |
| multi-store coordination | Blac is 148.0x slower than Zustand (29.6ms vs 200µs) — Gap: 29.4ms per operation   |
| rapid counter            | Blac is 93.0x slower than Zustand (9.3ms vs 100µs) — Gap: 9.2ms per operation      |
| nested object update     | Blac is 74.0x slower than Zustand (7.4ms vs 100µs) — Gap: 7.3ms per operation      |
| patch 1 of 20 fields     | Blac is 7.6x slower than Redux Toolkit (9.1ms vs 1.2ms) — Gap: 7.9ms per operation |
| notify 100 subscribers   | Blac is 4.0x slower than Zustand (800µs vs 200µs) — Gap: 600µs per operation       |

### Needs Attention (>1.25x slower)

| Operation                     | Result                                               |
| ----------------------------- | ---------------------------------------------------- |
| selective subscription        | Blac is 1.84x slower than Zustand (17.8ms vs 9.7ms)  |
| listener with selector filter | Blac is 1.81x slower than Zustand (18.1ms vs 10.0ms) |
| append 1k                     | Blac is 1.50x slower than Zustand (300µs vs 200µs)   |

### Wins

| Operation                   | Result             |
| --------------------------- | ------------------ |
| create 1k                   | Blac wins at 200µs |
| update every 10th           | Blac wins at 200µs |
| create 10k                  | Blac wins at 700µs |
| clear                       | Blac wins at 200µs |
| redundant patch             | Blac wins at 100µs |
| subscribe/unsubscribe churn | Blac wins at 100µs |

---

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation         | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| create 1k         | 200µs       | fastest         | 200µs          | fastest            | 300µs                | 1.50x slower             |
| create 10k        | 700µs       | fastest         | 700µs          | fastest            | 1.8ms                | 2.57x slower             |
| update every 10th | 200µs       | fastest         | 200µs          | fastest            | 500µs                | 2.50x slower             |
| append 1k         | 300µs       | 1.50x slower    | 200µs          | fastest            | 800µs                | 4.00x slower             |
| clear             | 200µs       | fastest         | 200µs          | fastest            | 300µs                | 1.50x slower             |

### CRUD Operations — Detailed Stats

#### create 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 200µs | 200µs  | 200µs | 200µs | 200µs | 0µs    | 0µs    | 0.0%  | -0.0%  |
| Zustand       | 0µs   | 200µs  | 163µs | 300µs | 500µs | 77µs   | 500µs  | 47.2% | -22.5% |
| Redux Toolkit | 100µs | 300µs  | 313µs | 500µs | 600µs | 114µs  | 500µs  | 36.3% | +4.2%  |

#### create 10k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 600µs | 700µs  | 713µs | 900µs | 1.0ms | 94µs   | 400µs  | 13.2% | +1.8% |
| Zustand       | 600µs | 700µs  | 718µs | 900µs | 900µs | 78µs   | 300µs  | 10.9% | +2.5% |
| Redux Toolkit | 1.7ms | 1.8ms  | 1.8ms | 1.9ms | 2.1ms | 77µs   | 400µs  | 4.2%  | +1.6% |

#### update every 10th

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 200µs | 200µs  | 200µs | 200µs | 200µs | 0µs    | 0µs    | 0.0%  | -0.0%  |
| Zustand       | 0µs   | 200µs  | 178µs | 300µs | 500µs | 82µs   | 500µs  | 46.2% | -12.4% |
| Redux Toolkit | 300µs | 500µs  | 510µs | 700µs | 800µs | 108µs  | 500µs  | 21.2% | +1.9%  |

#### append 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 100µs | 300µs  | 302µs | 500µs | 600µs | 123µs  | 500µs  | 40.6% | +0.7%  |
| Zustand       | 100µs | 200µs  | 248µs | 400µs | 400µs | 84µs   | 300µs  | 33.9% | +19.2% |
| Redux Toolkit | 600µs | 800µs  | 805µs | 1.1ms | 1.1ms | 112µs  | 500µs  | 13.9% | +0.6%  |

#### clear

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 0µs   | 200µs  | 194µs | 300µs | 500µs | 87µs   | 500µs  | 44.8% | -2.9%  |
| Zustand       | 0µs   | 200µs  | 181µs | 300µs | 500µs | 85µs   | 500µs  | 47.1% | -10.6% |
| Redux Toolkit | 100µs | 300µs  | 316µs | 600µs | 600µs | 118µs  | 500µs  | 37.3% | +5.1%  |

---

### State Update Patterns — Summary

| Operation            | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| -------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| redundant emit       | 100µs       | fastest         | 0µs            | fastest            | 900µs                | fastest                  |
| redundant patch      | 100µs       | fastest         | 100µs          | fastest            | 900µs                | 9.00x slower             |
| patch 1 of 20 fields | 9.1ms       | 7.58x slower    | 2.1ms          | 1.75x slower       | 1.2ms                | fastest                  |
| rapid counter        | 9.3ms       | 93.00x slower   | 100µs          | fastest            | 1.0ms                | 10.00x slower            |
| nested object update | 7.4ms       | 74.00x slower   | 100µs          | fastest            | 1.9ms                | 19.00x slower            |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%    | Skew    |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ------ | ------- |
| Blac          | 0µs   | 100µs  | 71µs  | 200µs | 400µs | 68µs   | 400µs  | 95.1%  | -40.8%  |
| Zustand       | 0µs   | 0µs    | 42µs  | 100µs | 200µs | 56µs   | 200µs  | 131.9% | +100.0% |
| Redux Toolkit | 800µs | 900µs  | 934µs | 1.1ms | 1.2ms | 98µs   | 400µs  | 10.5%  | +3.6%   |

#### redundant patch

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0%  | -0.0% |
| Zustand       | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0%  | -0.0% |
| Redux Toolkit | 700µs | 900µs  | 893µs | 1.2ms | 1.2ms | 113µs  | 500µs  | 12.6% | -0.8% |

#### patch 1 of 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 8.8ms | 9.1ms  | 9.1ms | 9.3ms | 9.4ms | 136µs  | 600µs  | 1.5% | -0.3% |
| Zustand       | 1.9ms | 2.1ms  | 2.1ms | 2.2ms | 2.4ms | 83µs   | 500µs  | 3.9% | -0.4% |
| Redux Toolkit | 1.1ms | 1.2ms  | 1.2ms | 1.4ms | 1.5ms | 86µs   | 400µs  | 6.9% | +3.9% |

#### rapid counter

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 9.0ms | 9.3ms  | 9.3ms | 9.4ms | 9.6ms | 114µs  | 600µs  | 1.2% | -0.5% |
| Zustand       | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0% | -0.0% |
| Redux Toolkit | 900µs | 1.0ms  | 1.0ms | 1.2ms | 1.3ms | 96µs   | 400µs  | 9.5% | +1.1% |

#### nested object update

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 7.2ms | 7.4ms  | 7.4ms | 7.6ms | 7.7ms | 97µs   | 500µs  | 1.3% | +0.5% |
| Zustand       | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0% | -0.0% |
| Redux Toolkit | 1.8ms | 1.9ms  | 2.0ms | 2.1ms | 2.3ms | 95µs   | 500µs  | 4.9% | +2.9% |

---

### Subscription & Notification — Summary

| Operation                     | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| notify 100 subscribers        | 800µs       | 4.00x slower    | 200µs          | fastest            | 300µs                | 1.50x slower             |
| selective subscription        | 17.8ms      | 1.84x slower    | 9.7ms          | fastest            | 21.8ms               | 2.25x slower             |
| subscribe/unsubscribe churn   | 100µs       | fastest         | 100µs          | fastest            | 200µs                | 2.00x slower             |
| listener with selector filter | 18.1ms      | 1.81x slower    | 10.0ms         | fastest            | 21.9ms               | 2.19x slower             |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 700µs | 800µs  | 868µs | 1.1ms | 1.2ms | 100µs  | 500µs  | 11.6% | +7.9%  |
| Zustand       | 0µs   | 200µs  | 182µs | 300µs | 500µs | 77µs   | 500µs  | 42.4% | -10.2% |
| Redux Toolkit | 100µs | 300µs  | 337µs | 600µs | 600µs | 118µs  | 500µs  | 35.1% | +10.9% |

#### selective subscription

| Library       | Min    | Median | Mean   | P95    | Max    | StdDev | Spread | CV%   | Skew  |
| ------------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ----- | ----- |
| Blac          | 16.7ms | 17.8ms | 17.8ms | 18.2ms | 18.6ms | 332µs  | 1.9ms  | 1.9%  | -0.1% |
| Zustand       | 6.8ms  | 9.7ms  | 9.0ms  | 12.7ms | 13.7ms | 1.9ms  | 6.9ms  | 21.4% | -7.7% |
| Redux Toolkit | 21.2ms | 21.8ms | 21.8ms | 22.2ms | 22.5ms | 232µs  | 1.3ms  | 1.1%  | -0.0% |

#### subscribe/unsubscribe churn

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0%  | -0.0% |
| Zustand       | 100µs | 100µs  | 100µs | 100µs | 100µs | 0µs    | 0µs    | 0.0%  | -0.0% |
| Redux Toolkit | 0µs   | 200µs  | 185µs | 400µs | 500µs | 93µs   | 500µs  | 50.0% | -7.9% |

#### listener with selector filter

| Library       | Min    | Median | Mean   | P95    | Max    | StdDev | Spread | CV%   | Skew  |
| ------------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ----- | ----- |
| Blac          | 17.1ms | 18.1ms | 18.0ms | 18.5ms | 19.2ms | 322µs  | 2.1ms  | 1.8%  | -0.4% |
| Zustand       | 6.9ms  | 10.0ms | 9.1ms  | 12.4ms | 14.5ms | 1.9ms  | 7.6ms  | 21.2% | -9.6% |
| Redux Toolkit | 21.6ms | 21.9ms | 21.9ms | 22.1ms | 22.2ms | 110µs  | 600µs  | 0.5%  | -0.0% |

---

### Multi-Store & Derived — Summary

| Operation                | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------ | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| derived state read       | 19.0ms      | 190.00x slower  | 100µs          | fastest            | 1.1ms                | 11.00x slower            |
| multi-store coordination | 29.6ms      | 148.00x slower  | 200µs          | fastest            | 3.1ms                | 15.50x slower            |

### Multi-Store & Derived — Detailed Stats

#### derived state read

| Library       | Min    | Median | Mean   | P95    | Max    | StdDev | Spread | CV%  | Skew  |
| ------------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ---- | ----- |
| Blac          | 18.8ms | 19.0ms | 19.0ms | 19.2ms | 19.4ms | 104µs  | 600µs  | 0.5% | +0.3% |
| Zustand       | 100µs  | 100µs  | 100µs  | 100µs  | 100µs  | 0µs    | 0µs    | 0.0% | -0.0% |
| Redux Toolkit | 1.0ms  | 1.1ms  | 1.1ms  | 1.3ms  | 1.4ms  | 71µs   | 400µs  | 6.2% | +3.5% |

#### multi-store coordination

| Library       | Min    | Median | Mean   | P95    | Max    | StdDev | Spread | CV%   | Skew  |
| ------------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ----- | ----- |
| Blac          | 29.3ms | 29.6ms | 29.6ms | 29.8ms | 29.9ms | 132µs  | 600µs  | 0.4%  | -0.1% |
| Zustand       | 0µs    | 200µs  | 199µs  | 400µs  | 500µs  | 92µs   | 500µs  | 46.4% | -0.5% |
| Redux Toolkit | 2.9ms  | 3.1ms  | 3.1ms  | 3.2ms  | 3.4ms  | 81µs   | 500µs  | 2.6%  | -1.5% |

---

## React Benchmark Details

React benchmarks measure end-to-end (E2E) time, React render time, and non-render overhead. Columns: E2E Med, Render Med, Overhead, E2E P95, E2E StdDev, E2E CV%.

Note: In all React benchmark operations, the recorded React Render time was 0µs for all libraries — the entire measured time is non-render overhead.

### run

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 31.3ms  | 0µs        | 31.3ms   | 35.5ms  | 3.0ms      | 9.6%    |
| Zustand       | 31.6ms  | 0µs        | 31.6ms   | 37.3ms  | 3.5ms      | 11.4%   |
| Redux Toolkit | 32.1ms  | 0µs        | 32.1ms   | 33.9ms  | 2.2ms      | 6.9%    |

### runLots

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 145ms   | 0µs        | 145ms    | 159ms   | 5.4ms      | 3.7%    |
| Zustand       | 163ms   | 0µs        | 163ms    | 173ms   | 4.2ms      | 2.5%    |
| Redux Toolkit | 139ms   | 0µs        | 139ms    | 150ms   | 5.2ms      | 3.7%    |

### add

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 42.8ms  | 0µs        | 42.8ms   | 45.2ms  | 959µs      | 2.2%    |
| Zustand       | 44.8ms  | 0µs        | 44.8ms   | 46.9ms  | 1.2ms      | 2.6%    |
| Redux Toolkit | 44.1ms  | 0µs        | 44.1ms   | 45.4ms  | 1.4ms      | 3.2%    |

### update

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 14.1ms  | 0µs        | 14.1ms   | 15.4ms  | 782µs      | 5.5%    |
| Zustand       | 14.3ms  | 0µs        | 14.3ms   | 15.2ms  | 579µs      | 4.1%    |
| Redux Toolkit | 13.9ms  | 0µs        | 13.9ms   | 14.5ms  | 248µs      | 1.8%    |

### clear

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 10.7ms  | 0µs        | 10.7ms   | 11.5ms  | 397µs      | 3.7%    |
| Zustand       | 11.9ms  | 0µs        | 11.9ms   | 14.0ms  | 1.1ms      | 8.6%    |
| Redux Toolkit | 11.5ms  | 0µs        | 11.5ms   | 13.3ms  | 853µs      | 7.2%    |

### swapRows

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 38.5ms  | 0µs        | 38.5ms   | 41.7ms  | 1.4ms      | 3.7%    |
| Zustand       | 37.4ms  | 0µs        | 37.4ms   | 39.1ms  | 518µs      | 1.4%    |
| Redux Toolkit | 38.2ms  | 0µs        | 38.2ms   | 41.8ms  | 1.2ms      | 3.0%    |
