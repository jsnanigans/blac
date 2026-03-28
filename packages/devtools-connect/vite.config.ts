import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
    },
  },
  pack: {
    entry: 'src/index.ts',
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    external: ['@blac/core'],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
