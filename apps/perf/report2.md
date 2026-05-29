# React State Management Benchmarks

## Scorecard

| Library | Wins | Slow (>1.5x) | Geometric Mean |
|---|---|---|---|
| Blac | 25 wins | 4 slow (>1.5x) | 1.20x |
| Zustand | 26 wins | 3 slow (>1.5x) | 1.15x |

## Blac Action Items

### Critical (>2x slower)

| Operation | Result |
|---|---|
| multi-store coordination | Blac is 9.0x slower than Zustand (900µs vs 100µs) — Gap: 800µs per operation |
| cross-store propagation | Blac is 6.0x slower than Zustand (600µs vs 100µs) — Gap: 500µs per operation |
| batch rapid updates | Blac is 2.0x slower than Zustand (200µs vs 100µs) — Gap: 100µs per operation |
| derived state computation | Blac is 2.0x slower than Zustand (200µs vs 100µs) — Gap: 100µs per operation |

### Wins

| Operation | Result |
|---|---|
| getter track multiple | Blac wins at 100µs |
| create 1k | Blac wins at 100µs |
| create 10k | Blac wins at 700µs |
| update every 10th | Blac wins at 100µs |
| append 1k | Blac wins at 200µs |
| clear | Blac wins at 100µs |
| patch 1 of 20 fields | Blac wins at 200µs |
| nested object update | Blac wins at 100µs |
| subscriber with computed filter | Blac wins at 100µs |
| proxy track 20 fields | Blac wins at 600µs |
| proxy change detection hit | Blac wins at 100µs |
| proxy cache reuse | Blac wins at 600µs |
| getter track wide aggregate | Blac wins at 1.1ms |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest |
|---|---|---|---|---|
| create 1k | 100µs | fastest | 100µs | fastest |
| create 10k | 700µs | fastest | 700µs | fastest |
| update every 10th | 100µs | fastest | 100µs | fastest |
| append 1k | 200µs | fastest | 200µs | fastest |
| clear | 100µs | fastest | 100µs | fastest |

### CRUD Operations — Detailed Stats

#### create 1k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### create 10k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 700µs | 700µs | 700µs | 700µs | 700µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 700µs | 700µs | 700µs | 700µs | 700µs | 0µs | 0µs | 0.0% | -0.0% |

#### update every 10th

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### append 1k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 200µs | 165µs | 300µs | 500µs | 80µs | 500µs | 48.6% | -21.0% |
| Zustand | 0µs | 200µs | 170µs | 300µs | 500µs | 84µs | 500µs | 49.4% | -18.0% |

#### clear

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

### State Update Patterns — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest |
|---|---|---|---|---|
| redundant emit | 0µs | fastest | 0µs | fastest |
| redundant patch | 0µs | fastest | 100µs | fastest |
| patch 1 of 20 fields | 200µs | fastest | 2.1ms | 10.50x slower |
| nested object update | 100µs | fastest | 100µs | fastest |
| batch rapid updates | 200µs | 2.00x slower | 100µs | fastest |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 19µs | 100µs | 300µs | 40µs | 300µs | 211.8% | +100.0% |
| Zustand | 0µs | 0µs | 25µs | 100µs | 200µs | 44µs | 200µs | 174.5% | +100.0% |

#### redundant patch

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 36µs | 100µs | 3.7ms | 132µs | 3.7ms | 364.4% | +100.0% |
| Zustand | 0µs | 100µs | 61µs | 200µs | 300µs | 61µs | 300µs | 101.5% | -65.2% |

#### patch 1 of 20 fields

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 200µs | 200µs | 200µs | 200µs | 200µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 1.9ms | 2.1ms | 2.1ms | 2.3ms | 2.4ms | 103µs | 500µs | 4.9% | -0.1% |

#### nested object update

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### batch rapid updates

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 200µs | 200µs | 200µs | 200µs | 200µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 0µs | 100µs | 57µs | 100µs | 300µs | 62µs | 300µs | 108.9% | -75.9% |

### Subscription & Notification — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest |
|---|---|---|---|---|
| notify 100 subscribers | 0µs | fastest | 100µs | fastest |
| selector notification skip | 0µs | fastest | 100µs | fastest |
| subscriber with computed filter | 100µs | fastest | 200µs | 2.00x slower |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 20µs | 100µs | 200µs | 41µs | 200µs | 208.2% | +100.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### selector notification skip

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 53µs | 100µs | 1.4ms | 79µs | 1.4ms | 147.6% | +100.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### subscriber with computed filter

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 66µs | 200µs | 400µs | 64µs | 400µs | 97.7% | -51.7% |
| Zustand | 0µs | 200µs | 164µs | 300µs | 500µs | 88µs | 500µs | 53.4% | -22.0% |

### Derived & Cross-Store — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest |
|---|---|---|---|---|
| derived state computation | 200µs | 2.00x slower | 100µs | fastest |
| cross-store propagation | 600µs | 6.00x slower | 100µs | fastest |
| multi-store coordination | 900µs | 9.00x slower | 100µs | fastest |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 200µs | 252µs | 400µs | 500µs | 76µs | 400µs | 30.1% | +20.6% |
| Zustand | 0µs | 100µs | 56µs | 100µs | 300µs | 59µs | 300µs | 106.5% | -79.9% |

#### cross-store propagation

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 400µs | 600µs | 566µs | 700µs | 900µs | 78µs | 500µs | 13.9% | -6.1% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

#### multi-store coordination

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 700µs | 900µs | 874µs | 1.0ms | 1.2ms | 74µs | 500µs | 8.5% | -2.9% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |

