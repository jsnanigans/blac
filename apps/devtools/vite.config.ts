import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'extension/panel.html'),
        devtools: resolve(__dirname, 'extension/devtools.html'),
        background: resolve(__dirname, 'extension/background.ts'),
        contentScript: resolve(__dirname, 'extension/contentScript.ts'),
        inject: resolve(__dirname, 'extension/inject.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (
            chunkInfo.name === 'background' ||
            chunkInfo.name === 'contentScript' ||
            chunkInfo.name === 'inject'
          ) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  publicDir: 'public',
});
