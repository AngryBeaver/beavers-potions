export const NS = "beavers-potions";

/** the potion flag of an effect or item: flags["beavers-potions"][key] */
export const potionFlag = (doc, key) => doc?.flags?.[NS]?.[key];

/** the active (not disabled / not suppressed) effects of the actor that carry the given potion flag */
/** item types that are effects in some systems (pf1 / D35E buffs, pf2e effects) */
const EFFECT_ITEMS = new Set(["buff", "effect"]);
export const isEffectItem = (doc) => doc instanceof Item && EFFECT_ITEMS.has(doc.type);

/** the potion effects of the actor: active effects and active effect items (buffs) with a potion flag */
export function potionEffectsOf(actor) {
  if (!actor) return [];
  const effects = [...(actor.appliedEffects ?? actor.effects ?? [])].filter((e) => e.flags?.[NS] && e.active !== false);
  const items = actor.items.filter((i) => isEffectItem(i) && i.flags?.[NS] && i.system?.active !== false);
  return [...effects, ...items];
}

/** deletes an effect or effect item that is still there (another hook or the system may have removed it already) */
const deleting = new Set();
export async function deleteEffect(e) {
  const parent = e?.parent;
  const there = e instanceof Item ? parent?.items?.has(e.id) : parent?.effects?.has(e.id);
  if (!there || deleting.has(e.uuid)) return;
  deleting.add(e.uuid);
  try {
    await e.delete();
  } catch {
    // gone already
  } finally {
    deleting.delete(e.uuid);
  }
}

/** the active effects (or effect items) of the actor that carry the given potion flag */
export function effectsWith(actor, key) {
  return potionEffectsOf(actor).filter((e) => potionFlag(e, key) !== undefined);
}

export const hasEffect = (actor, key) => effectsWith(actor, key).length > 0;

/** exactly one client acts on hooks every client receives */
export const isActiveGM = () => !!game.users.activeGM?.isSelf;

export const tokenOf = (actor) => actor?.getActiveTokens?.()[0] ?? null;

/** distance in grid units (ft) between two token placeables, measured between their centers */
export function distanceBetween(a, b) {
  if (!a || !b || a.scene !== b.scene) return Infinity;
  if (a === b) return 0;
  return canvas.grid.measurePath([a.center, b.center]).distance;
}

/** every token on the current scene within the radius of the token (itself included) */
export function tokensWithin(token, radius) {
  if (!token || !canvas?.tokens) return [];
  return canvas.tokens.placeables.filter((t) => t.actor && distanceBetween(token, t) <= radius);
}

export async function chat(actor, content, flavor) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    content: `<div class="beavers-potions">${content}</div>`,
  });
}

/* -------------------------------------------- */
/*  Actions that need the Gamemaster            */
/* -------------------------------------------- */

const gmActions = {};

/** registers an action a player can ask the active Gamemaster to perform (changes to actors the player does not own) */
export function registerGMAction(name, fn) {
  gmActions[name] = fn;
}

export async function runAsGM(name, data) {
  if (game.user.isGM) return gmActions[name](data);
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("beavers-potions.noGM"));
    return undefined;
  }
  game.socket.emit(`module.${NS}`, { name, data });
  return undefined;
}

Hooks.once("ready", () => {
  game.socket.on(`module.${NS}`, ({ name, data }) => {
    if (isActiveGM() && gmActions[name]) gmActions[name](data);
  });
});
