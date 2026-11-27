// Helpers shared by the system adapters of tools/generate-packs.mjs.

export const NS = "beavers-potions";

/** a stable 16 character id from a seed */
export const id16 = (seed) => (seed.replace(/[^a-zA-Z0-9]/g, "") + "0000000000000000").slice(0, 16);
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const componentKey = (uuid) => uuid.replace(/\./g, "-");

export const SECONDS = { rounds: 6, minutes: 60, hours: 3600, days: 86400 };
export const toSeconds = ([value, units]) => value * SECONDS[units];

/** the rules the runtime (src/) acts on, as flags of an effect: the same on every system */
export function runtimeEffectFlags(rules) {
  const f = {};
  for (const [rule, a, b] of rules) {
    switch (rule) {
      case "grants":
        if (a === "disadvantage") f.grantsDisadvantage = b?.sight ? "sight" : true;
        if (a === "advantage") f.grantsAdvantage = true;
        if (a === "critical") f.grantsCritical = true;
        break;
      case "attackAdvantage": f.attackAdvantage = true; break;
      case "distortion": f.distortion = a; break;
      case "turnStart": f.turnStart = a; break;
      case "aura": f.aura = a; break;
      case "light": f.light = a; break;
      case "exhaustionAtEnd": f.onEnd = { ...(f.onEnd ?? {}), exhaustion: a }; break;
      case "endOn": f.endOn = a; break;
      case "protectionFromDeath": f.protectionFromDeath = true; break;
      case "reflectDamage": f.reflectDamage = true; break;
      case "invulnerable": f.invulnerable = true; break;
    }
  }
  return f;
}

/** the rules the runtime acts on when the potion is drunk: item flag "use" */
export function runtimeUseFlags(rules) {
  const u = {};
  for (const [rule, a] of rules) {
    switch (rule) {
      case "restoreSlots": u.restoreSlots = { ...(u.restoreSlots ?? {}), maxLevel: a }; break;
      case "exhaustion": u.restoreSlots = { ...(u.restoreSlots ?? {}), exhaustion: a }; break;
      case "restoration": u.restoration = a; break;
      case "cure": (u.cure ??= []).push(a); break;
      case "drain": u.drain = a; break;
      case "area": u.area = { radius: a }; break;
      case "onlyCreatureType": u.onlyType = a; break;
    }
  }
  return u;
}

/** rules the runtime handles alone, whatever the system: they need no translation */
export const RUNTIME_RULES = new Set(["light", "endOn", "aura", "turnStart", "area", "drain", "exhaustionAtEnd"]);

/* -------------------------------------------- */
/*  Recipes and tables                          */
/* -------------------------------------------- */

const TESTS = (skill, dc) =>
  skill ? { fails: 1, consume: true, failsInARow: false, ands: { 1: { hits: 1, ors: { 1: { type: "SkillTest", data: { dc, skill } } } } } } : undefined;

/** the recipe flags of Beaver's Crafting */
export function recipeFlags({ name, gp, skill, dc, inputs, result }, lookup, macro) {
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
    macro: macro ?? "",
    folder: "Beaver's Potions",
    kind: "recipe",
  };
  return { "beavers-crafting": { subtype: "Recipe", recipe: JSON.parse(JSON.stringify(recipe)) } };
}

/** a roll table document (core data, Foundry 13 and 14) */
export function tableDoc(_id, name, entries) {
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

/** an active effect in the Foundry 14 data format (changes in system, duration in units) */
export function effectV14(itemId, potion, { name, img, description, duration, changes = [], statuses = [], flags = {}, system = {} }, index) {
  const _id = id16(`bpfx${potion.id.slice(0, 8)}${index}`);
  const [value, units] = duration ?? [null, null];
  return {
    _id,
    _key: `!items.effects!${itemId}.${_id}`,
    name: name ?? potion.effectName ?? potion.name,
    img: img ?? potion.img,
    type: "base",
    description: description ?? potion.description,
    system: {
      changes: changes.map(([key, type, value], i) => ({
        _id: id16(`${_id.slice(0, 12)}c${i}`),
        key,
        type,
        value,
        phase: "initial",
        priority: null,
      })),
      magical: true,
      ...system,
    },
    disabled: false,
    transfer: false,
    duration: value ? { value, units, expiry: "turnStart", expired: false } : { value: null, units: "seconds", expiry: null, expired: false },
    statuses,
    flags: Object.keys(flags).length ? { [NS]: flags } : {},
    tint: "#ffffff",
    showIcon: 1,
    origin: null,
    start: null,
    sort: 0,
  };
}

export const MUSHROOM_DESCRIPTION = "<p>A mushroom, an ingredient of Beaver's Potions.</p>";
export const ESSENCE_DESCRIPTION = "<p>The magic of a potion, distilled into a purple powder. Many potions need it.</p>";
export const RECIPE_DESCRIPTION = (skillLabel, dc) =>
  `<p>A recipe of Beaver's Potions, it needs the module Beaver's Crafting.</p>${skillLabel ? `<p>Brewing: ${skillLabel} check DC ${dc}.</p>` : ""}`;

/** the AnyOf macro of the mushrooms: the same on every system */
export const ANY_MUSHROOM_MACRO = `// beavers-crafting passes an item or a component of the actor
const doc = item?.system ? item : await item?.getEntity?.();
return doc?.flags?.["${NS}"]?.ingredient === "mushroom";`;

export const anyPotionMacro = (check) => `// beavers-crafting passes an item or a component of the actor
const doc = item?.system ? item : await item?.getEntity?.();
return doc?.flags?.["${NS}"]?.potion === true || (${check});`;
