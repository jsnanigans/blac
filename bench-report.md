# React State Management Benchmarks

## Scorecard

| Library       | Wins    | Slow (>1.5x)    | Geometric Mean |
| ------------- | ------- | --------------- | -------------- |
| Blac          | 15 wins | 6 slow (>1.5x)  | 1.62x          |
| Zustand       | 20 wins | 6 slow (>1.5x)  | 1.39x          |
| Redux Toolkit | 6 wins  | 23 slow (>1.5x) | 12.33x         |

## Blac Action Items

### Critical (>2x slower)

| Operation                 | Result                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| acquire/release cycle     | Blac is 179.7x slower than Zustand (2.7ms vs 15µs) — Gap: 2.7ms per operation |
| instance create/dispose   | Blac is 55.7x slower than Zustand (835µs vs 15µs) — Gap: 820µs per operation  |
| derived state computation | Blac is 2.7x slower than Zustand (40µs vs 15µs) — Gap: 25µs per operation     |
| batch rapid updates       | Blac is 2.0x slower than Zustand (40µs vs 20µs) — Gap: 20µs per operation     |

### Needs Attention (>1.25x slower)

| Operation                  | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| multi-store coordination   | Blac is 1.63x slower than Zustand (130µs vs 80µs)        |
| cross-store propagation    | Blac is 1.60x slower than Zustand (80µs vs 50µs)         |
| proxy track 1 field        | Blac is 1.50x slower than Zustand (45µs vs 30µs)         |
| redundant patch            | Blac is 1.50x slower than Zustand (30µs vs 20µs)         |
| selector notification skip | Blac is 1.40x slower than Zustand (35µs vs 25µs)         |
| proxy cache reuse          | Blac is 1.35x slower than Redux Toolkit (460µs vs 340µs) |
| proxy track 20 fields      | Blac is 1.34x slower than Redux Toolkit (455µs vs 340µs) |

### Wins

| Operation                       | Result             |
| ------------------------------- | ------------------ |
| update every 10th               | Blac wins at 55µs  |
| append 1k                       | Blac wins at 105µs |
| redundant emit                  | Blac wins at 10µs  |
| patch 1 of 20 fields            | Blac wins at 50µs  |
| notify 100 subscribers          | Blac wins at 5µs   |
| subscriber with computed filter | Blac wins at 25µs  |
| proxy change detection hit      | Blac wins at 20µs  |
| getter track simple             | Blac wins at 20µs  |
| getter track multiple           | Blac wins at 25µs  |
| getter track wide aggregate     | Blac wins at 530µs |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation         | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ----------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| create 1k         | 55µs        | 1.10x slower    | 50µs           | fastest            | 130µs                | 2.60x slower             |
| create 10k        | 520µs       | fastest         | 515µs          | fastest            | 1.2ms                | 2.42x slower             |
| update every 10th | 55µs        | fastest         | 55µs           | fastest            | 260µs                | 4.73x slower             |
| append 1k         | 105µs       | fastest         | 105µs          | fastest            | 500µs                | 4.76x slower             |
| clear             | 55µs        | 1.10x slower    | 50µs           | fastest            | 130µs                | 2.60x slower             |

### CRUD Operations — Detailed Stats

#### create 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 45µs  | 55µs   | 56µs  | 65µs  | 70µs  | 5µs    | 25µs   | 8.4% | +1.6% |
| Zustand       | 45µs  | 50µs   | 52µs  | 55µs  | 65µs  | 3µs    | 20µs   | 6.0% | +4.1% |
| Redux Toolkit | 120µs | 130µs  | 129µs | 135µs | 145µs | 4µs    | 25µs   | 3.5% | -1.1% |

#### create 10k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 505µs | 520µs  | 520µs | 530µs | 535µs | 7µs    | 30µs   | 1.3% | +0.0% |
| Zustand       | 500µs | 515µs  | 516µs | 525µs | 530µs | 6µs    | 30µs   | 1.2% | +0.2% |
| Redux Toolkit | 1.2ms | 1.2ms  | 1.2ms | 1.3ms | 1.3ms | 13µs   | 70µs   | 1.1% | +0.1% |

