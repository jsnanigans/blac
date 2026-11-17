import { defineConfig } from 'vite-plus';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

const define = {
  __BLAC_CONNECT_VERSION__: JSON.stringify(pkg.version),
};

export default defineConfig({
  define,
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
    },
  },
  pack: {
    define,
    entry: {
      index: 'src/index.ts',
      client: 'src/client.ts',
      protocol: 'src/protocol.ts',
    },
    format: ['esm', 'cjs'],
    clean: false,
    dts: false,
    sourcemap: true,
    external: ['@blac/core'],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
      };
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
