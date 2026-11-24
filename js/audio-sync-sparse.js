const FRAME=0.04;

function makeProbes(notes,origin,rate) {
  return notes.map(n=>({offset:12*Math.round((n.start-origin+0.55*(n.end-n.start))*rate/FRAME),pitch:n.pitch}));
}

function fit(contrast,probes,frame) {
  let sum=0;
  for(const p of probes) sum+=contrast[frame*12+p.offset+p.pitch];
  return sum/probes.length;
}

// An unsuccessful lesson search can still have a short played fill separated by written rests.
// Search only sounding events but preserve their timing. Stream the maximum over tempos and offsets.
export function sparseFillTakes({edges,notes},features,duration) {
  if(!notes.length || !features.length) return [];
  const bars=[];
  for(let i=0;i<edges.length-1;i++){
    if(edges[i+1]>edges[i] && notes.some(n=>n.end>edges[i] && n.start<edges[i+1])) bars.push(i);
  }
  if(!bars.length) return [];
  const first=edges[bars[0]], span=edges[bars.at(-1)+1]-first;
  const frames=features.length/12;
  const contrast=new Float64Array(features.length);
  for(let offset=0;offset<features.length;offset+=12){
    for(let p=0;p<12;p++) contrast[offset+p]=features[offset+p]-
      (features[offset+(p+1)%12]+features[offset+(p+11)%12])/2;
  }
  // Bound per-frame work on long scores and recordings. Keep probes spread across the whole phrase.
  const probeLimit=Math.max(12,Math.floor(90_000_000/(frames*71)));
  const stride=Math.max(1,Math.ceil(notes.length/probeLimit));
  const sample=stride===1?notes:notes.filter((_,i)=>i%stride===0);
  let bestFit=0, start=0, rate=1;
  for(let percent=70;percent<=140;percent++){
    const scale=percent/100,probes=makeProbes(sample,first,scale);
    const limit=Math.floor((duration-span*scale)/FRAME);
    for(let frame=0;frame<=limit;frame++){
      const value=fit(contrast,probes,frame);
      if(value>bestFit){bestFit=value;start=frame*FRAME;rate=scale;}
    }
  }
  if(!bestFit) return [];
  const takes=[];
  for(let i=bars[0];i<=bars.at(-1);i+=4){
    const local=notes.filter(n=>n.start>=edges[i] && n.start<edges[Math.min(i+4,edges.length-1)]);
    if(!local.length) continue;
    const step=Math.max(1,Math.ceil(local.length/probeLimit));
    const probes=makeProbes(local.filter((_,j)=>j%step===0),edges[i],rate);
    const predicted=Math.round((start+(edges[i]-first)*rate)/FRAME);
    const quality=fit(contrast,probes,predicted);
    if(!(quality>=0.20)) continue;
    const limit=frames-probes.reduce((max,p)=>Math.max(max,p.offset/12),0);
    let supported=true;
    for(let frame=0;frame<limit;frame++){
      if(quality<0.85*fit(contrast,probes,frame)){supported=false;break;}
    }
    if(!supported) continue;
    for(const index of bars.filter(j=>j>=i && j<i+4)){
      takes.push({index,start:start+(edges[index]-first)*rate,end:start+(edges[index+1]-first)*rate,quality,sparseFill:true});
    }
  }
  return takes;
}
