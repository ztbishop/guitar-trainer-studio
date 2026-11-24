import {refinePassage, PassageMatchError} from '../../js/audio-sync-passages.js';
import {barEvidence, neighborPace, supportsTempo, phraseSupported} from '../../js/audio-sync-pinned-phrases.js';

const FRAME = 0.04;

// Input contains the existing selections, score and audio features only.
// Every variant reads the same immutable pins. New placements never become pins.
export function pinnedExperiments(score, visits, features) {
  const output={allPins:[],pace:[],phrase:[],clock:[],pitch:[],corroborated:[],refined:[]};
  const edges=score.edges;
  let left=-1;
  for(let right=0;right<visits.length;right++){
    if(!visits[right]) continue;
    const pin=left;
    left=right;
    if(pin<0 || right===pin+1) continue;
    const start=visits[pin].endSeconds, end=visits[right].startSeconds;
    const nominal=edges[right]-edges[pin+1], rate=(end-start)/nominal;
    const before=neighborPace(visits,edges,pin,-1), after=neighborPace(visits,edges,right,1);
    const paceFits=[before,after].every(n=>n.rate>0 && rate/n.rate>=0.82 && rate/n.rate<=1.18);
    if(!(end>start && nominal>0))continue;
    const points=edges.slice(pin+1,right+1).map(t=>start+(t-edges[pin+1])*rate);
    points[points.length-1]=end;
    function append(group,positions){
      for(let k=1;k<positions.length;k++)
        output[group].push({originalVisit:pin+k+1,startSeconds:positions[k-1],endSeconds:positions[k]});
    }
    append('allPins',points);
    if(![before,after].every(n=>Math.abs((rate-n.rate)*nominal)<=0.18*n.rate*nominal+0.25))continue;
    if(paceFits)append('pace',points);
    const evidence=points.slice(1).map((to,k)=>barEvidence(score,pin+k+1,features,points[k],to));
    const origin=start-edges[pin+1]*rate;
    if(phraseSupported(evidence)){
      append('phrase',points);
      const a=supportsTempo(visits,edges,pin,-1,origin,rate);
      const b=supportsTempo(visits,edges,right,1,origin,rate);
      if(a&&b)append('clock',points);
    }
    if(!paceFits)continue;

    if(!evidence.every(e=>e.active>=3 && e.fit>=0.40 && e.contrast>=0.015))continue;
    append('pitch',points);
    // Require a continuous neighboring bar on at least one side, a tighter
    // tempo agreement, and a stronger pitch advantage throughout the run.
    if(Math.max(before.count,after.count)<2 ||
        ![before,after].every(n=>Math.abs(rate/n.rate-1)<=0.12) ||
        !evidence.every(e=>e.fit>=0.50 && e.contrast>=0.06)) continue;
    append('corroborated',points);
    const clip=features.subarray(Math.floor(start/FRAME)*12,Math.ceil(end/FRAME)*12);
    try{
      const warped=refinePassage(score,clip,pin+1,right-1,start,end);
      if(warped.every((t,i)=>Math.abs(t-points[i])<=0.25)) { append('refined',warped); continue; }
    }catch(e){if(!(e instanceof PassageMatchError))throw e;}
    append('refined',points);
  }
  return output;
}
