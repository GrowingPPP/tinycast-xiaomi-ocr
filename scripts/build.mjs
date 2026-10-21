import { build } from "esbuild";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

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

const manifest = JSON.parse(await readFile("package.json", "utf8"));

for (const command of manifest.commands ?? []) {
  const tsxEntry = `src/${command.name}.tsx`;
  const entry = await access(tsxEntry).then(
    () => tsxEntry,
    () => `src/${command.name}.ts`,
  );
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    external: ["@raycast/api", "react", "react/jsx-runtime"],
    outfile: `build/${command.name}.js`,
    logLevel: "info",
  });
}

const extensionManifest = Object.fromEntries(
  MANIFEST_KEYS.filter((key) => key in manifest).map((key) => [key, manifest[key]]),
);
await writeFile("build/package.json", JSON.stringify(extensionManifest, null, 2) + "\n");

await cp("assets", "build/assets", { recursive: true });

console.log("built build/ocr-screen.js");
