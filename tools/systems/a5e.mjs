// Level Up: Advanced 5th Edition (a5e, Foundry 14): "object" items (consumable) with a "Drink" action,
// active effects in the Foundry 14 format with a5e's keys ("grants" roll modes, bonus objects, expertise dice).
import { effectV14, formDescription, formFlag, id16, NS, runtimeEffectFlags, runtimeUseFlags, slug, transformOf } from "./common.mjs";

const SKILLS = { persuasion: "per", perception: "prc", stealth: "ste" };
const ATTACK_TYPES = {
  melee: ["meleeWeaponAttack"],
  ranged: ["rangedWeaponAttack"],
  spell: ["meleeSpellAttack", "rangedSpellAttack"],
};
// silenced: a status of the runtime (src/main.js registers it where the system has none)
const STATUSES = new Set(["blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious", "slowed", "confused", "dazzled", "rattled", "silenced"]);
const SIZES = { tiny: "tiny", small: "sm", medium: "med", large: "lg", huge: "huge", gargantuan: "grg" };
const label = (potion) => `${potion.name}`;

/** an attack of a form: a feature with an attack action (fixed bonus, the form's damage) */
function attackItem(potion, attack, i) {
  const rolls = {
    [id16(`bpatk${potion.id.slice(0, 6)}${i}a`)]: { type: "attack", attackType: "meleeWeaponAttack", ability: "none", proficient: false, bonus: String(attack.bonus), critThreshold: 20, default: true, label: "" },
  };
  attack.damage.forEach(([formula, damageType], j) => {
    rolls[id16(`bpdmg${potion.id.slice(0, 6)}${i}${j}`)] = { type: "damage", formula, damageType, canCrit: true, critBonus: "", default: true, label: "" };
  });
  return {
    name: attack.name,
    type: "feature",
    img: potion.form.img,
    system: {
      description: `<p>${potion.form.name}</p>`,
      actions: {
        [id16(`bpact${potion.id.slice(0, 6)}${i}`)]: {
          name: attack.name,
          activation: { type: "action", cost: 1, reactionTrigger: "" },
          target: { quantity: 1, type: "creature" },
          ranges: { [id16(`bprng${potion.id.slice(0, 6)}${i}`)]: { range: "short" } },
          rolls,
          prompts: {},
          consumers: {},
          effects: [],
        },
      },
    },
  };
}

/** a transformation: the form's AC, speed, senses and size; its token, hit points and attacks through the runtime */
function formEffect(potion, { form, duration }) {
  const changes = [
    ["system.attributes.ac.baseFormula", "override", String(form.ac)],
    ...Object.entries(form.speed).map(([m, v]) => [`system.attributes.movement.${m}.distance`, "override", v]),
    ...(form.blindsight ? [["system.attributes.senses.blindsight.distance", "upgrade", form.blindsight]] : []),
    ["system.traits.size", "override", SIZES[form.size] ?? "med"],
  ];
  const after = potion.after ? effectV14(potion.id, potion, potion.after, 9) : null;
  if (after) delete after._key;
  const flags = {
    form: formFlag(form, form.attacks.map((a, i) => attackItem(potion, a, i))),
    ...(after ? { onEnd: { createEffect: after } } : {}),
  };
  return effectV14(potion.id, potion, { name: `${potion.name}: ${form.name}`, img: potion.img, description: formDescription(potion), duration, changes, flags, system: { applyToSelf: false, effectType: "onUse" } }, 0);
}

