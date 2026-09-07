# React State Management Benchmarks

## Scorecard

| Library       | Wins    | Slow (>1.5x)    | Geometric Mean |
| ------------- | ------- | --------------- | -------------- |
| Blac          | 6 wins  | 5 slow (>1.5x)  | 1.39x          |
| Zustand       | 12 wins | 5 slow (>1.5x)  | 1.74x          |
| Redux Toolkit | 1 wins  | 17 slow (>1.5x) | 13.24x         |

## Blac Action Items

### Critical (>2x slower)

| Operation                 | Result                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| proxy track 1 field       | Blac is 3.0x slower than Zustand (45µs vs 15µs) — Gap: 30µs per operation  |
| derived state computation | Blac is 2.7x slower than Zustand (40µs vs 15µs) — Gap: 25µs per operation  |
| multi-store coordination  | Blac is 2.1x slower than Zustand (135µs vs 65µs) — Gap: 70µs per operation |

### Needs Attention (>1.25x slower)

| Operation                 | Result                                                   |
| ------------------------- | -------------------------------------------------------- |
| redundant patch           | Blac is 2.00x slower than Zustand (40µs vs 20µs)         |
| getter track simple       | Blac is 1.67x slower than Zustand (25µs vs 15µs)         |
| redundant emit            | Blac is 1.50x slower than Zustand (15µs vs 10µs)         |
| update every 10th         | Blac is 1.45x slower than Zustand (80µs vs 55µs)         |
| read 20 fields (baseline) | Blac is 1.37x slower than Redux Toolkit (460µs vs 335µs) |
| create 1k                 | Blac is 1.36x slower than Zustand (75µs vs 55µs)         |

### Wins

| Operation                               | Result             |
| --------------------------------------- | ------------------ |
| patch 1 of 20 fields                    | Blac wins at 65µs  |
| same-tick burst 1000 (tracked consumer) | Blac wins at 190µs |
| notify 100 subscribers                  | Blac wins at 5µs   |
| subscriber with computed filter         | Blac wins at 25µs  |
| getter track wide aggregate             | Blac wins at 530µs |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation         | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| create 1k         | 75µs        | 1.36x slower    | 55µs           | fastest            | 130µs                | 2.36x slower             |
| update every 10th | 80µs        | 1.45x slower    | 55µs           | fastest            | 255µs                | 4.64x slower             |
| append 1k         | 110µs       | fastest         | 105µs          | fastest            | 495µs                | 4.71x slower             |
| clear             | 65µs        | 1.18x slower    | 55µs           | fastest            | 125µs                | 2.27x slower             |

### CRUD Operations — Detailed Stats

#### create 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 45µs  | 75µs   | 76µs  | 115µs | 130µs | 20µs   | 85µs   | 27.0% | +0.9% |
| Zustand       | 45µs  | 55µs   | 53µs  | 60µs  | 70µs  | 4µs    | 25µs   | 6.9%  | -3.7% |
| Redux Toolkit | 110µs | 130µs  | 131µs | 155µs | 165µs | 12µs   | 55µs   | 8.9%  | +1.1% |

#### update every 10th

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 45µs  | 80µs   | 81µs  | 120µs | 150µs | 21µs   | 105µs  | 25.5% | +1.1% |
| Zustand       | 45µs  | 55µs   | 53µs  | 60µs  | 65µs  | 3µs    | 20µs   | 6.1%  | -4.0% |
| Redux Toolkit | 240µs | 255µs  | 254µs | 265µs | 270µs | 6µs    | 30µs   | 2.5%  | -0.5% |

#### append 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 95µs  | 110µs  | 113µs | 140µs | 150µs | 13µs   | 55µs   | 11.6% | +2.5% |
| Zustand       | 105µs | 105µs  | 105µs | 105µs | 105µs | 0µs    | 0µs    | 0.0%  | +0.0% |
| Redux Toolkit | 480µs | 495µs  | 493µs | 505µs | 510µs | 6µs    | 30µs   | 1.2%  | -0.4% |

