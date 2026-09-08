import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core/testing': path.resolve(__dirname, './src/testing'),
      '@blac/core': path.resolve(__dirname, './src'),
      '@blac/react': path.resolve(__dirname, '../blac-react/src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
      // Resolve structural to source so tests see live tracker features
      // instead of the stale built dist (matches blac-react/vite.config.ts).
      '@dirtytalk/structural': path.resolve(
        __dirname,
        '../dirtytalk-structural/src',
      ),
      '@dirtytalk/engine': path.resolve(__dirname, '../dirtytalk-engine/src'),
    },
  },
  pack: {
    entry: {
      index: 'src/index.ts',
      plugins: 'src/plugins.ts',
      testing: 'src/testing.ts',
    },
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
    },
  },
  test: {
    // Core is framework-agnostic and touches no DOM API — the globals it does
    // use (DOMException, AbortController, queueMicrotask) are Node builtins.
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)', '**/*.bench.[jt]s?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
});
