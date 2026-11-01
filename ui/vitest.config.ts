import { mergeConfig } from "vite";
import viteConfig from "./vite.config";

// Test-only settings on top of the app's Vite config (plugins, __APP_VERSION__).
// Kept apart because vitest bundles its own Vite, whose config types differ.
export default mergeConfig(viteConfig, {
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
