import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    tracking: 'src/tracking.ts',
    debug: 'src/debug.ts',
    plugins: 'src/plugins.ts',
    'watch-entry': 'src/watch-entry.ts',
    types: 'src/types.ts',
  },
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.js' : '.cjs',
    };
  },
});
