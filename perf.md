# React State Management Benchmarks

## Scorecard

| Library       | Wins    | Slow (>1.5x)    | Geometric Mean |
| ------------- | ------- | --------------- | -------------- |
| Blac          | 16 wins | 10 slow (>1.5x) | 1.77x          |
| Zustand       | 20 wins | 7 slow (>1.5x)  | 1.36x          |
| Redux Toolkit | 6 wins  | 23 slow (>1.5x) | 12.14x         |

## Blac Action Items

### Critical (>2x slower)

| Operation                 | Result                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| acquire/release cycle     | Blac is 123.3x slower than Zustand (1.9ms vs 15µs) — Gap: 1.8ms per operation |
| instance create/dispose   | Blac is 63.0x slower than Zustand (1.3ms vs 20µs) — Gap: 1.2ms per operation  |
| multi-store coordination  | Blac is 4.0x slower than Zustand (420µs vs 105µs) — Gap: 315µs per operation  |
| cross-store propagation   | Blac is 3.5x slower than Zustand (245µs vs 70µs) — Gap: 175µs per operation   |
| proxy track 1 field       | Blac is 3.4x slower than Zustand (135µs vs 40µs) — Gap: 95µs per operation    |
| batch rapid updates       | Blac is 2.3x slower than Zustand (80µs vs 35µs) — Gap: 45µs per operation     |
| derived state computation | Blac is 2.0x slower than Zustand (100µs vs 50µs) — Gap: 50µs per operation    |

### Needs Attention (>1.25x slower)

| Operation                  | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| getter track simple        | Blac is 1.83x slower than Zustand (55µs vs 30µs)         |
| getter track multiple      | Blac is 1.67x slower than Zustand (75µs vs 45µs)         |
| proxy change detection hit | Blac is 1.60x slower than Zustand (40µs vs 25µs)         |
| proxy track 20 fields      | Blac is 1.32x slower than Redux Toolkit (695µs vs 525µs) |
| proxy cache reuse          | Blac is 1.27x slower than Redux Toolkit (690µs vs 545µs) |

### Wins

| Operation                       | Result             |
| ------------------------------- | ------------------ |
| update every 10th               | Blac wins at 75µs  |
| clear                           | Blac wins at 75µs  |
| redundant emit                  | Blac wins at 15µs  |
| redundant patch                 | Blac wins at 30µs  |
| patch 1 of 20 fields            | Blac wins at 105µs |
| notify 100 subscribers          | Blac wins at 15µs  |
| selector notification skip      | Blac wins at 35µs  |
| subscriber with computed filter | Blac wins at 50µs  |
| getter track wide aggregate     | Blac wins at 1.1ms |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation         | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| create 1k         | 77µs        | fastest         | 75µs           | fastest            | 185µs                | 2.47x slower             |
| create 10k        | 680µs       | fastest         | 675µs          | fastest            | 1.8ms                | 2.65x slower             |
| update every 10th | 75µs        | fastest         | 75µs           | fastest            | 400µs                | 5.33x slower             |
| append 1k         | 145µs       | fastest         | 140µs          | fastest            | 820µs                | 5.86x slower             |
| clear             | 75µs        | fastest         | 75µs           | fastest            | 185µs                | 2.47x slower             |

### CRUD Operations — Detailed Stats

#### create 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 60µs  | 77µs   | 86µs  | 120µs | 135µs | 20µs   | 75µs   | 22.7% | +9.8% |
| Zustand       | 60µs  | 75µs   | 79µs  | 105µs | 115µs | 13µs   | 55µs   | 16.3% | +5.4% |
| Redux Toolkit | 170µs | 185µs  | 188µs | 210µs | 225µs | 12µs   | 55µs   | 6.4%  | +1.5% |

