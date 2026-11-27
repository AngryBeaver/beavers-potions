import { distortion, targetActors } from "../rolls.js";
import { chat, effectsWith, NS, potionFlag } from "../util.js";

/** attacks against a creature with grantsCritical are critical: a5e has no hook before its attack rolls, the chat says it */
async function criticalNotice(attacker, targets) {
  for (const target of targets) {
    const effect = effectsWith(target, "grantsCritical")[0];
    if (effect) await chat(target, game.i18n.format(`${NS}.criticalAgainst`, { target: target.name, attacker: attacker.name, name: effect.name }), effect.name);
  }
}

/**
 * Level Up: Advanced 5th Edition. Potions are "object" items with a "Drink" action; a5e fires a5e.itemActivate after
 * the action (its consumer has used up the potion by then). Attack roll modes against the drinker are a5e's own
 * "grants" effects, so only Distortion needs an attack hook here (the attack roll of an action).
 */

const isPotion = (item) => !!potionFlag(item, "potion");

export default {
  id: "a5e",
  rollsHealing: true,
  hpPaths: { value: "system.attributes.hp.value", temp: "system.attributes.hp.temp" },
  hp: (actor) => actor.system.attributes.hp,
  heal: (actor, amount) => actor.applyHealing(amount, "healing"),
  async setTemp(actor, amount) {
    if ((actor.system.attributes.hp.temp ?? 0) < amount) await actor.update({ "system.attributes.hp.temp": amount });
  },
  damage: (actor, amount, type) => actor.applyDamage(amount, type),
  async save(actor, ability, dc) {
    const message = await actor.rollSavingThrow(ability, { skipRollDialog: true });
    const total = message?.rolls?.[0]?.total;
    return total !== undefined && total >= dc;
  },
  /** a5e has fatigue instead of exhaustion */
  async exhaustion(actor, delta) {
    await actor.update({ "system.attributes.fatigue": Math.clamp((actor.system.attributes.fatigue ?? 0) + delta, 0, 7) });
  },
  exhaustionLevel: (actor) => actor.system.attributes.fatigue ?? 0,
  async restoreSlots(actor, maxLevel) {
    const update = {};
    const restored = [];
    for (let level = 1; level <= maxLevel; level++) {
      const slot = actor.system.spellResources?.slots?.[level];
      if (!slot?.max) continue;
      if (slot.current < slot.max) restored.push(level);
      update[`system.spellResources.slots.${level}.current`] = slot.max;
    }
    if (Object.keys(update).length) await actor.update(update);
    return restored;
  },
  creatureType: (actor) => [...(actor.system.details?.creatureTypes ?? [])].find((t) => t === "undead") ?? [...(actor.system.details?.creatureTypes ?? [])][0],
  statusLabel: (id) => game.i18n.localize(CONFIG.A5E.conditions?.[id] ?? id),
  seesThrough(actor) {
    const s = actor?.system.attributes?.senses ?? {};
    return (s.blindsight?.distance ?? 0) > 0 || (s.truesight?.distance ?? 0) > 0;
  },

  register({ drink, endOnAction }) {
    Hooks.on("a5e.itemActivate", (item, { action, rolls } = {}) => {
      const actor = item.actor ?? item.parent;
      if (!actor) return;
      const attack = (rolls ?? []).some((r) => r?.type === "attack");
      if (attack) {
        void endOnAction(actor, "attack");
        void distortion(actor, targetActors());
        void criticalNotice(actor, targetActors());
      }
      if (item.type === "spell") void endOnAction(actor, "spell");
      if (!isPotion(item)) return;
      // a5e keeps the action's effects as a Set
      const effects = [...(action?.effects ?? [])].map((id) => item.effects.get(id)).filter((e) => e);
      // a5e does not always use up the quantity (e.g. without its dialog): then the potion does it
      const quantity = item.system.quantity;
      setTimeout(async () => {
        const current = actor.items.get(item.id);
        if (!current || current.system.quantity !== quantity || !actor.isOwner) return;
        if (quantity > 1) await current.update({ "system.quantity": quantity - 1 });
        else await current.delete();
      }, 500);
      // a5e rolls the healing of the action and shows it, the drinker gets it here
      const healing = (rolls ?? []).find((r) => r?.type === "healing");
      const heal = healing?.roll ? [healing.healingType === "temporaryHealing" ? "temp" : "heal", healing.roll.total] : undefined;
      void drink(actor, item, { action, effects, heal });
    });
  },
};
