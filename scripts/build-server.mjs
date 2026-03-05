import * as esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function resolveTsPath(dir, name) {
  const withTs = path.join(dir, name + ".ts");
  if (fs.existsSync(withTs)) return withTs;
  const withTsx = path.join(dir, name + ".tsx");
  if (fs.existsSync(withTsx)) return withTsx;
  const indexTs = path.join(dir, name, "index.ts");
  if (fs.existsSync(indexTs)) return indexTs;
  return path.join(dir, name);
}

const aliasPlugin = {
  name: "alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const subpath = args.path.slice(2);
      const full = path.join(projectRoot, subpath);
      const dir = path.dirname(full);
      const name = path.basename(full);
      const resolved = resolveTsPath(dir, name);
      return { path: resolved };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(projectRoot, "apps/room-server/node.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: path.join(projectRoot, "dist/room-server.js"),
  format: "cjs",
  sourcemap: true,
  plugins: [aliasPlugin],
});

console.log("Built dist/room-server.js");