#### create 10k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 655µs | 680µs  | 684µs | 715µs | 720µs | 14µs   | 65µs   | 2.0% | +0.6% |
| Zustand       | 665µs | 675µs  | 679µs | 695µs | 695µs | 7µs    | 30µs   | 1.1% | +0.6% |
| Redux Toolkit | 1.7ms | 1.8ms  | 1.8ms | 1.9ms | 2.0ms | 57µs   | 270µs  | 3.2% | +0.8% |

#### update every 10th

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 65µs  | 75µs   | 77µs  | 90µs  | 90µs  | 6µs    | 25µs   | 7.5% | +2.0% |
| Zustand       | 65µs  | 75µs   | 78µs  | 90µs  | 95µs  | 6µs    | 30µs   | 8.1% | +3.3% |
| Redux Toolkit | 385µs | 400µs  | 406µs | 435µs | 455µs | 17µs   | 70µs   | 4.2% | +1.5% |

#### append 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 130µs | 145µs  | 148µs | 175µs | 185µs | 11µs   | 55µs   | 7.5% | +1.9% |
| Zustand       | 130µs | 140µs  | 146µs | 170µs | 180µs | 11µs   | 50µs   | 7.6% | +3.8% |
| Redux Toolkit | 770µs | 820µs  | 825µs | 865µs | 895µs | 23µs   | 125µs  | 2.8% | +0.6% |

#### clear

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 65µs  | 75µs   | 80µs  | 110µs | 115µs | 14µs   | 50µs   | 17.1% | +6.2% |
| Zustand       | 60µs  | 75µs   | 80µs  | 105µs | 115µs | 12µs   | 55µs   | 15.7% | +5.9% |
| Redux Toolkit | 170µs | 185µs  | 191µs | 220µs | 225µs | 12µs   | 55µs   | 6.3%  | +3.0% |

### State Update Patterns — Summary

| Operation            | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| -------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| redundant emit       | 15µs        | fastest         | 25µs           | 1.67x slower       | 1.1ms                | 74.00x slower            |
| redundant patch      | 30µs        | fastest         | 50µs           | 1.67x slower       | 1.0ms                | 34.33x slower            |
| patch 1 of 20 fields | 105µs       | fastest         | 2.1ms          | 19.52x slower      | 1.7ms                | 16.29x slower            |
| nested object update | 50µs        | 1.11x slower    | 45µs           | fastest            | 2.2ms                | 48.67x slower            |
| batch rapid updates  | 80µs        | 2.29x slower    | 35µs           | fastest            | 1.3ms                | 36.86x slower            |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 5µs   | 15µs   | 15µs  | 25µs  | 30µs  | 5µs    | 25µs   | 33.1% | -1.4%  |
| Zustand       | 10µs  | 25µs   | 23µs  | 30µs  | 40µs  | 5µs    | 30µs   | 21.3% | -10.0% |
| Redux Toolkit | 1.0ms | 1.1ms  | 1.1ms | 1.1ms | 1.2ms | 27µs   | 140µs  | 2.5%  | -0.4%  |

#### redundant patch

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 20µs  | 30µs   | 34µs  | 45µs  | 50µs  | 6µs    | 30µs   | 19.0% | +11.0% |
| Zustand       | 35µs  | 50µs   | 52µs  | 65µs  | 90µs  | 10µs   | 55µs   | 19.1% | +4.1%  |
| Redux Toolkit | 970µs | 1.0ms  | 1.0ms | 1.1ms | 1.2ms | 56µs   | 255µs  | 5.4%  | +1.2%  |

#### patch 1 of 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 105µs | 105µs  | 105µs | 105µs | 105µs | 0µs    | 0µs    | 0.0% | -0.0% |
| Zustand       | 2.0ms | 2.1ms  | 2.1ms | 2.1ms | 2.1ms | 12µs   | 55µs   | 0.6% | +0.2% |
| Redux Toolkit | 1.6ms | 1.7ms  | 1.7ms | 1.8ms | 1.9ms | 66µs   | 310µs  | 3.9% | -0.6% |

