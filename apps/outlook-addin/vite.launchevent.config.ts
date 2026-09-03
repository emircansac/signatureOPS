import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: resolve(__dirname, "../web/public/addin"),
    lib: {
      entry: resolve(__dirname, "src/launchevent.ts"),
      name: "SignatureOpsLaunch",
      formats: ["iife"],
      fileName: () => "launchevent.js",
    },
  },
});
