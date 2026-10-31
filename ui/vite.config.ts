import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Baked into the bundle so the UI shows the release it was built from (issue #128).
  // ui/package.json and pyproject.toml are bumped together; tests/test_version.py keeps them equal.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "../schematic/static/schematic",
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
