import { applyEffectData, effectData } from "../effects.js";
import { attackModes, distortion, invulnerable, reflect, targetActors } from "../rolls.js";
import { chat, NS, potionFlag } from "../util.js";

/** dnd5e (>= 6): activities, dnd5e's roll and damage hooks */

const isPotion = (item) => !!potionFlag(item, "potion");
const automate = () => game.settings.get(NS, "automate");

export default {
  id: "dnd5e",
  rollsHealing: true,
  /** dnd5e.preApplyDamage knows the attacker */
  reflectsDamage: true,
  hpPaths: { value: "system.attributes.hp.value", temp: "system.attributes.hp.temp" },
  hp: (actor) => actor.system.attributes.hp,
  heal: (actor, amount) => actor.applyDamage([{ value: amount, type: "healing" }]),
  async setTemp(actor, amount) {
    if ((actor.system.attributes.hp.temp ?? 0) < amount) await actor.update({ "system.attributes.hp.temp": amount });
  },
  damage: (actor, amount, type) => actor.applyDamage(type ? [{ value: amount, type }] : amount),
  async save(actor, ability, dc) {
    const roll = (await actor.rollSavingThrow({ ability, target: dc }, { configure: false }, { create: true }))?.[0];
    return roll ? roll.total >= dc : false;
  },
  async exhaustion(actor, delta) {
    if (actor.system.attributes?.exhaustion === undefined) return;
    const max = CONFIG.DND5E.conditionTypes.exhaustion?.levels ?? 6;
    await actor.update({ "system.attributes.exhaustion": Math.clamp((actor.system.attributes.exhaustion ?? 0) + delta, 0, max) });
  },
  exhaustionLevel: (actor) => actor.system.attributes?.exhaustion ?? 0,
  async restoreSlots(actor, maxLevel) {
    const update = {};
    const restored = [];
    for (let level = 1; level <= maxLevel; level++) {
      const slot = actor.system.spells?.[`spell${level}`];
      if (!slot?.max) continue;
      if (slot.value < slot.max) restored.push(level);
      update[`system.spells.spell${level}.value`] = slot.max;
    }
    if (Object.keys(update).length) await actor.update(update);
    return restored;
  },
  creatureType: (actor) => actor.system.details?.type?.value,
  statusLabel: (id) => game.i18n.localize(CONFIG.DND5E.conditionTypes[id]?.name ?? CONFIG.DND5E.statusEffects[id]?.name ?? id),
  restorationExtras(actor, kind) {
    if (kind !== "greater" || (actor.system.attributes.hp?.tempmax ?? 0) >= 0) return [];
    return [{ label: game.i18n.localize(`${NS}.restoreHpMax`), run: () => actor.update({ "system.attributes.hp.tempmax": 0 }) }];
  },
  seesThrough(actor) {
    const ranges = actor?.system.attributes?.senses?.ranges ?? {};
    return (ranges.blindsight ?? 0) > 0 || (ranges.truesight ?? 0) > 0;
  },

  /** Cobra Kai, Ice Devil: become the creature of the activity's profile for the potion's duration */
  async transform(actor, item, { seconds, after }, { activity }) {
    const profile = activity?.profiles?.[0];
    const source = profile?.uuid ? await fromUuid(profile.uuid) : null;
    if (!source) {
      ui.notifications.warn(game.i18n.format(`${NS}.noForm`, { name: item.name }));
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
        flags: { [NS]: { source: `${item.system.identifier}.transform`, onEnd: { revert: true, createEffect: afterEffect ? afterEffect.toObject() : undefined } } },
      },
    ]);
  },
  isTransformed: (actor) => !!actor.isPolymorphed,
  async revert(actor) {
    const original = game.actors.get(actor.getFlag("dnd5e", "originalActor"));
    await actor.revertOriginalForm();
    return original;
  },

  register({ drink, endOnAction }) {
    Hooks.on("dnd5e.postUseActivity", (activity) => {
      const actor = activity.actor;
      if (!actor) return;
      // any attack or spell ends effects like Minor Invisibility
      void endOnAction(actor, activity.type === "attack" ? "attack" : activity.item?.type === "spell" ? "spell" : null);
      const item = activity.item;
      if (!isPotion(item)) return;
      const effects = (activity.effects ?? []).map((e) => item.effects.get(e._id)).filter((e) => e);
      // heal activities: dnd5e rolls the healing, see dnd5e.rollDamageV2 below
      void drink(actor, item, { activity, effects });
    });

    Hooks.on("dnd5e.preRollAttackV2", (config) => {
      const { advantage, disadvantage } = attackModes(config.subject?.actor);
      if (advantage) config.advantage = true;
      if (disadvantage) config.disadvantage = true;
    });

    const potionHeal = (activity) => activity?.type === "heal" && isPotion(activity.item) && automate() && activity.actor?.isOwner;

    Hooks.on("dnd5e.preRollDamageV2", (config, dialog) => {
      if (potionHeal(config.subject)) dialog.configure = false;
      if (config.subject?.type === "attack" && attackModes(config.subject.actor).critical) config.isCritical = true;
    });

    /** the healing of a potion is rolled without dialog and applied to the drinker */
    Hooks.on("dnd5e.rollDamageV2", async (rolls, { subject } = {}) => {
      if (!potionHeal(subject) || !rolls?.length) return;
      const actor = subject.actor;
      const onlyType = potionFlag(subject.item, "use")?.onlyType;
      if (onlyType && actor.system.details?.type?.value !== onlyType) return; // drink() says so
      const total = rolls.reduce((sum, r) => sum + r.total, 0);
      if (rolls[0].options?.type === "temphp") await this.setTemp(actor, total);
      else await actor.applyDamage([{ value: total, type: "healing" }]);
    });

    Hooks.on("dnd5e.rollAttackV2", async (rolls, { subject } = {}) => {
      if (!subject) return;
      // an attack roll ends Minor Invisibility, also when the attack was rolled without using the activity
      if (subject.actor) await endOnAction(subject.actor, "attack");
      await distortion(subject.actor, targetActors());
    });

    Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
      if (invulnerable(actor)) return false;
      if (reflect(actor, amount, options?.originatingMessage?.getAssociatedActor?.())) return false;
      return true;
    });
  },
};

export { applyEffectData, effectData, chat };
