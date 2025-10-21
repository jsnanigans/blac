# BlaC Performance Benchmarks

A comprehensive browser-based performance testing suite for the BlaC state management library.

## Quick Start

```bash
# From the perf directory
pnpm dev

# Or from the monorepo root
cd apps/perf && pnpm dev
```

The app will be available at http://localhost:3001/

## Overview

This performance suite includes two main testing approaches:

### 1. JS Framework Benchmark

Based on [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), this test measures standard framework operations:

- **Create 1,000 rows**: Test initial render performance
- **Create 10,000 rows**: Stress test with large lists
- **Append 1,000 rows**: Test incremental updates
- **Update every 10th row**: Partial update performance
- **Swap rows**: Test list reordering
- **Clear**: Cleanup performance

**Best for**: Comparing BlaC against other framework benchmarks

### 2. Comprehensive Benchmark Dashboard

A full suite of BlaC-specific performance tests:

#### Memory Leak Detection

- Mount/unmount cycle testing
- Shared vs isolated bloc comparison
- Memory usage tracking (Chrome/Edge only)
- Subscription cleanup verification

#### Dependency Tracking Performance

- Tests proxy-based optimization
- Compares performance with/without tracking
- Validates selective re-rendering
- Measures render counts per component

#### Large State Tree Performance

- Deeply nested state structures
- Immutable update propagation
- Configurable tree depth and breadth
- Visual tree exploration

#### Concurrent Updates

- Multiple simultaneous state changes
- Batching and re-render optimization
- Auto-updating components
- Subscription system stress testing

## Project Structure

```
apps/perf/
├── main.tsx                          # Entry point with navigation
├── index.html                        # HTML template
├── src/
│   ├── components/
│   │   └── BenchmarkDashboard.tsx   # Main dashboard UI
│   ├── benchmarks/
│   │   ├── JSFrameworkBenchmark.tsx # Classic framework test
│   │   ├── MemoryLeakBenchmark.tsx  # Memory leak detection
│   │   ├── DependencyTrackingBenchmark.tsx
│   │   ├── LargeStateBenchmark.tsx  # Deep state trees
│   │   └── ConcurrentUpdatesBenchmark.tsx
│   └── utils/
│       └── PerformanceMetrics.ts    # Metrics collection utility
├── bootstrap.css                     # Styling for JS Framework test
└── main.css                          # Additional styles
```

## Performance Metrics Utility

The `PerformanceMetrics` class provides:

- **Memory tracking**: Heap usage monitoring (Chrome/Edge)
- **Duration measurement**: High-precision timing with `performance.now()`
- **Benchmark utilities**: Run tests multiple times with statistics
- **Async support**: Measure async operations
- **Export capabilities**: JSON export of results

### Example Usage

```typescript
import { PerformanceMetrics } from './utils/PerformanceMetrics';

// Simple measurement
PerformanceMetrics.start('operation');
// ... do work ...
const result = PerformanceMetrics.end('operation');

// Automatic measurement
const { result, metrics } = PerformanceMetrics.measure('operation', () => {
  // ... do work ...
  return someValue;
});

// Run benchmark with statistics
const stats = PerformanceMetrics.benchmark(
  'operation',
  () => {
    // ... do work ...
  },
  100,
); // Run 100 times
```

## Best Practices for Accurate Results

### Chrome/Edge Setup (Recommended)

1. **Enable memory profiling**:

   ```bash
   # Mac/Linux
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --enable-precise-memory-info \
     --expose-gc

   # Windows
   chrome.exe --enable-precise-memory-info --expose-gc
   ```

2. **Open DevTools**: Press F12 before running benchmarks
3. **Use Performance tab**: Record operations for detailed profiling
4. **Memory Profiler**: Take heap snapshots to detect leaks

### General Tips

- Close unnecessary tabs and applications
- Run benchmarks multiple times for consistency
- Use incognito/private mode to avoid extension interference
- Clear browser cache between major test runs
- Disable browser extensions during testing
- Use a consistent browser version for comparisons

## Understanding Results

### Memory Metrics

- **Used Heap Size**: Actual memory used by JavaScript objects
- **Memory Delta**: Change in memory usage (positive = leak potential)
- Watch for memory that doesn't return to baseline after cleanup

### Duration Metrics

- **Duration**: Total time for operation
- **Average**: Mean time per iteration (for batched operations)
- Look for operations that scale poorly (O(n²) vs O(n))

### Render Counts

- With **proxy tracking enabled**: Components should only re-render when accessed properties change
- Without **proxy tracking**: All components re-render on any state change
- Lower render counts = better performance

## Configuration

### Proxy Dependency Tracking

Toggle in the "Dependency Tracking" benchmark or globally:

```typescript
import { Blac } from '@blac/core';

Blac.setConfig({
  proxyDependencyTracking: true, // or false
});
```

**Note**: Changing this setting requires a page reload to take effect.

### Test Parameters

Each benchmark has configurable parameters:

- **Memory Leak**: Component count, cycle count, isolated vs shared
- **Dependency Tracking**: Number of updates, component types
- **Large State**: Tree depth and breadth
- **Concurrent Updates**: Component count, update interval

## Comparing with Other Frameworks

The JS Framework Benchmark is designed to be comparable with the official benchmark suite. For formal comparisons:

1. Run the test in the same browser/environment
2. Record multiple runs and average results
3. Use Chrome DevTools Performance API for precise metrics
4. Compare operations: create, update, swap, clear

## Troubleshooting

### Memory API Not Available

The Memory API (`performance.memory`) is only available in Chrome/Edge. Safari and Firefox don't support it. Some metrics will show "N/A" in other browsers.

### High Memory Usage

If you see consistently high memory:

1. Check the "Memory Leak" benchmark
2. Run mount/unmount cycles and verify memory returns to baseline
3. Take heap snapshots in DevTools to identify retained objects

### Slow Performance

- Reduce test parameters (fewer components, smaller trees)
- Close DevTools during actual tests (profiling has overhead)
- Ensure you're in production build mode for final tests

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Format code
pnpm format

# Build for production
pnpm build
```

## Future Enhancements

Potential additions:

- [ ] Export results to CSV/JSON
- [ ] Historical comparison charts
- [ ] Automated regression testing
- [ ] CI integration for performance monitoring
- [ ] Comparison with other state management libraries
- [ ] React 19 features testing (transitions, suspense)

## License

Part of the BlaC monorepo. See root LICENSE file.