#### clear

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 45µs  | 65µs   | 67µs  | 100µs | 100µs | 14µs   | 55µs   | 20.5% | +2.6% |
| Zustand       | 45µs  | 55µs   | 53µs  | 60µs  | 70µs  | 4µs    | 25µs   | 7.5%  | -3.4% |
| Redux Toolkit | 115µs | 125µs  | 128µs | 145µs | 145µs | 7µs    | 30µs   | 5.5%  | +2.7% |

### State Update Patterns — Summary

| Operation                               | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| --------------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| redundant emit                          | 15µs        | 1.50x slower    | 10µs           | fastest            | 645µs                | 64.50x slower            |
| redundant patch                         | 40µs        | 2.00x slower    | 20µs           | fastest            | 610µs                | 30.50x slower            |
| patch 1 of 20 fields                    | 65µs        | fastest         | 1.4ms          | 20.77x slower      | 880µs                | 13.54x slower            |
| nested object update                    | 45µs        | 1.12x slower    | 40µs           | fastest            | 1.2ms                | 30.37x slower            |
| batch rapid updates                     | 40µs        | 1.14x slower    | 35µs           | fastest            | 720µs                | 20.57x slower            |
| same-tick burst 1000 (tracked consumer) | 190µs       | fastest         | 1.4ms          | 7.16x slower       | 920µs                | 4.84x slower             |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 5µs   | 15µs   | 14µs  | 20µs  | 30µs  | 5µs    | 25µs   | 34.1% | -5.9% |
| Zustand       | 0µs   | 10µs   | 10µs  | 15µs  | 25µs  | 4µs    | 25µs   | 40.1% | +3.3% |
| Redux Toolkit | 610µs | 645µs  | 644µs | 670µs | 680µs | 15µs   | 70µs   | 2.3%  | -0.2% |

#### redundant patch

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 30µs  | 40µs   | 43µs  | 60µs  | 60µs  | 8µs    | 30µs   | 17.6% | +6.3% |
| Zustand       | 15µs  | 20µs   | 22µs  | 25µs  | 35µs  | 3µs    | 20µs   | 14.0% | +9.3% |
| Redux Toolkit | 575µs | 610µs  | 608µs | 630µs | 645µs | 14µs   | 70µs   | 2.3%  | -0.4% |

#### patch 1 of 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 50µs  | 65µs   | 67µs  | 90µs  | 100µs | 13µs   | 50µs   | 18.7% | +3.7% |
| Zustand       | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 15µs   | 70µs   | 1.1%  | +0.2% |
| Redux Toolkit | 845µs | 880µs  | 880µs | 900µs | 915µs | 13µs   | 70µs   | 1.5%  | -0.0% |

#### nested object update

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 30µs  | 45µs   | 45µs  | 60µs  | 60µs  | 7µs    | 30µs   | 16.3% | -0.6% |
| Zustand       | 30µs  | 40µs   | 44µs  | 60µs  | 60µs  | 8µs    | 30µs   | 19.0% | +8.2% |
| Redux Toolkit | 1.1ms | 1.2ms  | 1.2ms | 1.3ms | 1.3ms | 27µs   | 140µs  | 2.2%  | +0.1% |

#### batch rapid updates

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 40µs  | 40µs   | 40µs  | 40µs  | 40µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 20µs  | 35µs   | 36µs  | 50µs  | 50µs  | 7µs    | 30µs   | 19.2% | +3.2% |
| Redux Toolkit | 705µs | 720µs  | 719µs | 730µs | 735µs | 7µs    | 30µs   | 1.0%  | -0.2% |

#### same-tick burst 1000 (tracked consumer)

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 175µs | 190µs  | 190µs | 195µs | 205µs | 4µs    | 30µs   | 2.2% | -0.2% |
| Zustand       | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 7µs    | 30µs   | 0.5% | +0.1% |
| Redux Toolkit | 890µs | 920µs  | 921µs | 950µs | 955µs | 12µs   | 65µs   | 1.4% | +0.1% |

