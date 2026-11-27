// Ingredients and Beaver's Crafting recipes of Beaver's Potions, see tools/generate-packs.mjs.

/** the mushrooms: [id, name, Foundry core icon]; ids are kept from the old beavers-crafting ingredients */
export const MUSHROOMS = [
  ["EBn04GlzYZdMi23m", "Astrid Lindworm", "icons/consumables/mushrooms/helm-purple-shiny.webp"],
  ["F1SSWiF1VvLWDvoK", "Blue Bill", "icons/consumables/mushrooms/ovate-blue.webp"],
  ["yaAARBHnqhZCn3kG", "Bongo Wombo", "icons/consumables/mushrooms/cluster-red-brown.webp"],
  ["dw4rYedscUjl6tp6", "Earth Tongue", "icons/consumables/mushrooms/umbonate-brown.webp"],
  ["qX7GnE8q1YsDKhr7", "EldStuff Boxed", "icons/consumables/mushrooms/crimini-button-brown.webp"],
  ["XFwqSg3NggqCvxlu", "Fly Agaric", "icons/consumables/mushrooms/mushroom-spotted-red.webp"],
  ["iw2D0a2gXp3lu7iJ", "Ghoule Groats", "icons/consumables/mushrooms/convex-green-brown.webp"],
  ["Q8Mlg9WpuW6zKqes", "Gloat Glow", "icons/consumables/mushrooms/umbontae-hot-pink.webp"],
  ["MNUTlx4UjXSRzW25", "Guepinia", "icons/consumables/mushrooms/conical-bell-orange-white.webp"],
  ["OOFUAGixSqsgyT29", "Hansel and Gretel", "icons/consumables/mushrooms/campanulate-bell-red-white.webp"],
  ["tqfcqsuPQRChhdj7", "Husk Puff", "icons/consumables/mushrooms/convex-tan.webp"],
  ["abVFmDAfMIxApd1c", "Jelly Bag Cap", "icons/consumables/mushrooms/campanulate-bell-shiny-blue.webp"],
  ["rG0lI6sHUR8b2xvD", "Manticore Drops", "icons/consumables/mushrooms/campanulate-bell-shiny-bumpy-red.webp"],
  ["90BJIBWtxLN3SMHn", "Penny Bun", "icons/consumables/mushrooms/convex-bolete-brown.webp"],
  ["dVFbblELstFhBgeW", "Rainblow", "icons/consumables/mushrooms/umbontae-pink-purple.webp"],
  ["1GPYa56eLe6yUgoU", "Shrimp Brain", "icons/consumables/mushrooms/conical-bell-pink.webp"],
  ["NHWQ6levQ3apHpN2", "Silver Dart", "icons/consumables/mushrooms/ovate-thin-blue.webp"],
  ["Q2IL3nSljRbVrhnt", "Star Dip", "icons/consumables/mushrooms/alien-spotted-blue.webp"],
  ["WTpNWej9PSN8A4G8", "Tiny Maw", "icons/consumables/mushrooms/helm-red-white.webp"],
  ["qK9o4MD82WmUgXP8", "Vanilla Mob", "icons/consumables/mushrooms/bell-shiitake-brown.webp"],
  ["AAfrnuKdmek8QYqV", "Viscid Ghost", "icons/consumables/mushrooms/umbontae-bumpy-purple.webp"],
  ["nrssiAqJHHCV1vyv", "Yellow Stoned", "icons/consumables/mushrooms/conical-bell-yellow.webp"],
];

export const ESSENCE = ["dozjFH55CR4npT6F", "Magical Essence", "icons/tools/laboratory/bowl-powder-purple.webp"];
export const ANY_MUSHROOM = ["AGQvjDL4TIPOEBHX", "Any Mushroom"];
export const ANY_POTION = ["iluiCHKksYVhsxwk", "Any Potion"];

