import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/graph/dag.ts",
    "src/memory/pool.ts"
  ],
  format: ["esm", "cjs"],
  dts: {
    compilerOptions: {
      ignoreDeprecations: "6.0",
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
});
