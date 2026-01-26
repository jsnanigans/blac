import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vitest config WITH React Compiler enabled
// This allows testing how the React 19 compiler interacts with @blac/react
export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              target: '19', // React 19 target
              // Optional: Enable compilation logs for debugging
              // compilationMode: 'annotation', // Only compile components with "use memo"
            },
          ],
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    onConsoleLog(log) {
      return true;
    },
  },
});
