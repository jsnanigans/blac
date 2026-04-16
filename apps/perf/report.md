# React State Management Benchmarks

## Scorecard

| Library | Wins | Slow (>1.5x) | Geometric Mean |
|---|---|---|---|
| Blac | 24 wins | 5 slow (>1.5x) | 1.30x |
| Zustand | 24 wins | 3 slow (>1.5x) | 1.19x |
| Redux Toolkit | 14 wins | 15 slow (>1.5x) | 2.82x |

## Blac Action Items

### Critical (>2x slower)

| Operation | Result |
|---|---|
| proxy track 20 fields | Blac is 11.6x slower than Redux Toolkit (5.8ms vs 500µs) — Gap: 5.3ms per operation |
| proxy cache reuse | Blac is 6.8x slower than Redux Toolkit (3.4ms vs 500µs) — Gap: 2.9ms per operation |
| multi-store coordination | Blac is 4.0x slower than Zustand (400µs vs 100µs) — Gap: 300µs per operation |
| proxy track 1 field | Blac is 3.0x slower than Zustand (300µs vs 100µs) — Gap: 200µs per operation |
| cross-store propagation | Blac is 2.0x slower than Zustand (200µs vs 100µs) — Gap: 100µs per operation |

### Wins

| Operation | Result |
|---|---|
| create 1k | Blac wins at 100µs |
| create 10k | Blac wins at 600µs |
| update every 10th | Blac wins at 100µs |
| append 1k | Blac wins at 100µs |
| clear | Blac wins at 100µs |
| patch 1 of 20 fields | Blac wins at 100µs |
| batch rapid updates | Blac wins at 100µs |
| notify 100 subscribers | Blac wins at 100µs |
| selector notification skip | Blac wins at 100µs |
| subscriber with computed filter | Blac wins at 100µs |
| getter track simple | Blac wins at 100µs |
| getter track wide aggregate | Blac wins at 1.0ms |

## Pure State — Detailed Breakdown

### CRUD Operations — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
|---|---|---|---|---|---|---|
| create 1k | 100µs | fastest | 100µs | fastest | 200µs | 2.00x slower |
| create 10k | 600µs | fastest | 600µs | fastest | 1.7ms | 2.83x slower |
| update every 10th | 100µs | fastest | 100µs | fastest | 400µs | 4.00x slower |
| append 1k | 100µs | fastest | 200µs | 2.00x slower | 800µs | 8.00x slower |
| clear | 100µs | fastest | 100µs | fastest | 200µs | 2.00x slower |

### CRUD Operations — Detailed Stats

#### create 1k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 200µs | 200µs | 200µs | 200µs | 200µs | 0µs | 0µs | 0.0% | -0.0% |

#### create 10k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 500µs | 600µs | 647µs | 700µs | 1.0ms | 68µs | 500µs | 10.5% | +7.2% |
| Zustand | 500µs | 600µs | 653µs | 800µs | 900µs | 80µs | 400µs | 12.3% | +8.2% |
| Redux Toolkit | 1.7ms | 1.7ms | 1.7ms | 1.7ms | 1.7ms | 0µs | 0µs | 0.0% | -0.0% |

#### update every 10th

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 400µs | 400µs | 400µs | 400µs | 400µs | 0µs | 0µs | 0.0% | -0.0% |

#### append 1k

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 158µs | 300µs | 400µs | 81µs | 400µs | 51.1% | +36.7% |
| Zustand | 0µs | 200µs | 162µs | 300µs | 500µs | 81µs | 500µs | 50.4% | -23.8% |
| Redux Toolkit | 600µs | 800µs | 759µs | 900µs | 1.1ms | 78µs | 500µs | 10.2% | -5.4% |

#### clear

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 200µs | 200µs | 200µs | 200µs | 200µs | 0µs | 0µs | 0.0% | -0.0% |

