import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@blac/plugin-persist': path.resolve(
        __dirname,
        '../../packages/plugin-persist/src/index.ts',
      ),
    },
  },
  server: {
    port: 3002,
  },
});
