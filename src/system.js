/**
 * The adapter of the active game system (src/systems/<system>.js). The generic rules of the module use it for
 * everything that differs between systems:
 *
 *   id                                 system id
 *   hpPaths                            { value, temp } update paths of the hit points
 *   hp(actor)                          { value, max, temp }
 *   heal(actor, amount)                regain hit points
 *   setTemp(actor, amount)             temporary hit points (only raised)
 *   damage(actor, amount, type)        take damage
 *   save(actor, ability, dc)           roll a saving throw (5e ability ids), resolves to true on a success
 *   exhaustion(actor, delta)           change exhaustion (or the system's equivalent)
 *   exhaustionLevel(actor)
 *   restoreSlots(actor, maxLevel)      refill spell slots, resolves to the levels refilled
 *   creatureType(actor)                e.g. "undead"
 *   statusLabel(id)
 *   restorationExtras(actor, kind)     more choices for Restoration: [{ label, run }]
 *   transform(actor, item, use)        become another creature (optional)
 *   seesThrough(actor)                 blindsight / truesight
 *   reflectsDamage                     true: the adapter reflects damage itself (it knows the attacker)
 *   blockStatuses(actor, changes, ids) optional: keeps statuses stored as actor data out of an update (D35E)
 *   applyPotionEffects(actor, item, ctx) optional: put the potion's effects on the actor (default: its active effects)
 *   register({ drink, endOnAction })   hooks of the system: call drink(actor, item, ctx) when a potion is drunk
 */
export const sys = {};

export function setSystem(adapter) {
  Object.assign(sys, adapter);
}
