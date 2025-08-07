import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@blac/core': path.resolve(__dirname, '../../packages/blac/src'),
      '@blac/react': path.resolve(__dirname, '../../packages/blac-react/src'),
      '@blac/plugin-persistence': path.resolve(__dirname, '../../packages/plugins/bloc/persistence/src'),
      '@blac/plugin-render-logging': path.resolve(__dirname, '../../packages/plugins/system/render-logging/src'),
    },
  },
  server: {
    port: 3003,
    open: true,
  },
});