### Subscription & Notification — Summary

| Operation                       | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| notify 100 subscribers          | 5µs         | fastest         | 45µs           | 9.00x slower       | 150µs                | 30.00x slower            |
| subscriber with computed filter | 25µs        | fastest         | 85µs           | 3.40x slower       | 975µs                | 39.00x slower            |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 0µs   | 5µs    | 9µs   | 20µs  | 20µs  | 5µs    | 20µs   | 58.0% | +42.3% |
| Zustand       | 40µs  | 45µs   | 47µs  | 50µs  | 65µs  | 3µs    | 25µs   | 6.8%  | +5.1%  |
| Redux Toolkit | 140µs | 150µs  | 149µs | 155µs | 165µs | 4µs    | 25µs   | 2.7%  | -0.4%  |

#### subscriber with computed filter

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 25µs  | 25µs   | 25µs  | 25µs  | 25µs  | 0µs    | 0µs    | 0.0% | -0.0% |
| Zustand       | 85µs  | 85µs   | 85µs  | 85µs  | 85µs  | 0µs    | 0µs    | 0.0% | -0.0% |
| Redux Toolkit | 950µs | 975µs  | 976µs | 995µs | 1.0ms | 11µs   | 60µs   | 1.1% | +0.1% |

### Derived & Cross-Store — Summary

| Operation                 | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| derived state computation | 40µs        | 2.67x slower    | 15µs           | fastest            | 825µs                | 55.00x slower            |
| multi-store coordination  | 135µs       | 2.08x slower    | 65µs           | fastest            | 2.2ms                | 34.08x slower            |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 40µs  | 40µs   | 40µs  | 40µs  | 40µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 10µs  | 15µs   | 17µs  | 20µs  | 30µs  | 3µs    | 20µs   | 18.1% | +9.5% |
| Redux Toolkit | 805µs | 825µs  | 829µs | 850µs | 865µs | 11µs   | 60µs   | 1.4%  | +0.5% |

#### multi-store coordination

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 125µs | 135µs  | 137µs | 140µs | 150µs | 4µs    | 25µs   | 2.7% | +1.3% |
| Zustand       | 55µs  | 65µs   | 63µs  | 70µs  | 80µs  | 3µs    | 25µs   | 5.2% | -2.7% |
| Redux Toolkit | 2.2ms | 2.2ms  | 2.2ms | 2.3ms | 2.3ms | 30µs   | 150µs  | 1.3% | +0.3% |

### Other — Summary

| Operation                   | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| --------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| proxy track 1 field         | 45µs        | 3.00x slower    | 15µs           | fastest            | 705µs                | 47.00x slower            |
| read 20 fields (baseline)   | 460µs       | 1.37x slower    | 455µs          | 1.36x slower       | 335µs                | fastest                  |
| getter track simple         | 25µs        | 1.67x slower    | 15µs           | fastest            | 825µs                | 55.00x slower            |
| getter track wide aggregate | 530µs       | fastest         | 1.8ms          | 3.42x slower       | 1.5ms                | 2.90x slower             |

### Other — Detailed Stats

#### proxy track 1 field

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 45µs  | 45µs   | 45µs  | 45µs  | 45µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 10µs  | 15µs   | 17µs  | 20µs  | 30µs  | 3µs    | 20µs   | 17.8% | +9.6% |
| Redux Toolkit | 670µs | 705µs  | 704µs | 725µs | 740µs | 12µs   | 70µs   | 1.7%  | -0.1% |

#### read 20 fields (baseline)

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 445µs | 460µs  | 459µs | 465µs | 475µs | 5µs    | 30µs   | 1.1% | -0.2% |
| Zustand       | 440µs | 455µs  | 457µs | 465µs | 470µs | 6µs    | 30µs   | 1.3% | +0.4% |
| Redux Toolkit | 320µs | 335µs  | 335µs | 345µs | 350µs | 6µs    | 30µs   | 1.9% | -0.0% |