#### update every 10th

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 55µs  | 55µs   | 55µs  | 55µs  | 55µs  | 0µs    | 0µs    | 0.0% | +0.0% |
| Zustand       | 45µs  | 55µs   | 53µs  | 60µs  | 70µs  | 3µs    | 25µs   | 6.3% | -4.5% |
| Redux Toolkit | 245µs | 260µs  | 259µs | 270µs | 275µs | 5µs    | 30µs   | 2.0% | -0.3% |

#### append 1k

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 100µs | 105µs  | 107µs | 110µs | 120µs | 3µs    | 20µs   | 3.2% | +1.9% |
| Zustand       | 105µs | 105µs  | 105µs | 105µs | 105µs | 0µs    | 0µs    | 0.0% | -0.0% |
| Redux Toolkit | 485µs | 500µs  | 500µs | 510µs | 515µs | 6µs    | 30µs   | 1.2% | +0.1% |

#### clear

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 45µs  | 55µs   | 53µs  | 55µs  | 65µs  | 3µs    | 20µs   | 5.8% | -4.5% |
| Zustand       | 45µs  | 50µs   | 52µs  | 55µs  | 65µs  | 3µs    | 20µs   | 6.0% | +4.2% |
| Redux Toolkit | 120µs | 130µs  | 129µs | 135µs | 145µs | 4µs    | 25µs   | 3.0% | -0.6% |

### State Update Patterns — Summary

| Operation            | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| -------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| redundant emit       | 10µs        | fastest         | 10µs           | fastest            | 710µs                | 71.00x slower            |
| redundant patch      | 30µs        | 1.50x slower    | 20µs           | fastest            | 665µs                | 33.25x slower            |
| patch 1 of 20 fields | 50µs        | fastest         | 1.4ms          | 27.20x slower      | 945µs                | 18.90x slower            |
| nested object update | 30µs        | 1.20x slower    | 25µs           | fastest            | 1.2ms                | 49.80x slower            |
| batch rapid updates  | 40µs        | 2.00x slower    | 20µs           | fastest            | 765µs                | 38.25x slower            |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 0µs   | 10µs   | 8µs   | 20µs  | 25µs  | 4µs    | 25µs   | 52.7% | -18.8% |
| Zustand       | 0µs   | 10µs   | 11µs  | 20µs  | 20µs  | 5µs    | 20µs   | 39.9% | +12.2% |
| Redux Toolkit | 685µs | 710µs  | 710µs | 730µs | 745µs | 11µs   | 60µs   | 1.5%  | +0.0%  |

#### redundant patch

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%    | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ------ | ------ |
| Blac          | 25µs  | 30µs   | 38µs  | 70µs  | 1.5ms | 64µs   | 1.4ms  | 168.7% | +21.2% |
| Zustand       | 15µs  | 20µs   | 22µs  | 25µs  | 35µs  | 3µs    | 20µs   | 13.5%  | +9.0%  |
| Redux Toolkit | 655µs | 665µs  | 667µs | 680µs | 685µs | 7µs    | 30µs   | 1.0%   | +0.3%  |

#### patch 1 of 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 45µs  | 50µs   | 52µs  | 55µs  | 65µs  | 3µs    | 20µs   | 5.8% | +4.2% |
| Zustand       | 1.3ms | 1.4ms  | 1.4ms | 1.4ms | 1.4ms | 18µs   | 85µs   | 1.3% | +0.1% |
| Redux Toolkit | 930µs | 945µs  | 943µs | 955µs | 960µs | 7µs    | 30µs   | 0.8% | -0.2% |

