import { NS, potionFlag, registerGMAction, runAsGM } from "./util.js";

/**
 * Effect application without midi-qol / DAE: the effects of a potion are put onto the drinker (or everyone in the
 * area) as soon as it is used. Drinking the same potion again restarts its effects instead of stacking them.
 */

/** the key that identifies an effect of a potion, the same on every copy of the potion */
const sourceKey = (item, effect) => `${item.system.identifier || item.name.slugify()}.${effect.id}`;

/** effect data ready to be created on an actor */
export function effectData(item, effect) {
  const data = effect.toObject();
  delete data._id;
  data.origin = item.uuid;
  data.transfer = false;
  data.disabled = false;
  data.start = ActiveEffect.implementation.getEffectStart?.() ?? data.start;
  if (data.duration) data.duration.expired = false;
  data._stats = { ...(data._stats ?? {}), compendiumSource: null, duplicateSource: effect.uuid };
  foundry.utils.setProperty(data, `flags.${NS}.source`, sourceKey(item, effect));
  return data;
}

/** the effects an activity applies, as data */
export function activityEffects(activity) {
  const item = activity.item;
  return (activity.effects ?? [])
    .map((e) => item.effects.get(e._id))
    .filter((e) => e)
    .map((e) => effectData(item, e));
}

/** creates the effects on the actor, an effect of the same potion that is already there is replaced */
export async function applyEffectData(actor, effects) {
  if (!actor || !effects.length) return [];
  const sources = new Set(effects.map((e) => potionFlag(e, "source")));
  const old = actor.effects.filter((e) => sources.has(potionFlag(e, "source"))).map((e) => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  return actor.createEmbeddedDocuments("ActiveEffect", effects);
}

registerGMAction("applyEffects", async ({ actorUuids, effects }) => {
  for (const uuid of actorUuids) {
    const actor = await fromUuid(uuid);
    await applyEffectData(actor?.actor ?? actor, effects);
  }
});

/** applies effects to actors the user may not own */
export async function applyEffectsTo(actors, effects) {
  const own = actors.filter((a) => a.isOwner);
  for (const actor of own) await applyEffectData(actor, effects);
  const others = actors.filter((a) => !a.isOwner);
  if (others.length) await runAsGM("applyEffects", { actorUuids: others.map((a) => a.uuid), effects });
}

/** removes a status from the actor: the status effect itself and every effect that brings the status with it */
export async function removeStatus(actor, statusId) {
  const ids = actor.effects.filter((e) => e.statuses?.has(statusId)).map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  if (actor.statuses?.has(statusId)) await actor.toggleStatusEffect(statusId, { active: false });
}

export async function addExhaustion(actor, levels) {
  if (!levels || actor.system.attributes?.exhaustion === undefined) return;
  const max = CONFIG.DND5E.conditionTypes.exhaustion?.levels ?? 6;
  const value = Math.clamp((actor.system.attributes.exhaustion ?? 0) + levels, 0, max);
  await actor.update({ "system.attributes.exhaustion": value });
}
