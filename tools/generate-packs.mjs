#!/usr/bin/env node
// Generates packs-src (potions, ingredients, recipes, tables) from tools/potions.mjs and tools/recipes.mjs.
// The potions work with dnd5e (>= 6) alone: activities and active effects, the rest is done by src/ through the
// flags["beavers-potions"] of items and effects.
//
// Usage: node tools/generate-packs.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { POTIONS, PRICES } from "./potions.mjs";
import { ANY_MUSHROOM, ANY_POTION, ESSENCE, GATHER_ESSENCE_MACRO, MUSHROOMS, RECIPES, SRD_ITEMS, TABLES } from "./recipes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "packs-src");
const NS = "beavers-potions";
const SOURCE = { custom: "Beaver's Potions", rules: "2014", book: "", license: "" };

/** a stable 16 character id from a seed */
const id16 = (seed) => (seed.replace(/[^a-zA-Z0-9]/g, "") + "0000000000000000").slice(0, 16);
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fileName = (name, id) => `${name.replace(/[^a-zA-Z0-9]+/g, "_")}_${id}.json`;

function write(pack, doc) {
  const dir = path.join(OUT, pack);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName(doc.name, doc._id)), JSON.stringify(doc, null, 2) + "\n");
}

/* -------------------------------------------- */
/*  Potions                                     */
/* -------------------------------------------- */

function effectDoc(itemId, potion, def, index) {
  const _id = id16(`bpfx${potion.id.slice(0, 8)}${index}`);
  const [value, units] = def.duration ?? [null, null];
  return {
    _id,
    _key: `!items.effects!${itemId}.${_id}`,
    name: def.name ?? potion.name,
    img: def.img ?? potion.img,
    type: "base",
    description: def.description ?? potion.description,
    system: {
      changes: (def.changes ?? []).map(([key, type, value], i) => ({
        _id: id16(`${_id.slice(0, 12)}c${i}`),
        key,
        type,
        value,
        phase: "initial",
        priority: null,
      })),
      magical: true,
    },
    disabled: false,
    transfer: false,
    duration: value ? { value, units, expiry: "turnStart", expired: false } : { value: null, units: "seconds", expiry: null, expired: false },
    statuses: def.statuses ?? [],
    flags: def.flags ? { [NS]: def.flags } : {},
    tint: "#ffffff",
    showIcon: 1,
    origin: null,
    start: null,
    sort: 0,
  };
}

function baseActivity(potion, type, name, effects, sort = 0) {
  const [value, units] = potion.effect?.duration ?? [null, null];
  const durationUnits = { rounds: "round", minutes: "minute", hours: "hour", days: "day" }[units] ?? "inst";
  return {
    _id: id16(`bpact${potion.id.slice(0, 7)}${name}`),
    type,
    name,
    sort,
    activation: { type: "action", value: null, override: false, condition: "" },
    consumption: { scaling: { allowed: false }, spellSlot: true, targets: [{ type: "itemUses", value: "1", target: "" }] },
    description: { chatFlavor: "" },
    duration: { units: durationUnits, value: value ? String(value) : undefined, concentration: false, override: false },
    effects: effects.map((e) => ({ _id: e._id, level: { min: null, max: null } })),
    range: { units: "self", override: false, special: "" },
    target: {
      template: { contiguous: false, units: "ft", type: "" },
      affects: { choice: false, count: "", type: potion.use?.drain ? "creature" : "self" },
      override: false,
      prompt: false,
    },
    uses: { spent: 0, recovery: [], max: "" },
    img: "",
    visibility: { requireMagic: false, level: { min: null, max: null }, identifier: "" },
  };
}

function healing(formula, type) {
  const m = formula.replace(/\s/g, "").match(/^(?:(\d+)d(\d+))?\+?(\d+)?$/);
  if (!m) throw new Error(`healing formula ${formula}`);
  return {
    number: m[1] ? Number(m[1]) : null,
    denomination: m[2] ? Number(m[2]) : null,
    bonus: m[3] ?? "",
    types: [type],
    custom: { enabled: false, formula: "" },
    scaling: { mode: "", number: 1, formula: "" },
  };
}