### State Update Patterns — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
|---|---|---|---|---|---|---|
| redundant emit | 0µs | fastest | 0µs | fastest | 1.1ms | fastest |
| redundant patch | 0µs | fastest | 100µs | fastest | 1.0ms | fastest |
| patch 1 of 20 fields | 100µs | fastest | 2.0ms | 20.00x slower | 1.4ms | 14.00x slower |
| nested object update | 0µs | fastest | 100µs | fastest | 2.1ms | fastest |
| batch rapid updates | 100µs | fastest | 100µs | fastest | 1.2ms | 12.00x slower |

### State Update Patterns — Detailed Stats

#### redundant emit

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 27µs | 100µs | 200µs | 45µs | 200µs | 166.5% | +100.0% |
| Zustand | 0µs | 0µs | 23µs | 100µs | 200µs | 44µs | 200µs | 190.6% | +100.0% |
| Redux Toolkit | 1.1ms | 1.1ms | 1.1ms | 1.1ms | 1.1ms | 0µs | 0µs | 0.0% | +0.0% |

#### redundant patch

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 51µs | 100µs | 5.6ms | 184µs | 5.6ms | 359.7% | +100.0% |
| Zustand | 0µs | 100µs | 62µs | 200µs | 300µs | 67µs | 300µs | 107.2% | -60.4% |
| Redux Toolkit | 900µs | 1.0ms | 1.0ms | 1.1ms | 1.8ms | 100µs | 900µs | 9.7% | +3.0% |

#### patch 1 of 20 fields

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 1.9ms | 2.0ms | 2.0ms | 2.2ms | 3.6ms | 131µs | 1.7ms | 6.4% | +2.4% |
| Redux Toolkit | 1.4ms | 1.4ms | 1.4ms | 1.4ms | 1.4ms | 0µs | 0µs | 0.0% | -0.0% |

#### nested object update

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 44µs | 100µs | 900µs | 59µs | 900µs | 134.9% | +100.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 2.0ms | 2.1ms | 2.2ms | 2.3ms | 2.4ms | 69µs | 400µs | 3.2% | +2.3% |

#### batch rapid updates

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 0µs | 100µs | 63µs | 200µs | 400µs | 62µs | 400µs | 97.9% | -58.6% |
| Redux Toolkit | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 0µs | 0µs | 0.0% | -0.0% |

### Subscription & Notification — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
|---|---|---|---|---|---|---|
| notify 100 subscribers | 100µs | fastest | 100µs | fastest | 300µs | 3.00x slower |
| selector notification skip | 100µs | fastest | 100µs | fastest | 1.2ms | 12.00x slower |
| subscriber with computed filter | 100µs | fastest | 100µs | fastest | 1.6ms | 16.00x slower |

### Subscription & Notification — Detailed Stats

#### notify 100 subscribers

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 100µs | 300µs | 262µs | 400µs | 600µs | 83µs | 500µs | 31.7% | -14.5% |

#### selector notification skip

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 0µs | 0µs | 0.0% | -0.0% |

#### subscriber with computed filter

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 0µs | 100µs | 156µs | 300µs | 400µs | 79µs | 400µs | 50.5% | +35.9% |
| Redux Toolkit | 1.6ms | 1.6ms | 1.6ms | 1.6ms | 1.6ms | 0µs | 0µs | 0.0% | +0.0% |

### Derived & Cross-Store — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
|---|---|---|---|---|---|---|
| derived state computation | 100µs | fastest | 0µs | fastest | 1.4ms | fastest |
| cross-store propagation | 200µs | 2.00x slower | 100µs | fastest | 2.5ms | 25.00x slower |
| multi-store coordination | 400µs | 4.00x slower | 100µs | fastest | 3.7ms | 37.00x slower |

### Derived & Cross-Store — Detailed Stats

#### derived state computation

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 61µs | 200µs | 300µs | 61µs | 300µs | 99.4% | -63.5% |
| Zustand | 0µs | 0µs | 52µs | 100µs | 300µs | 60µs | 300µs | 115.8% | +100.0% |
| Redux Toolkit | 1.2ms | 1.4ms | 1.4ms | 1.4ms | 1.7ms | 64µs | 500µs | 4.8% | -3.6% |

