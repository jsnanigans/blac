import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  clean: true,
  dts: {
    // Don't bundle types from @blac/core - keep as import references
    resolve: [],
  },
  sourcemap: true,
  fixedExtension: false, // Use .js for ESM, .cjs for CJS
  // Explicitly mark @blac/core as external
  external: ['@blac/core'],
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.js' : '.cjs',
      dts: format === 'es' ? '.d.ts' : '.d.cts',
    };
  },
});
