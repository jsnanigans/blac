# React State Management Benchmarks

## Scorecard

| Library       | Wins    | Slow (>1.5x)    | Geometric Mean |
| ------------- | ------- | --------------- | -------------- |
| Blac          | 7 wins  | 4 slow (>1.5x)  | 1.30x          |
| Zustand       | 11 wins | 5 slow (>1.5x)  | 1.82x          |
| Redux Toolkit | 1 wins  | 17 slow (>1.5x) | 13.02x         |

## Blac Action Items

### Critical (>2x slower)

| Operation           | Result                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| proxy track 1 field | Blac is 2.7x slower than Zustand (55µs vs 20µs) — Gap: 35µs per operation |

### Needs Attention (>1.25x slower)

| Operation                 | Result                                                   |
| ------------------------- | -------------------------------------------------------- |
| redundant patch           | Blac is 2.00x slower than Zustand (40µs vs 20µs)         |
| multi-store coordination  | Blac is 1.60x slower than Zustand (120µs vs 75µs)        |
| derived state computation | Blac is 1.50x slower than Zustand (45µs vs 30µs)         |
| redundant emit            | Blac is 1.50x slower than Zustand (15µs vs 10µs)         |
| create 1k                 | Blac is 1.50x slower than Zustand (75µs vs 50µs)         |
| batch rapid updates       | Blac is 1.43x slower than Zustand (50µs vs 35µs)         |
| nested object update      | Blac is 1.40x slower than Zustand (35µs vs 25µs)         |
| read 20 fields (baseline) | Blac is 1.35x slower than Redux Toolkit (460µs vs 340µs) |

### Wins

| Operation                               | Result             |
| --------------------------------------- | ------------------ |
| patch 1 of 20 fields                    | Blac wins at 55µs  |
| same-tick burst 1000 (tracked consumer) | Blac wins at 105µs |
| notify 100 subscribers                  | Blac wins at 10µs  |
| subscriber with computed filter         | Blac wins at 25µs  |
| getter track simple                     | Blac wins at 10µs  |
| getter track wide aggregate             | Blac wins at 520µs |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation         | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| create 1k         | 75µs        | 1.50x slower    | 50µs           | fastest            | 125µs                | 2.50x slower             |
| update every 10th | 65µs        | 1.18x slower    | 55µs           | fastest            | 260µs                | 4.73x slower             |
| append 1k         | 110µs       | fastest         | 105µs          | fastest            | 495µs                | 4.71x slower             |
| clear             | 60µs        | 1.20x slower    | 50µs           | fastest            | 125µs                | 2.50x slower             |

### CRUD Operations — Detailed Stats

#### create 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 50µs  | 75µs   | 76µs  | 105µs | 130µs | 17µs   | 80µs   | 22.1% | +0.9%  |
| Zustand       | 45µs  | 50µs   | 52µs  | 55µs  | 70µs  | 3µs    | 25µs   | 6.1%  | +4.6%  |
| Redux Toolkit | 115µs | 125µs  | 143µs | 140µs | 1.8ms | 125µs  | 1.7ms  | 87.6% | +12.4% |

#### update every 10th

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 50µs  | 65µs   | 68µs  | 90µs  | 100µs | 12µs   | 50µs   | 17.6% | +4.6% |
| Zustand       | 45µs  | 55µs   | 53µs  | 60µs  | 70µs  | 3µs    | 25µs   | 6.1%  | -3.6% |
| Redux Toolkit | 250µs | 260µs  | 259µs | 270µs | 275µs | 6µs    | 25µs   | 2.3%  | -0.4% |

#### append 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 95µs  | 110µs  | 115µs | 145µs | 150µs | 13µs   | 55µs   | 11.6% | +4.1% |
| Zustand       | 105µs | 105µs  | 105µs | 105µs | 105µs | 0µs    | 0µs    | 0.0%  | +0.0% |
| Redux Toolkit | 480µs | 495µs  | 496µs | 505µs | 510µs | 6µs    | 30µs   | 1.1%  | +0.3% |

