import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/std/components/index.ts",
    "src/std/math/index.ts",
    "src/std/systems/index.ts",
    "src/std/utils/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: {
    compilerOptions: {
      ignoreDeprecations: "6.0",
      declarationMap: true,
    }
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
});