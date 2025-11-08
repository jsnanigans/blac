import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  clean: true,
  dts: false, // Disable tsdown's type generation - we'll use tsc instead
  sourcemap: true,
  fixedExtension: false, // Use .js for ESM, .cjs for CJS
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.js' : '.cjs',
      dts: format === 'es' ? '.d.ts' : '.d.cts',
    };
  },
});