#### nested object update

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%    | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ------ | ------ |
| Blac          | 25µs  | 30µs   | 38µs  | 75µs  | 930µs | 56µs   | 905µs  | 146.7% | +21.9% |
| Zustand       | 25µs  | 25µs   | 25µs  | 25µs  | 25µs  | 0µs    | 0µs    | 0.0%   | -0.0%  |
| Redux Toolkit | 1.2ms | 1.2ms  | 1.2ms | 1.3ms | 1.3ms | 12µs   | 65µs   | 0.9%   | +0.2%  |

#### batch rapid updates

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 40µs  | 40µs   | 40µs  | 40µs  | 40µs  | 0µs    | 0µs    | 0.0% | -0.0% |
| Zustand       | 20µs  | 20µs   | 20µs  | 20µs  | 20µs  | 0µs    | 0µs    | 0.0% | +0.0% |
| Redux Toolkit | 735µs | 765µs  | 764µs | 785µs | 800µs | 11µs   | 65µs   | 1.4% | -0.1% |

### Subscription & Notification — Summary

| Operation                       | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| notify 100 subscribers          | 5µs         | fastest         | 45µs           | 9.00x slower       | 155µs                | 31.00x slower            |
| selector notification skip      | 35µs        | 1.40x slower    | 25µs           | fastest            | 755µs                | 30.20x slower            |
| subscriber with computed filter | 25µs        | fastest         | 95µs           | 3.80x slower       | 1.0ms                | 41.40x slower            |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 5µs   | 5µs    | 5µs   | 5µs   | 5µs   | 0µs    | 0µs    | 0.0% | +0.0% |
| Zustand       | 40µs  | 45µs   | 47µs  | 50µs  | 60µs  | 3µs    | 20µs   | 7.0% | +3.8% |
| Redux Toolkit | 140µs | 155µs  | 154µs | 170µs | 170µs | 6µs    | 30µs   | 3.9% | -0.5% |

#### selector notification skip

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 35µs  | 35µs   | 35µs  | 35µs  | 35µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 20µs  | 25µs   | 27µs  | 30µs  | 40µs  | 3µs    | 20µs   | 11.3% | +7.1% |
| Redux Toolkit | 730µs | 755µs  | 757µs | 780µs | 795µs | 11µs   | 65µs   | 1.5%  | +0.3% |

#### subscriber with computed filter

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 25µs  | 25µs   | 25µs  | 25µs  | 25µs  | 0µs    | 0µs    | 0.0%  | -0.0% |
| Zustand       | 75µs  | 95µs   | 100µs | 130µs | 135µs | 15µs   | 60µs   | 15.0% | +5.1% |
| Redux Toolkit | 1.0ms | 1.0ms  | 1.0ms | 1.0ms | 1.1ms | 8µs    | 30µs   | 0.8%  | -0.1% |

### Derived & Cross-Store — Summary

| Operation                 | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| derived state computation | 40µs        | 2.67x slower    | 15µs           | fastest            | 875µs                | 58.33x slower            |
| cross-store propagation   | 80µs        | 1.60x slower    | 50µs           | fastest            | 1.6ms                | 31.60x slower            |
| multi-store coordination  | 130µs       | 1.63x slower    | 80µs           | fastest            | 2.4ms                | 30.31x slower            |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 40µs  | 40µs   | 40µs  | 40µs  | 40µs  | 0µs    | 0µs    | 0.0%  | -0.0%  |
| Zustand       | 10µs  | 15µs   | 19µs  | 35µs  | 35µs  | 6µs    | 25µs   | 32.5% | +20.7% |
| Redux Toolkit | 850µs | 875µs  | 877µs | 900µs | 915µs | 11µs   | 65µs   | 1.3%  | +0.3%  |

#### cross-store propagation

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 80µs  | 80µs   | 80µs  | 80µs  | 80µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 35µs  | 50µs   | 50µs  | 65µs  | 65µs  | 8µs    | 30µs   | 15.5% | +0.6% |
| Redux Toolkit | 1.5ms | 1.6ms  | 1.6ms | 1.6ms | 1.6ms | 21µs   | 105µs  | 1.3%  | +0.2% |

