import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core/testing': path.resolve(__dirname, '../blac-core/src/testing'),
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, '../blac-adapter/src'),
      '@blac/react/testing': path.resolve(
        __dirname,
        '../blac-react/src/testing',
      ),
      '@blac/react': path.resolve(__dirname, '../blac-react/src'),
    },
  },
  pack: {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    external: ['@blac/core', '@blac/react', 'react'],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    hookTimeout: 30000,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
