export function distortion(workflow, token){
    const random = Math.floor(Math.random() * 5)+1;
    if(random === 5){
        workflow.targets.delete(token);
    }
}

export function reflectDamage(actor, damageItem){
    let damage = damageItem.appliedDamage;
    if(damage > 0 && actor.system.attributes.hp.temp > 0){
        let tempHP = Math.max(actor.system.attributes.hp.temp-damage,0);
        damage = Math.max(damage-actor.system.attributes.hp.temp,0);
        actor.update({
            "system.attributes.hp.temp": tempHP
        });
    }
    if(damage > 0 && actor.system.attributes.hp.temp > 0){
        let value = Math.max(actor.system.attributes.hp.value-damage,0);
        actor.update({
            "system.attributes.hp.value":value
        });
    }
}

export function protectionFromDeath(actor,effect){
    window.setTimeout(()=>{
        effect.delete();
        actor.update({system:{attributes:{hp:{value:1}}}});
    },1000);
}