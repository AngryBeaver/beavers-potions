Hooks.on("midi-qol.preCheckHits",(workflow)=>{
    workflow.targets.forEach(token=>{
        token.documents.actor.effects.forEach((key,value)=>{
           if(value.label === "Distortion"){
               const random = Math.floor(Math.random() * 5)+1;
               if(random === 5 || true){
                   workflow.targets.delete(token);
               }
           }
        });
    })
});

