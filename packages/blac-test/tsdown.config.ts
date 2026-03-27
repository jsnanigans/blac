import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
  },
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  external: ['@blac/core', '@blac/react', 'react', 'react-dom', '@testing-library/react'],
  outExtensions({ format }) {
    return { js: format === 'es' ? '.js' : '.cjs' };
  },
});
