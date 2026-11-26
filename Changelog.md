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
