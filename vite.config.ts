import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 8080,
    host: true, // Enable external access for Builder.io
  },
  build: {
    outDir: "dist/spa",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        // Optimize for Builder.io deployment
        manualChunks: undefined,
      },
    },
    // Optimize for Builder.io
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
  },
  define: {
    // Builder.io environment variables
    __BUILDER_IO_ENV__: JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  // Builder.io optimizations
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
