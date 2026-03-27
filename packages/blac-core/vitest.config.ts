import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, './src'),
      '@blac/react': path.resolve(__dirname, '../blac-react/src'),
      '@blac/test': path.resolve(__dirname, '../blac-test/src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  test: {
    environment: 'jsdom', // Using jsdom as it's in devDependencies
    maxConcurrency: 2,
    maxWorkers: 2,
    globals: true, // Optional: consider if explicit imports are preferred
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/index.ts', // Often excluded if it only re-exports
        'src/types.ts', // Or any other type definition files
        'src/**/*.test.ts', // Test files themselves
        'src/**/*.spec.ts', // Spec files themselves
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
