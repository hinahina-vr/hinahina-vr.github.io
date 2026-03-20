import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const ROOT = join(import.meta.dirname, "..");
const ENTRY = join(ROOT, "src", "galge-runtime", "main.js");
const OUT_DIR = join(ROOT, "assets");
const OUT_FILE = join(OUT_DIR, "galge-runtime.bundle.js");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await build({
    entryPoints: [ENTRY],
    outfile: OUT_FILE,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    sourcemap: false,
    minify: false,
    logLevel: "info",
    charset: "utf8",
  });

  console.log(`✓ galge runtime bundled: ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
