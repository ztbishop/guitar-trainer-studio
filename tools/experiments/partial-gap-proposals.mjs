import {partialGapProposals as search} from '../../js/audio-sync-partial-gaps.js';

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
  if (rule==='confirmed') return search(score,features,matches,pins);
  return search(score,features,matches,pins,{
    stableTempo:rule!=='pitch',
    accept({agree,hasTake,index,start}) {
      if (rule==='agreement') return agree;
      if (rule==='distinct') return (agree || hasTake) && !competingPhrase(score.edges,matches,index,start);
      return true;
    }
  });
}
