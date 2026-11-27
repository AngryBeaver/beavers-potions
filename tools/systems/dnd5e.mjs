// dnd5e (>= 6, Foundry 14): consumables with activities, active effects in the Foundry 14 format.
import { effectV14, id16, NS, runtimeEffectFlags, runtimeUseFlags, RUNTIME_RULES, slug } from "./common.mjs";

const SOURCE = { custom: "Beaver's Potions", rules: "2014", book: "", license: "" };
const SKILLS = { persuasion: "per", perception: "prc", stealth: "ste" };
const ATTACK = { melee: ["mwak"], ranged: ["rwak"], spell: ["msak", "rsak"] };

/** rule -> [changes, statuses] in dnd5e; null: the runtime does it (or nothing to change) */
function translate([rule, a, b]) {
  switch (rule) {
    case "hpMax": return { changes: [["system.attributes.hp.tempmax", "add", String(a)]] };
    case "sense": return { changes: [[`system.attributes.senses.ranges.${a}`, "upgrade", String(b)]] };
    case "status": return { statuses: [a] };
    case "skillAdvantage": return { changes: [[`system.skills.${SKILLS[a]}.roll.mode`, "add", "1"]] };
    case "initiativeAdvantage": return { changes: [["system.attributes.init.roll.mode", "add", "1"]] };
    case "skillExpertise": return { changes: [[`system.skills.${SKILLS[a]}.value`, "upgrade", "2"]] };
    case "skillBonus": return { changes: [[`system.skills.${SKILLS[a]}.roll.bonus`, "add", String(b)]] };
    case "speed": return { changes: [["system.attributes.movement.multiplier", "multiply", String(a)]] };
    case "conditionImmunity": return { changes: [["system.traits.ci.value", "add", a]] };
    case "attunement": return { changes: [["system.attributes.attunement.max", "add", String(a)]] };
    case "ability": return { changes: [[`system.abilities.${a}.value`, "add", String(b)]] };
    case "ac": return { changes: [["system.attributes.ac.bonus", "add", b === undefined && a > 0 ? `+${a}` : String(a)]] };
    case "attackBonus": return { changes: ATTACK[a].map((k) => [`system.rolls.attack.${k}.bonus`, "add", String(b)]) };
    case "damageBonus": return { changes: ATTACK[a].map((k) => [`system.rolls.damage.${k}.bonus`, "add", String(b)]) };
    case "saveBonus": return { changes: [[`system.abilities.${a}.save.roll.bonus`, "add", String(b)]] };
    default: return {};
  }
}

function baseActivity(potion, type, name, effects, sort = 0, duration = potion.duration) {
  const [value, units] = duration ?? [null, null];
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
      affects: { choice: false, count: "", type: potion.rules.some(([r]) => r === "drain") ? "creature" : "self" },
      override: false,
      prompt: false,
    },
    uses: { spent: 0, recovery: [], max: "" },
    img: "",
    visibility: { requireMagic: false, level: { min: null, max: null }, identifier: "" },
  };
}

function healing(formula, type) {
  const m = String(formula).replace(/\s/g, "").match(/^(?:(\d+)d(\d+))?\+?(\d+)?$/);
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

export default {
  id: "dnd5e",
  label: "D&D 5e",
  suffix: "",
  core: 14,
  compatibility: { minimum: "6.0.0", verified: "6.1.1" },
  skills: { arc: "arc", his: "his", inv: "inv", med: "med", nat: "nat", rel: "rel", sur: "sur" },
  skillLabels: { arc: "Arcana", his: "History", inv: "Investigation", med: "Medicine", nat: "Nature", rel: "Religion", sur: "Survival" },
  lootType: "loot",
  potionCheck: 'doc?.type === "consumable" && doc.system.type?.value === "potion"',
  srdItems: {
    "Potion of Healing": ["Compendium.dnd5e.items.Item.ytlsBjYsZ7OBSEBs", "icons/consumables/potions/potion-tube-corked-red.webp"],
    "Potion of Greater Healing": ["Compendium.dnd5e.items.Item.L887NdWEP5NqHCrQ", "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp"],
    "Potion of Superior Healing": ["Compendium.dnd5e.items.Item.5m9ErO9In8Uc5yyf", "icons/consumables/potions/bottle-round-corked-red.webp"],
    "Potion of Supreme Healing": ["Compendium.dnd5e.items.Item.JFiSlgcm3uSSBM5t", "icons/consumables/potions/potion-flask-stopped-red.webp"],
  },

  potion(potion, { price }) {
    const _id = potion.id;
    const changes = [];
    const statuses = [];
    for (const rule of potion.rules) {
      const t = translate(rule);
      changes.push(...(t.changes ?? []));
      statuses.push(...(t.statuses ?? []));
    }
    const flags = runtimeEffectFlags(potion.rules);
    const transform = potion.rules.find(([r]) => r === "transform");
    const heal = potion.rules.find(([r]) => r === "heal" || r === "temp");

    const effects = [];
    if (!transform && (changes.length || statuses.length || Object.keys(flags).length || potion.duration)) {
      effects.push(effectV14(_id, potion, { duration: potion.duration, changes, statuses, flags }, 0));
    }
    let after;
    if (potion.after) {
      after = effectV14(_id, potion, potion.after, 9);
      effects.push(after);
    }

    const activities = {};
    const add = (a) => (activities[a._id] = a);
    const drinkEffects = effects.filter((e) => e !== after);
    if (transform) {
      const a = baseActivity(potion, "transform", "Drink", [], 0, null);
      a.profiles = [
        { _id: id16(`bpprof${_id.slice(0, 10)}`), name: transform[2], uuid: transform[1].dnd5e, cr: "", sizes: [], types: [], movement: [], level: { min: null, max: null } },
      ];
      a.transform = { customize: false, mode: "", preset: "polymorph", formless: false }; // "" = direct: exactly the profile's creature
      a.settings = null;
      add(a);
    } else if (heal) {
      const a = baseActivity(potion, "heal", "Drink", drinkEffects);
      a.healing = healing(heal[1], heal[0] === "temp" ? "temphp" : "healing");
      add(a);
    } else {
      add(baseActivity(potion, "utility", "Drink", drinkEffects));
    }
    if (potion.pour) add(baseActivity(potion, "utility", "Pour", [], 1, null));

    const use = runtimeUseFlags(potion.rules);
    if (transform) use.transform = { seconds: transform[3], after: after?._id };

    return {
      unsupported: [],
      doc: {
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
      },
    };
  },

  /** an ingredient or AnyOf item */
  loot(_id, name, img, { rarity = "common", price = 0, description = "", flags = {}, weight = 0.1 } = {}) {
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
  },

  recipe(_id, name, description, flags) {
    return {
      _id,
      _key: `!items!${_id}`,
      name,
      type: "loot",
      img: "icons/sundries/scrolls/scroll-worn-tan.webp",
      system: {
        description: { value: description, chat: "" },
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
      flags,
    };
  },
};

export { RUNTIME_RULES };
