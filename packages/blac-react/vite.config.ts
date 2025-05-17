import reactRefresh from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), dts({ include: ['src'], rollupTypes: true, entryRoot: 'src' })],
  publicDir: 'public',
  build: {
    lib: {
      entry: './src/index.ts', // Specifies the entry point for building the library.
      name: '@blac/react', // Sets the name of the generated library.
      fileName: (format: string) => `index.${format}.js`, // Generates the output file name based on the format.
      formats: ['cjs', 'es'], // Specifies the output formats (CommonJS and ES modules).
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@blac/core'], // Explicitly list peer/core deps
    },
    sourcemap: true, // Generates source maps for debugging.
    emptyOutDir: true, // Clears the output directory before building.
  },
});
