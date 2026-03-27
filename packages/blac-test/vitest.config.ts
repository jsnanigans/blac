import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, '../blac-adapter/src'),
      '@blac/react': path.resolve(__dirname, '../blac-react/src'),
      '@blac/devtools-connect': path.resolve(__dirname, '../devtools-connect/src'),
      '@blac/test/react': path.resolve(__dirname, './src/react'),
      '@blac/test': path.resolve(__dirname, './src'),
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
