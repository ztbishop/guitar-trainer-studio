import {printedMeasure} from './printed-measure.js';

// Recording times are seconds. Visit numbers follow the score's expanded repeat order.
export function insertTimedMeasure(plan, measures, number, start, end, duration) {
  const measure=measures[number-1];
  if(!measure || !Number.isFinite(start) || !Number.isFinite(end) || start<0 || end<=start || end>duration)
    throw Error('Set the first beat and a later end within the recording.');
  const next=structuredClone(plan), visits=next.musicalVisits;
  if(visits.some(v=>!Number.isInteger(v.originalVisit) || v.originalVisit===number))
    throw Error('Check the existing passage assignments before adding this measure.');
  if(visits.some(v=>v.originalVisit<number ? !Number.isFinite(v.endSeconds)||v.endSeconds>start : !Number.isFinite(v.startSeconds)||v.startSeconds<end))
    throw Error('These times cross another measure. Check the pass, start and end.');
  const added={originalVisit:number,scoreMeasure:measure.measureNumber,occurrence:measure.occurrence,
    startSeconds:start,endSeconds:end,anchors:[{offset480:0,seconds:start},{offset480:480,seconds:end}]};
  const index=visits.findIndex(v=>v.originalVisit>number);
  visits.splice(index<0?visits.length:index,0,added);
  visits.forEach((v,i)=>{v.visit=i+1;});
  const ref=v=>v?{visit:v.visit,originalVisit:v.originalVisit,scoreMeasure:v.scoreMeasure,occurrence:v.occurrence}:null;
  const ids=new Set(next.intervals.map(i=>i.id));
  next.intervals=next.intervals.flatMap(interval=>{
    const a=interval.startSeconds,b=interval.endSeconds;
    if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Place the existing interval boundaries first.');
    const overlap=a<end && b>start;
    if(overlap && (interval.kind!=='explanation'||interval.label!=='Unscored recording gap'))
      throw Error('These times cross a labeled break. Adjust its boundaries first.');
    const spans=overlap?[[a,Math.min(b,start)],[Math.max(a,end),b]].filter(([l,r])=>l<r):[[a,b]];
    return spans.map(([l,r],i)=>{
      let id=interval.id;
      if(i){id='gap-'+number;while(ids.has(id))id+='a';ids.add(id);}
      return {...interval,id,startSeconds:l,endSeconds:r,boundary:{
        after:ref(visits.findLast(v=>v.endSeconds<=l)),before:ref(visits.find(v=>v.startSeconds>=r))}};
    });
  });
  return next;
}

export function createMissingMeasureForm({measures,notation,visit,playhead,save}) {
  const box=document.createElement('fieldset'),legend=document.createElement('legend');
  const row=document.createElement('div');row.className='media-actions';
  legend.textContent='Time a missing measure';box.append(legend,row);
  const select=document.createElement('select');
  select.setAttribute('aria-label','Missing measure and pass');row.append(select);
  function edge(label){
    const wrap=document.createElement('label'),field=document.createElement('input'),pin=document.createElement('button');
    field.type='number';field.step='any';field.min='0';wrap.append(label+' (s) ',field);
    pin.type='button';pin.textContent='Use playhead for '+label.toLowerCase();
    pin.onclick=()=>{field.value=String(playhead());};row.append(wrap,pin);return field;
  }
  const start=edge('Start'),end=edge('End'),apply=document.createElement('button'),status=document.createElement('span');
  apply.type='button';apply.textContent='Add timed measure';status.setAttribute('role','status');row.append(apply);box.append(status);
  function defaults(){
    const n=Number(select.value);
    start.value=visit(n-1)?.endSeconds??'';end.value=visit(n+1)?.startSeconds??'';
    status.textContent='Check both times. Adjacent timed measures supply suggested boundaries.';
  }
  select.onchange=defaults;
  apply.onclick=()=>{try{save(Number(select.value),start.valueAsNumber,end.valueAsNumber);}catch(e){status.textContent=e.message;}};
  function refresh(){
    const previous=select.value;select.replaceChildren();
    for(const [i,m] of measures().entries())if(!visit(i+1))
      select.add(new Option('Measure '+printedMeasure(notation(),m.measureNumber)+' · pass '+m.occurrence,String(i+1)));
    if([...select.options].some(o=>o.value===previous))select.value=previous;
    box.hidden=!select.length;defaults();
  }
  function choose(number){
    if(![...select.options].some(o=>Number(o.value)===number))return false;
    select.value=String(number);defaults();select.focus();return true;
  }
  return {box,refresh,choose};
}
