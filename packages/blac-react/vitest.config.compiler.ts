import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest config WITH React Compiler enabled
// This allows testing how the React 19 compiler interacts with @blac/react
export default defineConfig({
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
