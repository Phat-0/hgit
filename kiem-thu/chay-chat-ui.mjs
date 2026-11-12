import { build } from "../trang-web/node_modules/esbuild/lib/main.js";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const here = dirname(fileURLToPath(import.meta.url)),
  requireFront = createRequire(
    new URL("../trang-web/package.json", import.meta.url),
  );
const temp = mkdtempSync(join(here, ".ui-run-")),
  out = join(temp, "chat.mjs");
try {
  await build({
    entryPoints: [join(here, "chat-tien-ich.ui.tsx")],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
    loader: { ".css": "empty" },
    plugins: [
      {
        name: "one-react-instance",
        setup(b) {
          b.onResolve(
            { filter: /node_modules\/(react|react-dom)\// },
            (args) => ({
              path: resolve(args.resolveDir, args.path),
              external: true,
            }),
          );
          b.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, (args) => ({
            path: requireFront.resolve(args.path),
            external: true,
          }));
        },
      },
    ],
  });
  execFileSync(process.execPath, [out], { stdio: "inherit", timeout: 60000 });
} finally {
  rmSync(temp, { recursive: true, force: true });
}