#### cross-store propagation

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 200µs | 200µs | 200µs | 200µs | 200µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 2.3ms | 2.5ms | 2.5ms | 2.6ms | 2.8ms | 73µs | 500µs | 3.0% | -1.6% |

#### multi-store coordination

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 400µs | 400µs | 400µs | 400µs | 400µs | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 3.5ms | 3.7ms | 3.7ms | 3.8ms | 4.0ms | 78µs | 500µs | 2.1% | -0.7% |

### Other — Summary

| Operation | Blac Median | Blac vs Fastest | Zustand Median | Zustand vs Fastest | Redux Toolkit Median | Redux Toolkit vs Fastest |
|---|---|---|---|---|---|---|
| proxy track 1 field | 300µs | 3.00x slower | 100µs | fastest | 1.2ms | 12.00x slower |
| proxy track 20 fields | 5.8ms | 11.60x slower | 600µs | 1.20x slower | 500µs | fastest |
| proxy track deep nested (5 levels) | 1.9ms | fastest | 0µs | fastest | 0µs | fastest |
| proxy change detection miss | 100µs | fastest | 0µs | fastest | 0µs | fastest |
| proxy change detection hit | 300µs | fastest | 0µs | fastest | 1.2ms | fastest |
| proxy cache reuse | 3.4ms | 6.80x slower | 600µs | 1.20x slower | 500µs | fastest |
| getter track simple | 100µs | fastest | 100µs | fastest | 1.3ms | 13.00x slower |
| getter track multiple | 100µs | fastest | 0µs | fastest | 1.5ms | fastest |
| getter track wide aggregate | 1.0ms | fastest | 2.6ms | 2.60x slower | 2.3ms | 2.30x slower |
| getter change detection miss | 0µs | fastest | 0µs | fastest | 0µs | fastest |
| acquire/release cycle | 100µs | fastest | 0µs | fastest | 6.8ms | fastest |
| acquire shared instance | 500µs | fastest | 0µs | fastest | 0µs | fastest |
| instance create/dispose | 300µs | fastest | 0µs | fastest | 6.8ms | fastest |

### Other — Detailed Stats

#### proxy track 1 field

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 300µs | 300µs | 300µs | 300µs | 300µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 0µs | 100µs | 59µs | 200µs | 400µs | 61µs | 400µs | 102.7% | -69.3% |
| Redux Toolkit | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 0µs | 0µs | 0.0% | -0.0% |

#### proxy track 20 fields

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 5.6ms | 5.8ms | 5.9ms | 6.0ms | 6.1ms | 86µs | 500µs | 1.5% | +0.9% |
| Zustand | 600µs | 600µs | 600µs | 600µs | 600µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 400µs | 500µs | 558µs | 700µs | 1.1ms | 93µs | 700µs | 16.7% | +10.4% |

#### proxy track deep nested (5 levels)

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 1.7ms | 1.9ms | 2.0ms | 2.1ms | 2.2ms | 72µs | 500µs | 3.7% | +2.6% |
| Zustand | 0µs | 0µs | 7µs | 100µs | 100µs | 26µs | 100µs | 359.0% | +100.0% |
| Redux Toolkit | 0µs | 0µs | 6µs | 100µs | 100µs | 24µs | 100µs | 399.4% | +100.0% |

#### proxy change detection miss

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 59µs | 200µs | 300µs | 63µs | 300µs | 107.1% | -69.3% |
| Zustand | 0µs | 0µs | 2µs | 0µs | 100µs | 13µs | 100µs | 784.2% | +100.0% |
| Redux Toolkit | 0µs | 0µs | 6µs | 100µs | 100µs | 23µs | 100µs | 403.0% | +100.0% |

