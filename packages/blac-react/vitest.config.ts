import { defineConfig } from 'vite';
import path from 'path';

// Vitest config WITHOUT React Compiler (default)
// Use vitest.config.compiler.ts to test with React 19 compiler enabled
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac/src'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(__dirname, '../devtools-connect/src'),
      '@blac/plugin-graph': path.resolve(__dirname, '../plugins/system/graph/src'),
      '@blac/plugin-graph-react': path.resolve(__dirname, '../plugins/system/graph-react/src'),
      '@blac/plugin-persistence': path.resolve(__dirname, '../plugins/bloc/persistence/src'),
      '@blac/plugin-render-logging': path.resolve(__dirname, '../plugins/system/render-logging/src'),
    },
  },
  test: {
    globals: true,
    maxConcurrency: 2,
    maxWorkers: 2,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__archived__/**',
      '**/.*/**',
    ],
    onConsoleLog(log) {
      return true;
    },
  },
});
