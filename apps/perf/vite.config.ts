import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import path from 'path';

const src = (pkg: string) =>
  path.resolve(__dirname, `../../packages/${pkg}/src`);

// Cross-origin isolation gives `performance.now()` 5µs resolution (instead of
// a 100µs clamp) and enables `measureUserAgentSpecificMemory`.
const isolated = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Source, not dist, so the benchmark always measures the working tree.
      { find: '@blac/core', replacement: src('blac-core') },
      { find: '@blac/react', replacement: src('blac-react') },
      {
        find: '@dirtytalk/structural',
        replacement: src('dirtytalk-structural'),
      },
      { find: '@dirtytalk/engine', replacement: src('dirtytalk-engine') },
      // The profiling build keeps React.Profiler timings in production.
      { find: /^react-dom\/client$/, replacement: 'react-dom/profiling' },
    ],
  },
  server: { port: 3001, headers: isolated },
  preview: { port: 3001, headers: isolated },
});
