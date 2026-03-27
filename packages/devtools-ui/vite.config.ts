import { defineConfig } from 'vite-plus';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/react': path.resolve(__dirname, '../blac-react/src'),
    },
  },
  pack: {
    entry: ['src/index.tsx'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    sourcemap: true,
    fixedExtension: false,
    external: ['react', 'react-dom', '@blac/core', '@blac/react'],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
        dts: format === 'es' ? '.d.ts' : '.d.cts',
      };
    },
  },
});
