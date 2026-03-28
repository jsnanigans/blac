import { defineConfig } from 'vite-plus';
import path from 'path';

// Vitest config for PERFORMANCE TESTING
// This config ensures tests run in isolation without concurrency
// for accurate performance measurements and memory profiling
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, '../blac-adapter/src'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  test: {
    globals: true,
    // CRITICAL: Disable concurrency for accurate performance measurements
    maxConcurrency: 1,
    maxWorkers: 1,
    pool: 'forks', // Use forks instead of threads for better isolation
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    hookTimeout: 60000, // 60 seconds for performance tests
    testTimeout: 120000, // 120 seconds for long-running performance tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__archived__/**',
      '**/.*/**',
    ],
    onConsoleLog(_log) {
      return true; // Show console logs for performance metrics
    },
    // Disable coverage for performance tests
    coverage: {
      enabled: false,
    },
    // Disable parallelism at file level too
    fileParallelism: false,
  },
});
