import { chat, distanceBetween, effectsWith, isActiveGM, NS, potionFlag } from "./util.js";

/**
 * Start of a creature's turn, run by the active Gamemaster:
 * - turnStart: { heal } regains hit points, { temp } regains temporary hit points up to the value (Regeneration, Frost Armor)
 * - aura: { radius, includeSelf, save: { ability, dc }, damage: { formula, type } } hurts the creature when it starts
 *   its turn within the radius of the aura's bearer (Frost Armor, Radio Activity)
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

Hooks.on("updateCombat", (combat, changed) => {
  if (!("turn" in changed || "round" in changed) || !combat.started || !isActiveGM()) return;
  const combatant = combat.combatant;
  if (!combatant?.actor) return;
  void turnStart(combatant).catch((err) => console.error(`${NS} | turn start`, err));
});

Hooks.on("combatStart", (combat) => {
  if (!isActiveGM()) return;
  // the first turn: updateCombat comes with it as well, but only when turn changes from a previous value
  const combatant = combat.combatant;
  if (combatant?.actor && combat.turn === 0 && combat.round <= 1) {
    setTimeout(() => void turnStart(combat.combatant).catch((err) => console.error(`${NS} | turn start`, err)), 0);
  }
});

export async function turnStart(combatant) {
  const actor = combatant.actor;
  for (const effect of effectsWith(actor, "turnStart")) {
    const { heal, temp } = potionFlag(effect, "turnStart");
    if (heal) {
      const amount = (await new Roll(String(heal)).evaluate()).total;
      await actor.applyDamage([{ value: amount, type: "healing" }]);
      await chat(actor, loc("turnHeal", { amount }), effect.name);
    }
    if (temp) {
      const current = actor.system.attributes.hp.temp ?? 0;
      if (current < temp) await actor.update({ "system.attributes.hp.temp": temp });
      await chat(actor, loc("turnTemp", { amount: temp }), effect.name);
    }
  }
  const token = combatant.token?.object;
  if (!token || !canvas.tokens) return;
  for (const bearer of canvas.tokens.placeables) {
    for (const effect of effectsWith(bearer.actor, "aura")) {
      const aura = potionFlag(effect, "aura");
      if (bearer.actor === actor && !aura.includeSelf) continue;
      if (distanceBetween(bearer, token) > aura.radius) continue;
      await auraHit(actor, effect, aura);
    }
  }
}

async function auraHit(actor, effect, { save, damage }) {
  let saved = false;
  if (save) {
    const roll = (await actor.rollSavingThrow({ ability: save.ability, target: save.dc }, { configure: false }, { create: true }))?.[0];
    saved = roll ? roll.total >= save.dc : false;
  }
  const roll = await new Roll(damage.formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${effect.name} (${damage.type})` });
  const amount = saved ? Math.floor(roll.total / 2) : roll.total;
  await actor.applyDamage([{ value: amount, type: damage.type }]);
}