#### multi-store coordination

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 125µs | 130µs  | 132µs | 140µs | 145µs | 4µs    | 20µs   | 2.7%  | +1.8% |
| Zustand       | 60µs  | 80µs   | 81µs  | 105µs | 115µs | 13µs   | 55µs   | 16.4% | +0.7% |
| Redux Toolkit | 2.4ms | 2.4ms  | 2.4ms | 2.5ms | 2.5ms | 35µs   | 160µs  | 1.4%  | +0.5% |

### Other — Summary

| Operation                          | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
| ---------------------------------- | ----------- | --------------- | -------------- | ------------------ | -------------------- | ------------------------ |
| proxy track 1 field                | 45µs        | 1.50x slower    | 30µs           | fastest            | 770µs                | 25.67x slower            |
| proxy track 20 fields              | 455µs       | 1.34x slower    | 455µs          | 1.34x slower       | 340µs                | fastest                  |
| proxy track deep nested (5 levels) | 0µs         | fastest         | 0µs            | fastest            | 5µs                  | fastest                  |
| proxy change detection miss        | 0µs         | fastest         | 0µs            | fastest            | 5µs                  | fastest                  |
| proxy change detection hit         | 20µs        | fastest         | 30µs           | 1.50x slower       | 765µs                | 38.25x slower            |
| proxy cache reuse                  | 460µs       | 1.35x slower    | 455µs          | 1.34x slower       | 340µs                | fastest                  |
| getter track simple                | 20µs        | fastest         | 30µs           | 1.50x slower       | 890µs                | 44.50x slower            |
| getter track multiple              | 25µs        | fastest         | 30µs           | 1.20x slower       | 1.0ms                | 40.00x slower            |
| getter track wide aggregate        | 530µs       | fastest         | 1.8ms          | 3.40x slower       | 1.7ms                | 3.21x slower             |
| getter change detection miss       | 0µs         | fastest         | 0µs            | fastest            | 15µs                 | fastest                  |
| acquire/release cycle              | 2.7ms       | 179.67x slower  | 15µs           | fastest            | 5.0ms                | 332.67x slower           |
| acquire shared instance            | 2.6ms       | fastest         | 0µs            | fastest            | 15µs                 | fastest                  |
| instance create/dispose            | 835µs       | 55.67x slower   | 15µs           | fastest            | 5.2ms                | 346.00x slower           |

### Other — Detailed Stats

#### proxy track 1 field

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew   |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ------ |
| Blac          | 40µs  | 45µs   | 50µs  | 60µs  | 1.3ms | 46µs   | 1.3ms  | 90.9% | +10.7% |
| Zustand       | 20µs  | 30µs   | 31µs  | 45µs  | 45µs  | 6µs    | 25µs   | 20.0% | +3.9%  |
| Redux Toolkit | 735µs | 770µs  | 770µs | 795µs | 805µs | 12µs   | 70µs   | 1.6%  | -0.0%  |

#### proxy track 20 fields

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 445µs | 455µs  | 458µs | 470µs | 475µs | 6µs    | 30µs   | 1.3% | +0.7% |
| Zustand       | 440µs | 455µs  | 455µs | 465µs | 470µs | 6µs    | 30µs   | 1.3% | -0.1% |
| Redux Toolkit | 325µs | 340µs  | 338µs | 350µs | 355µs | 6µs    | 30µs   | 1.9% | -0.5% |

#### proxy track deep nested (5 levels)

| Library       | Min | Median | Mean | P95 | Max | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | --- | --- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 0µs  | 5µs | 5µs | 1µs    | 5µs    | 359.0% | +100.0% |
| Zustand       | 0µs | 0µs    | 0µs  | 5µs | 5µs | 1µs    | 5µs    | 316.1% | +100.0% |
| Redux Toolkit | 5µs | 5µs    | 5µs  | 5µs | 5µs | 0µs    | 0µs    | 0.0%   | +0.0%   |

#### proxy change detection miss

