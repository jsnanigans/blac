import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    onConsoleLog(log) {
    //   if (log.startsWith("UNIT")) {
    //     return true;
    //   }
    //   return false;
      return true
    }
  },
});
