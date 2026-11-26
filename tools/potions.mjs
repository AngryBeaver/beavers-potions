// The potions of Beaver's Potions: what tools/generate-packs.mjs turns into the compendium "potions".
//
// Each potion: id (kept from the old packs, so existing links stay valid), name, img, rarity, description (HTML)
// and how it works with dnd5e alone:
//   effect / effects  active effects the "Drink" activity applies to the drinker
//                     { name?, duration: [value, units], changes: [[key, type, value]], statuses, flags, description }
//                     flags are the rules of this module (src/), see the README
//   heal              a heal activity instead of a utility one: { formula, type: "healing" | "temphp" }
//   transform         a transform activity: { uuid, seconds, after: effect shown afterwards }
//   use               item flag for src/use.js: restoreSlots, restoration, cure, drain, area, onlyType
//   pour              a second activity "Pour" (no effect), the drink activity keeps the effects
//
// Durations: [value, "rounds" | "minutes" | "hours" | "days"].

const ch = (key, type, value) => [key, type, value];
const invulnerable = { invulnerable: true };

export const POTIONS = [
  {
    id: "exyGaiw1Es8u37QE",
    name: "Aid Greater",
    img: "icons/consumables/potions/bottle-round-label-cork-red.webp",
    rarity: "rare",
    description: "<p>Your hit point maximum and your current hit points increase by 10 for 8 hours.</p>",
    heal: { formula: "10", type: "healing" },
    effect: { duration: [8, "hours"], changes: [ch("system.attributes.hp.tempmax", "add", "10")] },
  },
  {
    id: "UOYRzlUw2HSELs9u",
    name: "Batman",
    img: "icons/consumables/potions/bottle-conical-corked-tied-blue.webp",
    rarity: "rare",
    description:
      "<p>You lose the ability to speak for 10 minutes. Instead you can release high-frequency squeaks for echolocation: you have blindsight 60 ft. as long as the surroundings are on the material plane.</p>",
    effect: {
      duration: [10, "minutes"],
      changes: [ch("system.attributes.senses.ranges.blindsight", "upgrade", "60")],
      statuses: ["silenced"],
    },
  },
  {
    id: "6mg7QLtafdc2lDp9",
    name: "Beauty Elixir",
    img: "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
    rarity: "common",
    description: "<p>Makes you significantly more attractive for 5 hours: you have advantage on Charisma (Persuasion) checks.</p>",
    effect: { duration: [5, "hours"], changes: [ch("system.skills.per.roll.mode", "add", "1")] },
  },
  {
    id: "GC5EmcU3FzX8o4Mi",
    name: "Blur",
    img: "icons/consumables/potions/bottle-round-label-cork-blue.webp",
    rarity: "rare",
    description:
      "<p>Your body becomes blurred, shifting and wavering to all who can see you. For 1 minute any creature has disadvantage on attack rolls against you. An attacker is immune to this effect if it doesn't rely on sight, as with blindsight, or can see through illusions, as with truesight.</p>",
    effect: { duration: [1, "minutes"], flags: { grantsDisadvantage: "sight" } },
  },
  {
    id: "Qqh06crGN0I4wQuj",
    name: "Bug Shield",
    img: "icons/consumables/potions/bottle-bulb-corked-green.webp",
    rarity: "common",
    description: "<p>Repels insects and other tiny pests with 99% effectiveness. It lasts 3 days.</p>",
    effect: { duration: [3, "days"] },
  },
  ...[
    ["cWELUkq6t7rP6Ryo", "Casters Overtime", "uncommon", 2, 1, "first and second"],
    ["TPY2dFuG7d6kXgXx", "Casters Overtime Greater", "rare", 3, 2, "first to third"],
    ["vXJxudEhpp6hpdOe", "Casters Overtime Superior", "veryRare", 4, 3, "first to fourth"],
    ["E1oLiNET3axMz3B1", "Casters Overtime Supreme", "legendary", 5, 4, "first to fifth"],
  ].map(([id, name, rarity, maxLevel, exhaustion, levels]) => ({
    id,
    name,
    img: "icons/consumables/potions/bottle-metal-yellow-gray.webp",
    rarity,
    description: `<p>You spend one round doing nothing else than concentrating. During this time you cannot defend yourself: you are incapacitated, everyone attacking you has advantage and hits critically.</p><p>You replenish all your spell slots of the ${levels} level while you gain ${exhaustion} level${exhaustion > 1 ? "s" : ""} of exhaustion, which cannot be healed magically.</p>`,
    effect: {
      name: "Out of Mind",
      duration: [1, "rounds"],
      statuses: ["incapacitated"],
      flags: { grantsAdvantage: true, grantsCritical: true },
    },
    use: { restoreSlots: { maxLevel, exhaustion } },
  })),
  {
    id: "XShdKZEf6oqbyIOh",
    name: "Clone Army",
    img: "icons/consumables/potions/bottle-round-flask-fumes-purple.webp",
    rarity: "legendary",
    description:
      "<p>You create a clone of yourself, then you immediately begin to hate each other. You both know only one can survive when the time is up, and you are the original while the other is the clone… obviously. When the other you is still alive when the hour ends, both of you drop dead.</p>",
    effect: { duration: [1, "hours"] },
  },
  {
    id: "MChWuF8FTz5vOntg",
    name: "Cobra Kai",
    img: "icons/consumables/potions/bottle-conical-corked-cyan.webp",
    rarity: "common",
    description: "<p>Polymorphs you into a venomous snake for 6 hours.</p>",
    transform: { uuid: "Compendium.dnd5e.actors24.Actor.mmVenomousSnake0", name: "Venomous Snake", seconds: 6 * 3600 },
  },
  {
    id: "KHCZLpOKIl9Kjy84",
    name: "Comfort",
    img: "icons/consumables/potions/bottle-conical-corked-green.webp",
    rarity: "common",
    description:
      "<p>This potion lets you remain comfortable in extreme temperatures. For 8 hours you can ignore natural extremes in temperature and humidity.</p>",
    effect: { duration: [8, "hours"] },
  },
  {
    id: "aj92WlihsltHkeaJ",
    name: "Comprehend Languages",
    img: "icons/consumables/potions/bottle-pear-corked-pink.webp",
    rarity: "common",
    description: "<p>For one hour, you understand the literal meaning of any spoken language that you hear.</p>",
    effect: { duration: [1, "hours"] },
  },
  {
    id: "kSlCgJX5DO7u0F6a",
    name: "Cure Disease",
    img: "icons/consumables/potions/bottle-circular-corked-labeled-green.webp",
    rarity: "common",
    description: "<p>Cures one natural disease affecting you that you know of: ends the diseased condition.</p>",
    use: { cure: ["diseased"] },
  },
  {
    id: "tEG8DYWsIjsnq89H",
    name: "Cure Undead",
    img: "icons/consumables/potions/bottle-conical-corked-labeled-skull-poison-green.webp",
    rarity: "common",
    description: "<p>You regain 2d4 + 2 hit points when you are undead and drink this potion. It does nothing for the living.</p>",
    heal: { formula: "2d4 + 2", type: "healing" },
    use: { onlyType: "undead" },
  },
  {
    id: "hOpVQsMdNcgoZe8A",
    name: "Detect Magic",
    img: "icons/consumables/potions/bottle-bulb-corked-purple.webp",
    rarity: "common",
    description:
      "<p>Gives the effect of a <em>Detect Magic</em> spell for 10 minutes (no concentration required).</p>",
    effect: { duration: [10, "minutes"] },
  },
  {
    id: "R4hEpzqaIBuxT7Pb",
    name: "Distortion",
    img: "icons/consumables/potions/bottle-round-label-cork-yellow.webp",
    rarity: "veryRare",
    description:
      "<p>You vanish out of existence and back again within the blink of an eye. Your outline appears blurred, shifting and wavering. For 1 minute every attack against you has a 20% chance to miss: it appears as if you had not been targeted at all.</p>",
    effect: { duration: [1, "minutes"], flags: { distortion: 20 } },
  },
  {
    id: "kr0avi5meoADT9lu",
    name: "Feral Instinct",
    img: "icons/consumables/potions/bottle-round-label-cork-purple.webp",
    rarity: "uncommon",
    description: "<p>You have advantage on initiative rolls for 8 hours.</p>",
    effect: { duration: [8, "hours"], changes: [ch("system.attributes.init.roll.mode", "add", "1")] },
  },
  ...[
    ["OjFEnZKfdL0TfU64", "Frost Armor", "uncommon", 2, "1d4", 11],
    ["YywpTHDQ09DN7aLd", "Frost Armor Greater", "rare", 6, "3d4", 14],
  ].map(([id, name, rarity, temp, formula, dc]) => ({
    id,
    name,
    img: "icons/consumables/potions/bottle-corked-blue.webp",
    rarity,
    description: `<p>A protective magical force surrounds you, manifesting as a spectral frost that covers you and your gear for 5 rounds. At the start of each of your turns you regain temporary hit points up to ${temp}. Anyone starting its turn next to you takes ${formula} cold damage (Wisdom saving throw DC ${dc} for half).</p>`,
    effect: {
      duration: [5, "rounds"],
      flags: {
        turnStart: { temp },
        aura: { radius: 5, includeSelf: false, save: { ability: "wis", dc }, damage: { formula, type: "cold" } },
      },
    },
    heal: { formula: String(temp), type: "temphp" },
  })),
  {
    id: "0aHuyVIccJtLDbtq",
    name: "Glimpse of Future",
    img: "icons/consumables/potions/bottle-corked-empty.webp",
    rarity: "uncommon",
    description:
      "<p>You glimpse into your possible near future where you see yourself in a single snapshot moment. E.g. it shows you standing in front of a specific building, maybe this is the hideout you are searching for? Or it shows you freezing in cold snow while wearing shorts, maybe you should pack better clothes?</p>",
  },
  {
    id: "MBW3BYNmH8bhZhwe",
    name: "Gold Rush",
    img: "icons/consumables/potions/bottle-round-corked-orange.webp",
    rarity: "uncommon",
    description:
      "<p>For the next 24 hours you can smell the presence of gold within 50 ft. of you. On a successful (DC 15) Wisdom (Perception) check you can pinpoint its location and amount.</p>",
    effect: { duration: [24, "hours"] },
  },
  {
    id: "VnjrJ7YTYshlbm01",
    name: "Ice Devil",
    img: "icons/consumables/potions/bottle-ornate-bat-teal.webp",
    rarity: "legendary",
    description:
      "<p>You become an ice devil for 1 minute. You do not just polymorph into one, you actually become one. You cannot willingly dismiss the effect. Afterwards your mind is corrupted for a couple of days while the effect wears off.</p><p><strong>Ice Devil:</strong> You are self-centered and egoistic, you have no sense of empathy. You see your companions as slaves, lesser fools that might be useful to you; if not, you are willing to sacrifice them. Your main motivation is to get promoted by slaughtering enemies and claiming as many souls as possible.</p><p><strong>Corrupted Mind:</strong> You do not remember what happened. You feel like you have lost some great power and someone is to blame for it. You have the feeling everyone is lying to you and your companions are only selfish and do not want the best for you.</p>",
    transform: {
      uuid: "Compendium.dnd5e.actors24.Actor.mmIceDevil000000",
      name: "Ice Devil",
      seconds: 60,
      after: {
        name: "Corrupted Mind",
        duration: [3, "days"],
        description:
          "<p>You do not remember what happened. You feel like you have lost some great power and someone is to blame for it. You have the feeling everyone is lying to you.</p>",
      },
    },
  },
  {
    id: "aqkjbUe15A5ivk39",
    name: "Keen Sense",
    img: "icons/consumables/potions/bottle-round-corked-pink.webp",
    rarity: "uncommon",
    description: "<p>You gain expertise in Perception for 1 hour.</p>",
    effect: { duration: [1, "hours"], changes: [ch("system.skills.prc.value", "upgrade", "2")] },
  },
  {
    id: "YK67se6j7hfPVd6Q",
    name: "Life Shell",
    img: "icons/consumables/potions/flask-corked-green.webp",
    rarity: "uncommon",
    description: "<p>You gain 10 temporary hit points.</p>",
    heal: { formula: "10", type: "temphp" },
  },
  {
    id: "xtDv7zBzlF30hSGU",
    name: "Life Shell Greater",
    img: "icons/consumables/potions/flask-corked-green.webp",
    rarity: "rare",
    description: "<p>You gain 20 temporary hit points.</p>",
    heal: { formula: "20", type: "temphp" },
  },
  {
    id: "mEjNxXozN4eKsb98",
    name: "Liquid Knowledge",
    img: "icons/consumables/potions/bottle-round-ring-teal.webp",
    rarity: "uncommon",
    description:
      "<p>For 1 hour, when you see a type of enemy you instantly know one thing about it: its highest or lowest ability, a vulnerability, immunity or resistance, or a special attack.</p>",
    effect: { duration: [1, "hours"] },
  },
  {
    id: "IGqhyVesOoWIt6Tg",
    name: "Live Essence",
    img: "icons/consumables/potions/bottle-round-corked-orante-red.webp",
    rarity: "rare",
    description:
      "<p>Before drinking, mix in one drop of fresh blood of your target (target it). You drink the life essence of the blood's owner: it takes 3d6 + 3 necrotic damage on a failed DC 14 Constitution saving throw, or half as much on a successful one. You heal the same amount.</p>",
    use: { drain: { formula: "3d6 + 3", type: "necrotic", ability: "con", dc: 14 } },
  },
  {
    id: "Sp3E9go1b56yNnBX",
    name: "Messenger's Potion",
    img: "icons/consumables/potions/bottle-conical-corked-labeled-shell-cyan.webp",
    rarity: "uncommon",
    description: "<p>Doubles your speed for 3 hours, afterwards you gain two levels of exhaustion.</p>",
    effect: {
      duration: [3, "hours"],
      changes: [ch("system.attributes.movement.multiplier", "multiply", "2")],
      flags: { onEnd: { exhaustion: 2 } },
    },
  },
  {
    id: "kmMTJHkbMUoOLJIy",
    name: "Minor Invisibility",
    img: "icons/consumables/potions/bottle-conical-corked-blue.webp",
    rarity: "common",
    description:
      "<p>You have the invisible condition for 1 minute or until you move, make an attack or cast a spell: attacks against you have disadvantage, your attacks have advantage.</p>",
    effect: {
      duration: [1, "minutes"],
      statuses: ["invisible"],
      flags: { grantsDisadvantage: "sight", attackAdvantage: true, endOn: ["attack", "spell", "move"] },
    },
  },
  {
    id: "RhTbotaKOkFunnJ3",
    name: "Overconfident",
    img: "icons/consumables/potions/bottle-pear-corked-labeled-ornamental-purple.webp",
    rarity: "uncommon",
    description:
      "<p>You are confident that you can do almost everything. For the next 10 minutes you are immune to being frightened, while you are also willing to take more risks.</p>",
    effect: { duration: [10, "minutes"], changes: [ch("system.traits.ci.value", "add", "frightened")] },
  },
  {
    id: "tr3gjUhvmWpYrGJ0",
    name: "Overload Attunement",
    img: "icons/consumables/potions/bottle-corked-red.webp",
    rarity: "legendary",
    description:
      "<p>Within this potion slumbers a tiny parasite. When you drink it, the parasite awakes. For the following 4 hours you painfully feel how something is eating your internals while slowly growing and moving upwards towards your brain. At its destination it attaches to your brain stem and usually stops growing. There it lives for the next 5 days until it dies. During this time it grants you the ability to attune to one additional magic item.</p>",
    effect: { duration: [5, "days"], changes: [ch("system.attributes.attunement.max", "add", "1")] },
  },
  {
    id: "yDfNPSQ296iityij",
    name: "Pass Without Trace",
    img: "icons/consumables/potions/bottle-round-corked-yellow.webp",
    rarity: "uncommon",
    description:
      "<p>For 1 hour you can move through any type of terrain and leave neither footprints nor scent: you have a +10 bonus to Dexterity (Stealth) checks and you cannot be tracked except by magical means.</p>",
    effect: { duration: [1, "hours"], changes: [ch("system.skills.ste.roll.bonus", "add", "10")] },
  },
  {
    id: "NRltRDCfJCTu6frt",
    name: "Plant Nourishment",
    img: "icons/consumables/potions/bottle-conical-bubbling-blue.webp",
    rarity: "common",
    description:
      "<p>Makes plants grow 10 times faster than normal over the course of a year, and cures any blights or wounds the plants have suffered. 1 dose poured on the ground affects all plants in a 40 ft. radius.</p><p>If drunk by a person it results in the permanent loss of 1 Wisdom.</p>",
    pour: true,
    effect: { name: "Plant Nourishment (drunk)", changes: [ch("system.abilities.wis.value", "add", "-1")] },
  },
  {
    id: "rwiqgjX2sHoB5H3k",
    name: "Protection From Death",
    img: "icons/consumables/potions/flask-corked-red-glow.webp",
    rarity: "veryRare",
    description: "<p>For one hour: the first time any effect would reduce you to 0 hit points you are reduced to 1 hit point instead.</p>",
    effect: { duration: [1, "hours"], flags: { protectionFromDeath: true } },
  },
  {
    id: "iSnyqLSClSjZx1Nk",
    name: "Radio Activity",
    img: "icons/consumables/potions/bottle-conical-fumes-green.webp",
    rarity: "rare",
    description:
      "<p>You begin to glow for 5 rounds creating a 25 ft. aura of green light around you. Each creature, including yourself, must make a DC 14 Constitution saving throw when it starts its turn within 25 ft. of you. A target takes 3d6 radiant damage on a failed save, or half as much on a successful one.</p>",
    effect: {
      duration: [5, "rounds"],
      flags: {
        aura: { radius: 25, includeSelf: true, save: { ability: "con", dc: 14 }, damage: { formula: "3d6", type: "radiant" } },
        light: { dim: 25, bright: 5, color: "#4dff4d", alpha: 0.4, animation: { type: "pulse", speed: 3, intensity: 3 } },
      },
    },
  },
  {
    id: "y6zSFJYIKPOiZnI7",
    name: "Reflect Damage",
    img: "icons/consumables/potions/bottle-round-corked-red.webp",
    rarity: "veryRare",
    description: "<p>Until the start of your next turn, all damage you would receive from an attacker is dealt to the attacker instead.</p>",
    effect: { duration: [1, "rounds"], flags: { reflectDamage: true } },
  },
  {
    id: "BxtFA7sMSWIML0aG",
    name: "Regeneration",
    img: "icons/consumables/potions/conical-ornate-purple.webp",
    rarity: "veryRare",
    description: "<p>You regenerate 10 hit points at the start of each of your turns for one minute.</p>",
    effect: { duration: [10, "rounds"], flags: { turnStart: { heal: "10" } } },
  },
  {
    id: "SUJ0FsFU1YlW8Ail",
    name: "Repair Glue",
    img: "icons/consumables/potions/bottle-conical-corked-purple.webp",
    rarity: "common",
    description:
      "<p>Repairs small breaks or tears in objects. 1 dose poured on objects weighing 10 lb. in total.</p><p>If drunk by a person it results in the permanent loss of 1 Wisdom.</p>",
    pour: true,
    effect: { name: "Repair Glue (drunk)", changes: [ch("system.abilities.wis.value", "add", "-1")] },
  },
  {
    id: "OaJjAk4crpXHRTPv",
    name: "Restoration Greater",
    img: "icons/consumables/potions/bottle-round-label-cork-green.webp",
    rarity: "veryRare",
    description:
      "<p>Positive energy undoes a debilitating effect. You can reduce your exhaustion level by one, or end one of the following effects: charmed, petrified, cursed, a reduction of your hit point maximum.</p>",
    use: { restoration: "greater" },
  },
  {
    id: "FL9Yuouc8V8OTrbP",
    name: "Restoration Lesser",
    img: "icons/consumables/potions/bottle-round-label-cork-green.webp",
    rarity: "uncommon",
    description: "<p>Ends one disease or one of the following conditions afflicting you: blinded, deafened, paralyzed or poisoned.</p>",
    use: { restoration: "lesser" },
  },
  {
    id: "xVqhoLAtPeYxYe9P",
    name: "Shield of Energy",
    img: "icons/consumables/potions/bottle-round-empty-glass.webp",
    rarity: "rare",
    description:
      "<p>You create a gleaming sphere of energy with a 10 ft. radius centered on you. For 1 minute everyone within it when it forms (you included) gets a +2 bonus to AC.</p>",
    effect: { duration: [1, "minutes"], changes: [ch("system.attributes.ac.bonus", "add", "+2")] },
    use: { area: { radius: 10 } },
  },
  {
    id: "U8wGkjLGinM5L54q",
    name: "Speak Language",
    img: "icons/consumables/potions/bottle-pear-corked-pink.webp",
    rarity: "uncommon",
    description: "<p>For 24 hours, you can speak, read and understand one additional language.</p>",
    effect: { duration: [24, "hours"] },
  },
  {
    id: "j641yloHOUgLIBwM",
    name: "Specialist (Mage)",
    img: "icons/consumables/potions/bottle-pear-corked-labeled-green.webp",
    rarity: "uncommon",
    description: "<p>For the next minute you gain +2 on spell attacks and +2 on spell damage, while your speed is halved.</p>",
    effect: {
      duration: [1, "minutes"],
      changes: [
        ch("system.rolls.attack.msak.bonus", "add", "2"),
        ch("system.rolls.attack.rsak.bonus", "add", "2"),
        ch("system.rolls.damage.msak.bonus", "add", "2"),
        ch("system.rolls.damage.rsak.bonus", "add", "2"),
        ch("system.attributes.movement.multiplier", "multiply", "0.5"),
      ],
    },
  },
  {
    id: "omxL5fdlJ5wYXlkw",
    name: "Specialist (Melee)",
    img: "icons/consumables/potions/bottle-pear-corked-labeled-green.webp",
    rarity: "uncommon",
    description:
      "<p>For the next minute you gain +2 on melee weapon attacks and +2 on melee weapon damage, while your Dexterity and Wisdom saving throws are lowered by 2.</p>",
    effect: {
      duration: [1, "minutes"],
      changes: [
        ch("system.rolls.attack.mwak.bonus", "add", "2"),
        ch("system.rolls.damage.mwak.bonus", "add", "2"),
        ch("system.abilities.dex.save.roll.bonus", "add", "-2"),
        ch("system.abilities.wis.save.roll.bonus", "add", "-2"),
      ],
    },
  },
  {
    id: "EdcAwBTS1ke2QxZ0",
    name: "Specialist (Ranged)",
    img: "icons/consumables/potions/bottle-pear-corked-labeled-green.webp",
    rarity: "uncommon",
    description: "<p>For the next minute you gain +2 on ranged weapon attacks and +2 on ranged weapon damage, while your AC is lowered by 2.</p>",
    effect: {
      duration: [1, "minutes"],
      changes: [
        ch("system.rolls.attack.rwak.bonus", "add", "2"),
        ch("system.rolls.damage.rwak.bonus", "add", "2"),
        ch("system.attributes.ac.bonus", "add", "-2"),
      ],
    },
  },
  {
    id: "nUgpaHq1LHC9QGLu",
    name: "Time Stop",
    img: "icons/consumables/potions/bottle-conical-corked-yellow.webp",
    rarity: "rare",
    description:
      "<p>You stop the time affecting you for 5 rounds. For the rest of the world you freeze in place: you cannot be moved or changed in any way (including damage and healing), and you cannot act. For yourself no time has passed, you just happen to be 5 rounds further in the future.</p>",
    effect: {
      name: "Timeless",
      duration: [5, "rounds"],
      statuses: ["incapacitated"],
      changes: [ch("system.attributes.movement.multiplier", "multiply", "0")],
      flags: invulnerable,
    },
  },
  {
    id: "WQ0Sfdnn0c5sQI2Q",
    name: "Time Travel",
    img: "icons/consumables/potions/bottle-conical-corked-yellow.webp",
    rarity: "legendary",
    description:
      "<p>You travel back in time for exactly 30 minutes. You do not change! The world around you does: you coexist with your past self. You start your existence in the past at the exact same spot you are currently in, with exactly the same stats and equipment.</p><p><strong>Rules of time travel:</strong> you cannot change anything affecting your personal perspective of history! Your past self is not aware of your help and does exactly the same as before. If you violate the rules, your time travel ends immediately and you return to your timeline where everything happened as before. (In reality you just opened a new parallel timeline, sadly your mind is bonded to this one.)</p><p>When your time is up or after you violate the rules, your existence vanishes while your past self is simultaneously struck down to 0 hit points. When it survives, its mind is the mind of the traveller.</p><p>But wait, why should you then drink this potion? Be creative! The changes you make could change the future thereafter. E.g. you have been chased by an angry mob and ended up in front of a locked door. If only someone had left a key below that doormat.</p>",
    effect: { name: "Timeless", duration: [30, "minutes"] },
  },
  {
    id: "Xw46DSfi4sKT8nWz",
    name: "Tree Friend",
    img: "icons/consumables/potions/bottle-round-corked-green.webp",
    rarity: "uncommon",
    description: "<p>You are instantly teleported to the nearest tree.</p>",
  },
  {
    id: "abmTcsGnJaHZxNDU",
    name: "Weightless",
    img: "icons/consumables/potions/bottle-bulb-empty-glass.webp",
    rarity: "common",
    description:
      "<p>Your body becomes weightless for 1 minute. As long as you do not carry anything (including clothes) you are no longer pulled down to earth: you hover.</p>",
    effect: { duration: [1, "minutes"], statuses: ["hovering"] },
  },
];

export const PRICES = { common: 50, uncommon: 250, rare: 750, veryRare: 2500, legendary: 5000 };
