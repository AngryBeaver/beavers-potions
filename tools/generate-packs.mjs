#!/usr/bin/env node
// Generates packs-src for every supported system from tools/potions.mjs (the potions, system independent) and
// tools/recipes.mjs (ingredients, recipes, tables). tools/systems/<system>.mjs translates them into the system's
// documents. dnd5e keeps the pack names potions, ingredients, recipes, tables; the other systems get <pack>-<system>.
//
// Every potion carries its rules (flags["beavers-potions"].rules) and the rules its system cannot do
// (flags["beavers-potions"].unsupported); the end-to-end test in beavers-testing checks them.
//
// Usage: node tools/generate-packs.mjs [system ...]   (default: all)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { POTIONS, PRICES } from "./potions.mjs";
import { ANY_MUSHROOM, ANY_POTION, ESSENCE, GATHER_ESSENCE_MACRO, MUSHROOMS, RECIPES, TABLES } from "./recipes.mjs";
import {
  ANY_MUSHROOM_MACRO,
  anyPotionMacro,
  ESSENCE_DESCRIPTION,
  MUSHROOM_DESCRIPTION,
  NS,
  RECIPE_DESCRIPTION,
  recipeFlags,
  tableDoc,
} from "./systems/common.mjs";
import dnd5e from "./systems/dnd5e.mjs";
import a5e from "./systems/a5e.mjs";
import d35e from "./systems/D35E.mjs";
import pf1 from "./systems/pf1.mjs";
import pf2e from "./systems/pf2e.mjs";

export const SYSTEMS = [dnd5e, a5e, d35e, pf1, pf2e];

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "packs-src");
const fileName = (name, id) => `${name.replace(/[^a-zA-Z0-9]+/g, "_")}_${id}.json`;

const packName = (system, pack) => (system.suffix ? `${pack}-${system.id}` : pack);

function write(dir, doc) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName(doc.name, doc._id)), JSON.stringify(doc, null, 2) + "\n");
}

