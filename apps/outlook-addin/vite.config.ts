import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/addin/",
  build: {
    outDir: resolve(__dirname, "../web/public/addin"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        commands: resolve(__dirname, "commands.html"),
        taskpane: resolve(__dirname, "taskpane.html"),
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
