import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac/src'),
      '@blac/preact': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    maxConcurrency: 2,
    maxWorkers: 2,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    hookTimeout: 30000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__archived__/**',
      '**/.*/**',
    ],
    onConsoleLog() {
      return true;
    },
  },
});
