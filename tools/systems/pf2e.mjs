// Pathfinder 2e (pf2e, Foundry 13): consumables (potion); what a potion does is a pf2e effect item with rule elements
// (flags["beavers-potions"].effects) the runtime puts on the drinker. 5e terms are translated:
// advantage: roll twice and keep the higher (RollTwice); attacks against you with advantage: off-guard; with
// disadvantage: concealed; exhaustion: drained; conditions are granted condition items.
import { id16, NS, runtimeUseFlags, slug } from "./common.mjs";
import { translatePotion } from "./pf1.mjs";

const COND = "Compendium.pf2e.conditionitems.Item.";
export const PF2E_CONDITIONS = {
  invisible: "zJxUflt9np0q4yML", incapacitated: "6uEgoh53GbXuHpTF" /* paralyzed */, blinded: "XgEqL1kFApUbl5Z2",
  deafened: "9PR9y0bi4JPKnHPR", paralyzed: "6uEgoh53GbXuHpTF", poisoned: "fesd1n5eVhpCSS18" /* sickened */,
  frightened: "TBSHQspnbcqxsmjL", prone: "j91X7x0XSomq8d60",
};
const SKILLS = { persuasion: "diplomacy", perception: "perception", stealth: "stealth" };
const SAVES = { str: "fortitude", con: "fortitude", dex: "reflex", int: "will", wis: "will", cha: "will" };
const ATTACK = { melee: "melee-strike-attack-roll", ranged: "ranged-strike-attack-roll", spell: "spell-attack-roll" };
const DAMAGE = { melee: "melee-strike-damage", ranged: "ranged-strike-damage", spell: "spell-damage" };
const UNITS = { rounds: "rounds", minutes: "minutes", hours: "hours", days: "days" };
const RARITY = { common: "common", uncommon: "uncommon", rare: "rare", veryRare: "rare", legendary: "unique" };
const LEVEL = { common: 1, uncommon: 4, rare: 8, veryRare: 12, legendary: 16 };

const flat = (selector, value, type = "untyped") => ({ key: "FlatModifier", selector, value, type, label: "Beaver's Potions" });
const grant = (id) => ({ key: "GrantItem", uuid: COND + id, onDeleteActions: { grantee: "restrict" } });

function translate([rule, a, b]) {
  switch (rule) {
    case "hpMax": return { changes: [flat("hp", a)] };
    case "sense": return a === "blindsight" ? { changes: [{ key: "Sense", selector: "echolocation", acuity: "precise", range: b }] } : null;
    case "status": return PF2E_CONDITIONS[a] ? { changes: [grant(PF2E_CONDITIONS[a])] } : null;
    case "skillAdvantage": return { changes: [{ key: "RollTwice", selector: SKILLS[a], keep: "higher" }] };
    case "initiativeAdvantage": return { changes: [{ key: "RollTwice", selector: "initiative", keep: "higher" }] };
    case "skillExpertise": return { changes: [flat(SKILLS[a], 2, "status")] };
    case "skillBonus": return { changes: [flat(SKILLS[a], b)] };
    case "speed":
      return { changes: [{ key: "ActiveEffectLike", path: "system.attributes.speed.value", mode: a === 0 ? "override" : "multiply", value: a }] };
    case "conditionImmunity": return { changes: [{ key: "Immunity", type: a }] };
    case "ability": return { changes: [{ key: "ActiveEffectLike", path: `system.abilities.${a}.mod`, mode: "add", value: b }] };
    case "ac": return { changes: [flat("ac", a)] };
    case "attackBonus": return { changes: [flat(ATTACK[a], b)] };
    case "damageBonus": return { changes: [flat(DAMAGE[a], b)] };
    case "saveBonus": return { changes: [flat(SAVES[a], b)] };
    case "grants":
      if (a === "advantage") return { changes: [grant("AJh5ex99aV6VTggg")] }; // off-guard
      if (a === "disadvantage") return { changes: [grant("DmAIPqOBomZ7H95W")] }; // concealed
      return null;
    case "attackAdvantage": return { changes: [{ key: "RollTwice", selector: "attack-roll", keep: "higher" }] };
    case "heal": case "temp": case "restoreSlots": case "exhaustion": case "exhaustionAtEnd": case "restoration":
    case "drain": case "area": case "onlyCreatureType": case "turnStart": case "aura": case "light": case "endOn":
    case "protectionFromDeath": case "invulnerable": case "distortion":
      return {};
    // no attunement, disease, polymorph (battle forms are too different) or damage source
    default: return null;
  }
}

