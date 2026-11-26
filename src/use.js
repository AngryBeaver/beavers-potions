import { activityEffects, addExhaustion, applyEffectData, applyEffectsTo, removeStatus } from "./effects.js";
import { chat, effectsWith, NS, potionFlag, registerGMAction, runAsGM, tokenOf, tokensWithin } from "./util.js";

/**
 * What happens when a potion of this module is drunk (dnd5e.postUseActivity).
 * The item flag flags["beavers-potions"].use describes the special parts, the activity's effects are always applied.
 */

const loc = (key, data) => (data ? game.i18n.format(`${NS}.${key}`, data) : game.i18n.localize(`${NS}.${key}`));

Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
  const actor = activity.actor;
  if (!actor) return;
  // any attack or spell ends effects like Minor Invisibility
  void endOnAction(actor, activity);
  const item = activity.item;
  if (!potionFlag(item, "potion")) return;
  if (!game.settings.get(NS, "automate")) return;
  void drink(actor, item, activity).catch((err) => {
    console.error(`${NS} | ${item.name}`, err);
    ui.notifications.error(`${item.name}: ${err.message}`);
  });
});

async function drink(actor, item, activity) {
  const use = potionFlag(item, "use") ?? {};
  const effects = activityEffects(activity);
  if (use.area) {
    const token = tokenOf(actor);
    const actors = token ? [...new Set(tokensWithin(token, use.area.radius).map((t) => t.actor))] : [actor];
    await applyEffectsTo(actors, effects);
  } else if (activity.type !== "transform") {
    await applyEffectData(actor, effects);
  }
  for (const status of use.cure ?? []) {
    const had = actor.statuses.has(status);
    await removeStatus(actor, status);
    await chat(actor, loc(had ? "restored" : "nothingToRestore", { what: game.i18n.localize(CONFIG.DND5E.conditionTypes[status]?.name ?? status) }));
  }
  if (use.restoreSlots) await restoreSlots(actor, use.restoreSlots);
  if (use.restoration) await restoration(actor, use.restoration);
  if (use.drain) await drain(actor, item, use.drain);
  if (activity.type === "transform") await transform(actor, item, activity, use.transform ?? {});
}

/* -------------------------------------------- */

/** ends effects like Minor Invisibility when the creature attacks or casts a spell */
export async function endOnAction(actor, activity) {
  const kind = activity.type === "attack" ? "attack" : activity.item?.type === "spell" ? "spell" : null;
  if (!kind || !actor.isOwner) return;
  const ids = effectsWith(actor, "endOn").filter((e) => potionFlag(e, "endOn").includes(kind)).map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/** Casters Overtime: refills the spell slots up to a level, at the price of exhaustion */
async function restoreSlots(actor, { maxLevel, exhaustion }) {
  const update = {};
  const restored = [];
  for (let level = 1; level <= maxLevel; level++) {
    const slot = actor.system.spells?.[`spell${level}`];
    if (!slot?.max) continue;
    if (slot.value < slot.max) restored.push(level);
    update[`system.spells.spell${level}.value`] = slot.max;
  }
  if (Object.keys(update).length) await actor.update(update);
  await addExhaustion(actor, exhaustion);
  await chat(actor, loc("restoredSlots", { levels: restored.join(", ") || "-", exhaustion }));
}

/** Restoration: ends one condition (lesser) or one debilitating effect (greater) the drinker chooses */
async function restoration(actor, kind) {
  const options = [];
  const statuses = kind === "greater" ? ["charmed", "petrified", "cursed"] : ["blinded", "deafened", "paralyzed", "poisoned", "diseased"];
  for (const id of statuses) {
    if (!actor.statuses.has(id)) continue;
    const label = game.i18n.localize(CONFIG.DND5E.conditionTypes[id]?.name ?? CONFIG.DND5E.statusEffects[id]?.name ?? id);
    options.push({ label, run: () => removeStatus(actor, id) });
  }
  if (kind === "greater") {
    if ((actor.system.attributes.exhaustion ?? 0) > 0) {
      options.push({ label: loc("exhaustionMinusOne"), run: () => addExhaustion(actor, -1) });
    }
    if ((actor.system.attributes.hp?.tempmax ?? 0) < 0) {
      options.push({ label: loc("restoreHpMax"), run: () => actor.update({ "system.attributes.hp.tempmax": 0 }) });
    }
  }
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
async function drain(actor, item, drainData) {
  const target = [...game.user.targets].map((t) => t.actor).find((a) => a && a !== actor);
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
  const save = (await target.rollSavingThrow({ ability, target: dc }, { configure: false }, { create: true }))?.[0];
  const saved = save ? save.total >= dc : false;
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${name} (${type})` });
  const amount = saved ? Math.floor(roll.total / 2) : roll.total;
  const before = target.system.attributes.hp.value + (target.system.attributes.hp.temp ?? 0);
  await target.applyDamage([{ value: amount, type }]);
  const after = target.system.attributes.hp.value + (target.system.attributes.hp.temp ?? 0);
  const dealt = Math.max(0, before - after);
  if (dealt) await actor.applyDamage([{ value: dealt, type: "healing" }]);
  await chat(actor, loc("drained", { target: target.name, dealt }));
});

/** Cobra Kai, Ice Devil: become the creature of the activity's profile for the potion's duration */
async function transform(actor, item, activity, { seconds, after }) {
  const profile = activity.profiles?.[0];
  const source = profile?.uuid ? await fromUuid(profile.uuid) : null;
  if (!source) {
    ui.notifications.warn(loc("noForm", { name: item.name }));
    return;
  }
  const afterEffect = after ? item.effects.get(after) : null;
  const tokens = await actor.transformInto(source, activity.settings);
  const transformed = tokens?.[0]?.actor ?? game.actors.find((a) => a.getFlag("dnd5e", "originalActor") === actor.id && a !== actor);
  if (!transformed) return;
  await transformed.createEmbeddedDocuments("ActiveEffect", [
    {
      name: item.name,
      img: item.img,
      origin: item.uuid,
      duration: { value: seconds, units: "seconds", expiry: "turnStart" },
      start: ActiveEffect.implementation.getEffectStart?.(),
      flags: {
        [NS]: {
          source: `${item.system.identifier}.transform`,
          onEnd: { revert: true, createEffect: afterEffect ? afterEffect.toObject() : undefined },
        },
      },
    },
  ]);
}
