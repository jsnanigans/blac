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
    },
  },
  pack: {
    entry: {
      index: 'src/index.ts',
      tracking: 'src/tracking.ts',
      debug: 'src/debug.ts',
      plugins: 'src/plugins.ts',
      'watch-entry': 'src/watch-entry.ts',
      types: 'src/types.ts',
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
    environment: 'jsdom',
    maxConcurrency: 2,
    maxWorkers: 2,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/index.ts',
        'src/types.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
    },
    onConsoleLog(log) {
      if (log.startsWith('UNIT')) {
        return true;
      }
      return false;
    },
  },
});
