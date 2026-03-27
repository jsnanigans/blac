import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core/testing': path.resolve(
        __dirname,
        '../../packages/blac-core/src/testing',
      ),
      '@blac/core': path.resolve(__dirname, '../../packages/blac-core/src'),
      '@blac/adapter': path.resolve(
        __dirname,
        '../../packages/blac-adapter/src',
      ),
      '@blac/react/testing': path.resolve(
        __dirname,
        '../../packages/blac-react/src/testing',
      ),
      '@blac/react': path.resolve(__dirname, '../../packages/blac-react/src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../../packages/devtools-connect/src',
      ),
    },
  },
  test: {
    globals: true,
    maxConcurrency: 2,
    maxWorkers: 2,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