#### nested object update

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 50µs  | 50µs   | 50µs  | 50µs  | 50µs  | 0µs    | 0µs    | 0.0% | +0.0% |
| Zustand       | 35µs  | 45µs   | 44µs  | 50µs  | 55µs  | 3µs    | 20µs   | 7.0% | -2.9% |
| Redux Toolkit | 2.1ms | 2.2ms  | 2.2ms | 2.3ms | 2.4ms | 76µs   | 305µs  | 3.4% | +0.5% |

#### batch rapid updates

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 70µs  | 80µs   | 87µs  | 115µs | 120µs | 12µs   | 50µs   | 14.4% | +7.6% |
| Zustand       | 25µs  | 35µs   | 37µs  | 45µs  | 50µs  | 5µs    | 25µs   | 13.1% | +4.7% |
| Redux Toolkit | 1.2ms | 1.3ms  | 1.3ms | 1.4ms | 1.4ms | 36µs   | 180µs  | 2.8%  | -0.3% |

### Subscription & Notification — Summary

| Operation                       | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| notify 100 subscribers          | 15µs        | fastest         | 85µs           | 5.67x slower       | 260µs                | 17.33x slower            |
| selector notification skip      | 35µs        | fastest         | 60µs           | 1.71x slower       | 1.2ms                | 33.86x slower            |
| subscriber with computed filter | 50µs        | fastest         | 140µs          | 2.80x slower       | 1.6ms                | 32.70x slower            |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 5µs   | 15µs   | 17µs  | 30µs  | 30µs  | 6µs    | 25µs   | 36.6% | +11.7% |
| Zustand       | 70µs  | 85µs   | 85µs  | 95µs  | 100µs | 6µs    | 30µs   | 7.7%  | -0.5%  |
| Redux Toolkit | 230µs | 260µs  | 258µs | 280µs | 295µs | 13µs   | 65µs   | 5.2%  | -0.7%  |

#### selector notification skip

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 35µs  | 35µs   | 35µs  | 35µs  | 35µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 40µs  | 60µs   | 62µs  | 90µs  | 95µs  | 14µs   | 55µs   | 22.4% | +3.9% |
| Redux Toolkit | 1.1ms | 1.2ms  | 1.2ms | 1.3ms | 1.3ms | 33µs   | 190µs  | 2.8%  | +0.6% |

#### subscriber with computed filter

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 35µs  | 50µs   | 52µs  | 75µs  | 85µs  | 11µs   | 50µs   | 20.9% | +3.5% |
| Zustand       | 125µs | 140µs  | 148µs | 175µs | 180µs | 15µs   | 55µs   | 9.8%  | +5.1% |
| Redux Toolkit | 1.5ms | 1.6ms  | 1.6ms | 1.8ms | 1.8ms | 63µs   | 285µs  | 3.8%  | +0.4% |

### Derived & Cross-Store — Summary

| Operation                 | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| derived state computation | 100µs       | 2.00x slower    | 50µs           | fastest            | 1.4ms                | 27.10x slower            |
| cross-store propagation   | 245µs       | 3.50x slower    | 70µs           | fastest            | 2.5ms                | 36.21x slower            |
| multi-store coordination  | 420µs       | 4.00x slower    | 105µs          | fastest            | 3.8ms                | 36.52x slower            |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 90µs  | 100µs  | 105µs | 130µs | 140µs | 11µs   | 50µs   | 10.3% | +5.0% |
| Zustand       | 30µs  | 50µs   | 52µs  | 75µs  | 85µs  | 13µs   | 55µs   | 24.8% | +3.8% |
| Redux Toolkit | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.5ms | 32µs   | 125µs  | 2.4%  | +1.0% |

