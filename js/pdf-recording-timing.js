// Printed measure numbers can repeat. Recording times are unique and ordered.
export function putAnchor(anchors,anchor,replaceTime=null) {
  if(!Number.isInteger(anchor.measure) || anchor.measure<1 || !Number.isFinite(anchor.time) || anchor.time<0)
    throw Error('Choose a measure and a valid recording time.');
  const next=anchors.filter(a=>a.time!==replaceTime);
  if(next.some(a=>Math.abs(a.time-anchor.time)<.001))throw Error('There is already a tap at this time. Select it to make a correction.');
  return [...next,anchor].sort((a,b)=>a.time-b.time);
}

export function measureIntervals(anchors) {
  const spans=[];
  for(let i=1;i<anchors.length;i++) {
    const a=anchors[i-1], b=anchors[i], stop=b.measure+(b.end?1:0);
    if(a.end || stop<=a.measure)continue;
    const duration=(b.time-a.time)/(stop-a.measure);
    for(let n=a.measure;n<stop;n++)spans.push({measure:n,start:a.time+(n-a.measure)*duration,
      end:n+1===stop?b.time:a.time+(n+1-a.measure)*duration});
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
