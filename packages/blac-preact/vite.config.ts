import { defineConfig } from 'vite-plus';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, '../blac-adapter/src'),
      '@blac/preact': path.resolve(__dirname, './src'),
    },
  },
  pack: {
    entry: 'src/index.ts',
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    external: ['@blac/core', 'preact', 'preact/hooks', 'preact/compat'],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
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
