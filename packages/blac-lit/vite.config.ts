import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@dirtytalk/structural': path.resolve(
        __dirname,
        '../dirtytalk-structural/src',
      ),
    },
  },
  pack: {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    external: ['@blac/core', /^lit-html/],
    outExtensions({ format }) {
      return { js: format === 'es' ? '.js' : '.cjs' };
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.*/**'],
  },
});
