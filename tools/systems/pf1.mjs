// Pathfinder 1e (pf1, Foundry 13): consumables (potion) with a "Drink" action; what a potion does is a pf1 buff
// (changes, conditions, duration) the runtime puts on the drinker. 5e terms are translated:
// advantage on a check: +4 circumstance; attacks against you with advantage: -4 AC; with disadvantage: 20% miss
// chance (concealment, the runtime rolls it); exhaustion: fatigued / exhausted.
import { formDescription, formFlag, id16, NS, runtimeEffectFlags, runtimeUseFlags, slug, transformOf } from "./common.mjs";

const SKILLS = { persuasion: "dip", perception: "per", stealth: "ste" };
const SAVES = { str: "fort", con: "fort", dex: "ref", int: "will", wis: "will", cha: "will" };
const ATTACK = { melee: "mattack", ranged: "rattack", spell: "sattack" };
const DAMAGE = { melee: "mwdamage", ranged: "rwdamage", spell: "sdamage" };
/** 5e condition -> pf1 condition */
export const PF1_CONDITIONS = {
  invisible: "invisible", incapacitated: "dazed", blinded: "blind", deafened: "deaf", paralyzed: "paralyzed",
  poisoned: "sickened", frightened: "frightened", stunned: "stunned", prone: "prone",
};
const UNITS = { rounds: "round", minutes: "minute", hours: "hour", days: "day" };

const change = (target, formula, type = "untyped", operator) => ({ formula: String(formula), target, type, ...(operator ? { operator } : {}) });

/** rule -> { changes, conditions, flags } ; unsupported: null */
function translate([rule, a, b]) {
  switch (rule) {
    case "hpMax": return { changes: [change("mhp", a)] };
    case "sense": return a === "blindsight" ? { changes: [change("sensebs", b)] } : null;
    case "status":
      if (a === "hovering") return { conditions: ["hover"] };
      if (a === "silenced") return { flags: { statuses: ["silenced"] } }; // a status of the runtime
      return PF1_CONDITIONS[a] ? { conditions: [PF1_CONDITIONS[a]] } : null;
    case "conditionImmunity": return { flags: { immune: [PF1_CONDITIONS[a] ?? a] } }; // the runtime keeps it off
    case "skillAdvantage": return { changes: [change(`skill.${SKILLS[a]}`, 4, "circumstance")] };
    case "initiativeAdvantage": return { changes: [change("init", 4, "circumstance")] };
    case "skillExpertise": return { changes: [change(`skill.${SKILLS[a]}`, 4, "competence")] };
    case "skillBonus": return { changes: [change(`skill.${SKILLS[a]}`, b)] };
    case "speed":
      if (a === 0) return { changes: [change("landSpeed", 0, "untyped", "set")] };
      return { changes: [change("landSpeed", a >= 1 ? `@attributes.speed.land.base * ${a - 1}` : `-floor(@attributes.speed.land.base * ${1 - a})`)] };
    case "ability": return { changes: [change(a, b)] };
    case "ac": return { changes: [change("ac", a)] };
    case "attackBonus": return { changes: [change(ATTACK[a], b)] };
    case "damageBonus": return { changes: [change(DAMAGE[a], b)] };
    case "saveBonus": return { changes: [change(SAVES[a], b)] };
    case "grants":
      if (a === "advantage") return { changes: [change("ac", -4)] };
      if (a === "disadvantage") return { flags: { distortion: 20 } }; // concealment: 20% miss chance
      return { conditions: ["helpless"] }; // attacks against you are critical: helpless (coup de grace)
    case "attackAdvantage": return { changes: [change("attack", 2)] };
    case "heal": case "temp": case "restoreSlots": case "exhaustion": case "exhaustionAtEnd": case "restoration":
    case "drain": case "area": case "onlyCreatureType": case "turnStart": case "aura": case "light": case "endOn":
    case "protectionFromDeath": case "invulnerable": case "distortion": case "reflectDamage":
      return {};
    // no attunement and no disease in pf1
    default: return null;
  }
}

/** size steps from medium */
const SIZE_STEPS = { tiny: -2, small: -1, medium: 0, large: 1, huge: 2, gargantuan: 3 };
const SPEEDS = { walk: "landSpeed", swim: "swimSpeed", fly: "flySpeed", climb: "climbSpeed" };

/** a form's attack: a natural attack with the form's bonus (on top of the base attack bonus) and damage */
function attackItem(potion, attack, i) {
  return {
    name: attack.name,
    type: "attack",
    img: potion.form.img,
    system: {
      subType: "natural",
      description: { value: `<p>${potion.form.name}</p>` },
      actions: [{
        _id: id16(`bpatk${potion.id.slice(0, 6)}${i}`),
        name: attack.name,
        actionType: "mwak",
        activation: { type: "attack", unchained: { type: "attack" } },
        ability: { attack: "", damage: "", critRange: 20 },
        attackBonus: String(attack.bonus),
        damage: { parts: attack.damage.map(([formula, type]) => ({ formula, types: [type] })) },
        range: { units: "melee" },
        duration: { units: "inst" },
      }],
    },
  };
}