#### getter track simple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 15µs  | 25µs   | 23µs  | 25µs  | 35µs  | 3µs    | 20µs   | 13.3% | -9.3% |
| Zustand       | 10µs  | 15µs   | 16µs  | 20µs  | 30µs  | 3µs    | 20µs   | 18.8% | +8.9% |
| Redux Toolkit | 790µs | 825µs  | 824µs | 845µs | 860µs | 12µs   | 70µs   | 1.4%  | -0.2% |

#### getter track wide aggregate

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 515µs | 530µs  | 528µs | 540µs | 545µs | 6µs    | 30µs   | 1.2% | -0.3% |
| Zustand       | 1.8ms | 1.8ms  | 1.8ms | 1.8ms | 1.9ms | 21µs   | 110µs  | 1.1% | -0.1% |
| Redux Toolkit | 1.5ms | 1.5ms  | 1.5ms | 1.6ms | 1.6ms | 21µs   | 110µs  | 1.4% | +0.0% |

## Registry Lifecycle (per-library, not comparable)

Zustand and Redux have no acquire/release/dispose concept — their versions of
these ops allocate a store and tear down nothing, so ratios here would measure
feature presence, not speed. Tracked per library against its own history.

| Library       | Operation               | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----------------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | acquire/release cycle   | 2.3ms | 2.5ms  | 2.5ms | 2.6ms | 2.7ms | 70µs   | 395µs  | 2.8%  | +0.4%  |
| Blac          | instance create/dispose | 680µs | 695µs  | 694µs | 710µs | 710µs | 7µs    | 30µs   | 1.1%  | -0.2%  |
| Zustand       | acquire/release cycle   | 15µs  | 20µs   | 23µs  | 30µs  | 35µs  | 5µs    | 20µs   | 20.3% | +12.9% |
| Zustand       | instance create/dispose | 20µs  | 20µs   | 20µs  | 20µs  | 20µs  | 0µs    | 0µs    | 0.0%  | -0.0%  |
| Redux Toolkit | acquire/release cycle   | 4.0ms | 4.5ms  | 4.5ms | 4.9ms | 5.1ms | 220µs  | 1.1ms  | 4.9%  | -0.1%  |
| Redux Toolkit | instance create/dispose | 4.1ms | 4.5ms  | 4.5ms | 4.8ms | 5.0ms | 184µs  | 945µs  | 4.1%  | -0.0%  |

## React Benchmark Details

### run

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 52.5ms  | 19.2ms     | 33.3ms   | 60.6ms  | 4.2ms      | 8.0%    |
| Blac (prop rows)          | 38.1ms  | 12.2ms     | 25.8ms   | 42.7ms  | 1.7ms      | 4.3%    |
| Zustand (sub rows)        | 48.9ms  | 16.0ms     | 33.0ms   | 58.5ms  | 3.9ms      | 7.9%    |
| Zustand (prop rows)       | 44.7ms  | 15.3ms     | 29.3ms   | 48.8ms  | 2.2ms      | 5.0%    |
| Redux Toolkit (sub rows)  | 38.7ms  | 11.6ms     | 27.0ms   | 44.1ms  | 2.3ms      | 5.8%    |
| Redux Toolkit (prop rows) | 36.2ms  | 11.0ms     | 25.2ms   | 40.9ms  | 1.7ms      | 4.7%    |

### runLots

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 640ms   | 165ms      | 475ms    | 724ms   | 56.4ms     | 8.9%    |
| Blac (prop rows)          | 540ms   | 129ms      | 411ms    | 659ms   | 54.8ms     | 9.9%    |
| Zustand (sub rows)        | 546ms   | 131ms      | 415ms    | 625ms   | 40.0ms     | 7.2%    |
| Zustand (prop rows)       | 550ms   | 127ms      | 423ms    | 631ms   | 43.3ms     | 7.7%    |
| Redux Toolkit (sub rows)  | 513ms   | 126ms      | 387ms    | 556ms   | 21.3ms     | 4.1%    |
| Redux Toolkit (prop rows) | 518ms   | 116ms      | 402ms    | 568ms   | 29.6ms     | 5.7%    |

