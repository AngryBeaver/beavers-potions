import { distortion } from "../rolls.js";
import { chat, NS, potionFlag } from "../util.js";

/**
 * D&D 3.5 SRD. The module takes over the use of its potions (D35E.ItemUse.preUseItem with customUse): it uses one up,
 * shows it in the chat and puts its buff (flags["beavers-potions"].buffs) on the drinker. D35E conditions are flags of
 * the actor: the runtime sets them with the buff and clears them when it ends.
 */

const SAVES = { str: "fort", con: "fort", dex: "ref", int: "will", wis: "will", cha: "will" };
const CONDITIONS = {
  invisible: "invisible", incapacitated: "helpless", blinded: "blind", deafened: "deaf", paralyzed: "paralyzed",
  poisoned: "sickened", frightened: "fear", stunned: "stunned", prone: "prone",
};
const condPath = (id) => `system.attributes.conditions.${id}`;

/** "Drink" or "Pour" for potions that have both; the test sets the next answer (api.nextAction) */
async function chooseAction(item) {
  if (!potionFlag(item, "pour")) return "Drink";
  const api = game.modules.get(NS).api ?? {};
  if (api.nextAction) {
    const action = api.nextAction;
    api.nextAction = undefined;
    return action;
  }
  return foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `<p>${game.i18n.localize(`${NS}.drinkOrPour`)}</p>`,
    buttons: [
      { action: "Drink", label: game.i18n.localize(`${NS}.drink`), default: true },
      { action: "Pour", label: game.i18n.localize(`${NS}.pour`) },
    ],
    rejectClose: false,
  });
}

export default {
  id: "D35E",
  rollsHealing: false,
  hpPaths: { value: "system.attributes.hp.value", temp: "system.attributes.hp.temp" },
  hp: (actor) => actor.system.attributes.hp,
  async heal(actor, amount) {
    const hp = actor.system.attributes.hp;
    await actor.update({ "system.attributes.hp.value": Math.min(hp.max, hp.value + amount) });
  },
  async setTemp(actor, amount) {
    if ((actor.system.attributes.hp.temp ?? 0) < amount) await actor.update({ "system.attributes.hp.temp": amount });
  },
  async damage(actor, amount) {
    const hp = actor.system.attributes.hp;
    const fromTemp = Math.min(hp.temp ?? 0, amount);
    await actor.update({ "system.attributes.hp.temp": (hp.temp ?? 0) - fromTemp, "system.attributes.hp.value": hp.value - (amount - fromTemp) });
  },
  /** the save's total as D35E computes it, rolled here (no dialog) */
  async save(actor, ability, dc) {
    const id = SAVES[ability] ?? "will";
    const bonus = actor.system.attributes.savingThrows?.[id]?.total ?? 0;
    const roll = await new Roll(`1d20 + ${bonus}`).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${game.i18n.localize(`D35E.SavingThrow${id.capitalize()}`)} (DC ${dc})` });
    return roll.total >= dc;
  },
  async exhaustion(actor, delta) {
    const level = Math.clamp(this.exhaustionLevel(actor) + delta, 0, 2);
    await actor.update({ [condPath("fatigued")]: level === 1, [condPath("exhausted")]: level === 2 });
  },
  exhaustionLevel: (actor) => (actor.system.attributes.conditions?.exhausted ? 2 : actor.system.attributes.conditions?.fatigued ? 1 : 0),
  async restoreSlots(actor, maxLevel) {
    const update = {};
    const restored = new Set();
    for (const [bookId, book] of Object.entries(actor.system.attributes?.spells?.spellbooks ?? {})) {
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
  creatureType: (actor) => actor.flags?.[NS]?.creatureType ?? actor.system.attributes?.creatureType,
  statusId: (id) => CONDITIONS[id] ?? null,
  hasStatus: (actor, id) => !!id && !!actor.system.attributes.conditions?.[id],
  removeStatus: (actor, id) => (id ? actor.update({ [condPath(id)]: false }) : undefined),
  statusLabel: (id) => game.i18n.localize(CONFIG.D35E?.conditions?.[CONDITIONS[id] ?? id] ?? id),
  seesThrough: () => false,

  potionData: (item) => potionFlag(item, "buffs") ?? [],
  applyPotionEffects(actor, item) {
    return this.applyPotionData(actor, this.potionData(item));
  },
  async applyPotionData(actor, data) {
    const buffs = foundry.utils.deepClone(data ?? []);
    if (!buffs.length) return;
    const sources = new Set(buffs.map((b) => b.flags?.[NS]?.source));
    const old = actor.items.filter((i) => i.type === "buff" && sources.has(i.flags?.[NS]?.source)).map((i) => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    for (const b of buffs) b.system.active = true;
    await actor.createEmbeddedDocuments("Item", buffs);
    const conditions = buffs.flatMap((b) => b.flags?.[NS]?.conditions ?? []);
    if (conditions.length) await actor.update(Object.fromEntries(conditions.map((c) => [condPath(c), true])));
  },
  /** conditions the drinker is immune to stay off: returns the ones kept off */
  blockStatuses(actor, changes, immune) {
    const kept = [];
    for (const id of immune) {
      if (foundry.utils.getProperty(changes, condPath(id)) !== true) continue;
      foundry.utils.setProperty(changes, condPath(id), false);
      kept.push(id);
    }
    return kept;
  },
  /** a buff of a potion ended: its conditions end too */
  async effectEnded(actor, effect) {
    const conditions = effect.flags?.[NS]?.conditions ?? [];
    if (conditions.length) await actor.update(Object.fromEntries(conditions.map((c) => [condPath(c), false])));
  },

  register({ drink, endOnAction }) {
    // attacks: they end Minor Invisibility, Distortion may let them miss
    Hooks.on("D35E.ItemUse.preRollAllAttacks", (item, rollData, attacks, userId) => {
      const actor = item?.actor;
      if (!actor || (userId && userId !== game.user.id)) return;
      void endOnAction(actor, "attack");
      void distortion(actor, [...game.user.targets].map((t) => t.actor).filter((a) => a));
    });
    Hooks.on("D35E.ItemUse.preUseItem", (item, actor, hookValues) => {
      if (!potionFlag(item, "potion") || !actor) return;
      hookValues.customUse = true;
      void (async () => {
        const action = await chooseAction(item);
        if (!action) return;
        const quantity = item.system.quantity ?? 1;
        const data = item.toObject();
        if (quantity > 1) await item.update({ "system.quantity": quantity - 1 });
        else await item.delete();
        await chat(actor, `<p><strong>${data.name}</strong> (${game.i18n.localize(`${NS}.${action.toLowerCase()}`)})</p>${data.system.description?.value ?? ""}`);
        if (action === "Drink") await drink(actor, item, {});
      })();
    });
  },
};
