import { applyEffectData, applyEffectsTo, effectData, removeStatus } from "./effects.js";
import { sys } from "./system.js";
import { chat, deleteEffect, effectsWith, NS, potionFlag, registerGMAction, runAsGM, tokenOf, tokensWithin } from "./util.js";

/**
 * What happens when a potion of this module is drunk. The system adapter calls drink() from its own hook.
 * The item flag flags["beavers-potions"].use describes the special parts, the potion's effects are always applied.
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

/**
 * @param {Actor} actor
 * @param {Item} item         the potion (it may be deleted already when the last one was drunk)
 * @param {object} ctx
 * @param {ActiveEffect[]} [ctx.effects]  the effects to apply (default: the potion's effects that are not shown afterwards)
 * @param {boolean} [ctx.transform]       the system transforms the drinker itself
 */
export async function drink(actor, item, ctx = {}) {
  if (!game.settings.get(NS, "automate")) return;
  try {
    const use = potionFlag(item, "use") ?? {};
    const after = use.transform?.after;
    const sources = ctx.effects ?? item.effects.filter((e) => e.id !== after);
    const effects = sources.map((e) => effectData(item, e));
    if (use.onlyType && sys.creatureType(actor) !== use.onlyType) {
      await chat(actor, loc("noEffect"), item.name);
      return;
    }
    if (use.area) {
      const token = tokenOf(actor);
      const actors = token ? [...new Set(tokensWithin(token, use.area.radius).map((t) => t.actor))] : [actor];
      if (sys.potionData) {
        // effect items (buffs): the drinker's own actors here, the others through the Gamemaster
        const data = sys.potionData(item);
        for (const a of actors.filter((a) => a.isOwner)) await sys.applyPotionData(a, data);
        const others = actors.filter((a) => !a.isOwner);
        if (others.length) await runAsGM("applyPotionData", { actorUuids: others.map((a) => a.uuid), data });
      } else await applyEffectsTo(actors, effects);
    } else if (!use.transform) {
      if (sys.applyPotionEffects) await sys.applyPotionEffects(actor, item, ctx);
      else await applyEffectData(actor, effects);
    }
    // healing the system did not roll itself: from the potion's rules
    if (!ctx.heal && !sys.rollsHealing) {
      const rule = (potionFlag(item, "rules") ?? []).find(([r]) => r === "heal" || r === "temp");
      if (rule) ctx.heal = [rule[0], (await new Roll(String(rule[1])).evaluate()).total];
    }
    if (ctx.heal) await healDrinker(actor, ctx.heal);
    for (const status of use.cure ?? []) {
      const had = hasStatus(actor, status);
      await clearStatus(actor, status);
      await chat(actor, loc(had ? "restored" : "nothingToRestore", { what: sys.statusLabel(status) }));
    }
    if (use.restoreSlots) await restoreSlots(actor, use.restoreSlots);
    if (use.restoration) await restoration(actor, use.restoration);
    if (use.drain) await drain(actor, item, use.drain, ctx.targets);
    if (use.transform && sys.transform) await sys.transform(actor, item, use.transform, ctx);
  } catch (err) {
    console.error(`${NS} | ${item.name}`, err);
    ui.notifications.error(`${item.name}: ${err.message}`);
  }
}

/** healing the system did not apply itself: [kind, amount] */
async function healDrinker(actor, [kind, amount]) {
  if (kind === "temp") await sys.setTemp(actor, amount);
  else await sys.heal(actor, amount);
}

/** statuses by their 5e id, translated by the system (pf1: poisoned -> sickened ...) */
const statusId = (id) => (sys.statusId ? sys.statusId(id) : id);
const hasStatus = (actor, id) => (sys.hasStatus ? sys.hasStatus(actor, statusId(id)) : !!statusId(id) && actor.statuses.has(statusId(id)));
const clearStatus = (actor, id) => (sys.removeStatus ? sys.removeStatus(actor, statusId(id)) : removeStatus(actor, statusId(id)));

/* -------------------------------------------- */

