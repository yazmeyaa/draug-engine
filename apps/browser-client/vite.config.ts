import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
});
