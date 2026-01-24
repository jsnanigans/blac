import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/tracking.ts',
    'src/watch-entry.ts',
    'src/plugins.ts',
    'src/debug.ts',
  ],
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  fixedExtension: false,
  hash: false,
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.js' : '.cjs',
      dts: format === 'es' ? '.d.ts' : '.d.cts',
    };
  },
});
