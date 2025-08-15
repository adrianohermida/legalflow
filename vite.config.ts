import { defineConfig } from "vite";
import path from "path";

// Simple config optimized for Builder.io
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    outDir: "dist/spa",
    emptyOutDir: true,
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
