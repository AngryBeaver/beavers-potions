import { applyEffectData } from "./effects.js";
import { sys } from "./system.js";
import { chat, deleteEffect, effectsWith, isEffectItem, NS, potionEffectsOf, potionFlag } from "./util.js";

/**
 * Begin and end of potion effects:
 * - light: the bearer's tokens glow while the effect lasts (Radio Activity)
 * - form: { name, img, tint, size, hp, attacks } a transformation in the systems without dnd5e's transformInto: the
 *   tokens show the form, the form's hit points are temporary hit points, its attacks are items (Cobra Kai, Ice Devil)
 * - statuses: [id] statuses the actor has while the effect lasts (silenced where the system has no such status)
 * - hold: { path: value } actor data set while the effect lasts, then set back (D35E's senses)
 * - endsWith: source of another effect of the potion: this one ends with it
 * - endOn: ["move"] the effect ends when the token moves (Minor Invisibility; attack / spell: see use.js)
 * - onEnd: { exhaustion, revert, createEffect, createData } when the effect ends or expires (Messenger's Potion,
 *   Cobra Kai, Ice Devil); createData: effect items (buffs) of the system
 * Each hook acts on the client of the user who made the change.
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

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
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const remember = {};
  const light = potionFlag(effect, "light");
  if (light) {
    remember.priorLight = {};
    for (const token of actor.getActiveTokens(false, true)) {
      remember.priorLight[token.id] = token.light.toObject();
      await token.update({ light });
    }
  }
  const form = potionFlag(effect, "form");
  if (form) Object.assign(remember, await beginForm(actor, effect, form));
  for (const id of potionFlag(effect, "statuses") ?? []) await actor.toggleStatusEffect(id, { active: true });
  // Foundry stores "a.b" keys of a flag as nested objects: the paths are the leaves
  const hold = foundry.utils.flattenObject(potionFlag(effect, "hold") ?? {});
  if (Object.keys(hold).length) {
    remember.priorHold = Object.fromEntries(Object.keys(hold).map((path) => [path, foundry.utils.getProperty(actor._source, path) ?? null]));
    await actor.update(hold);
  }
  if (Object.keys(remember).length) await effect.update({ [`flags.${NS}`]: remember });
}

/**
 * The tokens show the form (img, tint; size where the system does not size tokens itself), its hit points become
 * temporary hit points, its attacks are items of the actor. Only what is changed is remembered.
 */
async function beginForm(actor, effect, { name, img, tint, size, hp, attacks }) {
  const priorForm = {};
  for (const token of img || size ? actor.getActiveTokens(false, true) : []) {
    const prior = {};
    const update = {};
    if (img) {
      prior["texture.src"] = token.texture.src;
      prior["texture.tint"] = token.texture.tint?.css ?? token.texture.tint ?? null;
      update["texture.src"] = img;
      update["texture.tint"] = tint ?? null;
    }
    if (size) {
      Object.assign(prior, { width: token.width, height: token.height });
      Object.assign(update, { width: size, height: size });
    }
    priorForm[token.id] = prior;
    await token.update(update);
  }
  if (hp) await sys.setTemp(actor, hp);
  const items = attacks?.length
    ? await actor.createEmbeddedDocuments("Item", attacks.map((a) => foundry.utils.mergeObject(foundry.utils.deepClone(a), { [`flags.${NS}.formAttack`]: true })))
    : [];
  await chat(actor, loc("becomes", { form: name }), effect.name);
  return { priorForm, formItems: items.map((i) => i.id) };
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
  const form = potionFlag(effect, "form");
  if (form) await endForm(actor, effect, form);
  for (const id of potionFlag(effect, "statuses") ?? []) {
    if (!effectsWith(actor, "statuses").some((e) => e !== effect && potionFlag(e, "statuses").includes(id))) await actor.toggleStatusEffect(id, { active: false });
  }
  const priorHold = foundry.utils.flattenObject(potionFlag(effect, "priorHold") ?? {});
  if (Object.keys(priorHold).length) await actor.update(priorHold);
  // effects that last as long as this one (pf2e: "critical hits against you" of Casters Overtime)
  const source = potionFlag(effect, "source");
  for (const e of potionEffectsOf(actor).filter((e) => source && potionFlag(e, "endsWith") === source)) await deleteEffect(e);
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
    // an effect of the potion like the others (drinking again replaces it)
    foundry.utils.setProperty(data, `flags.${NS}.source`, data.flags?.[NS]?.source ?? `${potionFlag(effect, "source")}.after`);
    data.start = ActiveEffect.implementation.getEffectStart?.();
    await applyEffectData(target, [data]);
  }
  if (onEnd.createData && target && sys.applyPotionData) await sys.applyPotionData(target, onEnd.createData);
  if (effect.duration?.expired && actor.effects?.has?.(effect.id)) await effect.delete();
}

/** the tokens look as before, what is left of the form's hit points and its attacks are gone */
async function endForm(actor, effect, form) {
  const priorForm = potionFlag(effect, "priorForm") ?? {};
  for (const token of actor.getActiveTokens(false, true)) {
    if (priorForm[token.id]) await token.update(priorForm[token.id]);
  }
  if (form.hp && (sys.hp(actor).temp ?? 0) > 0) await actor.update({ [sys.hpPaths.temp]: 0 });
  const items = (potionFlag(effect, "formItems") ?? []).filter((id) => actor.items.has(id));
  if (items.length) await actor.deleteEmbeddedDocuments("Item", items);
  await chat(actor, loc("formEnds", { form: form.name }), effect.name);
}

Hooks.on("updateToken", async (token, changed, options, userId) => {
  if (userId !== game.user.id || !("x" in changed || "y" in changed)) return;
  const actor = token.actor;
  for (const e of effectsWith(actor, "endOn").filter((e) => potionFlag(e, "endOn").includes("move"))) await deleteEffect(e);
});
