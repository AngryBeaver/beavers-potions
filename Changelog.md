# 3.1.1
- Cobra Kai and Ice Devil transform you in every system: outside dnd5e an effect with the form's AC, speed, size and
  blindsight, its hit points as temporary hit points and its attacks; the token shows the form (pf2e: a battle form,
  D35E: its shapechange image). Ice Devil leaves "Corrupted Mind" behind in every system
- Reflect Damage works in a5e, pf1, pf2e and D35E (the attacker is the creature whose roll came last)
- Casters Overtime, attacks against you are critical: pf1 and D35E helpless, pf2e every hit is a critical hit, a5e says it in the chat
- Batman: silenced in a5e, pf1 and D35E (a status of the module), blindsight in pf1 and D35E
- Overconfident: pf1 and D35E keep frightened (shaken / fear) off
- Weightless: pf1 hover; pf2e and D35E a fly speed as fast as you walk
- Overload Attunement in pf2e: one more invested item
- Cure Disease in pf2e: ends afflictions and effects with the disease trait
- pf1: every change of a buff has its own id (they shared one)

# 3.1.0
- new systems: Level Up A5E, D&D 3.5 SRD (Foundry 14), Pathfinder 1e and Pathfinder 2e (Foundry 13): each with its own potions, ingredients, recipes and tables
- the potions are described once, independent of the system (tools/potions.mjs); tools/systems/<system>.mjs translates them, src/systems/<system>.js is the runtime part of a system
- 5e rules are translated where a system has no 5e term (advantage, exhaustion ...); what a system cannot do is listed per potion and left to the Gamemaster
- the module needs Foundry 13 (pf1, pf2e) or 14 (dnd5e, a5e, D35E)

# 3.0.0
⚠️ needs Foundry 14 and dnd5e 6, reimport the potions, ingredients and recipes
- the potions work with dnd5e alone: midi-qol, DAE, item macro, dfreds convenient effects, Active Auras and Token Magic are no longer needed
- most potions do what they describe (see README), the others carry a reminder effect with their duration
- new compendium Ingredients: 22 mushrooms (Foundry icons), Magical Essence, Any Mushroom, Any Potion. They were part of beavers-crafting before
- recipes point to the new ingredients; new recipes: Blur, Regeneration, Glimpse of Future, Casters Overtime Supreme; fixed recipes without result
- Casters Overtime Supreme refills up to level 5 (4 exhaustion); Specialist (Mage) halves speed
- random potion tables are built from the potions of each rarity
- fixed names (Shield of Energy, Specialist (Melee), Beauty Elixir, …)
- build with esbuild instead of gulp, compendiums are generated as JSON sources (packs-src); GitHub actions for lint/build and release

# 2.0.2
- upgrade recipes to beaver's crafting 4.0.0
⚠️ you need to reimport the recipes
# 1.0.10
- upgrade recipes to beaver's crafting 3.0.0
⚠️you need to reimport the recipes

# 1.0.9
- fix gather essence
- change: shield of energy 

midi-qol 10.0.24 is out and optiona ac is now working, sadly it can not be passed via aura. ->
Shield of Energy effect will be granted to all within the aura regardless if the attacker is outside or not.
With this interpretation it simplifies gameplay as you do not need to do anything when getting attacked.

# 1.0.8
- fix rollTable compendium.
- fix recipes using correct Magical Essence reference
