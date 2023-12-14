import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { dependencies, devDependencies } from './package.json';

const external = [
  ...Object.keys(dependencies),
  ...Object.keys(devDependencies),
].filter((name) => {
  return name;
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), dts()],
  publicDir: 'public',
  build: {
    lib: {
      entry: './src/index.ts', // Specifies the entry point for building the library.
      name: 'blac-react', // Sets the name of the generated library.
      fileName: (format) => `index.${format}.js`, // Generates the output file name based on the format.
      formats: ['cjs', 'es'], // Specifies the output formats (CommonJS and ES modules).
    },
    rollupOptions: {
      external: [...external, 'react', 'react-dom', 'react/jsx-runtime'], // Defines external dependencies for Rollup bundling.
    },
    sourcemap: true, // Generates source maps for debugging.
    emptyOutDir: true, // Clears the output directory before building.
  },
});