#### clear

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 50µs  | 60µs   | 66µs  | 90µs  | 100µs | 12µs   | 50µs   | 18.6% | +8.9% |
| Zustand       | 45µs  | 50µs   | 53µs  | 60µs  | 65µs  | 3µs    | 20µs   | 6.1%  | +4.9% |
| Redux Toolkit | 120µs | 125µs  | 127µs | 135µs | 140µs | 4µs    | 20µs   | 2.8%  | +1.9% |

### State Update Patterns — Summary

| Operation                               | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| --------------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| redundant emit                          | 15µs        | 1.50x slower    | 10µs           | fastest            | 645µs                | 64.50x slower            |
| redundant patch                         | 40µs        | 2.00x slower    | 20µs           | fastest            | 595µs                | 29.75x slower            |
| patch 1 of 20 fields                    | 55µs        | fastest         | 1.4ms          | 24.82x slower      | 870µs                | 15.82x slower            |
| nested object update                    | 35µs        | 1.40x slower    | 25µs           | fastest            | 1.2ms                | 47.20x slower            |
| batch rapid updates                     | 50µs        | 1.43x slower    | 35µs           | fastest            | 695µs                | 19.86x slower            |
| same-tick burst 1000 (tracked consumer) | 105µs       | fastest         | 1.4ms          | 12.90x slower      | 900µs                | 8.57x slower             |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 15µs  | 15µs   | 15µs  | 15µs  | 15µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 0µs   | 10µs   | 11µs  | 20µs  | 25µs  | 5µs    | 25µs   | 43.7% | +7.2% |
| Redux Toolkit | 630µs | 645µs  | 645µs | 660µs | 660µs | 7µs    | 30µs   | 1.1%  | -0.1% |

#### redundant patch

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 25µs  | 40µs   | 39µs  | 55µs  | 55µs  | 7µs    | 30µs   | 17.8% | -1.6% |
| Zustand       | 15µs  | 20µs   | 22µs  | 25µs  | 40µs  | 3µs    | 25µs   | 13.7% | +9.4% |
| Redux Toolkit | 585µs | 595µs  | 597µs | 605µs | 615µs | 6µs    | 30µs   | 1.0%  | +0.4% |

#### patch 1 of 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 40µs  | 55µs   | 60µs  | 85µs  | 95µs  | 12µs   | 55µs   | 19.8% | +7.9% |
| Zustand       | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 13µs   | 60µs   | 1.0%  | +0.2% |
| Redux Toolkit | 835µs | 870µs  | 871µs | 895µs | 905µs | 13µs   | 70µs   | 1.4%  | +0.1% |

#### nested object update

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 20µs  | 35µs   | 35µs  | 50µs  | 50µs  | 7µs    | 30µs   | 20.2% | -1.4% |
| Zustand       | 25µs  | 25µs   | 25µs  | 25µs  | 25µs  | 0µs    | 0µs    | 0.0%  | -0.0% |
| Redux Toolkit | 1.1ms | 1.2ms  | 1.2ms | 1.2ms | 1.2ms | 13µs   | 70µs   | 1.1%  | -0.1% |

#### batch rapid updates

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 35µs  | 50µs   | 51µs  | 75µs  | 85µs  | 12µs   | 50µs   | 23.1% | +2.6% |
| Zustand       | 25µs  | 35µs   | 35µs  | 45µs  | 50µs  | 5µs    | 25µs   | 15.8% | -1.0% |
| Redux Toolkit | 680µs | 695µs  | 694µs | 700µs | 710µs | 6µs    | 30µs   | 0.8%  | -0.2% |

#### same-tick burst 1000 (tracked consumer)

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 90µs  | 105µs  | 109µs | 135µs | 145µs | 13µs   | 55µs   | 12.0% | +3.7% |
| Zustand       | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 13µs   | 70µs   | 0.9%  | +0.2% |
| Redux Toolkit | 865µs | 900µs  | 899µs | 920µs | 935µs | 13µs   | 70µs   | 1.5%  | -0.1% |