/** results that are not potions of this module */
export const SRD_ITEMS = {
  "Potion of Healing": ["Compendium.dnd5e.items.Item.ytlsBjYsZ7OBSEBs", "icons/consumables/potions/potion-tube-corked-red.webp"],
  "Potion of Greater Healing": ["Compendium.dnd5e.items.Item.L887NdWEP5NqHCrQ", "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp"],
  "Potion of Superior Healing": ["Compendium.dnd5e.items.Item.5m9ErO9In8Uc5yyf", "icons/consumables/potions/bottle-round-corked-red.webp"],
  "Potion of Supreme Healing": ["Compendium.dnd5e.items.Item.JFiSlgcm3uSSBM5t", "icons/consumables/potions/potion-flask-stopped-red.webp"],
};

/** the random potion tables: [id, name, rarity, extra SRD potion] */
export const TABLES = [
  ["FoM4MdQwQ0ASqMGu", "Common Potions", "common", "Potion of Healing"],
  ["G0IBdDLoy3o2j0jJ", "Uncommon Potions", "uncommon", "Potion of Greater Healing"],
  ["rYKKOSkRoX5zmgJ3", "Rare Potions", "rare", "Potion of Superior Healing"],
  ["aq3NJ4xfyf3HhNXc", "Very Rare Potions", "veryRare", "Potion of Supreme Healing"],
  ["79j5pXceUZYl7bFu", "Legendary Potions", "legendary", null],
];

/**
 * [id, name, cost in gp, skill, dc, inputs [quantity, ingredient], result]
 * result: a potion of this module, an SRD item, a table or the Magical Essence
 */
