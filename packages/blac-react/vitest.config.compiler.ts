import { defineConfig } from 'vite-plus';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import path from 'path';

// Vitest config WITH React Compiler enabled
// This allows testing how the React 19 compiler interacts with @blac/react.
// @vitejs/plugin-react v6 dropped the inline `babel` option; the compiler is
// now wired via @rolldown/plugin-babel + the exported reactCompilerPreset.
export default defineConfig({
  resolve: {
    alias: {
      '@blac/core': path.resolve(__dirname, '../blac-core/src'),
      '@blac/adapter': path.resolve(__dirname, '../blac-adapter/src'),
      '@blac/react': path.resolve(__dirname, './src'),
      '@blac/devtools-connect': path.resolve(
        __dirname,
        '../devtools-connect/src',
      ),
    },
  },
  plugins: [
    react(),
    babel({
      presets: [
        reactCompilerPreset({
          target: '19', // React 19 target
        }),
      ],
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
    onConsoleLog(_log) {
      return true;
    },
  },
});