#### cross-store propagation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 230µs | 245µs  | 247µs | 260µs | 260µs | 6µs    | 30µs   | 2.2%  | +0.8% |
| Zustand       | 50µs  | 70µs   | 72µs  | 115µs | 120µs | 17µs   | 70µs   | 23.7% | +2.9% |
| Redux Toolkit | 2.4ms | 2.5ms  | 2.6ms | 2.8ms | 2.9ms | 128µs  | 540µs  | 5.0%  | +0.6% |

#### multi-store coordination

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 405µs | 420µs  | 420µs | 430µs | 435µs | 7µs    | 30µs   | 1.7%  | -0.0% |
| Zustand       | 95µs  | 105µs  | 109µs | 140µs | 145µs | 13µs   | 50µs   | 11.7% | +4.0% |
| Redux Toolkit | 3.6ms | 3.8ms  | 3.9ms | 4.1ms | 4.2ms | 135µs  | 580µs  | 3.5%  | +0.5% |

### Other — Summary

| Operation                          | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ---------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| proxy track 1 field                | 135µs       | 3.38x slower    | 40µs           | fastest            | 1.2ms                | 29.50x slower            |
| proxy track 20 fields              | 695µs       | 1.32x slower    | 725µs          | 1.38x slower       | 525µs                | fastest                  |
| proxy track deep nested (5 levels) | 0µs         | fastest         | 0µs            | fastest            | 5µs                  | fastest                  |
| proxy change detection miss        | 0µs         | fastest         | 0µs            | fastest            | 5µs                  | fastest                  |
| proxy change detection hit         | 40µs        | 1.60x slower    | 25µs           | fastest            | 1.2ms                | 48.20x slower            |
| proxy cache reuse                  | 690µs       | 1.27x slower    | 730µs          | 1.34x slower       | 545µs                | fastest                  |
| getter track simple                | 55µs        | 1.83x slower    | 30µs           | fastest            | 1.4ms                | 45.00x slower            |
| getter track multiple              | 75µs        | 1.67x slower    | 45µs           | fastest            | 1.5ms                | 34.00x slower            |
| getter track wide aggregate        | 1.1ms       | fastest         | 2.7ms          | 2.50x slower       | 2.5ms                | 2.32x slower             |
| getter change detection miss       | 0µs         | fastest         | 0µs            | fastest            | 15µs                 | fastest                  |
| acquire/release cycle              | 1.9ms       | 123.33x slower  | 15µs           | fastest            | 8.0ms                | 534.67x slower           |
| acquire shared instance            | 1.9ms       | fastest         | 0µs            | fastest            | 10µs                 | fastest                  |
| instance create/dispose            | 1.3ms       | 63.00x slower   | 20µs           | fastest            | 8.0ms                | 399.25x slower           |

### Other — Detailed Stats

#### proxy track 1 field

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 120µs | 135µs  | 138µs | 160µs | 175µs | 11µs   | 55µs   | 8.2%  | +2.3% |
| Zustand       | 30µs  | 40µs   | 41µs  | 50µs  | 55µs  | 4µs    | 25µs   | 10.5% | +2.1% |
| Redux Toolkit | 1.2ms | 1.2ms  | 1.2ms | 1.2ms | 1.2ms | 17µs   | 80µs   | 1.4%  | +0.3% |

#### proxy track 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 680µs | 695µs  | 705µs | 750µs | 755µs | 21µs   | 75µs   | 3.0% | +1.4% |
| Zustand       | 680µs | 725µs  | 732µs | 785µs | 815µs | 29µs   | 135µs  | 4.0% | +0.9% |
| Redux Toolkit | 510µs | 525µs  | 534µs | 580µs | 585µs | 22µs   | 75µs   | 4.0% | +1.8% |

#### proxy track deep nested (5 levels)