| Library       | Min | Median | Mean | P95 | Max  | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | --- | ---- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 1µs  | 5µs | 10µs | 2µs    | 10µs   | 254.2% | +100.0% |
| Zustand       | 0µs | 0µs    | 1µs  | 5µs | 10µs | 2µs    | 10µs   | 181.2% | +100.0% |
| Redux Toolkit | 5µs | 5µs    | 5µs  | 5µs | 5µs  | 0µs    | 0µs    | 0.0%   | +0.0%   |

#### proxy change detection hit

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 20µs  | 20µs   | 20µs  | 20µs  | 20µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 20µs  | 30µs   | 31µs  | 40µs  | 45µs  | 6µs    | 25µs   | 18.2% | +2.9% |
| Redux Toolkit | 730µs | 765µs  | 764µs | 785µs | 800µs | 12µs   | 70µs   | 1.5%  | -0.1% |

#### proxy cache reuse

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 445µs | 460µs  | 460µs | 470µs | 475µs | 6µs    | 30µs   | 1.2% | +0.1% |
| Zustand       | 440µs | 455µs  | 455µs | 465µs | 470µs | 6µs    | 30µs   | 1.4% | +0.1% |
| Redux Toolkit | 325µs | 340µs  | 339µs | 350µs | 355µs | 6µs    | 30µs   | 1.7% | -0.4% |

#### getter track simple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 20µs  | 20µs   | 20µs  | 20µs  | 20µs  | 0µs    | 0µs    | 0.0%  | +0.0% |
| Zustand       | 20µs  | 30µs   | 32µs  | 45µs  | 45µs  | 6µs    | 25µs   | 20.2% | +5.0% |
| Redux Toolkit | 860µs | 890µs  | 892µs | 915µs | 930µs | 12µs   | 70µs   | 1.4%  | +0.2% |

#### getter track multiple

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 25µs  | 25µs   | 25µs  | 25µs  | 25µs  | 0µs    | 0µs    | 0.0%  | -0.0% |
| Zustand       | 20µs  | 30µs   | 30µs  | 40µs  | 45µs  | 6µs    | 25µs   | 20.4% | -1.3% |
| Redux Toolkit | 970µs | 1.0ms  | 1.0ms | 1.0ms | 1.0ms | 14µs   | 70µs   | 1.4%  | +0.3% |

#### getter track wide aggregate

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%  | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ---- | ----- |
| Blac          | 515µs | 530µs  | 530µs | 540µs | 545µs | 6µs    | 30µs   | 1.1% | +0.0% |
| Zustand       | 1.8ms | 1.8ms  | 1.8ms | 1.8ms | 1.9ms | 16µs   | 90µs   | 0.9% | +0.2% |
| Redux Toolkit | 1.6ms | 1.7ms  | 1.7ms | 1.7ms | 1.8ms | 18µs   | 110µs  | 1.1% | +0.2% |

#### getter change detection miss

| Library       | Min | Median | Mean | P95  | Max  | StdDev | Spread | CV%    | Skew    |
| ------------- | --- | ------ | ---- | ---- | ---- | ------ | ------ | ------ | ------- |
| Blac          | 0µs | 0µs    | 1µs  | 5µs  | 15µs | 2µs    | 15µs   | 229.1% | +100.0% |
| Zustand       | 0µs | 0µs    | 1µs  | 5µs  | 5µs  | 2µs    | 5µs    | 227.4% | +100.0% |
| Redux Toolkit | 5µs | 15µs   | 14µs | 20µs | 30µs | 4µs    | 25µs   | 30.1%  | -3.5%   |

#### acquire/release cycle

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 2.5ms | 2.7ms  | 2.7ms | 2.9ms | 3.1ms | 106µs  | 575µs  | 3.9%  | +0.6% |
| Zustand       | 5µs   | 15µs   | 15µs  | 25µs  | 30µs  | 6µs    | 25µs   | 40.4% | -0.4% |
| Redux Toolkit | 4.3ms | 5.0ms  | 5.0ms | 5.4ms | 5.7ms | 257µs  | 1.3ms  | 5.2%  | -0.3% |