#### proxy change detection hit

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 300µs | 262µs | 400µs | 600µs | 83µs | 500µs | 31.5% | -14.5% |
| Zustand | 0µs | 0µs | 51µs | 100µs | 600µs | 60µs | 600µs | 116.7% | +100.0% |
| Redux Toolkit | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 1.2ms | 0µs | 0µs | 0.0% | -0.0% |

#### proxy cache reuse

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 3.4ms | 3.4ms | 3.4ms | 3.4ms | 3.4ms | 0µs | 0µs | 0.0% | -0.0% |
| Zustand | 600µs | 600µs | 600µs | 600µs | 600µs | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 400µs | 500µs | 547µs | 600µs | 800µs | 68µs | 400µs | 12.5% | +8.6% |

#### getter track simple

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 0µs | 100µs | 56µs | 200µs | 300µs | 60µs | 300µs | 107.0% | -78.2% |
| Redux Toolkit | 1.2ms | 1.3ms | 1.3ms | 1.4ms | 1.7ms | 69µs | 500µs | 5.2% | +3.4% |

#### getter track multiple

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 100µs | 151µs | 300µs | 400µs | 75µs | 400µs | 49.6% | +33.6% |
| Zustand | 0µs | 0µs | 54µs | 100µs | 200µs | 57µs | 200µs | 106.6% | +100.0% |
| Redux Toolkit | 1.3ms | 1.5ms | 1.7ms | 2.8ms | 5.7ms | 460µs | 4.4ms | 27.7% | +9.7% |

#### getter track wide aggregate

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 800µs | 1.0ms | 965µs | 1.1ms | 1.3ms | 72µs | 500µs | 7.5% | -3.6% |
| Zustand | 2.6ms | 2.6ms | 2.6ms | 2.6ms | 2.6ms | 0µs | 0µs | 0.0% | +0.0% |
| Redux Toolkit | 2.2ms | 2.3ms | 2.3ms | 2.5ms | 2.6ms | 91µs | 400µs | 3.9% | +1.5% |

#### getter change detection miss

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 0µs | 0µs | 3µs | 0µs | 100µs | 16µs | 100µs | 589.2% | +100.0% |
| Zustand | 0µs | 0µs | 7µs | 100µs | 100µs | 26µs | 100µs | 361.7% | +100.0% |
| Redux Toolkit | 0µs | 0µs | 32µs | 100µs | 300µs | 49µs | 300µs | 156.4% | +100.0% |

#### acquire/release cycle

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 100µs | 100µs | 100µs | 100µs | 0µs | 0µs | 0.0% | +0.0% |
| Zustand | 0µs | 0µs | 44µs | 100µs | 600µs | 59µs | 600µs | 133.4% | +100.0% |
| Redux Toolkit | 6.1ms | 6.8ms | 6.8ms | 7.2ms | 7.4ms | 237µs | 1.3ms | 3.5% | -0.3% |

#### acquire shared instance

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 400µs | 500µs | 509µs | 700µs | 1.1ms | 96µs | 700µs | 18.8% | +1.7% |
| Zustand | 0µs | 0µs | 1µs | 0µs | 100µs | 11µs | 100µs | 871.3% | +100.0% |
| Redux Toolkit | 0µs | 0µs | 20µs | 100µs | 200µs | 40µs | 200µs | 203.1% | +100.0% |

#### instance create/dispose

| Library | Min | Median | Mean | P95 | Max | StdDev | Spread | CV% | Skew |
|---|---|---|---|---|---|---|---|---|---|
| Blac | 100µs | 300µs | 268µs | 400µs | 600µs | 83µs | 500µs | 30.9% | -12.0% |
| Zustand | 0µs | 0µs | 43µs | 100µs | 500µs | 55µs | 500µs | 129.4% | +100.0% |
| Redux Toolkit | 6.1ms | 6.8ms | 6.8ms | 7.2ms | 7.5ms | 241µs | 1.4ms | 3.5% | -0.1% |