### add

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 46.1ms  | 19.5ms     | 26.6ms   | 47.3ms  | 872µs      | 1.9%    |
| Blac (prop rows)          | 37.0ms  | 14.2ms     | 22.8ms   | 42.1ms  | 2.2ms      | 5.8%    |
| Zustand (sub rows)        | 34.7ms  | 12.4ms     | 22.3ms   | 35.9ms  | 558µs      | 1.6%    |
| Zustand (prop rows)       | 37.3ms  | 12.7ms     | 24.6ms   | 45.8ms  | 4.0ms      | 10.6%   |
| Redux Toolkit (sub rows)  | 37.5ms  | 12.3ms     | 25.1ms   | 43.3ms  | 3.1ms      | 8.3%    |
| Redux Toolkit (prop rows) | 35.4ms  | 11.5ms     | 23.8ms   | 40.7ms  | 2.8ms      | 7.6%    |

### update

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 4.8ms   | 0µs        | 4.8ms    | 17.7ms  | 6.2ms      | 94.6%   |
| Blac (prop rows)          | 6.1ms   | 0µs        | 6.1ms    | 8.3ms   | 2.1ms      | 39.6%   |
| Zustand (sub rows)        | 5.5ms   | 1.4ms      | 4.1ms    | 8.3ms   | 1.2ms      | 18.9%   |
| Zustand (prop rows)       | 5.2ms   | 1.4ms      | 3.9ms    | 7.3ms   | 899µs      | 16.1%   |
| Redux Toolkit (sub rows)  | 5.4ms   | 1.4ms      | 4.0ms    | 5.6ms   | 117µs      | 2.2%    |
| Redux Toolkit (prop rows) | 5.6ms   | 1.5ms      | 4.1ms    | 5.9ms   | 197µs      | 3.5%    |

### clear

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 6.5ms   | 115µs      | 6.4ms    | 7.5ms   | 473µs      | 7.1%    |
| Blac (prop rows)          | 6.3ms   | 70µs       | 6.2ms    | 6.8ms   | 243µs      | 3.9%    |
| Zustand (sub rows)        | 8.1ms   | 40µs       | 8.1ms    | 9.0ms   | 413µs      | 5.0%    |
| Zustand (prop rows)       | 5.5ms   | 53µs       | 5.4ms    | 6.6ms   | 473µs      | 8.5%    |
| Redux Toolkit (sub rows)  | 7.6ms   | 60µs       | 7.6ms    | 8.3ms   | 367µs      | 4.8%    |
| Redux Toolkit (prop rows) | 6.6ms   | 108µs      | 6.5ms    | 7.2ms   | 425µs      | 6.5%    |

### swapRows

| Library                   | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac (sub rows)           | 22.5ms  | 1.8ms      | 20.7ms   | 24.6ms  | 919µs      | 4.1%    |
| Blac (prop rows)          | 22.0ms  | 1.9ms      | 20.1ms   | 24.0ms  | 1.1ms      | 5.2%    |
| Zustand (sub rows)        | 20.2ms  | 710µs      | 19.5ms   | 21.8ms  | 929µs      | 4.6%    |
| Zustand (prop rows)       | 21.5ms  | 760µs      | 20.8ms   | 22.3ms  | 722µs      | 3.4%    |
| Redux Toolkit (sub rows)  | 22.2ms  | 745µs      | 21.4ms   | 24.0ms  | 1.3ms      | 5.7%    |
| Redux Toolkit (prop rows) | 22.0ms  | 902µs      | 21.1ms   | 22.8ms  | 460µs      | 2.1%    |