### Subscription & Notification — Summary

| Operation                       | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| notify 100 subscribers          | 10µs        | fastest         | 60µs           | 6.00x slower       | 145µs                | 14.50x slower            |
| subscriber with computed filter | 25µs        | fastest         | 90µs           | 3.60x slower       | 970µs                | 38.80x slower            |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 10µs  | 10µs   | 10µs  | 10µs  | 10µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 45µs  | 60µs   | 65µs  | 90µs  | 100µs | 12µs   | 55µs   | 18.7% | +7.8% |
| Redux Toolkit | 130µs | 145µs  | 150µs | 175µs | 185µs | 11µs   | 55µs   | 7.7%  | +3.0% |

#### subscriber with computed filter

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 15µs  | 25µs   | 26µs  | 40µs  | 40µs  | 7µs    | 25µs   | 25.5% | +4.1% |
| Zustand       | 75µs  | 90µs   | 94µs  | 120µs | 130µs | 13µs   | 55µs   | 13.9% | +4.1% |
| Redux Toolkit | 935µs | 970µs  | 980µs | 1.0ms | 1.0ms | 25µs   | 110µs  | 2.5%  | +1.0% |

### Derived & Cross-Store — Summary

| Operation                 | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| derived state computation | 45µs        | 1.50x slower    | 30µs           | fastest            | 820µs                | 27.33x slower            |
| multi-store coordination  | 120µs       | 1.60x slower    | 75µs           | fastest            | 2.2ms                | 28.93x slower            |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 35µs  | 45µs   | 52µs  | 75µs  | 85µs  | 13µs   | 50µs   | 24.4% | +12.7% |
| Zustand       | 20µs  | 30µs   | 31µs  | 45µs  | 45µs  | 6µs    | 25µs   | 19.6% | +3.7%  |
| Redux Toolkit | 790µs | 820µs  | 822µs | 850µs | 855µs | 14µs   | 65µs   | 1.7%  | +0.2%  |

#### multi-store coordination

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 105µs | 120µs  | 124µs | 155µs | 160µs | 13µs   | 55µs   | 10.6% | +3.5% |
| Zustand       | 60µs  | 75µs   | 75µs  | 90µs  | 90µs  | 7µs    | 30µs   | 9.7%  | -0.3% |
| Redux Toolkit | 2.1ms | 2.2ms  | 2.2ms | 2.3ms | 2.3ms | 55µs   | 220µs  | 2.5%  | +1.3% |

### Other — Summary

| Operation                   | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| --------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| proxy track 1 field         | 55µs        | 2.75x slower    | 20µs           | fastest            | 695µs                | 34.75x slower            |
| read 20 fields (baseline)   | 460µs       | 1.35x slower    | 460µs          | 1.35x slower       | 340µs                | fastest                  |
| getter track simple         | 10µs        | fastest         | 15µs           | 1.50x slower       | 820µs                | 82.00x slower            |
| getter track wide aggregate | 520µs       | fastest         | 1.8ms          | 3.49x slower       | 1.4ms                | 2.67x slower             |

### Other — Detailed Stats

#### proxy track 1 field

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 35µs  | 55µs   | 56µs  | 85µs  | 90µs  | 13µs   | 55µs   | 23.0% | +2.5% |
| Zustand       | 20µs  | 20µs   | 20µs  | 20µs  | 20µs  | 0µs    | 0µs    | 0.0%  | -0.0% |
| Redux Toolkit | 675µs | 695µs  | 696µs | 720µs | 730µs | 12µs   | 55µs   | 1.7%  | +0.2% |