| Library       | Min | Median | Mean | P95  | Max  | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | ---- | ---- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 1µs  | 5µs  | 15µs | 2µs    | 15µs   | 200.4% | +100.0% |
| Zustand       | 0µs | 0µs    | 1µs  | 5µs  | 5µs  | 2µs    | 5µs    | 222.5% | +100.0% |
| Redux Toolkit | 0µs | 5µs    | 6µs  | 10µs | 20µs | 4µs    | 20µs   | 66.9%  | +18.5%  |

#### proxy change detection miss

| Library       | Min | Median | Mean | P95 | Max  | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | --- | ---- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 2µs  | 5µs | 20µs | 3µs    | 20µs   | 150.7% | +100.0% |
| Zustand       | 0µs | 0µs    | 1µs  | 5µs | 10µs | 2µs    | 10µs   | 157.9% | +100.0% |
| Redux Toolkit | 5µs | 5µs    | 5µs  | 5µs | 5µs  | 0µs    | 0µs    | 0.0%   | +0.0%   |

#### proxy change detection hit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 30µs  | 40µs   | 44µs  | 70µs  | 80µs  | 11µs   | 50µs   | 25.2% | +9.9% |
| Zustand       | 20µs  | 25µs   | 27µs  | 30µs  | 40µs  | 3µs    | 20µs   | 11.2% | +8.0% |
| Redux Toolkit | 1.2ms | 1.2ms  | 1.2ms | 1.3ms | 1.3ms | 35µs   | 160µs  | 2.9%  | +0.5% |

#### proxy cache reuse

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 680µs | 690µs  | 691µs | 705µs | 705µs | 6µs    | 25µs   | 0.9% | +0.2% |
| Zustand       | 685µs | 730µs  | 735µs | 780µs | 805µs | 26µs   | 120µs  | 3.6% | +0.7% |
| Redux Toolkit | 510µs | 545µs  | 548µs | 585µs | 600µs | 21µs   | 90µs   | 3.9% | +0.5% |

#### getter track simple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 40µs  | 55µs   | 57µs  | 90µs  | 90µs  | 13µs   | 50µs   | 21.9% | +3.9% |
| Zustand       | 30µs  | 30µs   | 30µs  | 30µs  | 30µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Redux Toolkit | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 23µs   | 105µs  | 1.7%  | +0.4% |

#### getter track multiple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 60µs  | 75µs   | 77µs  | 100µs | 110µs | 12µs   | 50µs   | 15.2% | +2.6% |
| Zustand       | 30µs  | 45µs   | 50µs  | 75µs  | 85µs  | 14µs   | 55µs   | 27.7% | +9.8% |
| Redux Toolkit | 1.5ms | 1.5ms  | 1.5ms | 1.6ms | 1.7ms | 51µs   | 235µs  | 3.3%  | +0.8% |

#### getter track wide aggregate

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 1.0ms | 1.1ms  | 1.1ms | 1.1ms | 1.2ms | 40µs   | 170µs  | 3.7% | -1.3% |
| Zustand       | 2.7ms | 2.7ms  | 2.8ms | 2.9ms | 2.9ms | 52µs   | 165µs  | 1.9% | +1.1% |
| Redux Toolkit | 2.5ms | 2.5ms  | 2.6ms | 2.7ms | 2.9ms | 83µs   | 410µs  | 3.2% | +0.5% |

#### getter change detection miss

| Library       | Min | Median | Mean | P95  | Max  | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | ---- | ---- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 1µs  | 5µs  | 10µs | 2µs    | 10µs   | 180.9% | +100.0% |
| Zustand       | 0µs | 0µs    | 2µs  | 5µs  | 10µs | 2µs    | 10µs   | 149.5% | +100.0% |
| Redux Toolkit | 5µs | 15µs   | 14µs | 20µs | 30µs | 4µs    | 25µs   | 26.3%  | -9.7%   |

