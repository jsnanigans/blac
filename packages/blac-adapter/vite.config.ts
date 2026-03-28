import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, './src'),
    },
  },
  pack: {
    entry: 'src/index.ts',
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
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/**/*.test.ts'],
    },
  },
});
