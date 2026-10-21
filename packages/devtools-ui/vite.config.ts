import { defineConfig } from 'vite-plus';
import path from 'path';

const connect = (file: string) =>
  path.resolve(__dirname, '../devtools-connect/src', file);

export default defineConfig({
  resolve: {
    alias: {
      '@blac/devtools-connect/client': connect('client.ts'),
      '@blac/devtools-connect/protocol': connect('protocol.ts'),
    },
  },
  pack: {
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