#### read 20 fields (baseline)

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 445µs | 460µs  | 459µs | 465µs | 475µs | 5µs    | 30µs   | 1.2% | -0.3% |
| Zustand       | 445µs | 460µs  | 460µs | 470µs | 475µs | 5µs    | 30µs   | 1.1% | +0.1% |
| Redux Toolkit | 325µs | 340µs  | 341µs | 350µs | 355µs | 6µs    | 30µs   | 1.7% | +0.4% |

#### getter track simple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 5µs   | 10µs   | 13µs  | 25µs  | 30µs  | 5µs    | 25µs   | 37.8% | +24.9% |
| Zustand       | 10µs  | 15µs   | 17µs  | 20µs  | 25µs  | 3µs    | 15µs   | 18.5% | +9.2%  |
| Redux Toolkit | 795µs | 820µs  | 822µs | 850µs | 855µs | 15µs   | 60µs   | 1.8%  | +0.2%  |

#### getter track wide aggregate

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 505µs | 520µs  | 519µs | 530µs | 535µs | 6µs    | 30µs   | 1.1% | -0.1% |
| Zustand       | 1.8ms | 1.8ms  | 1.8ms | 1.8ms | 1.9ms | 14µs   | 65µs   | 0.8% | +0.1% |
| Redux Toolkit | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.5ms | 24µs   | 120µs  | 1.7% | +0.6% |

## Registry Lifecycle (per-library, not comparable)

Zustand and Redux have no acquire/release/dispose concept — their versions of
these ops allocate a store and tear down nothing, so ratios here would measure
feature presence, not speed. Tracked per library against its own history.

| Library       | Operation               | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----------------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | acquire/release cycle   | 2.1ms | 2.3ms  | 2.3ms | 2.4ms | 2.5ms | 65µs   | 345µs  | 2.9%  | +0.3% |
| Blac          | instance create/dispose | 440µs | 455µs  | 455µs | 465µs | 470µs | 6µs    | 30µs   | 1.2%  | +0.0% |
| Zustand       | acquire/release cycle   | 5µs   | 15µs   | 15µs  | 25µs  | 30µs  | 6µs    | 25µs   | 40.8% | -3.4% |
| Zustand       | instance create/dispose | 5µs   | 15µs   | 15µs  | 25µs  | 30µs  | 6µs    | 25µs   | 40.2% | -2.8% |
| Redux Toolkit | acquire/release cycle   | 3.7ms | 4.4ms  | 4.4ms | 4.8ms | 5.2ms | 283µs  | 1.5ms  | 6.5%  | -0.7% |
| Redux Toolkit | instance create/dispose | 4.6ms | 4.9ms  | 4.9ms | 5.3ms | 5.4ms | 182µs  | 840µs  | 3.7%  | +0.3% |

## React Benchmark Details

### run

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 44.4ms  | 12.8ms     | 31.6ms   | 51.9ms  | 3.0ms      | 6.7%    |
| Blac (prop rows)          | 40.6ms  | 12.5ms     | 28.1ms   | 41.4ms  | 456µs      | 1.1%    |
| Zustand (sub rows)        | 46.4ms  | 15.8ms     | 30.6ms   | 53.7ms  | 3.4ms      | 7.4%    |
| Zustand (prop rows)       | 42.8ms  | 11.6ms     | 31.1ms   | 48.8ms  | 2.8ms      | 6.5%    |
| Redux Toolkit (sub rows)  | 46.3ms  | 15.3ms     | 30.9ms   | 50.7ms  | 2.2ms      | 4.6%    |
| Redux Toolkit (prop rows) | 38.1ms  | 11.0ms     | 27.1ms   | 42.4ms  | 1.7ms      | 4.3%    |

### runLots

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 601ms   | 139ms      | 461ms    | 673ms   | 53.0ms     | 8.8%    |
| Blac (prop rows)          | 545ms   | 130ms      | 415ms    | 613ms   | 39.5ms     | 7.2%    |
| Zustand (sub rows)        | 570ms   | 128ms      | 442ms    | 627ms   | 34.4ms     | 6.0%    |
| Zustand (prop rows)       | 559ms   | 127ms      | 433ms    | 661ms   | 48.1ms     | 8.5%    |
| Redux Toolkit (sub rows)  | 544ms   | 126ms      | 418ms    | 587ms   | 25.1ms     | 4.6%    |
| Redux Toolkit (prop rows) | 529ms   | 118ms      | 411ms    | 599ms   | 32.9ms     | 6.2%    |

