import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core/testing': path.resolve(__dirname, '../blac-core/src/testing'),
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/react/testing': path.resolve(__dirname, './src/testing'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  pack: {
    entry: {
      index: 'src/index.ts',
      testing: 'src/testing.tsx',
    },
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
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    hookTimeout: 30000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__archived__/**',
      '**/.*/**',
    ],
  },
});
