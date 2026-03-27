import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing.ts',
  },
  format: ['esm', 'cjs'],
  clean: true,
  dts: false,
  sourcemap: true,
  external: [
    '@blac/adapter',
    '@blac/core',
    '@blac/core/testing',
    '@testing-library/react',
    'react',
    'react-dom',
  ],
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.js' : '.cjs',
    };
  },
});