### Other — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest |
|---|---|---|---|---|
| proxy track 1 field | 300µs | fastest | 0µs | fastest |
| proxy track 20 fields | 600µs | fastest | 600µs | fastest |
| proxy track deep nested (5 levels) | 0µs | fastest | 0µs | fastest |
| proxy change detection miss | 0µs | fastest | 0µs | fastest |
| proxy change detection hit | 100µs | fastest | 100µs | fastest |
| proxy cache reuse | 600µs | fastest | 600µs | fastest |
| getter track simple | 100µs | fastest | 0µs | fastest |
| getter track multiple | 100µs | fastest | 100µs | fastest |
| getter track wide aggregate | 1.1ms | fastest | 2.7ms | 2.45x slower |
| getter change detection miss | 0µs | fastest | 0µs | fastest |
| acquire/release cycle | 100µs | fastest | 0µs | fastest |
| acquire shared instance | 700µs | fastest | 0µs | fastest |
| instance create/dispose | 400µs | fastest | 0µs | fastest |

### Other — Detailed Stats

#### proxy track 1 field

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 300µs | 278µs | 400µs | 600µs | 78µs | 500µs | 28.1% | -7.8% |
| Zustand | 0µs | 0µs | 41µs | 100µs | 500µs | 58µs | 500µs | 142.1% | +100.0% |

#### proxy track 20 fields

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 500µs | 600µs | 649µs | 800µs | 900µs | 67µs | 400µs | 10.3% | +7.5% |
| Zustand | 500µs | 600µs | 651µs | 800µs | 900µs | 70µs | 400µs | 10.7% | +7.8% |

#### proxy track deep nested (5 levels)

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 1µs | 0µs | 100µs | 9µs | 100µs | 1049.3% | +100.0% |
| Zustand | 0µs | 0µs | 9µs | 100µs | 100µs | 28µs | 100µs | 321.9% | +100.0% |

#### proxy change detection miss

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 2µs | 0µs | 100µs | 14µs | 100µs | 682.8% | +100.0% |
| Zustand | 0µs | 0µs | 2µs | 0µs | 100µs | 13µs | 100µs | 760.4% | +100.0% |

#### proxy change detection hit

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 58µs | 200µs | 300µs | 62µs | 300µs | 105.9% | -71.1% |
| Zustand | 0µs | 100µs | 57µs | 200µs | 300µs | 60µs | 300µs | 105.9% | -76.2% |

#### proxy cache reuse

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 500µs | 600µs | 651µs | 800µs | 900µs | 69µs | 400µs | 10.7% | +7.8% |
| Zustand | 500µs | 600µs | 650µs | 700µs | 800µs | 62µs | 300µs | 9.6% | +7.7% |

#### getter track simple

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 58µs | 200µs | 400µs | 61µs | 400µs | 105.6% | -73.1% |
| Zustand | 0µs | 0µs | 56µs | 100µs | 1.2ms | 69µs | 1.2ms | 124.2% | +100.0% |

#### getter track multiple

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 0µs | 100µs | 57µs | 200µs | 400µs | 62µs | 400µs | 108.6% | -74.2% |

#### getter track wide aggregate

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 1.1ms | 1.1ms | 1.1ms | 1.1ms | 1.1ms | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 2.5ms | 2.7ms | 2.7ms | 2.9ms | 3.0ms | 112µs | 500µs | 4.1% | +0.4% |

#### getter change detection miss

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 2µs | 0µs | 100µs | 15µs | 100µs | 666.7% | +100.0% |
| Zustand | 0µs | 0µs | 6µs | 100µs | 100µs | 23µs | 100µs | 406.7% | +100.0% |

#### acquire/release cycle

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 0µs | 0µs | 44µs | 100µs | 800µs | 60µs | 800µs | 134.2% | +100.0% |

#### acquire shared instance

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 700µs | 700µs | 700µs | 700µs | 700µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 0µs | 0µs | 1µs | 0µs | 100µs | 11µs | 100µs | 871.3% | +100.0% |

#### instance create/dispose

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 300µs | 400µs | 453µs | 600µs | 700µs | 73µs | 400µs | 16.1% | +11.6% |
| Zustand | 0µs | 0µs | 43µs | 100µs | 200µs | 56µs | 200µs | 130.3% | +100.0% |

## React Benchmark Details

### run

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 39.6ms | 20.5ms | 19.1ms | 43.8ms | 2.4ms | 6.0% |
| Zustand | 40.8ms | 20.3ms | 20.6ms | 47.3ms | 3.4ms | 8.5% |

### runLots

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 284ms | 106ms | 177ms | 293ms | 6.6ms | 2.3% |
| Zustand | 301ms | 119ms | 182ms | 326ms | 9.0ms | 3.0% |

### add

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 49.4ms | 17.7ms | 31.7ms | 56.1ms | 2.7ms | 5.3% |
| Zustand | 59.5ms | 18.5ms | 41.0ms | 66.4ms | 2.8ms | 4.6% |

### update

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 6.5ms | 2.5ms | 4.0ms | 7.6ms | 379µs | 5.8% |
| Zustand | 8.2ms | 2.7ms | 5.5ms | 9.0ms | 435µs | 5.2% |

### clear

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 11.7ms | 0µs | 11.7ms | 13.1ms | 532µs | 4.5% |
| Zustand | 11.6ms | 100µs | 11.5ms | 12.7ms | 376µs | 3.2% |

### swapRows

| Library | E2E Med | Render Med | Overhead | E2E P95 | E2E StdDev | E2E CV% |
|---|---|---|---|---|---|---|
| Blac | 39.1ms | 1.1ms | 38.0ms | 42.1ms | 1.3ms | 3.3% |
| Zustand | 40.3ms | 1.2ms | 39.1ms | 47.7ms | 3.0ms | 7.2% |
