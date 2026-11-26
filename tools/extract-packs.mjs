#!/usr/bin/env node
// Extracts the LevelDB compendium packs into packs-src/<name>/*.json, the sources build.mjs compiles.
// Edit the compendiums in Foundry, then run this to bring the changes back into the repository.
//
// Usage: node tools/extract-packs.mjs [folder holding the packs]
//        default: the packs of the dev install (package.json "devDir"/<name>/packs)

import { extractPack } from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const MODULE = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const SOURCE = process.argv[2] || path.join(PACKAGE.devDir, PACKAGE.name, "packs");
const OUT = path.join(ROOT, "packs-src");

for (const { name } of MODULE.packs) {
  const packPath = path.join(SOURCE, name);
  if (!fs.existsSync(packPath)) {
    console.warn(`[extract] ${name}: ${packPath} not found, skipped`);
    continue;
  }
  // work on a copy: a running Foundry keeps the original locked
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "bp-pack-"));
  fs.cpSync(packPath, copy, { recursive: true });
  fs.rmSync(path.join(copy, "LOCK"), { force: true });
  const dest = path.join(OUT, name);
  fs.rmSync(dest, { recursive: true, force: true });
  await extractPack(copy, dest, { clean: true });
  fs.rmSync(copy, { recursive: true, force: true });
  console.log(`[extract] ${name} -> ${dest} (${fs.readdirSync(dest).length} files)`);
}
