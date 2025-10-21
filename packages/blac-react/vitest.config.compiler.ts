import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vitest config WITH React Compiler enabled
// This allows testing how the React 19 compiler interacts with @blac/react
export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac/src'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
      '@blac/plugin-graph': path.resolve(
        __dirname,
        '../plugins/system/graph/src',
      ),
      '@blac/plugin-graph-react': path.resolve(
        __dirname,
        '../plugins/system/graph-react/src',
      ),
      '@blac/plugin-persistence': path.resolve(
        __dirname,
        '../plugins/bloc/persistence/src',
      ),
      '@blac/plugin-render-logging': path.resolve(
        __dirname,
        '../plugins/system/render-logging/src',
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
