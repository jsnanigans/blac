import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      // Optionally, explicitly exclude tests if 'include' isn't sufficient
      // exclude: ['tests', '**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
      rollupTypes: true,
      entryRoot: 'src',
    }),
  ],
  publicDir: 'public',
  build: {
    lib: {
      entry: './src/index.ts', // Specifies the entry point for building the library.
      name: '@blac/core', // Sets the name of the generated library.
      fileName: (format: string) => `index.${format}.js`, // Generates the output file name based on the format.
      formats: ['cjs', 'es'], // Specifies the output formats (CommonJS and ES modules).
    },
    sourcemap: true, // Generates source maps for debugging.
    emptyOutDir: true, // Clears the output directory before building.
  },
});
