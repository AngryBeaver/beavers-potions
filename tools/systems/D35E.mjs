// D&D 3.5 SRD (D35E, Foundry 14): consumables (potion); the runtime takes over their use (D35E.ItemUse.preUseItem) and
// puts a D35E buff on the drinker. 5e terms are translated like for pf1: advantage +4, attacks against you with
// advantage -4 AC, with disadvantage 20% concealment (D35E's own), exhaustion fatigued / exhausted. Conditions are
// set by the runtime while the buff is active (flags["beavers-potions"].conditions).
import { id16, NS, runtimeUseFlags, slug } from "./common.mjs";
import { translatePotion } from "./pf1.mjs";

const SKILLS = { persuasion: "dip", perception: "spt", stealth: "hid" };
const SAVES = { str: "fort", con: "fort", dex: "ref", int: "will", wis: "will", cha: "will" };
export const D35E_CONDITIONS = {
  invisible: "invisible", incapacitated: "helpless", blinded: "blind", deafened: "deaf", paralyzed: "paralyzed",
  poisoned: "sickened", frightened: "fear", stunned: "stunned", prone: "prone",
};
const UNITS = { rounds: "round", minutes: "minute", hours: "hour", days: "day" };
const ch = (formula, category, target, type = "untyped") => [String(formula), category, target, type];

function translate([rule, a, b]) {
  switch (rule) {
    case "hpMax": return { changes: [ch(a, "misc", "mhp")] };
    case "status": return D35E_CONDITIONS[a] ? { conditions: [D35E_CONDITIONS[a]] } : null;
    case "skillAdvantage": return { changes: [ch(4, "skill", `skill.${SKILLS[a]}`, "circumstance")] };
    case "initiativeAdvantage": return { changes: [ch(4, "misc", "init", "circumstance")] };
    case "skillExpertise": return { changes: [ch(4, "skill", `skill.${SKILLS[a]}`, "competence")] };
    case "skillBonus": return { changes: [ch(b, "skill", `skill.${SKILLS[a]}`)] };
    case "speed":
      if (a === 0) return { changes: [ch("-@attributes.speed.land.base", "speed", "landSpeed")] };
      return { changes: [ch(a >= 1 ? `@attributes.speed.land.base * ${a - 1}` : `-floor(@attributes.speed.land.base * ${1 - a})`, "speed", "landSpeed")] };
    case "ability": return { changes: [ch(b, "ability", a)] };
    case "ac": return { changes: [ch(a, "ac", "ac")] };
    case "attackBonus": return { changes: [ch(b, "attack", a === "melee" ? "mattack" : a === "ranged" ? "rattack" : "attack")] };
    case "damageBonus": return { changes: [ch(b, "damage", a === "spell" ? "sdamage" : "wdamage")] };
    case "saveBonus": return { changes: [ch(b, "savingThrows", SAVES[a])] };
    case "grants":
      if (a === "advantage") return { changes: [ch(-4, "ac", "ac")] };
      if (a === "disadvantage") return { changes: [ch(20, "misc", "concealment")] };
      return null;
    case "attackAdvantage": return { changes: [ch(2, "attack", "attack")] };
    case "heal": case "temp": case "restoreSlots": case "exhaustion": case "exhaustionAtEnd": case "restoration":
    case "drain": case "area": case "onlyCreatureType": case "turnStart": case "aura": case "light": case "endOn":
    case "protectionFromDeath": case "invulnerable": case "distortion":
      return {};
    default: return null;
  }
}

export default {
  id: "D35E",
  label: "D&D 3.5 SRD",
  suffix: true,
  core: 14,
  compatibility: { minimum: "3.0.0", verified: "3.1.0" },
  skills: { arc: "kar", his: "khi", inv: "src", med: "hea", nat: "kna", rel: "kre", sur: "sur" },
  skillLabels: { arc: "Knowledge (arcana)", his: "Knowledge (history)", inv: "Search", med: "Heal", nat: "Knowledge (nature)", rel: "Knowledge (religion)", sur: "Survival" },
  lootType: "loot",
  potionCheck: 'doc?.type === "consumable" && doc.system.consumableType === "potion"',
  srdItems: {},

  potion(potion, { price }) {
    const _id = potion.id;
    const { changes, conditions, unsupported, flags } = translatePotion(potion, translate);
    // D35E sets the token light from active buffs: the light belongs on the buff
    const light = flags.light;
    delete flags.light;
    const buffs = [];
    if (changes.length || conditions.length || Object.keys(flags).length || potion.duration) {
      buffs.push({
        name: potion.effectName ?? potion.name,
        type: "buff",
        img: potion.img,
        system: {
          buffType: "temp",
          active: true,
          level: 1,
          duration: potion.duration ? { value: String(potion.duration[0]), units: UNITS[potion.duration[1]] } : { value: null, units: "" },
          changes,
          ...(light ? { light: { emitLight: true, dimRadius: light.dim, radius: light.bright ?? 0, color: light.color, alpha: light.alpha ?? 0.5, type: light.animation?.type ?? "", animationSpeed: light.animation?.speed ?? "", animationIntensity: light.animation?.intensity ?? "", lightAngle: 360 } } : {}),
          description: { value: potion.description },
        },
        flags: { [NS]: { ...flags, conditions, source: `${slug(potion.name)}.buff` } },
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
          consumableType: "potion",
          description: { value: potion.description },
          quantity: 1,
          weight: 0.1,
          price,
          identified: true,
          identifiedName: potion.name,
          uses: { value: 0, max: 0, per: "single" },
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: { [NS]: { potion: true, buffs, pour: !!potion.pour, ...(Object.keys(use).length ? { use } : {}) } },
      },
    };
  },

  loot(_id, name, img, { price = 0, description = "", flags = {}, weight = 0.1 } = {}) {
    return {
      _id,
      _key: `!items!${_id}`,
      name,
      type: "loot",
      img,
      system: { subType: "tradeGoods", description: { value: description }, quantity: 1, weight, price, identified: true, identifiedName: name },
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
      system: { subType: "misc", description: { value: description }, quantity: 1, weight: 0, price: 0, identified: true, identifiedName: name },
      effects: [],
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags,
    };
  },
};

export { id16 };
