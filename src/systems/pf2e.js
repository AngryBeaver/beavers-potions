import { distortion } from "../rolls.js";
import { effectsWith, NS, potionFlag } from "../util.js";

/**
 * Pathfinder 2e. Using a consumable posts a chat message with flags.pf2e.origin (the potion may be gone by then: its
 * compendium source tells what it was). What a potion does is a pf2e effect item (flags["beavers-potions"].effects)
 * put on the drinker; pf2e runs its rule elements and its duration.
 */

const SAVES = { str: "fortitude", con: "fortitude", dex: "reflex", int: "will", wis: "will", cha: "will" };
const diseases = (actor) => actor.items.filter((i) => ["affliction", "effect"].includes(i.type) && (i.system.traits?.value ?? []).includes("disease"));
const CONDITIONS = { invisible: "invisible", incapacitated: "paralyzed", blinded: "blinded", deafened: "deafened", paralyzed: "paralyzed", poisoned: "sickened", frightened: "frightened", prone: "prone" };

export default {
  id: "pf2e",
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
    await actor.update({ "system.attributes.hp.temp": (hp.temp ?? 0) - fromTemp, "system.attributes.hp.value": Math.max(0, hp.value - (amount - fromTemp)) });
  },
  async save(actor, ability, dc) {
    const roll = await actor.saves?.[SAVES[ability] ?? "will"]?.roll({ dc: { value: dc }, skipDialog: true });
    return roll ? roll.total >= dc : false;
  },
  /** drained (1-4) */
  async exhaustion(actor, delta) {
    const current = this.exhaustionLevel(actor);
    const value = Math.clamp(current + delta, 0, 4);
    if (value === current) return;
    const condition = actor.getCondition?.("drained");
    if (value === 0) await actor.decreaseCondition("drained", { forceRemove: true });
    else if (!condition) await actor.increaseCondition("drained", { value });
    else await condition.update({ "system.value.value": value });
  },
  exhaustionLevel: (actor) => actor.getCondition?.("drained")?.value ?? 0,
  async restoreSlots(actor, maxLevel) {
    const restored = new Set();
    for (const entry of actor.itemTypes?.spellcastingEntry ?? []) {
      const update = {};
      for (let level = 1; level <= maxLevel; level++) {
        const slot = entry.system.slots?.[`slot${level}`];
        if (!slot?.max) continue;
        if (slot.value < slot.max) restored.add(level);
        update[`system.slots.slot${level}.value`] = slot.max;
      }
      if (Object.keys(update).length) await entry.update(update);
    }
    return [...restored].sort();
  },
  creatureType: (actor) => (actor.system.traits?.value ?? []).find((t) => t === "undead") ?? actor.system.traits?.value?.[0],
  statusId: (id) => CONDITIONS[id] ?? (["drained", "sickened", "off-guard", "concealed", "diseased"].includes(id) ? id : null),
  /** diseased: an affliction or effect with the disease trait */
  hasStatus: (actor, id) => (id === "diseased" ? diseases(actor).length > 0 : !!id && !!actor.hasCondition?.(id)),
  removeStatus(actor, id) {
    if (id === "diseased") return actor.deleteEmbeddedDocuments("Item", diseases(actor).map((i) => i.id));
    return id ? actor.decreaseCondition(id, { forceRemove: true }) : undefined;
  },
  statusLabel: (id) => game.i18n.localize(id === "diseased" ? "PF2E.TraitDisease" : CONFIG.PF2E?.conditionTypes?.[CONDITIONS[id] ?? id] ?? id),
  seesThrough: (actor) => (actor?.system.perception?.senses ?? []).some((s) => ["truesight", "echolocation", "tremorsense"].includes(s.type)),

  potionData: (item) => potionFlag(item, "effects") ?? [],
  applyPotionEffects(actor, item) {
    return this.applyPotionData(actor, this.potionData(item));
  },
  /** the effect items on the actor; drinking again restarts them */
  async applyPotionData(actor, data) {
    const effects = foundry.utils.deepClone(data ?? []);
    if (!effects.length) return;
    const sources = new Set(effects.map((e) => e.flags?.[NS]?.source));
    const old = actor.items.filter((i) => i.type === "effect" && sources.has(i.flags?.[NS]?.source)).map((i) => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    for (const e of effects) e.system.start = { value: game.time.worldTime, initiative: game.combat?.combatant?.initiative ?? null };
    await actor.createEmbeddedDocuments("Item", effects);
  },

  register({ drink, endOnAction }) {
    Hooks.on("createChatMessage", async (message, options, userId) => {
      if (userId !== game.user.id) return;
      const pf2e = message.flags?.pf2e ?? {};
      const actor = ChatMessage.getSpeakerActor(message.speaker);
      if (!actor) return;
      const targets = [...game.user.targets].map((t) => t.actor).filter((a) => a);
      if (pf2e.context?.type === "attack-roll") {
        // after pf2e has finished the roll (it still works with the effects that gave it, e.g. roll twice)
        // only what the attacker had at the attack, not a potion drunk right after it
        const ids = new Set(effectsWith(actor, "endOn").map((e) => e.id));
        setTimeout(() => void endOnAction(actor, "attack", ids), 1000);
        void distortion(actor, targets);
        return;
      }
      if (pf2e.origin?.type === "spell" || pf2e.context?.type === "spell-attack-roll") void endOnAction(actor, "spell");
      if (pf2e.origin?.type !== "consumable") return;
      const item = fromUuidSync(pf2e.origin.uuid) ?? (pf2e.origin.sourceId ? await fromUuid(pf2e.origin.sourceId) : null);
      if (!potionFlag(item, "potion")) return;
      void drink(actor, item, { targets });
    });
  },
};