### add

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 39.1ms  | 13.7ms     | 25.4ms   | 45.5ms  | 3.3ms      | 8.2%    |
| Blac (prop rows)          | 36.8ms  | 14.1ms     | 22.7ms   | 42.5ms  | 2.5ms      | 6.8%    |
| Zustand (sub rows)        | 36.9ms  | 12.6ms     | 24.2ms   | 42.5ms  | 2.7ms      | 7.1%    |
| Zustand (prop rows)       | 36.4ms  | 12.1ms     | 24.3ms   | 46.7ms  | 3.4ms      | 9.3%    |
| Redux Toolkit (sub rows)  | 36.4ms  | 12.7ms     | 23.7ms   | 39.1ms  | 997µs      | 2.7%    |
| Redux Toolkit (prop rows) | 36.9ms  | 12.9ms     | 24.0ms   | 38.9ms  | 2.1ms      | 5.9%    |

### update

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 3.7ms   | 0µs        | 3.7ms    | 7.8ms   | 2.3ms      | 57.8%   |
| Blac (prop rows)          | 4.9ms   | 0µs        | 4.9ms    | 7.8ms   | 1.4ms      | 28.9%   |
| Zustand (sub rows)        | 7.4ms   | 1.5ms      | 5.9ms    | 9.0ms   | 1.4ms      | 19.7%   |
| Zustand (prop rows)       | 5.8ms   | 1.5ms      | 4.3ms    | 9.5ms   | 1.5ms      | 22.3%   |
| Redux Toolkit (sub rows)  | 5.9ms   | 1.5ms      | 4.5ms    | 6.2ms   | 142µs      | 2.4%    |
| Redux Toolkit (prop rows) | 5.7ms   | 1.4ms      | 4.3ms    | 8.1ms   | 1.1ms      | 17.4%   |

### clear

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 6.0ms   | 80µs       | 5.9ms    | 8.0ms   | 771µs      | 12.4%   |
| Blac (prop rows)          | 6.8ms   | 93µs       | 6.7ms    | 8.3ms   | 894µs      | 12.9%   |
| Zustand (sub rows)        | 8.0ms   | 45µs       | 8.0ms    | 8.8ms   | 753µs      | 9.3%    |
| Zustand (prop rows)       | 9.2ms   | 67µs       | 9.2ms    | 10.0ms  | 1.0ms      | 11.4%   |
| Redux Toolkit (sub rows)  | 9.6ms   | 65µs       | 9.5ms    | 10.7ms  | 871µs      | 9.0%    |
| Redux Toolkit (prop rows) | 5.3ms   | 73µs       | 5.2ms    | 5.7ms   | 212µs      | 4.0%    |

### swapRows

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 23.3ms  | 1.8ms      | 21.5ms   | 25.8ms  | 1.2ms      | 5.0%    |
| Blac (prop rows)          | 23.2ms  | 2.0ms      | 21.1ms   | 25.5ms  | 1.1ms      | 4.9%    |
| Zustand (sub rows)        | 21.7ms  | 805µs      | 20.9ms   | 22.6ms  | 378µs      | 1.7%    |
| Zustand (prop rows)       | 22.1ms  | 865µs      | 21.2ms   | 23.9ms  | 883µs      | 4.0%    |
| Redux Toolkit (sub rows)  | 22.2ms  | 795µs      | 21.4ms   | 24.1ms  | 751µs      | 3.4%    |
| Redux Toolkit (prop rows) | 21.8ms  | 890µs      | 20.9ms   | 22.8ms  | 415µs      | 1.9%    |
