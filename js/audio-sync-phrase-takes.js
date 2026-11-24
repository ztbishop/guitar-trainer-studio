const distance = (a,b) => Math.max(Math.abs(a.start-b.start),Math.abs(a.end-b.end));

// Count consecutive measures whose independently retrieved candidates support this take's tempo.
function support(edges,matches,i,take) {
  const rate=(take.end-take.start)/(edges[i+1]-edges[i]);
  const project=t=>take.start+(t-edges[i])*rate;
  let votes=0;
  for(const direction of [-1,1]){
    for(let step=1;step<=3;step++){
      const j=i+direction*step;
      if(!matches[j]) break;
      const expected={start:project(edges[j]),end:project(edges[j+1])};
      if(!matches[j].some(t=>!t.reviewOnly && distance(t,expected)<=0.25+0.12*step)) break;
      votes++;
    }
  }
  return votes;
}

export function selectPhraseTakes(edges,matches,choices) {
  for(let i=0;i<matches.length;i++){
    if(!matches[i].length || !(edges[i+1]>edges[i])) continue;
    const old=matches[i][choices[i]];
    if(old && (old.pinnedStart || old.pinnedEnd || old.manual)) continue;
    if(old && matches[i].length===1) continue;
    const ranked=matches[i].map((take,index)=>({take,index,votes:support(edges,matches,i,take)}))
      .filter(entry=>!entry.take.reviewOnly)
      .sort((a,b)=>b.votes-a.votes || b.take.quality-a.take.quality);
    const best=ranked[0];
    if(!best || best.votes<3 || (old && distance(old,best.take)<0.5)) continue;
    const rival=ranked.find(other=>distance(other.take,best.take)>=0.5);
    if(best.votes-(rival?.votes??0)<2) continue;
    const before=choices.findLastIndex((c,j)=>j<i && c>=0);
    const after=choices.findIndex((c,j)=>j>i && c>=0);
    if(before>=0 && matches[before][choices[before]].end>best.take.start) continue;
    if(after>=0 && matches[after][choices[after]].start<best.take.end) continue;
    choices[i]=best.index;
  }
}