/** rule -> { changes, statuses } ; unsupported: null */
function translate(potion, [rule, a, b]) {
  switch (rule) {
    case "hpMax": return { changes: [["flags.a5e.effects.bonuses.hitPoint", "custom", { label: label(potion), formula: String(a), context: {} }]] };
    case "sense": return { changes: [[`system.attributes.senses.${a}.distance`, "upgrade", b]] };
    case "status":
      if (a === "hovering") return { changes: [["system.attributes.movement.traits.hover", "override", true]] };
      return STATUSES.has(a) ? { statuses: [a] } : null;
    case "skillAdvantage": return { changes: [[`system.skills.${SKILLS[a]}.rollMode`, "override", 1]] };
    case "initiativeAdvantage": return { changes: [["system.attributes.initiative.rollMode", "override", 1]] };
    case "skillExpertise": return { changes: [[`system.skills.${SKILLS[a]}.proficient`, "override", true], [`system.skills.${SKILLS[a]}.expertiseDice`, "upgrade", 2]] };
    case "skillBonus": return { changes: [[`system.skills.${SKILLS[a]}.bonuses.check`, "add", String(b)]] };
    case "speed": return { changes: ["walk", "fly", "swim", "climb", "burrow"].map((m) => [`system.attributes.movement.${m}.distance`, "multiply", a]) };
    case "conditionImmunity": return { changes: [["system.traits.conditionImmunities", "add", [a]]] };
    case "attunement": return { changes: [["system.attributes.attunement.max", "add", a]] };
    case "ability": return { changes: [[`system.abilities.${a}.value`, "add", b]] };
    case "ac": return { changes: [["system.attributes.ac.changes.bonuses.value", "add", String(a)]] };
    case "attackBonus":
      return { changes: [["flags.a5e.effects.bonuses.attacks", "custom", { label: label(potion), formula: String(b), context: { attackTypes: ATTACK_TYPES[a], spellLevels: [] } }]] };
    case "damageBonus":
      return { changes: [["flags.a5e.effects.bonuses.damage", "custom", { label: label(potion), formula: String(b), damageType: "", context: { attackTypes: ATTACK_TYPES[a], spellLevels: [], damageTypes: [] } }]] };
    case "saveBonus": return { changes: [[`system.abilities.${a}.save.bonus`, "add", String(b)]] };
    case "grants":
      if (a === "disadvantage") return { changes: [["flags.a5e.effects.grants.rollMode.attack.all", "override", -1]] };
      if (a === "advantage") return { changes: [["flags.a5e.effects.grants.rollMode.attack.all", "override", 1]] };
      // a5e has no hook before its attack rolls: the runtime says in the chat that a hit is critical
      return {};
    case "attackAdvantage": return { changes: [["flags.a5e.effects.rollMode.attack.all", "override", 1]] };
    // the runtime does these, through a5e's damage, healing, saves and spell slots
    case "heal": case "temp": case "restoreSlots": case "exhaustion": case "exhaustionAtEnd": case "restoration":
    case "drain": case "area": case "onlyCreatureType": case "turnStart": case "aura": case "light": case "endOn":
    case "protectionFromDeath": case "invulnerable": case "distortion": case "reflectDamage":
      return {};
    // a5e has no diseases
    default: return null;
  }
}

