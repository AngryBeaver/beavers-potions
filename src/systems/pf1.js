import { distortion } from "../rolls.js";
import { NS, potionFlag } from "../util.js";

/**
 * Pathfinder 1e. Potions are consumables with a "Drink" action; pf1PostActionUse comes after the action (the potion is
 * used up then). What a potion does is a buff (flags["beavers-potions"].buffs) put active on the drinker.
 */

const isPotion = (item) => !!potionFlag(item, "potion");
const SAVES = { str: "fort", con: "fort", dex: "ref", int: "will", wis: "will", cha: "will" };
const CONDITIONS = {
  invisible: "invisible", incapacitated: "dazed", blinded: "blind", deafened: "deaf", paralyzed: "paralyzed",
  poisoned: "sickened", frightened: "frightened", stunned: "stunned", prone: "prone",
};

export default {
  id: "pf1",
  rollsHealing: false,
  hpPaths: { value: "system.attributes.hp.value", temp: "system.attributes.hp.temp" },
  hp: (actor) => actor.system.attributes.hp,
  /** pf1 stores the hit points as an offset from the maximum */
  nextHp(actor, changes) {
    const hp = actor.system.attributes.hp;
    const offset = foundry.utils.getProperty(changes, "system.attributes.hp.offset");
    return {
      value: offset === undefined ? foundry.utils.getProperty(changes, "system.attributes.hp.value") : hp.max + offset,
      temp: foundry.utils.getProperty(changes, "system.attributes.hp.temp"),
    };
  },
  setHp(actor, changes, { value, temp }) {
    if (value !== undefined) {
      foundry.utils.setProperty(changes, "system.attributes.hp.offset", value - actor.system.attributes.hp.max);
      if (foundry.utils.getProperty(changes, "system.attributes.hp.value") !== undefined) foundry.utils.setProperty(changes, "system.attributes.hp.value", value);
    }
    if (temp !== undefined) foundry.utils.setProperty(changes, "system.attributes.hp.temp", temp);
  },
  heal: (actor, amount) => actor.applyDamage(-amount, { forceDialog: false }),
  async setTemp(actor, amount) {
    if ((actor.system.attributes.hp.temp ?? 0) < amount) await actor.update({ "system.attributes.hp.temp": amount });
  },
  damage: (actor, amount) => actor.applyDamage(amount, { forceDialog: false }),
  async save(actor, ability, dc) {
    const result = await actor.rollSavingThrow(SAVES[ability] ?? "will", { skipDialog: true, chatMessage: true });
    const total = result?.rolls?.[0]?.total ?? result?.total;
    return total !== undefined && total >= dc;
  },
  /** fatigued (1) and exhausted (2) */
  async exhaustion(actor, delta) {
    const level = Math.clamp(this.exhaustionLevel(actor) + delta, 0, 2);
    await actor.setConditions({ fatigued: level === 1, exhausted: level === 2 });
  },
  exhaustionLevel: (actor) => (actor.statuses.has("exhausted") ? 2 : actor.statuses.has("fatigued") ? 1 : 0),
  async restoreSlots(actor, maxLevel) {
    const update = {};
    const restored = new Set();
    for (const [bookId, book] of Object.entries(actor.system.attributes?.spells?.spellbooks ?? {})) {
      if (!book.inUse) continue;
      for (let level = 1; level <= maxLevel; level++) {
        const slot = book.spells?.[`spell${level}`];
        if (!slot?.max) continue;
        if (slot.value < slot.max) restored.add(level);
        update[`system.attributes.spells.spellbooks.${bookId}.spells.spell${level}.value`] = slot.max;
      }
    }
    if (Object.keys(update).length) await actor.update(update);
    return [...restored].sort();
  },
  creatureType: (actor) => actor.race?.system?.creatureTypes?.[0] ?? actor.system.traits?.type ?? actor.flags?.[NS]?.creatureType,
  statusId: (id) => CONDITIONS[id] ?? (["fatigued", "exhausted", "dazed", "sickened", "blind", "deaf"].includes(id) ? id : null),
  hasStatus: (actor, id) => !!id && actor.statuses.has(id),
  removeStatus: (actor, id) => (id ? actor.setCondition(id, false) : undefined),
  statusLabel: (id) => game.i18n.localize(pf1.registry?.conditions?.get(CONDITIONS[id] ?? id)?.name ?? id),
  seesThrough: (actor) => !!(actor?.system.traits?.senses?.bs?.value || actor?.system.traits?.senses?.ts?.value),

  /** the potion's buffs (flags["beavers-potions"].buffs) */
  potionData: (item) => potionFlag(item, "buffs") ?? [],
  applyPotionEffects(actor, item) {
    return this.applyPotionData(actor, this.potionData(item));
  },
  /** the buffs, active on the actor; drinking again restarts them */
  async applyPotionData(actor, data) {
    const buffs = foundry.utils.deepClone(data ?? []);
    if (!buffs.length) return;
    const sources = new Set(buffs.map((b) => b.flags?.[NS]?.source));
    const old = actor.items.filter((i) => i.type === "buff" && sources.has(i.flags?.[NS]?.source)).map((i) => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    for (const b of buffs) {
      b.system.active = true;
      b.system.duration.start = game.time.worldTime;
    }
    await actor.createEmbeddedDocuments("Item", buffs);
  },

  register({ drink, endOnAction }) {
    Hooks.on("pf1PostActionUse", (actionUse) => {
      const item = actionUse.item;
      const actor = actionUse.actor ?? item?.actor;
      if (!actor || !item) return;
      const targets = (actionUse.shared?.targets ?? []).map((t) => t.actor ?? t.document?.actor).filter((a) => a);
      if (actionUse.action?.hasAttack) {
        void endOnAction(actor, "attack");
        void distortion(actor, targets);
      }
      if (item.type === "spell") void endOnAction(actor, "spell");
      if (!isPotion(item)) return;
      if (actionUse.action?.name === "Pour") return; // poured out: it does nothing to the drinker
      void drink(actor, item, { targets });
    });
  },
};
