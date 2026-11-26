// Beaver's Potions: the potions work with dnd5e alone, the rules that dnd5e has no effect for are implemented here.
import { NS } from "./util.js";
import "./effects.js";
import "./use.js";
import "./rolls.js";
import "./combat.js";
import "./lifecycle.js";

Hooks.once("init", () => {
  game.settings.register(NS, "automate", {
    name: `${NS}.settings.automate.name`,
    hint: `${NS}.settings.automate.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});