export default {
  id: "pf2e",
  label: "Pathfinder 2e",
  suffix: true,
  core: 13,
  compatibility: { minimum: "7.0.0", verified: "7.12.2" },
  skills: { arc: "arcana", his: "society", inv: "society", med: "medicine", nat: "nature", rel: "religion", sur: "survival" },
  skillLabels: { arc: "Arcana", his: "Society", inv: "Society", med: "Medicine", nat: "Nature", rel: "Religion", sur: "Survival" },
  lootType: "treasure",
  potionCheck: 'doc?.type === "consumable" && doc.system.category === "potion"',
  dc: (dc) => dc + 5,
  srdItems: {
    "Potion of Healing": ["Compendium.pf2e.equipment-srd.Item.2RuepCemJhrpKKao", "icons/consumables/potions/bottle-round-corked-orante-red.webp", "consumable", "Healing Potion (Minor)"],
    "Potion of Greater Healing": ["Compendium.pf2e.equipment-srd.Item.e0vSAQfxhHauiAoD", "icons/consumables/potions/bottle-round-corked-orante-red.webp", "consumable", "Healing Potion (Lesser)"],
    "Potion of Superior Healing": ["Compendium.pf2e.equipment-srd.Item.G7haQ5gDt30ftJLC", "icons/consumables/potions/bottle-round-corked-orante-red.webp", "consumable", "Healing Potion (Moderate)"],
    "Potion of Supreme Healing": ["Compendium.pf2e.equipment-srd.Item.TSrbwHW8zm0mhkwb", "icons/consumables/potions/bottle-round-corked-orante-red.webp", "consumable", "Healing Potion (Greater)"],
  },

  potion(potion, { price }) {
    const _id = potion.id;
    const { changes, unsupported, flags } = translatePotion(potion, translate);
    const effects = [];
    if (changes.length || Object.keys(flags).length || potion.duration) {
      effects.push({
        name: `Effect: ${potion.effectName ?? potion.name}`,
        type: "effect",
        img: potion.img,
        system: {
          description: { value: potion.description },
          duration: potion.duration
            ? { value: potion.duration[0], unit: UNITS[potion.duration[1]], expiry: "turn-start", sustained: false }
            : { value: -1, unit: "unlimited", expiry: null, sustained: false },
          rules: changes,
          tokenIcon: { show: true },
          level: { value: LEVEL[potion.rarity] },
          traits: { value: [], rarity: "common" },
          slug: `effect-${slug(potion.name)}`,
        },
        flags: { [NS]: { ...flags, source: `${slug(potion.name)}.effect` } },
      });
    }
    const use = runtimeUseFlags(potion.rules);
    return {
      unsupported,
      doc: {
        _id,
        _key: `!items!${_id}`,
        name: potion.name,
        type: "consumable",
        img: potion.img,
        system: {
          category: "potion",
          description: { value: potion.description },
          level: { value: LEVEL[potion.rarity] },
          price: { value: { gp: price } },
          quantity: 1,
          bulk: { value: 0.1 },
          uses: { value: 1, max: 1, autoDestroy: true },
          traits: { value: ["consumable", "magical", "potion"], rarity: RARITY[potion.rarity] },
          usage: { value: "held-in-one-hand" },
          rules: [],
          slug: slug(potion.name),
          publication: { title: "Beaver's Potions", authors: "", license: "OGL", remaster: false },
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: { [NS]: { potion: true, effects, ...(Object.keys(use).length ? { use } : {}) } },
      },
    };
  },

  loot(_id, name, img, { rarity = "common", price = 0, description = "", flags = {}, weight = 0.1 } = {}) {
    return {
      _id,
      _key: `!items!${_id}`,
      name,
      type: "treasure",
      img,
      system: {
        description: { value: description },
        level: { value: 0 },
        price: { value: price ? { gp: price } : { sp: 1 } },
        quantity: 1,
        bulk: { value: weight ? 0.1 : 0 },
        traits: { value: [], rarity: RARITY[rarity] ?? "common" },
        category: "",
        stackGroup: null,
        slug: slug(name),
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
      type: "treasure",
      img: "icons/sundries/scrolls/scroll-worn-tan.webp",
      system: { description: { value: description }, level: { value: 0 }, price: { value: {} }, quantity: 1, bulk: { value: 0 }, traits: { value: [], rarity: "common" }, slug: `recipe-${slug(name)}` },
      effects: [],
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags,
    };
  },
};

export { id16 };
