import { defineConfig } from 'vite-plus';

export default defineConfig({
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
