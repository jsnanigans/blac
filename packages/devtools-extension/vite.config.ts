import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/content-script': resolve(__dirname, 'src/content/content-script.ts'),
        'inject/inject-script': resolve(__dirname, 'src/inject/inject-script.ts'),
        'devtools/devtools': resolve(__dirname, 'src/devtools/devtools.html'),
        'panel/index': resolve(__dirname, 'src/panel/index.html'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});