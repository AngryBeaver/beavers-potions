// Beaver's Potions: the potions work with the game system alone; the rules a system has no effect for are
// implemented here, the system specific parts are in src/systems/<system>.js.
import { NS } from "./util.js";
import { setSystem, sys } from "./system.js";
import { drink, endOnAction } from "./use.js";
import "./effects.js";
import "./rolls.js";
import "./combat.js";
import "./lifecycle.js";
import dnd5e from "./systems/dnd5e.js";
import a5e from "./systems/a5e.js";
import pf1 from "./systems/pf1.js";
import pf2e from "./systems/pf2e.js";
import D35E from "./systems/D35E.js";

const ADAPTERS = { dnd5e, a5e, pf1, pf2e, D35E };

Hooks.once("init", () => {
  game.settings.register(NS, "automate", {
    name: `${NS}.settings.automate.name`,
    hint: `${NS}.settings.automate.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  const adapter = ADAPTERS[game.system.id];
  if (!adapter) return;
  setSystem(adapter);
  game.modules.get(NS).api = { drink, system: game.system.id };
  sys.register({ drink, endOnAction });
});

// Batman's "silenced" where the system has no such status (a5e, pf1, D35E): a status of Foundry's core
// (pf2e only takes its own conditions)
Hooks.once("ready", () => {
  if (!sys.id || sys.id === "pf2e" || CONFIG.statusEffects.some((s) => s.id === "silenced")) return;
  CONFIG.statusEffects.push({ id: "silenced", name: `${NS}.silenced`, img: "icons/svg/silenced.svg" });
});
