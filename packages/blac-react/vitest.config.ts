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
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  test: {
    globals: true,
    maxConcurrency: 2,
    maxWorkers: 2,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    hookTimeout: 30000, // 30 seconds for hooks (afterEach cleanup)
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
