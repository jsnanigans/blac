import { defineConfig } from 'vite';

// Vitest config WITHOUT React Compiler (default)
// Use vitest.config.compiler.ts to test with React 19 compiler enabled
// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    onConsoleLog(log) {
      return true;
    },
  },
});
