import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../schema_graph/static/schema_graph",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "main.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "main.css";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy Django API requests during development
      "/schema/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
