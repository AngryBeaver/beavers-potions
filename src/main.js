import {distortion, protectionFromDeath, reflectDamage} from "./EffectHooks.js";



Hooks.on("midi-qol.preCheckHits",(workflow)=>{
    workflow.targets.forEach(token=>{
        token.document.actor.effects.forEach((effect)=>{
           if(effect.label === "Distortion"){
               distortion(workflow, token)
           }
        });
    })
});

Hooks.on("midi-qol.damageApplied",(token,next)=>{
    token.document.actor.effects.forEach((effect)=>{
       if(effect.label === "Reflect Damage"){
           reflectDamage(next.workflow.actor, next.ditem)
       }
    });
});

Hooks.on("updateActor",(actor,update,data,id)=>{
    if(update.system?.attributes?.hp?.value <= 0 ){
        actor.effects.forEach((effect)=>{
            if(effect.label === "Protection From Death"){
                protectionFromDeath(actor,effect);
            }
        });
    }
});
