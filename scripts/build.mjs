import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const MANIFEST_KEYS = [
  "$schema",
  "name",
  "title",
  "description",
  "icon",
  "author",
  "license",
  "categories",
  "platforms",
  "commands",
  "preferences",
  "dependencies",
];

await rm("build", { recursive: true, force: true });
await mkdir("build", { recursive: true });

await build({
  entryPoints: ["src/ocr-screen.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["@raycast/api"],
  outfile: "build/ocr-screen.js",
  logLevel: "info",
});

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const extensionManifest = Object.fromEntries(
  MANIFEST_KEYS.filter((key) => key in manifest).map((key) => [key, manifest[key]]),
);
await writeFile("build/package.json", JSON.stringify(extensionManifest, null, 2) + "\n");

await cp("assets", "build/assets", { recursive: true });

console.log("built build/ocr-screen.js");
