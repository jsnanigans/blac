import { defineConfig } from 'vite-plus';
import path from 'path';
import connectPkg from '../devtools-connect/package.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

const connect = (file: string) =>
  path.resolve(__dirname, '../devtools-connect/src', file);

const define = {
  __BLAC_UI_VERSION__: JSON.stringify(pkg.version),
  // Tests alias the connect source, which reads its own version.
  __BLAC_CONNECT_VERSION__: JSON.stringify(connectPkg.version),
};

export default defineConfig({
  define,
  resolve: {
    alias: {
      '@blac/devtools-connect/client': connect('client.ts'),
      '@blac/devtools-connect/protocol': connect('protocol.ts'),
    },
  },
  pack: {
    define: { __BLAC_UI_VERSION__: define.__BLAC_UI_VERSION__ },
    entry: ['src/index.tsx'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: false,
    sourcemap: true,
    fixedExtension: false,
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      /^@blac\/devtools-connect(\/.*)?$/,
    ],
    outExtensions({ format }) {
      return {
        js: format === 'es' ? '.js' : '.cjs',
        dts: format === 'es' ? '.d.ts' : '.d.cts',
      };
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