export default {
  id: "a5e",
  label: "Level Up A5E",
  suffix: true,
  core: 14,
  compatibility: { minimum: "1.5.0", verified: "1.5.3" },
  skills: { arc: "arc", his: "his", inv: "inv", med: "med", nat: "nat", rel: "rel", sur: "sur" },
  skillLabels: { arc: "Arcana", his: "History", inv: "Investigation", med: "Medicine", nat: "Nature", rel: "Religion", sur: "Survival" },
  lootType: "object",
  potionCheck: 'doc?.type === "object" && doc.system.objectType === "consumable" && /potion|elixir/i.test(doc.name)',
  srdItems: {
    "Potion of Healing": ["Compendium.a5e.a5e-adventuring-gear.Item.yla4i7uz4h58mfqb", "icons/consumables/potions/vial-cork-red.webp", "object", "Healing Potion (Basic)"],
    "Potion of Greater Healing": ["Compendium.a5e.a5e-adventuring-gear.Item.nees9nzonritxzwe", "icons/consumables/potions/bottle-corked-red.webp", "object", "Healing Potion (Greater)"],
    "Potion of Superior Healing": ["Compendium.a5e.a5e-adventuring-gear.Item.3gmfg4fsi8abv1ej", "icons/consumables/potions/potion-flask-corked-shiny-red.webp", "object", "Healing Potion (Superior)"],
    "Potion of Supreme Healing": ["Compendium.a5e.a5e-adventuring-gear.Item.wrvoldjxwhogx3ea", "icons/consumables/potions/bottle-round-label-cork-red.webp", "object", "Healing Potion (Supreme)"],
  },

  potion(potion, { price }) {
    const _id = potion.id;
    const changes = [];
    const statuses = [];
    const unsupported = [];
    const transform = transformOf(potion);
    for (const rule of potion.rules) {
      if (rule[0] === "transform" && transform) continue;
      const t = translate(potion, rule);
      if (t === null) unsupported.push(rule[0] === "status" || rule[0] === "grants" || rule[0] === "cure" ? `${rule[0]} ${rule[1]}` : rule[0]);
      else {
        changes.push(...(t.changes ?? []));
        statuses.push(...(t.statuses ?? []));
      }
    }
    const flags = runtimeEffectFlags(potion.rules);
    // the runtime must not add what a5e does itself
    delete flags.grantsAdvantage;
    delete flags.grantsDisadvantage;
    delete flags.attackAdvantage;
    const effects = [];
    if (transform) effects.push(formEffect(potion, transform));
    else if (changes.length || statuses.length || Object.keys(flags).length || potion.duration) {
      effects.push(effectV14(_id, potion, { duration: potion.duration, changes, statuses, flags, system: { applyToSelf: false, effectType: "onUse" } }, 0));
    }
    const actions = {};
    const action = (name, withEffects) => {
      const id = id16(`bpact${_id.slice(0, 7)}${name}`);
      const heal = potion.rules.find(([r]) => r === "heal" || r === "temp");
      actions[id] = {
        name,
        img: potion.img,
        activation: { type: "action", cost: 1, reactionTrigger: "" },
        duration: potion.duration ? { unit: { rounds: "rounds", minutes: "minutes", hours: "hours", days: "days" }[potion.duration[1]], value: String(potion.duration[0]) } : { unit: "instantaneous", value: "" },
        target: { quantity: "", type: "self" },
        consumers: { [id16(`bpcon${_id.slice(0, 7)}${name}`)]: { type: "quantity", default: true, itemId: "", quantity: 1, deleteOnZero: true, label: "" } },
        rolls: withEffects && heal
          ? { [id16(`bproll${_id.slice(0, 6)}${name}`)]: { type: "healing", formula: String(heal[1]), healingType: heal[0] === "temp" ? "temporaryHealing" : "healing", name: potion.name } }
          : {},
        prompts: {},
        effects: withEffects ? effects.map((e) => e._id) : [],
        macro: "",
      };
    };
    action("Drink", true);
    if (potion.pour) action("Pour", false);
    const use = runtimeUseFlags(potion.rules);
    return {
      unsupported,
      doc: {
        _id,
        _key: `!items!${_id}`,
        name: potion.name,
        type: "object",
        img: potion.img,
        system: {
          description: potion.description,
          actions,
          objectType: "consumable",
          price: { value: price, denomination: "gp", special: "" },
          quantity: 1,
          rarity: potion.rarity,
          weight: 0.5,
          source: "",
          requiresAttunement: false,
          unidentified: false,
        },
        effects,
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: { [NS]: { potion: true, ...(Object.keys(use).length ? { use } : {}) } },
      },
    };
  },

  loot(_id, name, img, { rarity = "common", price = 0, description = "", flags = {}, weight = 0.1 } = {}) {
    return {
      _id,
      _key: `!items!${_id}`,
      name,
      type: "object",
      img,
      system: { description, objectType: "miscellaneous", price: { value: price, denomination: "gp", special: "" }, quantity: 1, rarity, weight, actions: {} },
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
      type: "object",
      img: "icons/sundries/scrolls/scroll-worn-tan.webp",
      system: { description, objectType: "miscellaneous", price: { value: 0, denomination: "gp", special: "" }, quantity: 1, weight: 0, actions: {} },
      effects: [],
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags,
    };
  },
};

export { slug };