#### acquire/release cycle

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 1.7ms | 1.9ms  | 1.9ms | 2.0ms | 2.2ms | 92µs   | 475µs  | 4.9%  | +0.8% |
| Zustand       | 5µs   | 15µs   | 14µs  | 20µs  | 25µs  | 3µs    | 20µs   | 21.2% | -7.7% |
| Redux Toolkit | 6.7ms | 8.0ms  | 8.0ms | 9.0ms | 9.8ms | 594µs  | 3.1ms  | 7.4%  | +0.0% |

#### acquire shared instance

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%    | Skew    |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ------ | ------- |
| Blac          | 1.7ms | 1.9ms  | 1.9ms | 2.0ms | 2.2ms | 88µs   | 460µs  | 4.7%   | -0.2%   |
| Zustand       | 0µs   | 0µs    | 1µs   | 5µs   | 5µs   | 2µs    | 5µs    | 226.6% | +100.0% |
| Redux Toolkit | 5µs   | 10µs   | 12µs  | 25µs  | 25µs  | 6µs    | 20µs   | 44.2%  | +20.0%  |

#### instance create/dispose

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 1.2ms | 1.3ms  | 1.3ms | 1.3ms | 1.4ms | 33µs   | 160µs  | 2.6%  | +0.7% |
| Zustand       | 15µs  | 20µs   | 21µs  | 30µs  | 35µs  | 4µs    | 20µs   | 21.0% | +4.7% |
| Redux Toolkit | 6.5ms | 8.0ms  | 7.9ms | 8.9ms | 9.8ms | 634µs  | 3.3ms  | 8.0%  | -0.8% |

## React Benchmark Details

### run

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 86.6ms  | 26.3ms     | 60.2ms   | 89.9ms  | 3.8ms      | 4.5%    |
| Zustand       | 81.4ms  | 22.4ms     | 59.1ms   | 83.3ms  | 2.4ms      | 3.0%    |
| Redux Toolkit | 77.2ms  | 22.2ms     | 55.0ms   | 86.6ms  | 4.7ms      | 6.0%    |

### runLots

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 1143ms  | 321ms      | 822ms    | 1159ms  | 15.0ms     | 1.3%    |
| Zustand       | 1380ms  | 229ms      | 1151ms   | 1593ms  | 165ms      | 12.1%   |
| Redux Toolkit | 1366ms  | 213ms      | 1153ms   | 1380ms  | 16.6ms     | 1.2%    |

### add

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 84.2ms  | 38.0ms     | 46.2ms   | 87.8ms  | 4.3ms      | 5.1%    |
| Zustand       | 72.5ms  | 22.0ms     | 50.5ms   | 80.2ms  | 4.3ms      | 5.9%    |
| Redux Toolkit | 78.0ms  | 28.2ms     | 49.8ms   | 78.7ms  | 465µs      | 0.6%    |

### update

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 1.3ms   | 0µs        | 1.3ms    | 2.4ms   | 580µs      | 37.0%   |
| Zustand       | 10.4ms  | 2.1ms      | 8.4ms    | 25.6ms  | 7.3ms      | 54.1%   |
| Redux Toolkit | 10.1ms  | 2.2ms      | 7.9ms    | 10.5ms  | 230µs      | 2.3%    |

### clear

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 15.4ms  | 70µs       | 15.3ms   | 15.4ms  | 163µs      | 1.1%    |
| Zustand       | 14.6ms  | 65µs       | 14.5ms   | 19.0ms  | 2.3ms      | 15.3%   |
| Redux Toolkit | 21.0ms  | 95µs       | 20.9ms   | 25.8ms  | 3.8ms      | 18.7%   |

### swapRows

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 56.1ms  | 2.6ms      | 53.5ms   | 57.7ms  | 1.4ms      | 2.5%    |
| Zustand       | 58.8ms  | 1.2ms      | 57.6ms   | 89.3ms  | 17.3ms     | 25.5%   |
| Redux Toolkit | 56.2ms  | 1.2ms      | 55.0ms   | 88.5ms  | 19.2ms     | 29.5%   |
