import { endOnAction } from "./use.js";
import { chat, effectsWith, hasEffect, NS, potionFlag, registerGMAction, runAsGM } from "./util.js";

/**
 * Attack and damage rules of the potions:
 * - grantsAdvantage / grantsDisadvantage / grantsCritical: attacks against the creature (Casters Overtime, Blur, Minor Invisibility)
 * - attackAdvantage: the creature's own attacks (Minor Invisibility)
 * - distortion: a chance that an attack against the creature misses (Distortion)
 * - reflectDamage: damage from an attack goes back to the attacker (Reflect Damage)
 * - invulnerable: no damage and no healing (Time Stop)
 * - protectionFromDeath: the first time the creature would drop to 0 hit points it keeps 1 (Protection From Death)
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

const targetActors = () => [...game.user.targets].map((t) => t.actor).filter((a) => a);

/** an attacker with blindsight or truesight is not fooled by what relies on sight */
function seesThrough(attacker) {
  const ranges = attacker?.system.attributes?.senses?.ranges ?? attacker?.system.attributes?.senses ?? {};
  return (ranges.blindsight ?? 0) > 0 || (ranges.truesight ?? 0) > 0;
}

Hooks.on("dnd5e.preRollAttackV2", (config) => {
  const attacker = config.subject?.actor;
  let advantage = hasEffect(attacker, "attackAdvantage");
  let disadvantage = false;
  for (const target of targetActors()) {
    if (hasEffect(target, "grantsAdvantage")) advantage = true;
    for (const effect of effectsWith(target, "grantsDisadvantage")) {
      if (potionFlag(effect, "grantsDisadvantage") === "sight" && seesThrough(attacker)) continue;
      disadvantage = true;
    }
  }
  if (advantage) config.advantage = true;
  if (disadvantage) config.disadvantage = true;
});

/** the healing of a potion is rolled without dialog and applied to the drinker */
const potionHeal = (activity) =>
  activity?.type === "heal" && potionFlag(activity.item, "potion") && game.settings.get(NS, "automate") && activity.actor?.isOwner;

Hooks.on("dnd5e.preRollDamageV2", (config, dialog) => {
  if (potionHeal(config.subject)) dialog.configure = false;
});

Hooks.on("dnd5e.rollDamageV2", async (rolls, { subject } = {}) => {
  if (!potionHeal(subject) || !rolls?.length) return;
  const actor = subject.actor;
  const onlyType = potionFlag(subject.item, "use")?.onlyType;
  if (onlyType && actor.system.details?.type?.value !== onlyType) {
    await chat(actor, loc("noEffect"), subject.item.name);
    return;
  }
  const total = rolls.reduce((sum, r) => sum + r.total, 0);
  if (rolls[0].options?.type === "temphp") {
    if ((actor.system.attributes.hp.temp ?? 0) < total) await actor.update({ "system.attributes.hp.temp": total });
  } else {
    await actor.applyDamage([{ value: total, type: "healing" }]);
  }
});

Hooks.on("dnd5e.preRollDamageV2", (config) => {
  if (config.subject?.type !== "attack") return;
  if (targetActors().some((t) => hasEffect(t, "grantsCritical"))) config.isCritical = true;
});

Hooks.on("dnd5e.rollAttackV2", async (rolls, { subject } = {}) => {
  if (!subject) return;
  // an attack roll ends Minor Invisibility, also when the attack was rolled without using the activity
  if (subject.actor) await endOnAction(subject.actor, subject);
  for (const target of targetActors()) {
    for (const effect of effectsWith(target, "distortion")) {
      const chance = Number(potionFlag(effect, "distortion")) || 20;
      const roll = await new Roll("1d100").evaluate();
      const missed = roll.total <= chance;
      await chat(target, loc(missed ? "distortionMiss" : "distortionHit", { attacker: subject.actor?.name ?? "", roll: roll.total, chance }), effect.name);
    }
  }
});

/* -------------------------------------------- */

Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
  if (hasEffect(actor, "invulnerable")) {
    void chat(actor, loc("invulnerable"));
    return false;
  }
  if (amount > 0 && hasEffect(actor, "reflectDamage")) {
    const attacker = options?.originatingMessage?.getAssociatedActor?.();
    if (attacker && attacker !== actor) {
      void runAsGM("damage", { uuid: attacker.uuid, amount });
      void chat(actor, loc("reflected", { amount, attacker: attacker.name }));
      return false;
    }
  }
  return true;
});

registerGMAction("damage", async ({ uuid, amount }) => {
  const actor = await fromUuid(uuid);
  await actor?.applyDamage(amount);
});

Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  const hp = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (hp === undefined || hp > 0) return;
  const effect = effectsWith(actor, "protectionFromDeath")[0];
  if (!effect) return;
  foundry.utils.setProperty(changes, "system.attributes.hp.value", 1);
  // after the update: the protection is used up
  setTimeout(async () => {
    await effect.delete();
    await chat(actor, loc("protectedFromDeath"), effect.name);
  }, 0);
});
