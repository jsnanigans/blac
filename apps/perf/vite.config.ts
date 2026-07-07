import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../../packages/blac-core/src'),
      '@blac/react': path.resolve(__dirname, '../../packages/blac-react/src'),
    },
  },
  server: {
    port: 3001, // Optional: specify port if needed
    headers: {
      // Enable cross-origin isolation so `performance.now()` gets 5µs
      // resolution (vs the default 100µs clamp) for the pure-state benchmark.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