function generate(system) {
  const dir = (pack) => path.join(OUT, packName(system, pack));
  for (const pack of ["potions", "ingredients", "recipes", "tables"]) fs.rmSync(dir(pack), { recursive: true, force: true });
  const uuid = (pack, id, type = "Item") => `Compendium.${NS}.${packName(system, pack)}.${type}.${id}`;

  // potions
  const potions = [];
  const support = {};
  for (const p of POTIONS) {
    const { doc, unsupported } = system.potion(p, { price: p.price ?? PRICES[p.rarity] });
    doc.flags ??= {};
    doc.flags[NS] = { ...(doc.flags[NS] ?? {}), potion: true, rarity: p.rarity, rules: p.rules, ...(unsupported.length ? { unsupported } : {}) };
    write(dir("potions"), doc);
    potions.push(doc);
    support[p.name] = unsupported;
  }

  // ingredients
  const ingredients = [
    ...MUSHROOMS.map(([id, name, img]) => system.loot(id, name, img, { description: MUSHROOM_DESCRIPTION, flags: { [NS]: { ingredient: "mushroom" } } })),
    system.loot(ESSENCE[0], ESSENCE[1], ESSENCE[2], { rarity: "uncommon", price: 10, description: ESSENCE_DESCRIPTION, flags: { [NS]: { ingredient: "essence" } } }),
    ...[
      [ANY_MUSHROOM, ANY_MUSHROOM_MACRO, "<p>Any mushroom of Beaver's Potions.</p>"],
      [ANY_POTION, anyPotionMacro(system.potionCheck), "<p>Any potion.</p>"],
    ].map(([[id, name], macro, description]) =>
      system.loot(id, name, "modules/beavers-crafting/icons/anyOf.png", {
        description,
        weight: 0,
        flags: { "beavers-crafting": { subtype: "AnyOf", anyOf: { macro } } },
      }),
    ),
  ];
  ingredients.forEach((i) => write(dir("ingredients"), i));

  // recipe components: potions, ingredients, the system's own healing potions, tables
  const components = new Map();
  const itemComponent = (doc, pack, type = "Item") => ({ id: doc._id, uuid: uuid(pack, doc._id), img: doc.img, name: doc.name, type, itemType: doc.type });
  potions.forEach((p) => components.set(p.name, itemComponent(p, "potions")));
  ingredients.forEach((i) => components.set(i.name, itemComponent(i, "ingredients", i.flags["beavers-crafting"]?.subtype === "AnyOf" ? "AnyOf" : "Item")));
  const srd = system.srdItems ?? {};
  for (const [name, [u, img, itemType, realName]] of Object.entries(srd)) {
    components.set(name, { id: u.split(".").pop(), uuid: u, img, name: realName ?? name, type: "Item", itemType: itemType ?? "consumable" });
  }
  const tables = TABLES.map(([id, name, rarity, extra]) => {
    const entries = potions.filter((p) => POTIONS.find((x) => x.id === p._id).rarity === rarity).map((p) => ({ name: p.name, img: p.img, uuid: uuid("potions", p._id) }));
    if (extra && srd[extra]) entries.push({ name: srd[extra][3] ?? extra, img: srd[extra][1], uuid: srd[extra][0] });
    return tableDoc(id, name, entries);
  });
  tables.forEach((t) => {
    write(dir("tables"), t);
    components.set(t.name, { id: t._id, uuid: uuid("tables", t._id, "RollTable"), img: t.img, name: t.name, type: "RollTable" });
  });
  const lookup = (name) => {
    const c = components.get(name);
    if (!c) throw new Error(`${system.id}: unknown recipe component "${name}"`);
    return c;
  };
  let recipes = 0;
  for (const [id, name, gp, skill, dc, inputs, result] of RECIPES) {
    if (!components.has(result)) continue; // e.g. no SRD healing potion of that strength in the system
    const macro = name === "Gather Essence" ? GATHER_ESSENCE_MACRO(uuid("ingredients", ESSENCE[0]), system.lootType) : "";
    const flags = recipeFlags({ name, gp, skill: system.skills[skill], dc: system.dc?.(dc) ?? dc, inputs, result }, lookup, macro);
    write(dir("recipes"), system.recipe(id, name, RECIPE_DESCRIPTION(system.skillLabels[skill], system.dc?.(dc) ?? dc), flags));
    recipes++;
  }
  const notFull = Object.entries(support).filter(([, u]) => u.length);
  console.log(`${system.id}: ${potions.length} potions (${notFull.length} with rules the system cannot do), ${ingredients.length} ingredients, ${recipes} recipes, ${tables.length} tables`);
  return support;
}

const wanted = process.argv.slice(2);
const supportFile = path.join(ROOT, "tools", "support.json");
const report = fs.existsSync(supportFile) ? JSON.parse(fs.readFileSync(supportFile, "utf8")) : {};
for (const system of SYSTEMS) {
  if (system.stub || (wanted.length && !wanted.includes(system.id))) continue;
  report[system.id] = generate(system);
}
// what each system cannot do, for the README / the test dashboard
fs.writeFileSync(path.join(ROOT, "tools", "support.json"), JSON.stringify(report, null, 2) + "\n");

// module.json: the packs of every system (Foundry shows only those of the world's system)
const moduleFile = path.join(ROOT, "module.json");
const manifest = JSON.parse(fs.readFileSync(moduleFile, "utf8"));
const LABELS = { potions: "Potions", ingredients: "Ingredients", recipes: "Recipes", tables: "Random Potions" };
const active = SYSTEMS.filter((s) => !s.stub);
manifest.packs = active.flatMap((system) =>
  Object.entries(LABELS).map(([pack, label]) => ({
    label,
    name: packName(system, pack),
    path: `packs/${packName(system, pack)}`,
    system: system.id,
    type: pack === "tables" ? "RollTable" : "Item",
    ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" },
  })),
);
manifest.relationships.systems = active.map((s) => ({ id: s.id, type: "system", compatibility: s.compatibility ?? {} }));
manifest.compatibility = { minimum: String(Math.min(...active.map((s) => s.core))), verified: "14" };
fs.writeFileSync(moduleFile, JSON.stringify(manifest, null, 2) + "\n");