export const RECIPES = [
  ["wfZxrUtKwj9arP2Y", "Aid Greater", 250, "med", 12, [[5, "Penny Bun"], [5, "Yellow Stoned"], [5, "Silver Dart"], [2, "Magical Essence"]], "Aid Greater"],
  ["d4fqiVR0OnZofgX0", "Batman", 250, "nat", 12, [[5, "Jelly Bag Cap"], [5, "Gloat Glow"], [5, "Blue Bill"], [2, "Magical Essence"]], "Batman"],
  ["nAfRk1eKIniTL049", "Beauty Elixir", 5, "med", 8, [[5, "Yellow Stoned"]], "Beauty Elixir"],
  ["bpRecBlur0000000", "Blur", 250, "arc", 12, [[5, "Viscid Ghost"], [5, "Star Dip"], [5, "Rainblow"], [2, "Magical Essence"]], "Blur"],
  ["c1sDpKEQbnzoQLwo", "Bug Shield", 5, "nat", 8, [[5, "Jelly Bag Cap"]], "Bug Shield"],
  ["FYqwMWNeD1QplR0n", "Casters Overtime", 50, "arc", 10, [[5, "Vanilla Mob"], [5, "Hansel and Gretel"], [1, "Magical Essence"]], "Casters Overtime"],
  ["Og1fc7UB41CYGY84", "Casters Overtime Greater", 250, "arc", 12, [[5, "Astrid Lindworm"], [5, "Guepinia"], [5, "Manticore Drops"], [2, "Magical Essence"]], "Casters Overtime Greater"],
  ["JUXP9jG5P4ETjwfj", "Casters Overtime Superior", 500, "arc", 13, [[5, "Jelly Bag Cap"], [5, "Yellow Stoned"], [5, "Manticore Drops"], [5, "Shrimp Brain"], [3, "Magical Essence"]], "Casters Overtime Superior"],
  ["bpRecCastSupreme", "Casters Overtime Supreme", 750, "arc", 14, [[5, "Jelly Bag Cap"], [5, "Yellow Stoned"], [5, "Manticore Drops"], [5, "Shrimp Brain"], [5, "Earth Tongue"], [5, "Magical Essence"]], "Casters Overtime Supreme"],
  ["WlN9m1NIGvHqAnbu", "Clone Army", 750, "rel", 14, [[5, "Bongo Wombo"], [5, "Husk Puff"], [5, "Gloat Glow"], [5, "Yellow Stoned"], [5, "Vanilla Mob"], [5, "Magical Essence"]], "Clone Army"],
  ["nygwgLC0SxofDDVZ", "Cobra Kai", 5, "arc", 8, [[5, "Astrid Lindworm"]], "Cobra Kai"],
  ["6IGsdtwlCEkDIeAI", "Comfort", 5, "med", 8, [[5, "Husk Puff"]], "Comfort"],
  ["FYEuonYJtrpvwvYn", "Comprehend Languages", 5, "his", 8, [[5, "Fly Agaric"]], "Comprehend Languages"],
  ["ypHSfO1FbsWbMdca", "Cure Disease", 5, "med", 8, [[5, "Bongo Wombo"]], "Cure Disease"],
  ["W4ZaZLBPC3bEg19y", "Cure Undead", 5, "rel", 8, [[5, "Ghoule Groats"]], "Cure Undead"],
  ["L8SnO3cRbAh6Q3UN", "Detect Magic", 5, "arc", 8, [[5, "Rainblow"]], "Detect Magic"],
  ["IVqv7WZE3537ilDC", "Distortion", 500, "arc", 13, [[5, "Vanilla Mob"], [5, "Star Dip"], [5, "Penny Bun"], [5, "Astrid Lindworm"], [3, "Magical Essence"]], "Distortion"],
  ["JJ5d0Cxg8kDaDHc9", "Feral Instinct", 50, "nat", 10, [[5, "Fly Agaric"], [5, "Blue Bill"], [1, "Magical Essence"]], "Feral Instinct"],
  ["F1nc2wXJBQ25mGs0", "Frost Armor", 50, "arc", 10, [[5, "Husk Puff"], [5, "Manticore Drops"], [1, "Magical Essence"]], "Frost Armor"],
  ["F6OhvQrbAYAt8yH1", "Frost Armor Greater", 250, "arc", 12, [[5, "Vanilla Mob"], [5, "Shrimp Brain"], [5, "Hansel and Gretel"], [2, "Magical Essence"]], "Frost Armor Greater"],
  ["pVCnbESlMZsDDjEj", "Gather Essence", 5, "arc", 12, [[1, "Any Potion"]], "Magical Essence"],
  ["bpRecGlimpseFutu", "Glimpse of Future", 50, "his", 10, [[5, "Fly Agaric"], [5, "Rainblow"], [1, "Magical Essence"]], "Glimpse of Future"],
  ["ZuHEc6ZY050bp2iM", "Gold Rush", 50, "inv", 10, [[5, "Shrimp Brain"], [5, "Viscid Ghost"], [1, "Magical Essence"]], "Gold Rush"],
  ["KOSkZi3yi79kHOIZ", "Healing", 5, "med", 8, [[5, "Penny Bun"]], "Potion of Healing"],
  ["4NtpsbVooCQ6k3id", "Healing Greater", 50, "med", 10, [[5, "Penny Bun"], [5, "Guepinia"], [1, "Magical Essence"]], "Potion of Greater Healing"],
  ["9M1uavgfergGK3eH", "Healing Superior", 250, "med", 12, [[5, "Penny Bun"], [5, "Guepinia"], [5, "Yellow Stoned"], [2, "Magical Essence"]], "Potion of Superior Healing"],
  ["8yD1yiMGeL6TwqXs", "Healing Supreme", 500, "med", 13, [[5, "Penny Bun"], [5, "Guepinia"], [5, "Yellow Stoned"], [5, "Vanilla Mob"], [3, "Magical Essence"]], "Potion of Supreme Healing"],
  ["dcWNQGhDujps4dqB", "Ice Devil", 750, "rel", 14, [[5, "Manticore Drops"], [5, "Rainblow"], [5, "Viscid Ghost"], [5, "Shrimp Brain"], [5, "Hansel and Gretel"], [5, "Magical Essence"]], "Ice Devil"],
  ["D8jF2dRLBwePH5wz", "Keen Sense", 50, "sur", 10, [[5, "Tiny Maw"], [5, "Jelly Bag Cap"], [1, "Magical Essence"]], "Keen Sense"],
  ["ihthq65bJVEDsFuV", "Life Shell", 50, "sur", 10, [[5, "Jelly Bag Cap"], [5, "Rainblow"], [1, "Magical Essence"]], "Life Shell"],
  ["HdbQ1mt64kKGQ3hH", "Life Shell Greater", 250, "sur", 12, [[5, "Silver Dart"], [5, "Ghoule Groats"], [5, "Star Dip"], [2, "Magical Essence"]], "Life Shell Greater"],
  ["dSXdTu2RVTwJFCi5", "Liquid Knowledge", 50, "his", 10, [[5, "Viscid Ghost"], [5, "EldStuff Boxed"], [1, "Magical Essence"]], "Liquid Knowledge"],
  ["IaetBi5E9k3kkhqm", "Live Essence", 250, "med", 12, [[5, "Silver Dart"], [5, "Viscid Ghost"], [5, "EldStuff Boxed"], [2, "Magical Essence"]], "Live Essence"],
  ["A8jxxQJwwPSbDOQc", "Messenger's Potion", 50, "sur", 10, [[5, "Astrid Lindworm"], [5, "Guepinia"], [1, "Magical Essence"]], "Messenger's Potion"],
  ["QGlBs8QE4OMos03s", "Minor Invisibility", 5, "arc", 8, [[5, "Viscid Ghost"]], "Minor Invisibility"],
  ["Cg3IAxhshQynxqYl", "Overconfident", 50, "nat", 10, [[5, "Gloat Glow"], [5, "Silver Dart"], [1, "Magical Essence"]], "Overconfident"],
  ["dRx6IG62FzVc3Ukk", "Overload Attunement", 750, "rel", 14, [[5, "Husk Puff"], [5, "Hansel and Gretel"], [5, "Astrid Lindworm"], [5, "Blue Bill"], [5, "Silver Dart"], [5, "Magical Essence"]], "Overload Attunement"],
  ["DqcuNZtAfICawMFn", "Pass Without Trace", 50, "sur", 10, [[5, "Ghoule Groats"], [5, "Star Dip"], [1, "Magical Essence"]], "Pass Without Trace"],
  ["IxqUUVHx8x7PUOFN", "Plant Nourishment", 5, "nat", 8, [[5, "Hansel and Gretel"]], "Plant Nourishment"],
  ["ayJRDGYJqHqvUPSd", "Protection From Death", 500, "rel", 13, [[5, "EldStuff Boxed"], [5, "Hansel and Gretel"], [5, "Guepinia"], [5, "Gloat Glow"], [3, "Magical Essence"]], "Protection From Death"],
  ["zpBJ8hvTbYkTOJje", "Radio Activity", 250, "rel", 12, [[5, "Silver Dart"], [5, "Ghoule Groats"], [5, "Husk Puff"], [2, "Magical Essence"]], "Radio Activity"],
  ["UMOWLiOcsH51uOl4", "Random Common Potions", 5, "arc", 10, [[1, "Any Mushroom"], [1, "Any Mushroom"], [1, "Any Mushroom"], [1, "Any Mushroom"], [1, "Any Mushroom"]], "Common Potions"],
  ["48vLNVsbMTIpD1RJ", "Random Uncommon Potions", 50, "arc", 12, [[2, "Any Mushroom"], [2, "Any Mushroom"], [2, "Any Mushroom"], [2, "Any Mushroom"], [2, "Any Mushroom"], [2, "Magical Essence"]], "Uncommon Potions"],
  ["SBlmvWsBOAm3Etek", "Random Rare Potions", 250, "arc", 13, [[3, "Any Mushroom"], [3, "Any Mushroom"], [3, "Any Mushroom"], [3, "Any Mushroom"], [3, "Any Mushroom"], [3, "Magical Essence"]], "Rare Potions"],
  ["v6iPMppJ7SF1of1O", "Reflect Damage", 500, "his", 13, [[5, "Viscid Ghost"], [5, "Vanilla Mob"], [5, "Rainblow"], [5, "Silver Dart"], [3, "Magical Essence"]], "Reflect Damage"],
  ["bpRecRegenerate0", "Regeneration", 500, "med", 13, [[5, "Penny Bun"], [5, "Guepinia"], [5, "Ghoule Groats"], [5, "Tiny Maw"], [3, "Magical Essence"]], "Regeneration"],
  ["WCT7FlQhy7n0Xcgf", "Repair Glue", 5, "nat", 8, [[5, "Silver Dart"]], "Repair Glue"],
  ["D7ONauhAkWoH2iha", "Restoration Greater", 500, "med", 13, [[5, "Ghoule Groats"], [5, "EldStuff Boxed"], [5, "Blue Bill"], [5, "Astrid Lindworm"], [3, "Magical Essence"]], "Restoration Greater"],
  ["icKX3MnIej8vPtsV", "Restoration Lesser", 50, "med", 10, [[5, "Yellow Stoned"], [5, "Bongo Wombo"], [1, "Magical Essence"]], "Restoration Lesser"],
  ["ZGB9jRHX55UagekR", "Shield of Energy", 250, "arc", 12, [[5, "Manticore Drops"], [5, "Astrid Lindworm"], [5, "Bongo Wombo"], [2, "Magical Essence"]], "Shield of Energy"],
  ["enaPqoHyVwF0tO7C", "Speak Language", 50, "his", 10, [[5, "Hansel and Gretel"], [5, "Husk Puff"], [1, "Magical Essence"]], "Speak Language"],
  ["S50ESLGzxno3r4Zr", "Specialist (Mage)", 50, "arc", 10, [[5, "Rainblow"], [5, "Blue Bill"], [1, "Magical Essence"]], "Specialist (Mage)"],
  ["5O4GphkYHSsJ3CEb", "Specialist (Melee)", 50, "arc", 10, [[5, "Guepinia"], [5, "Penny Bun"], [1, "Magical Essence"]], "Specialist (Melee)"],
  ["lrNJTNrNbAzRT1mF", "Specialist (Ranged)", 50, "arc", 10, [[5, "Earth Tongue"], [5, "Fly Agaric"], [1, "Magical Essence"]], "Specialist (Ranged)"],
  ["KCF5dUd3MRL5EuFf", "Time Stop", 250, "arc", 12, [[5, "Hansel and Gretel"], [5, "Tiny Maw"], [5, "Earth Tongue"], [2, "Magical Essence"]], "Time Stop"],
  ["J8EHAIj9czAq9fdY", "Time Travel", 750, "his", 14, [[5, "Husk Puff"], [5, "Hansel and Gretel"], [5, "Star Dip"], [5, "Ghoule Groats"], [5, "Gloat Glow"], [5, "Magical Essence"]], "Time Travel"],
  ["b1SvPq0S5arFLGet", "Tree Friend", 50, "nat", 10, [[5, "Jelly Bag Cap"], [5, "Shrimp Brain"], [1, "Magical Essence"]], "Tree Friend"],
  ["4ZYLH0NembGidYfo", "Weightless", 5, "nat", 8, [[5, "Star Dip"]], "Weightless"],
];

/** Gather Essence: the essence it yields depends on the rarity of the potion given up (our potions carry it as a flag) */
export const GATHER_ESSENCE_MACRO = (essenceUuid, itemType) => `const essence = {
  id: "${ESSENCE[0]}",
  uuid: "${essenceUuid}",
  type: "Item",
  itemType: "${itemType}",
  name: "${ESSENCE[1]}",
  img: "${ESSENCE[2]}",
  quantity: 1
};
const perRarity = { common: 0, uncommon: 2, rare: 4, veryRare: 8, legendary: 16, artifact: 32 };
for (const ingredient of Object.values(recipeData.input[1] ?? {})) {
  const item = await ingredient.getEntity();
  const rarity = item?.flags?.["beavers-potions"]?.rarity ?? item?.system?.rarity;
  // one essence is in the recipe's result already: add what the rarity gives on top of it
  essence.quantity = (perRarity[rarity] ?? 1) - 1;
  if (essence.quantity !== 0) result.updateComponent("produced", essence);
  break;
}`;
