// A passage end and the following start can share a timestamp at a repeat.
export function putAnchor(anchors,anchor,replaceTime=null) {
  if(!Number.isInteger(anchor.measure) || anchor.measure<1 || !Number.isFinite(anchor.time) || anchor.time<0)
    throw Error('Choose a measure and a valid recording time.');
  const next=anchors.filter(a=>typeof replaceTime==='object' ? a!==replaceTime : a.time!==replaceTime);
  if(next.some(a=>Math.abs(a.time-anchor.time)<.001 && !(a.time===anchor.time && Boolean(a.end)!==Boolean(anchor.end))))throw Error('There is already a tap at this time. Select it to make a correction.');
  return [...next,anchor].sort((a,b)=>a.time-b.time || Number(Boolean(b.end))-Number(Boolean(a.end)));
}

export function tapPassages(anchors) {
  const passages=[];
  for(let i=1;i<anchors.length;i++) {
    const a=anchors[i-1],b=anchors[i],count=b.measure+(b.end?1:0)-a.measure;
    if(a.end || count<=0 || b.time<=a.time)continue;
    const id=[a.measure,a.time,b.measure,b.time,Boolean(b.end)].join('/');
    passages.push({id,first:a.measure,last:b.measure,start:a.time,end:b.time,count,endsAtRelease:!!b.end});
  }
  return passages;
}

export function validEstimates(p,starts) {
  return Array.isArray(starts) && starts.length===p.count-1 &&
    starts.every((t,i)=>Number.isFinite(t) && t>(i?starts[i-1]:p.start) && t<p.end);
}

export function measureIntervals(anchors,overrides={}) {
  const spans=[];
  for(const p of tapPassages(anchors)) {
    const duration=(p.end-p.start)/p.count, starts=overrides[p.id];
    const refined=validEstimates(p,starts);
    let start=p.start;
    for(let i=0;i<p.count;i++) {
      const end=i+1===p.count?p.end:refined?starts[i]:p.start+(i+1)*duration;
      spans.push({measure:p.first+i,start,end});
      start=end;
    }
  }
  return spans;
}

export function recordingLoop(spans,first,last,at) {
  if(last<first)return null;
  let best=null;
  for(let i=0;i<spans.length;i++) {
    const start=spans[i];
    if(start.measure!==first)continue;
    let j=i;
    while(spans[j].measure<last && spans[j+1]?.measure===spans[j].measure+1 && spans[j+1].start===spans[j].end)j++;
    if(spans[j].measure!==last)continue;
    const end=spans[j].end;
    const distance=Math.max(start.start-at,at-end,0);
    if(!best || distance<best.distance)best={start:start.start,end,distance,measures:new Set(spans.slice(i,j+1).map(s=>s.measure))};
  }
  return best;
}
