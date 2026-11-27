import { sys } from "./system.js";
import { chat, deleteEffect, effectsWith, hasEffect, NS, potionFlag, runAsGM } from "./util.js";

/**
 * Damage and attack rules of the potions. The parts that work on the hit points are the same in every system:
 * - invulnerable: no damage and no healing (Time Stop)
 * - protectionFromDeath: the first time the creature would drop to 0 hit points it keeps 1 (Protection From Death)
 * The system adapters call the attack helpers from their roll hooks:
 * - attackModes(attacker, targets): advantage / disadvantage / critical from grantsAdvantage, grantsDisadvantage,
 *   grantsCritical (attacks against the creature) and attackAdvantage (its own attacks)
 * - distortion(attacker, targets): a chance that an attack against the creature misses (Distortion)
 * - reflect(actor, amount, attacker): damage goes back to the attacker (Reflect Damage); systems that apply damage
 *   without its source get it from the hit point update and the latest roll in the chat
 * - immune: [status] statuses that cannot be put on the creature (Overconfident in pf1, D35E)
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

export const targetActors = () => [...game.user.targets].map((t) => t.actor).filter((a) => a);

export function attackModes(attacker, targets = targetActors()) {
  let advantage = hasEffect(attacker, "attackAdvantage");
  let disadvantage = false;
  let critical = false;
  for (const target of targets) {
    if (hasEffect(target, "grantsAdvantage")) advantage = true;
    if (hasEffect(target, "grantsCritical")) critical = true;
    for (const effect of effectsWith(target, "grantsDisadvantage")) {
      if (potionFlag(effect, "grantsDisadvantage") === "sight" && sys.seesThrough?.(attacker)) continue;
      disadvantage = true;
    }
  }
  return { advantage, disadvantage, critical };
}

export async function distortion(attacker, targets = targetActors()) {
  for (const target of targets) {
    for (const effect of effectsWith(target, "distortion")) {
      const chance = Number(potionFlag(effect, "distortion")) || 20;
      const roll = await new Roll("1d100").evaluate();
      const missed = roll.total <= chance;
      await chat(target, loc(missed ? "distortionMiss" : "distortionHit", { attacker: attacker?.name ?? "", roll: roll.total, chance }), effect.name);
    }
  }
}

/** returns true when the damage was reflected (and must not be applied to the actor) */
export function reflect(actor, amount, attacker, type) {
  if (!(amount > 0) || !hasEffect(actor, "reflectDamage") || !attacker || attacker === actor) return false;
  void runAsGM("damage", { uuid: attacker.uuid, amount, type });
  void chat(actor, loc("reflected", { amount, attacker: attacker.name }));
  return true;
}

/**
 * The attacker of damage the system does not tell (a5e, pf1, pf2e, D35E apply damage without a source): the speaker
 * of the latest roll in the chat (of the last minute) that is not the damaged creature itself. pf1 and D35E keep the
 * rolls of their attack cards in their own data: a message with the system's flags counts as well.
 */
function lastAttacker(actor) {
  const since = Date.now() - 60_000;
  for (const message of game.messages.contents.slice(-10).reverse()) {
    if (message.timestamp < since) break;
    if (message.content?.includes(`class="${NS}"`)) continue;
    if (!message.rolls?.length && !message.flags?.[game.system.id]) continue;
    const speaker = ChatMessage.getSpeakerActor(message.speaker);
    if (speaker && speaker !== actor) return speaker;
  }
  return null;
}

/** the statuses the actor's potions keep off (pf1, D35E: flags["beavers-potions"].immune) */
const immunities = (actor) => new Set(effectsWith(actor, "immune").flatMap((e) => potionFlag(e, "immune")));

Hooks.on("preCreateActiveEffect", (effect) => {
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !effect.statuses?.size) return;
  const immune = immunities(actor);
  const kept = [...effect.statuses].filter((s) => immune.has(s));
  if (!kept.length) return;
  void chat(actor, loc("immune", { what: kept.map((s) => sys.statusLabel?.(s) ?? s).join(", ") }));
  return false;
});

export const invulnerable = (actor) => hasEffect(actor, "invulnerable");

/** the hit points an update would set (the adapter may store them differently, pf1: offset from the maximum) */
function nextHp(actor, changes) {
  if (sys.nextHp) return sys.nextHp(actor, changes);
  const { value: valuePath, temp: tempPath } = sys.hpPaths ?? {};
  if (!valuePath) return {};
  return { value: foundry.utils.getProperty(changes, valuePath), temp: tempPath ? foundry.utils.getProperty(changes, tempPath) : undefined };
}

function setHp(actor, changes, hp) {
  if (sys.setHp) return sys.setHp(actor, changes, hp);
  const { value: valuePath, temp: tempPath } = sys.hpPaths;
  if (hp.value !== undefined) foundry.utils.setProperty(changes, valuePath, hp.value);
  if (hp.temp !== undefined && tempPath) foundry.utils.setProperty(changes, tempPath, hp.temp);
}

Hooks.on("preUpdateActor", (actor, changes) => {
  // D35E: conditions are actor data
  if (sys.blockStatuses) {
    const kept = sys.blockStatuses(actor, changes, immunities(actor));
    if (kept.length) void chat(actor, loc("immune", { what: kept.map((s) => sys.statusLabel?.(s) ?? s).join(", ") }));
  }
  if (!sys.hp) return;
  const { value, temp } = nextHp(actor, changes);
  if (value === undefined && temp === undefined) return;

  // Time Stop: hit points do not change at all
  if (invulnerable(actor)) {
    const hp = sys.hp(actor);
    const keep = {};
    if (value !== undefined && value !== hp.value) keep.value = hp.value;
    if (temp !== undefined && temp !== (hp.temp ?? 0)) keep.temp = hp.temp ?? 0;
    if (Object.keys(keep).length) {
      setHp(actor, changes, keep);
      void chat(actor, loc("invulnerable"));
    }
    return;
  }

  // Reflect Damage, where the system does not do it itself (dnd5e: dnd5e.preApplyDamage)
  if (!sys.reflectsDamage && hasEffect(actor, "reflectDamage")) {
    const hp = sys.hp(actor);
    const lost = hp.value + (hp.temp ?? 0) - ((value ?? hp.value) + (temp ?? hp.temp ?? 0));
    if (lost > 0 && reflect(actor, lost, lastAttacker(actor))) {
      setHp(actor, changes, { value: hp.value, temp: hp.temp ?? 0 });
      return;
    }
  }

  // Protection From Death
  if (value === undefined || value > 0) return;
  const effect = effectsWith(actor, "protectionFromDeath")[0];
  if (!effect) return;
  setHp(actor, changes, { value: 1 });
  // after the update: the protection is used up
  setTimeout(async () => {
    await deleteEffect(effect);
    await chat(actor, loc("protectedFromDeath"), effect.name);
  }, 0);
});
