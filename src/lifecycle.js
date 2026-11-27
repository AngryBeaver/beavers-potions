import { applyEffectData } from "./effects.js";
import { sys } from "./system.js";
import { deleteEffect, effectsWith, isEffectItem, NS, potionFlag } from "./util.js";

/**
 * Begin and end of potion effects:
 * - light: the bearer's tokens glow while the effect lasts (Radio Activity)
 * - endOn: ["move"] the effect ends when the token moves (Minor Invisibility; attack / spell: see use.js)
 * - onEnd: { exhaustion, revert, createEffect } when the effect ends or expires (Messenger's Potion, Cobra Kai, Ice Devil)
 * Each hook acts on the client of the user who made the change.
 */

Hooks.on("createActiveEffect", (effect, options, userId) => void began(effect, userId));

// buffs (pf1, D35E) and effects (pf2e) are items
Hooks.on("createItem", (item, options, userId) => {
  if (isEffectItem(item) && item.flags?.[NS] && item.system?.active !== false) void began(item, userId);
});
Hooks.on("updateItem", (item, changed, options, userId) => {
  if (userId !== game.user.id || !isEffectItem(item) || !item.flags?.[NS]) return;
  const active = foundry.utils.getProperty(changed, "system.active");
  if (active === false) void ended(item);
  if (active === true) void began(item, userId);
});
Hooks.on("deleteItem", (item, options, userId) => {
  if (userId !== game.user.id || !isEffectItem(item) || !item.flags?.[NS] || item.system?.active === false) return;
  void ended(item);
});

async function began(effect, userId) {
  if (userId !== game.user.id) return;
  const light = potionFlag(effect, "light");
  if (light && effect.parent instanceof Actor) {
    const prior = {};
    for (const token of effect.parent.getActiveTokens(false, true)) {
      prior[token.id] = token.light.toObject();
      await token.update({ light });
    }
    await effect.setFlag(NS, "priorLight", prior);
  }
}

Hooks.on("updateActiveEffect", async (effect, changed, options, userId) => {
  if (userId !== game.user.id) return;
  if (foundry.utils.getProperty(changed, "duration.expired") === true) await ended(effect);
});

Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
  if (userId !== game.user.id) return;
  if (effect.duration?.expired) return; // already handled when it expired
  await ended(effect);
});

async function ended(effect) {
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  // a buff that is switched off and then deleted ends once
  const prior = potionFlag(effect, "priorLight");
  if (prior) {
    for (const token of actor.getActiveTokens(false, true)) {
      if (prior[token.id]) await token.update({ light: prior[token.id] });
    }
  }
  if (sys.effectEnded) await sys.effectEnded(actor, effect);
  const onEnd = potionFlag(effect, "onEnd");
  if (!onEnd) return;
  if (onEnd.exhaustion) await sys.exhaustion(actor, onEnd.exhaustion);
  let target = actor;
  if (onEnd.revert && sys.isTransformed?.(actor)) target = (await sys.revert(actor)) ?? actor;
  if (onEnd.createEffect && target) {
    const data = foundry.utils.deepClone(onEnd.createEffect);
    delete data._id;
    data.transfer = false;
    data.start = ActiveEffect.implementation.getEffectStart?.();
    await applyEffectData(target, [data]);
  }
  if (effect.duration?.expired && actor.effects?.has?.(effect.id)) await effect.delete();
}

Hooks.on("updateToken", async (token, changed, options, userId) => {
  if (userId !== game.user.id || !("x" in changed || "y" in changed)) return;
  const actor = token.actor;
  for (const e of effectsWith(actor, "endOn").filter((e) => potionFlag(e, "endOn").includes("move"))) await deleteEffect(e);
});
