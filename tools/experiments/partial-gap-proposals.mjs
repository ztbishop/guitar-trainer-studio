import {barEvidence, neighborPace, supportsTempo} from '../../js/audio-sync-pinned-phrases.js';

// Search outwards from each original pin. Limit accumulated drift by keeping
// the clock for each side fixed, and stop that side at its first weak measure.
function scanSide(score, features, matches, pins, left, right, forward, rule) {
  const pin = forward ? left : right, direction = forward ? 1 : -1;
  const rate = neighborPace(pins, score.edges, pin, -direction).rate;
  const near = forward ? pins[left].endSeconds : pins[right].startSeconds;
  const boundary = forward ? left+1 : right;
  const origin = near - score.edges[boundary]*rate;
  const supported = supportsTempo(pins, score.edges, pin, -direction, origin, rate);
  const results = new Map();
  if (!(rate>0) || (rule!=='pitch' && !supported)) return results;
  for (let i=pin+direction; i>left && i<right; i+=direction) {
    const start=near+(score.edges[i]-score.edges[boundary])*rate;
    const end=near+(score.edges[i+1]-score.edges[boundary])*rate;
    if (start<pins[left].endSeconds-0.20 || end>pins[right].startSeconds+0.20) break;
    const from=Math.max(start,pins[left].endSeconds), to=Math.min(end,pins[right].startSeconds);
    if (!(to>from)) break;
    const evidence=barEvidence(score,i,features,from,to);
    if (evidence.active<4 || evidence.fit<0.48 || evidence.contrast<0.06) break;
    const hasTake=matches[i].some(t=>!t.reviewOnly && Math.abs(t.start-from)<=0.20 && Math.abs(t.end-to)<=0.20);
    results.set(i,{start:from,end:to,hasTake});
  }
  return results;
}

// A distant take that also explains two neighboring bars is a competing
// performance of this phrase. Test it as a veto before accepting an edge.
function competingPhrase(edges, matches, i, start) {
  const duration=edges[i+1]-edges[i];
  return matches[i].some(take=>{
    if(take.reviewOnly || Math.abs(take.start-start)<=2)return false;
    const rate=(take.end-take.start)/duration;
    let neighbors=0;
    for(const step of [-1,1]){
      for(let k=1;k<=2;k++){
        const j=i+step*k;
        if(!matches[j])break;
        const from=take.start+(edges[j]-edges[i])*rate;
        const to=take.start+(edges[j+1]-edges[i])*rate;
        if(!matches[j].some(t=>!t.reviewOnly && Math.abs(t.start-from)<=0.35 && Math.abs(t.end-to)<=0.35))break;
        neighbors++;
      }
    }
    return neighbors>=2;
  });
}

export function partialGapProposals(score, features, matches, pins, rule) {
  const result=[];
  let left=-1;
  for(let right=0;right<pins.length;right++){
    if(!pins[right])continue;
    const previous=left; left=right;
    if(previous<0 || right===previous+1 || pins[right].startSeconds<=pins[previous].endSeconds)continue;
    const f=scanSide(score,features,matches,pins,previous,right,true,rule);
    const b=scanSide(score,features,matches,pins,previous,right,false,rule);
    const gap=[];
    for(let i=previous+1;i<right;i++){
      const a=f.get(i), z=b.get(i);
      if(!a&&!z)continue;
      const agree=a&&z&&Math.max(Math.abs(a.start-z.start),Math.abs(a.end-z.end))<=0.20;
      if(a&&z&&!agree)continue;
      if((rule==='confirmed'||rule==='distinct') && !(agree||a?.hasTake||z?.hasTake))continue;
      if(rule==='agreement' && !agree)continue;
      const take=a??z;
      let start=agree?(a.start+z.start)/2:take.start;
      let end=agree?(a.end+z.end)/2:take.end;
      if(rule==='distinct' && competingPhrase(score.edges,matches,i,start))continue;
      if(i===previous+1 && start-pins[previous].endSeconds<=0.08) start=pins[previous].endSeconds;
      if(i===right-1 && pins[right].startSeconds-end<=0.08) end=pins[right].startSeconds;
      gap.push({index:i,start,end});
    }
    // Keep each accepted arm connected to its source. A rejected or disputed
    // visit cannot become a stepping stone into the middle of a distant take.
    let prefix=previous, suffix=right;
    for(const t of gap){if(t.index!==prefix+1 || !f.has(t.index))break;prefix=t.index;}
    for(let k=gap.length-1;k>=0;k--){const i=gap[k].index;if(i!==suffix-1||!b.has(i))break;suffix=i;}
    const arms=gap.filter(t=>t.index<=prefix||t.index>=suffix);
    if(arms.some((t,k)=>k&&t.start<arms[k-1].end-0.08))continue;
    result.push(...arms);
  }
  return result;
}
