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
      // Resolve to source (like core/react above) so tracker changes are picked
      // up live — otherwise this consumes the prebuilt dist and drifts stale.
      '@dirtytalk/structural': path.resolve(
        __dirname,
        '../../packages/dirtytalk-structural/src',
      ),
      // Same reason: the engine owns DirtyChannel's mark/flush hot path, and
      // its package entry points at dist/, so without this the benchmark would
      // measure a stale prebuilt engine and silently miss changes.
      '@dirtytalk/engine': path.resolve(
        __dirname,
        '../../packages/dirtytalk-engine/src',
      ),
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