/** the buff of a transformation: the form's AC, speeds, senses and size */
function formBuff(potion, { form, duration }) {
  const changes = [
    change("ac", form.ac, "base", "set"),
    ...Object.entries(form.speed).filter(([m]) => SPEEDS[m]).map(([m, v]) => change(SPEEDS[m], v, "untyped", "set")),
    ...(form.blindsight ? [change("sensebs", form.blindsight)] : []),
    ...(SIZE_STEPS[form.size] ? [change("size", SIZE_STEPS[form.size])] : []),
  ];
  // pf1 sizes the token by the size change
  return { changes, flags: { form: formFlag(form, form.attacks.map((a, i) => attackItem(potion, a, i)), { size: false }) }, duration, description: formDescription(potion) };
}

export function translatePotion(potion, translateRule, conditionsKey = "conditions") {
  const changes = [];
  const conditions = [];
  const unsupported = [];
  const extraFlags = {};
  for (const rule of potion.rules) {
    if (rule[0] === "transform" && transformOf(potion)) continue; // the system's potion() does the form
    const t = translateRule(rule);
    if (t === null) unsupported.push(["status", "grants", "cure"].includes(rule[0]) ? `${rule[0]} ${rule[1]}` : rule[0]);
    else {
      changes.push(...(t.changes ?? []));
      conditions.push(...(t.conditions ?? []));
      // lists (statuses, immune) add up
      for (const [k, v] of Object.entries(t.flags ?? {})) extraFlags[k] = Array.isArray(v) ? [...(extraFlags[k] ?? []), ...v] : v;
    }
  }
  const flags = { ...runtimeEffectFlags(potion.rules), ...extraFlags };
  delete flags.grantsAdvantage;
  delete flags.grantsDisadvantage;
  delete flags.attackAdvantage;
  return { changes, conditions, unsupported, flags };
}

export default {
  id: "pf1",
  label: "Pathfinder 1e",
  suffix: true,
  core: 13,
  compatibility: { minimum: "11.0", verified: "11.11" },
  skills: { arc: "kar", his: "khi", inv: "per", med: "hea", nat: "kna", rel: "kre", sur: "sur" },
  skillLabels: { arc: "Knowledge (arcana)", his: "Knowledge (history)", inv: "Perception", med: "Heal", nat: "Knowledge (nature)", rel: "Knowledge (religion)", sur: "Survival" },
  lootType: "loot",
  potionCheck: 'doc?.type === "consumable" && doc.system.subType === "potion"',
  srdItems: {},

  potion(potion, { price }) {
    const _id = potion.id;
    const { changes, conditions, unsupported, flags } = translatePotion(potion, translate);
    const buff = ({ name, changes, conditions = [], duration, description, flags, key }) => ({
      name,
      type: "buff",
      img: potion.img,
      system: {
        subType: "temp",
        active: true,
        level: 1,
        duration: duration ? { value: String(duration[0]), units: UNITS[duration[1]], end: "turnStart" } : { value: null, units: "perm", end: "" },
        // 8 characters, unique within the buff
        changes: changes.map((c, i) => ({ _id: id16(`bpc${key}${i}${_id}`).slice(0, 8), ...c })),
        conditions,
        description: { value: description },
      },
      flags: { [NS]: { ...flags, source: `${slug(potion.name)}.${key === "a" ? "after" : "buff"}` } },
    });
    const buffs = [];
    const transform = transformOf(potion);
    if (transform) {
      const f = formBuff(potion, transform);
      const after = potion.after ? buff({ name: potion.after.name, changes: [], duration: potion.after.duration, description: potion.after.description, flags: {}, key: "a" }) : null;
      buffs.push(buff({ name: `${potion.name}: ${transform.form.name}`, changes: f.changes, duration: f.duration, description: f.description, flags: { ...f.flags, ...(after ? { onEnd: { createData: [after] } } : {}) }, key: "" }));
    } else if (changes.length || conditions.length || Object.keys(flags).length || potion.duration) {
      buffs.push(buff({ name: potion.effectName ?? potion.name, changes, conditions, duration: potion.duration, description: potion.description, flags, key: "" }));
    }
    const actions = [{ _id: id16(`bpact${_id.slice(0, 7)}Drink`), name: "Drink", activation: { type: "standard", unchained: { type: "action", cost: 2 } }, duration: { units: "inst" } }];
    if (potion.pour) actions.push({ _id: id16(`bpact${_id.slice(0, 7)}Pour`), name: "Pour", activation: { type: "standard", unchained: { type: "action", cost: 2 } }, duration: { units: "inst" } });
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
          subType: "potion",
          description: { value: potion.description, instructions: "", unidentified: "" },
          quantity: 1,
          weight: { value: 0.1 },
          price,
          identified: true,
          cl: 1,
          uses: { value: null, per: "single", autoDeductChargesCost: "", maxFormula: "", rechargeFormula: "" },
          actions,
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: { [NS]: { potion: true, buffs, ...(Object.keys(use).length ? { use } : {}) } },
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
      system: { subType: "tradeGoods", description: { value: description }, quantity: 1, weight: { value: weight }, price, identified: true },
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
      system: { subType: "misc", description: { value: description }, quantity: 1, weight: { value: 0 }, price: 0, identified: true },
      effects: [],
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags,
    };
  },
};