function potionDoc(potion) {
  const _id = potion.id;
  const effects = [];
  for (const def of potion.effects ?? (potion.effect ? [potion.effect] : [])) effects.push(effectDoc(_id, potion, def, effects.length));
  let after;
  if (potion.transform?.after) {
    after = effectDoc(_id, potion, potion.transform.after, 9);
    after.transfer = false;
    effects.push(after);
  }

  const activities = {};
  const add = (a) => (activities[a._id] = a);
  const drinkEffects = effects.filter((e) => e !== after);
  if (potion.transform) {
    const a = baseActivity(potion, "transform", "Drink", []);
    a.duration = { units: "inst", concentration: false, override: false };
    a.profiles = [
      {
        _id: id16(`bpprof${_id.slice(0, 10)}`),
        name: potion.transform.name,
        uuid: potion.transform.uuid,
        cr: "",
        sizes: [],
        types: [],
        movement: [],
        level: { min: null, max: null },
      },
    ];
    a.transform = { customize: false, mode: "", preset: "polymorph", formless: false }; // "" = direct: exactly the profile's creature
    a.settings = null;
    add(a);
  } else if (potion.heal) {
    const a = baseActivity(potion, "heal", "Drink", drinkEffects);
    a.healing = healing(potion.heal.formula, potion.heal.type);
    add(a);
  } else {
    add(baseActivity(potion, "utility", "Drink", drinkEffects));
  }
  if (potion.pour) add(baseActivity({ ...potion, effect: undefined }, "utility", "Pour", [], 1));

  const use = { ...(potion.use ?? {}) };
  if (potion.transform) use.transform = { seconds: potion.transform.seconds, after: after?._id };
  const price = potion.price ?? PRICES[potion.rarity];

  return {
    _id,
    _key: `!items!${_id}`,
    name: potion.name,
    type: "consumable",
    img: potion.img,
    system: {
      description: { value: potion.description, chat: "" },
      identifier: slug(potion.name),
      source: SOURCE,
      quantity: 1,
      weight: { value: 0.5, units: "lb" },
      price: { value: price, denomination: "gp" },
      rarity: potion.rarity,
      identified: true,
      unidentified: { description: "" },
      container: null,
      attunement: "",
      attuned: false,
      equipped: false,
      type: { value: "potion", subtype: "" },
      properties: ["mgc"],
      uses: { spent: 0, max: "1", recovery: [], autoDestroy: true },
      activities,
    },
    effects,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { [NS]: { potion: true, ...(Object.keys(use).length ? { use } : {}) } },
  };
}

/* -------------------------------------------- */
/*  Ingredients                                 */
/* -------------------------------------------- */

