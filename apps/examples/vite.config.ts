import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const src = (p: string) => path.resolve(__dirname, '../../packages', p);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve the workspace @blac/* packages to their TS source rather than the
    // published dist/. Keeps the examples (a dev/learning app) always running
    // against the latest library source — no rebuild needed — and ensures a
    // single module instance per package so internal cross-imports share the
    // same Symbol identities (e.g. the deps-merge symbols). Mirrors the `paths`
    // map in tsconfig.json so type-checking and runtime resolution agree.
    // Anchored regexes prevent `@blac/core` from shadowing `@blac/core/*`.
    alias: [
      {
        find: /^@blac\/core\/testing$/,
        replacement: src('blac-core/src/testing.ts'),
      },
      {
        find: /^@blac\/core\/tracking$/,
        replacement: src('blac-core/src/tracking.ts'),
      },
      { find: /^@blac\/core$/, replacement: src('blac-core/src/index.ts') },
      {
        find: /^@blac\/adapter$/,
        replacement: src('blac-adapter/src/index.ts'),
      },
      {
        find: /^@blac\/react\/testing$/,
        replacement: src('blac-react/src/testing.ts'),
      },
      { find: /^@blac\/react$/, replacement: src('blac-react/src/index.ts') },
      {
        find: /^@blac\/plugin-persist$/,
        replacement: src('plugin-persist/src/index.ts'),
      },
      {
        find: /^@dirtytalk\/spatial$/,
        replacement: src('dirtytalk-spatial/src/index.ts'),
      },
      {
        find: /^@dirtytalk\/engine$/,
        replacement: src('dirtytalk-engine/src/index.ts'),
      },
    ],
  },
  server: {
    port: 3002,
  },
});
