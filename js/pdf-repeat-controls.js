import {printedMeasure} from './printed-measure.js';
import {printedBoxForVisit} from './pdf-box-review.js';

export function visitLabel(score,visit){
  return (visit.playbackMeasureIndex+1)+' · score '+printedMeasure(score,visit.measureNumber)+
    (visit.occurrence>1?' · pass '+visit.occurrence:'');
}

// Populate the visit lists only when the user edits playback order.
export function initRepeatControls(state,getMapping,apply,message){
  const get=id=>document.getElementById('pdf-'+id);
  const section=get('order'),from=get('from'),through=get('through'),first=get('first');
  function refresh(){
    const visits=state.playbackTimeline?.measures;
    if(!section.open || !visits?.length)return;
    for(const select of [from,through]){
      const selected=select.value;
      select.replaceChildren(...visits.map(v=>{
        const n=printedBoxForVisit(v,getMapping());
        return new Option(visitLabel(state.score,v)+' → '+(n==null?'unmapped':'print '+printedMeasure(state.score,n)),v.playbackMeasureIndex+1);
      }));
      if(selected && Number(selected)<=visits.length)select.value=selected;
    }
    first.replaceChildren(...Array.from(get('measure').options,o=>new Option(o.text,o.value)));
    first.value=String(printedBoxForVisit(visits[Number(from.value)-1],getMapping()) ?? 1);
  }
  section.ontoggle=refresh;
  from.onchange=()=>{
    through.value=from.value;
    first.value=String(printedBoxForVisit(state.playbackTimeline.measures[Number(from.value)-1],getMapping()) ?? 1);
  };
  function assign(unmap){
    const start=Number(from.value),end=Number(through.value),printed=Number(first.value);
    const visits=state.playbackTimeline.measures;
    if(start<1 || end<start || end>visits.length){message('Choose an end visit at or after the start visit.');return;}
    if(!unmap && (printed<1 || printed+end-start>first.length)){message('The range extends beyond the last printed measure. Shorten the range or choose an earlier printed measure.');return;}
    const next=getMapping()?.slice() ?? visits.map(v=>v.measureNumber);
    for(let i=start;i<=end;i++)next[i-1]=unmap?null:printed+i-start;
    apply(next.every((n,i)=>n===visits[i].measureNumber)?null:next);
    refresh();
    message('Visits '+start+'–'+end+(unmap?' are unmapped.':' now follow printed measures '+printedMeasure(state.score,printed)+'–'+printedMeasure(state.score,printed+end-start)+'.'));
  }
  get('apply-range').onclick=()=>assign(false);
  get('unmap').onclick=()=>assign(true);
  return {open(){
    section.open=true;from.focus({preventScroll:true});
  },reset(){
    section.open=false;from.replaceChildren();through.replaceChildren();first.replaceChildren();
  }};
}
