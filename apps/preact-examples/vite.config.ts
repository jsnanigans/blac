import preact from '@preact/preset-vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 3003,
  },
});
