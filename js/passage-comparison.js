const endpoint='http://127.0.0.1:8766/passage';
const sampleRate=11025;

export async function comparisonAvailable(){
  if(location.protocol!=='http:' || !['localhost','127.0.0.1'].includes(location.hostname))return false;
  try {
    const response=await fetch(endpoint+'/available',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(1200)});
    return response.ok && (await response.json()).trackswitch===true;
  }catch{return false;}
}

export async function comparePassage(snapshot,edges,start,end,getSamples,signal){
  const from=edges[0],to=edges.at(-1);
  if(end-start>120 || to-from>120 || ((end-start)*50+2)*((to-from)*50+2)>6000000)
    throw Error('Choose closer pins for the experimental comparison.');
  const notes=[];
  for(const event of snapshot.timeline.events){
    if(event.trackId!==String(snapshot.trackId))continue;
    for(const n of event.notes){
      const a=Math.max(from,(n.startTimeMs??event.startTimeMs)/1000);
      const b=Math.min(to,(n.endTimeMs??event.endTimeMs)/1000);
      if(n.attack!==false && !n.isDead && Number.isInteger(n.midi) && b>a)notes.push([a-from,b-from,n.midi]);
    }
  }
  const samples=await getSamples();
  signal.throwIfAborted();
  const low=Math.max(0,Math.floor((start-2)*sampleRate));
  const clip=samples.subarray(low,Math.min(samples.length,Math.ceil((end+2)*sampleRate)));
  const origin=low/sampleRate;
  const header=new TextEncoder().encode(JSON.stringify({edges:edges.map(e=>e-from),notes,start:start-origin,end:end-origin}));
  const size=new DataView(new ArrayBuffer(4));size.setUint32(0,header.length,true);
  const body=new Blob([size,header,clip],{type:'application/octet-stream'});
  const response=await fetch(endpoint+'/compare',{method:'POST',body,credentials:'omit',
    signal:AbortSignal.any([signal,AbortSignal.timeout(115000)])});
  const data=await response.json();
  if(!response.ok)throw Error(data.error || 'Comparison unavailable.');
  const points=data.points;
  if(!Array.isArray(points) || points.length!==edges.length || points.some((p,i)=>!Number.isFinite(p) || (i>0 && p<=points[i-1])) ||
     Math.abs(points[0]+origin-start)>0.001 || Math.abs(points.at(-1)+origin-end)>0.001)
    throw Error('Comparison returned invalid points.');
  return points.map((p,i)=>i===0?start:i===points.length-1?end:p+origin);
}

export function showComparison(panel,{current,methods,label,hear,apply}){
  panel.replaceChildren();panel.hidden=false;
  const make=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  const button=(text,fn)=>{const b=make('button',text);b.type='button';b.onclick=fn;return b;};
  const picks=current.map(()=>0);
  const candidates=[{name:'Current',points:current},...methods];
  const point=make('select',''),choice=make('select',''),note=make('span','');
  point.setAttribute('aria-label','Point to compare');choice.setAttribute('aria-label','Timing to keep for this point');
  for(let i=1;i<current.length-1;i++)point.add(new Option(label(i),String(i)));
  function refresh(){
    const i=Number(point.value);choice.replaceChildren();
    candidates.forEach(({name,points},k)=>choice.add(new Option(name+' · '+points[i].toFixed(3)+' s',String(k))));
    choice.value=String(picks[i]);
    note.textContent='';
  }
  choice.onchange=()=>{picks[Number(point.value)]=Number(choice.value);note.textContent='';};
  point.onchange=refresh;
  const pointLabel=make('label','Point '),choiceLabel=make('label','Timing to keep ');
  pointLabel.append(point);choiceLabel.append(choice);
  panel.append(make('legend','Compare point timing'),pointLabel,choiceLabel,button('Hear selected',()=>{
    const i=Number(point.value),p=candidates[picks[i]].points;
    hear(i,p[i],p[i+1]);
  }),button('Use selection for all points',()=>{picks.fill(Number(choice.value));refresh();}),button('Apply chosen timing',()=>{
    const offsets=current.map((time,i)=>i===0 || i===current.length-1?time:candidates[picks[i]].points[i]);
    if(offsets.some((v,i)=>i && Math.round(v*1000)<=Math.round(offsets[i-1]*1000))){
      note.textContent='Two chosen times cross. Choose another timing for one of those points.';return;
    }
    apply(offsets);
  }),note);
  refresh();
}
