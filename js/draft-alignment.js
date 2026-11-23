// Pure, provisional projection. Never compile a partial plan or change its evidence.
import {copyDraftJson} from './draft-timing.js';
export const finite=Number.isFinite;
export function draftPieces(plan) {
  return [...plan.musicalVisits.map((value,index)=>({key:`music:${index}`,kind:'music',value,index})),
    ...(plan.intervals??plan.explanations??[]).map((value,index)=>({key:`interval:${index}`,kind:value?.kind??'explanation',value:value&&typeof value==='object'?value:{},index}))];
}
export function draftAnchors(visit) {
  const anchors=(visit.anchors??[]).map(a=>({...a}));
  for(const [offset480,key] of [[0,'startSeconds'],[480,'endSeconds']]) {
    if(finite(visit[key])&&!anchors.some(a=>a.offset480===offset480))anchors.push({offset480,seconds:visit[key]});
  }
  anchors.sort((a,b)=>a.offset480-b.offset480);
  if(anchors.some((a,i)=>!finite(a.seconds)||!finite(a.offset480)||a.offset480<0||a.offset480>480||
    i>0&&(a.offset480<=anchors[i-1].offset480||a.seconds<=anchors[i-1].seconds)))return [];
  if(anchors.some(a=>a.offset480===0&&finite(visit.startSeconds)&&a.seconds!==visit.startSeconds||a.offset480===480&&finite(visit.endSeconds)&&a.seconds!==visit.endSeconds))return [];
  return anchors;
}
// Build once per draft edit. Match the preview's unique musical coverage,
// including partial anchors and overlaps with another passage or interval.
export function draftMusicRanges(plan,timeline) {
  const edges=[];
  function span(start,end,music,interval) {
    if(!finite(start)||!finite(end)||start>=end)return;
    edges.push({ms:start*1000,music,interval},{ms:end*1000,music:-music,interval:-interval});
  }
  for(const visit of plan.musicalVisits) {
    const native=timeline?.measures[visit.originalVisit-1];
    if(!native || native.measureNumber!==visit.scoreMeasure || native.occurrence!==visit.occurrence)continue;
    const anchors=draftAnchors(visit);
    if(anchors.length>=2)span(anchors[0].seconds,anchors.at(-1).seconds,1,0);
  }
  for(const v of plan.intervals??plan.explanations??[])span(v.startSeconds,v.endSeconds,0,1);
  edges.sort((a,b)=>a.ms-b.ms);
  const ranges=[];
  let music=0,interval=0,previous=0;
  for(const edge of edges) {
    if(previous<edge.ms && music===1 && !interval)ranges.push({startMs:previous,endMs:edge.ms});
    music+=edge.music;interval+=edge.interval;previous=edge.ms;
  }
  return ranges;
}
export function draftPosition(plan,timeline,seconds) {
  const intervals=(plan.intervals??plan.explanations??[]).filter(v=>finite(v?.startSeconds)&&finite(v?.endSeconds)&&seconds>=v.startSeconds&&seconds<v.endSeconds);
  const candidates=[];
  for(const visit of plan.musicalVisits) {
    const native=timeline?.measures?.[visit.originalVisit-1];
    if(!native||native.measureNumber!==visit.scoreMeasure||native.occurrence!==visit.occurrence)continue;
    const anchors=draftAnchors(visit);
    for(let i=1;i<anchors.length;i++) {
      const a=anchors[i-1],b=anchors[i];
      if(seconds>=a.seconds&&seconds<b.seconds){
        const fraction=(a.offset480+(b.offset480-a.offset480)*(seconds-a.seconds)/(b.seconds-a.seconds))/480;
        candidates.push({kind:'music',originalVisit:visit.originalVisit,scoreMeasure:visit.scoreMeasure,occurrence:visit.occurrence,
          fraction,tick:native.startTick+fraction*(native.endTick-native.startTick)});break;
      }
    }
  }
  if(candidates.length===1&&!intervals.length)return candidates[0];
  if(intervals.length===1&&!candidates.length)return {kind:intervals[0].kind??'explanation',label:intervals[0].label};
  return {kind:'unresolved'}; // Never extrapolate, choose overlaps or stretch across a gap.
}
// Invert the same anchor segments used for drawing the cursor. One printed
// beat can represent several passes; prefer the one nearest the recording.
export function draftSeekTarget(plan,timeline,number,fraction,clock) {
  const measure=timeline?.measures[number-1];
  if(!measure || !finite(fraction) || fraction<0 || fraction>=1)return null;
  const offset=fraction*480;
  let best=null;
  for(const [index,v] of plan.musicalVisits.entries()){
    if(v.scoreMeasure!==measure.measureNumber)continue;
    const anchors=draftAnchors(v);
    for(let i=1;i<anchors.length;i++){
      const a=anchors[i-1],b=anchors[i];
      if(offset<a.offset480 || offset>=b.offset480)continue;
      const time=a.seconds+(offset-a.offset480)/(b.offset480-a.offset480)*(b.seconds-a.seconds);
      if(draftPosition(plan,timeline,time).originalVisit!==v.originalVisit)continue;
      const distance=Math.max(anchors[0].seconds-clock,clock-anchors.at(-1).seconds,0);
      if(!best || distance<best.distance || distance===best.distance && v.originalVisit===number)
        best={index,time,distance};
      break;
    }
  }
  return best;
}
export function editDraftPiece(working,key,target,time,duration) {
  if(!finite(time))throw Error('Enter an observed time in seconds.');
  const next=copyDraftJson(working),pieces=draftPieces(next.candidatePlan),piece=pieces.find(p=>p.key===key);
  if(!piece)throw Error('Select a section.');
  if(piece.kind!=='music'){const raw=(next.candidatePlan.intervals??next.candidatePlan.explanations)[piece.index];if(!raw||typeof raw!=='object')throw Error('This interval has no structure. Repair it in optional advanced edits; the supplied evidence is retained.');}
  const v=piece.value,changes=[];
  const set=(object,key,value,label)=>{if(value<0||value>duration)throw Error('This edit is outside the actual recording. Supplied points are retained until you edit them.');changes.push(`${label}: ${object[key]??'unplaced'} → ${value} s`);object[key]=value;};
  if(target==='move') {
    if(!finite(v.startSeconds))throw Error('Place the start before moving the whole section.');
    const delta=time-v.startSeconds;
    for(const k of ['startSeconds','endSeconds'])if(finite(v[k]))set(v,k,v[k]+delta,k==='startSeconds'?'Start':'End');
    for(const a of v.anchors??[])if(finite(a.seconds))set(a,'seconds',a.seconds+delta,`Anchor ${a.offset480}/480`);
  } else if(target==='startSeconds'||target==='endSeconds') {
    set(v,target,time,target==='startSeconds'?'Start':'End');
    if(piece.kind==='music') {
      const offset480=target==='startSeconds'?0:480,a=v.anchors.find(a=>a.offset480===offset480);
      if(a)set(a,'seconds',time,`Boundary anchor ${offset480}/480`);
      else {v.anchors.push({offset480,seconds:time});v.anchors.sort((a,b)=>a.offset480-b.offset480);changes.push(`Place boundary anchor ${offset480}/480 at ${time} s`);}
    }
  } else {
    const a=v.anchors?.[Number(target)];if(!a)throw Error('Select an anchor.');
    set(a,'seconds',time,`Anchor ${a.offset480}/480`);
    if(a.offset480===0)set(v,'startSeconds',time,'Start');
    if(a.offset480===480)set(v,'endSeconds',time,'End');
  }
  if(finite(v.startSeconds)&&finite(v.endSeconds)&&v.endSeconds<=v.startSeconds)throw Error('Start must stay before end.');
  const known=(v.anchors??[]).filter(a=>finite(a.seconds));
  if(known.some((a,i)=>i&&a.seconds<=known[i-1].seconds||finite(v.startSeconds)&&a.seconds<v.startSeconds||finite(v.endSeconds)&&a.seconds>v.endSeconds))throw Error('Anchors must stay in order inside this section.');
  // Moving a section or boundary cannot cross a previously separate neighboring section.
  const old=draftPieces(working.candidatePlan).find(p=>p.key===key).value;
  for(const other of pieces.filter(p=>p.key!==key)) {
    const o=other.value;
    if(finite(o.endSeconds)&&finite(old.startSeconds)&&o.endSeconds<=old.startSeconds&&finite(v.startSeconds)&&v.startSeconds<o.endSeconds ||
       finite(o.startSeconds)&&finite(old.endSeconds)&&o.startSeconds>=old.endSeconds&&finite(v.endSeconds)&&v.endSeconds>o.startSeconds ||
       !finite(old.endSeconds)&&finite(old.startSeconds)&&finite(o.startSeconds)&&o.startSeconds>old.startSeconds&&
       (finite(v.endSeconds)&&v.endSeconds>o.startSeconds||finite(v.startSeconds)&&v.startSeconds>=o.startSeconds))throw Error('This edit would cross another section. Move its boundary separately first.');
  }
  return {working:next,changes};
}
