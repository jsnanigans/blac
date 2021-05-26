import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
  resolve: {},
  build: {
    outDir: "tool",
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        assetFileNames: `[name].js`,
        chunkFileNames: '[name].js',
        sanitizeFileName: false,
      }
    }
  },
  // rollupOutputOptions: {
  //   entryFileNames: '[name].js',
  // }
});