function lootDoc([_id, name, img], { rarity = "common", price = 0, description = "", flags = {}, weight = 0.1 } = {}) {
  return {
    _id,
    _key: `!items!${_id}`,
    name,
    type: "loot",
    img,
    system: {
      description: { value: description, chat: "" },
      identifier: slug(name),
      source: SOURCE,
      quantity: 1,
      weight: { value: weight, units: "lb" },
      price: { value: price, denomination: "gp" },
      rarity,
      identified: true,
      unidentified: { description: "" },
      container: null,
      type: { value: "material", subtype: "" },
      properties: [],
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags,
  };
}

const anyOfDoc = ([_id, name], macro, description) =>
  lootDoc([_id, name, "modules/beavers-crafting/icons/anyOf.png"], {
    description,
    weight: 0,
    flags: { "beavers-crafting": { subtype: "AnyOf", anyOf: { macro } } },
  });

/* -------------------------------------------- */
/*  Recipes and tables                          */
/* -------------------------------------------- */

const componentKey = (uuid) => uuid.replace(/\./g, "-");
const TESTS = (skill, dc) =>
  skill ? { fails: 1, consume: true, failsInARow: false, ands: { 1: { hits: 1, ors: { 1: { type: "SkillTest", data: { dc, skill } } } } } } : undefined;

function recipeDoc([_id, name, gp, skill, dc, inputs, result], lookup) {
  const input = {};
  inputs.forEach(([quantity, ingredient], i) => {
    const c = lookup(ingredient);
    input[i + 1] = { [componentKey(c.uuid)]: { ...c, quantity } };
  });
  const out = lookup(result);
  const recipe = {
    required: {},
    input,
    output: { 1: { [componentKey(out.uuid)]: { ...out, quantity: 1 } } },
    currency: gp ? { name: "gp", value: gp } : undefined,
    beaversTests: TESTS(skill, dc),
    macro: name === "Gather Essence" ? GATHER_ESSENCE_MACRO : "",
    folder: "Beaver's Potions",
    kind: "recipe",
  };
  const skillLabel = { arc: "Arcana", his: "History", inv: "Investigation", med: "Medicine", nat: "Nature", rel: "Religion", sur: "Survival" }[skill];
  return {
    _id,
    _key: `!items!${_id}`,
    name,
    type: "loot",
    img: "icons/sundries/scrolls/scroll-worn-tan.webp",
    system: {
      description: {
        value: `<p>A recipe of Beaver's Potions, it needs the module Beaver's Crafting.</p>${skillLabel ? `<p>Brewing: ${skillLabel} check DC ${dc}.</p>` : ""}`,
        chat: "",
      },
      identifier: `recipe-${slug(name)}`,
      source: SOURCE,
      quantity: 1,
      weight: { value: 0, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: "",
      identified: true,
      type: { value: "", subtype: "" },
      properties: [],
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { "beavers-crafting": { subtype: "Recipe", recipe: JSON.parse(JSON.stringify(recipe)) } },
  };
}

function tableDoc([_id, name, rarity, extra]) {
  const entries = POTIONS.filter((p) => p.rarity === rarity).map((p) => ({
    name: p.name,
    img: p.img,
    uuid: `Compendium.${NS}.potions.Item.${p.id}`,
  }));
  if (extra) entries.push({ name: extra, img: SRD_ITEMS[extra][1], uuid: SRD_ITEMS[extra][0] });
  return {
    _id,
    _key: `!tables!${_id}`,
    name,
    img: "icons/tools/laboratory/vials-blue-pink.webp",
    description: `<p>A random ${name.toLowerCase().replace(" potions", "")} potion.</p>`,
    formula: `1d${entries.length}`,
    replacement: true,
    displayRoll: true,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    results: entries.map((e, i) => {
      const rid = id16(`bptr${_id.slice(0, 8)}${String(i).padStart(2, "0")}`);
      return {
        _id: rid,
        _key: `!tables.results!${_id}.${rid}`,
        type: "document",
        name: e.name,
        img: e.img,
        description: "",
        documentUuid: e.uuid,
        weight: 1,
        range: [i + 1, i + 1],
        drawn: false,
        flags: {},
      };
    }),
  };
}

/* -------------------------------------------- */

fs.rmSync(OUT, { recursive: true, force: true });

const potions = POTIONS.map(potionDoc);
potions.forEach((p) => write("potions", p));

const ingredients = [
  ...MUSHROOMS.map((m) =>
    lootDoc(m, {
      description: "<p>A mushroom, an ingredient of Beaver's Potions.</p>",
      flags: { [NS]: { ingredient: "mushroom" } },
    }),
  ),
  lootDoc(ESSENCE, {
    rarity: "uncommon",
    price: 10,
    description: "<p>The magic of a potion, distilled into a purple powder. Many potions need it.</p>",
    flags: { [NS]: { ingredient: "essence" } },
  }),
  anyOfDoc(ANY_MUSHROOM, `// beavers-crafting passes an item or a component of the actor
const doc = item?.system ? item : await item?.getEntity?.();
return doc?.flags?.["${NS}"]?.ingredient === "mushroom";`, "<p>Any mushroom of Beaver's Potions.</p>"),
  anyOfDoc(
    ANY_POTION,
    `// beavers-crafting passes an item or a component of the actor
const doc = item?.system ? item : await item?.getEntity?.();
return doc?.type === "consumable" && doc.system.type?.value === "potion";`,
    "<p>Any potion.</p>",
  ),
];
ingredients.forEach((i) => write("ingredients", i));

const components = new Map();
const itemComponent = (doc, pack, type = "Item") => ({
  id: doc._id,
  uuid: `Compendium.${NS}.${pack}.Item.${doc._id}`,
  img: doc.img,
  name: doc.name,
  type,
  itemType: doc.type,
});
potions.forEach((p) => components.set(p.name, itemComponent(p, "potions")));
ingredients.forEach((i) =>
  components.set(i.name, itemComponent(i, "ingredients", i.flags["beavers-crafting"]?.subtype === "AnyOf" ? "AnyOf" : "Item")),
);
for (const [name, [uuid, img]] of Object.entries(SRD_ITEMS)) {
  components.set(name, { id: uuid.split(".").pop(), uuid, img, name, type: "Item", itemType: "consumable" });
}
const tables = TABLES.map(tableDoc);
tables.forEach((t) => {
  write("tables", t);
  components.set(t.name, { id: t._id, uuid: `Compendium.${NS}.tables.RollTable.${t._id}`, img: t.img, name: t.name, type: "RollTable" });
});
const lookup = (name) => {
  const c = components.get(name);
  if (!c) throw new Error(`unknown recipe component "${name}"`);
  return c;
};
for (const r of RECIPES) write("recipes", recipeDoc(r, lookup));

const missing = POTIONS.filter((p) => !RECIPES.some((r) => r[6] === p.name)).map((p) => p.name);
console.log(`${potions.length} potions, ${ingredients.length} ingredients, ${RECIPES.length} recipes, ${tables.length} tables`);
if (missing.length) console.log(`potions without recipe: ${missing.join(", ")}`);
