import path from 'node:path';
import { defineConfig } from 'vite-plus';

const src = (p: string) => path.resolve(__dirname, '../../packages', p);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@blac\/core$/, replacement: src('blac-core/src/index.ts') },
      { find: /^@blac\/lit$/, replacement: src('blac-lit/src/index.ts') },
      {
        find: /^@dirtytalk\/structural$/,
        replacement: src('dirtytalk-structural/src/index.ts'),
      },
      {
        find: /^@dirtytalk\/engine$/,
        replacement: src('dirtytalk-engine/src/index.ts'),
      },
    ],
  },
  server: { port: 3010 },
});
