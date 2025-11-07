import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../../packages/blac/src'),
      '@blac/react': path.resolve(__dirname, '../../packages/blac-react/src'),
      '@blac/devtools-ui': path.resolve(__dirname, '../../packages/devtools-ui/src'),
    },
  },
  server: {
    port: 3002,
  },
});