/** ends effects like Minor Invisibility when the creature attacks ("attack") or casts a spell ("spell") */
export async function endOnAction(actor, kind, onlyIds) {
  if (!kind || !actor?.isOwner) return;
  const ended = effectsWith(actor, "endOn").filter((e) => potionFlag(e, "endOn").includes(kind) && (!onlyIds || onlyIds.has(e.id)));
  // the system may have removed it already (pf2e ends expired effects itself)
  for (const e of ended) await deleteEffect(e);
}

/** Casters Overtime: refills the spell slots up to a level, at the price of exhaustion */
async function restoreSlots(actor, { maxLevel, exhaustion }) {
  const restored = (await sys.restoreSlots(actor, maxLevel)) ?? [];
  if (exhaustion) await sys.exhaustion(actor, exhaustion);
  await chat(actor, loc("restoredSlots", { levels: restored.join(", ") || "-", exhaustion: exhaustion ?? 0 }));
}

/** Restoration: ends one condition (lesser) or one debilitating effect (greater) the drinker chooses */
async function restoration(actor, kind) {
  const options = [];
  const statuses = kind === "greater" ? ["charmed", "petrified", "cursed"] : ["blinded", "deafened", "paralyzed", "poisoned", "diseased"];
  for (const id of statuses) {
    if (!hasStatus(actor, id)) continue;
    options.push({ label: sys.statusLabel(id), run: () => clearStatus(actor, id) });
  }
  if (kind === "greater" && sys.exhaustionLevel(actor) > 0) {
    options.push({ label: loc("exhaustionMinusOne"), run: () => sys.exhaustion(actor, -1) });
  }
  options.push(...((await sys.restorationExtras?.(actor, kind)) ?? []));
  if (!options.length) {
    await chat(actor, loc("nothingToRestore"));
    return;
  }
  let choice = options[0];
  if (options.length > 1) {
    const index = await foundry.applications.api.DialogV2.wait({
      window: { title: loc("restorationTitle") },
      content: `<p>${loc("restorationChoose")}</p>`,
      buttons: options.map((o, i) => ({ action: `o${i}`, label: o.label, default: i === 0, callback: () => i })),
      rejectClose: false,
    });
    if (index === null || index === undefined) return;
    choice = options[index];
  }
  await choice.run();
  await chat(actor, loc("restored", { what: choice.label }));
}

/** Live Essence: the target saves or takes the damage, the drinker heals the same amount */
async function drain(actor, item, drainData, targets) {
  const target = [...(targets ?? game.user.targets)].map((t) => t.actor ?? t).find((a) => a && a !== actor);
  if (!target) {
    ui.notifications.warn(loc("needsTarget", { name: item.name }));
    return;
  }
  await runAsGM("drain", { actorUuid: actor.uuid, targetUuid: target.uuid, name: item.name, ...drainData });
}

registerGMAction("drain", async ({ actorUuid, targetUuid, name, formula, type, ability, dc }) => {
  const actor = await fromUuid(actorUuid);
  const target = await fromUuid(targetUuid);
  if (!actor || !target) return;
  const saved = await sys.save(target, ability, dc);
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${name} (${type})` });
  const amount = saved ? Math.floor(roll.total / 2) : roll.total;
  const total = (a) => sys.hp(a).value + (sys.hp(a).temp ?? 0);
  const before = total(target);
  await sys.damage(target, amount, type);
  const dealt = Math.max(0, before - total(target));
  if (dealt) await sys.heal(actor, dealt);
  await chat(actor, loc("drained", { target: target.name, dealt }));
});

registerGMAction("applyPotionData", async ({ actorUuids, data }) => {
  for (const uuid of actorUuids) {
    const a = await fromUuid(uuid);
    if (a) await sys.applyPotionData(a.actor ?? a, data);
  }
});

registerGMAction("damage", async ({ uuid, amount, type }) => {
  const actor = await fromUuid(uuid);
  if (actor) await sys.damage(actor.actor ?? actor, amount, type);
});
