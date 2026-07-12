import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    clean: false,
    dts: true,
    sourcemap: true,
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
