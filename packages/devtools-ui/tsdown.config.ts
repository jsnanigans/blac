import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  dts: false, // Disable tsdown's type generation - we'll use tsc instead
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
});