#### acquire shared instance

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%    | Skew    |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ------ | ------- |
| Blac          | 2.5ms | 2.6ms  | 2.6ms | 2.8ms | 3.0ms | 95µs   | 490µs  | 3.6%   | +0.9%   |
| Zustand       | 0µs   | 0µs    | 1µs   | 5µs   | 5µs   | 2µs    | 5µs    | 251.0% | +100.0% |
| Redux Toolkit | 5µs   | 15µs   | 15µs  | 25µs  | 30µs  | 5µs    | 25µs   | 33.0%  | -1.3%   |

#### instance create/dispose

| Library       | Min   | Median | Mean  | P95   | Max   | StdDev | Spread | CV%   | Skew  |
| ------------- | ----- | ------ | ----- | ----- | ----- | ------ | ------ | ----- | ----- |
| Blac          | 810µs | 835µs  | 835µs | 855µs | 870µs | 10µs   | 60µs   | 1.2%  | +0.0% |
| Zustand       | 5µs   | 15µs   | 14µs  | 25µs  | 30µs  | 5µs    | 25µs   | 37.4% | -3.5% |
| Redux Toolkit | 4.7ms | 5.2ms  | 5.2ms | 5.6ms | 5.8ms | 214µs  | 1.1ms  | 4.1%  | +0.1% |

## React Benchmark Details

### run

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 50.4ms  | 15.7ms     | 34.7ms   | 61.4ms  | 4.6ms      | 8.9%    |
| Zustand       | 43.6ms  | 12.1ms     | 31.5ms   | 50.5ms  | 2.7ms      | 6.1%    |
| Redux Toolkit | 46.1ms  | 14.5ms     | 31.6ms   | 53.7ms  | 3.7ms      | 8.0%    |

### runLots

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 699ms   | 186ms      | 513ms    | 841ms   | 81.9ms     | 11.7%   |
| Zustand       | 615ms   | 133ms      | 483ms    | 678ms   | 44.9ms     | 7.3%    |
| Redux Toolkit | 520ms   | 117ms      | 402ms    | 628ms   | 40.0ms     | 7.5%    |

### add

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 53.0ms  | 20.3ms     | 32.7ms   | 57.9ms  | 3.1ms      | 5.8%    |
| Zustand       | 37.2ms  | 12.5ms     | 24.6ms   | 41.5ms  | 1.9ms      | 5.0%    |
| Redux Toolkit | 39.1ms  | 12.3ms     | 26.8ms   | 48.2ms  | 4.7ms      | 11.7%   |

### update

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 4.0ms   | 0µs        | 4.0ms    | 17.2ms  | 5.2ms      | 82.7%   |
| Zustand       | 6.2ms   | 1.5ms      | 4.8ms    | 8.5ms   | 1.1ms      | 17.2%   |
| Redux Toolkit | 6.9ms   | 1.4ms      | 5.4ms    | 9.8ms   | 1.2ms      | 17.3%   |

### clear

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 9.2ms   | 137µs      | 9.1ms    | 9.7ms   | 390µs      | 4.2%    |
| Zustand       | 6.9ms   | 50µs       | 6.9ms    | 7.8ms   | 405µs      | 5.9%    |
| Redux Toolkit | 7.1ms   | 70µs       | 7.0ms    | 9.0ms   | 845µs      | 11.6%   |

### swapRows

| Library       | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
| ------------- | ------- | ---------- | -------- | ------- | ---------- | ------- |
| Blac          | 27.0ms  | 2.3ms      | 24.7ms   | 29.5ms  | 1.6ms      | 5.9%    |
| Zustand       | 21.2ms  | 818µs      | 20.3ms   | 22.8ms  | 836µs      | 3.9%    |
| Redux Toolkit | 23.0ms  | 930µs      | 22.0ms   | 24.6ms  | 807µs      | 3.5%    |
