import { addExhaustion, applyEffectData } from "./effects.js";
import { effectsWith, NS, potionFlag } from "./util.js";

/**
 * Begin and end of potion effects:
 * - light: the bearer's tokens glow while the effect lasts (Radio Activity)
 * - endOn: ["move"] the effect ends when the token moves (Minor Invisibility; attack / spell: see use.js)
 * - onEnd: { exhaustion, revert, createEffect } when the effect ends or expires (Messenger's Potion, Cobra Kai, Ice Devil)
 * Each hook acts on the client of the user who made the change.
 */

Hooks.on("createActiveEffect", async (effect, options, userId) => {
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
});

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
  const prior = potionFlag(effect, "priorLight");
  if (prior) {
    for (const token of actor.getActiveTokens(false, true)) {
      if (prior[token.id]) await token.update({ light: prior[token.id] });
    }
  }
  const onEnd = potionFlag(effect, "onEnd");
  if (!onEnd) return;
  if (onEnd.exhaustion) await addExhaustion(actor, onEnd.exhaustion);
  let target = actor;
  if (onEnd.revert && actor.isPolymorphed) {
    const original = game.actors.get(actor.getFlag("dnd5e", "originalActor"));
    await actor.revertOriginalForm();
    target = original ?? actor;
  }
  if (onEnd.createEffect && target) {
    const data = foundry.utils.deepClone(onEnd.createEffect);
    delete data._id;
    data.transfer = false;
    data.start = ActiveEffect.implementation.getEffectStart?.();
    await applyEffectData(target, [data]);
  }
  if (effect.duration?.expired && actor.effects.has(effect.id)) await effect.delete();
}

Hooks.on("updateToken", async (token, changed, options, userId) => {
  if (userId !== game.user.id || !("x" in changed || "y" in changed)) return;
  const actor = token.actor;
  const ids = effectsWith(actor, "endOn").filter((e) => potionFlag(e, "endOn").includes("move")).map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
});
