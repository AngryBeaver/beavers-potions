export const NS = "beavers-potions";

/** the potion flag of an effect or item: flags["beavers-potions"][key] */
export const potionFlag = (doc, key) => doc?.flags?.[NS]?.[key];

/** the active (not disabled / not suppressed) effects of the actor that carry the given potion flag */
export function effectsWith(actor, key) {
  if (!actor) return [];
  return [...(actor.appliedEffects ?? actor.effects ?? [])].filter((e) => potionFlag(e, key) !== undefined && e.active !== false);
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
