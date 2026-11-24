// Explicit musical traversal and unscored recording intervals. No transport, native API,
// provider access, timing guesses or changes to the original score belong here.
export const EXPLANATION_TIMING_FORMAT='musical-visits-and-explanations';
export const EXPLANATION_TIMING_VERSION=1;
export const INTERVAL_TIMING_FORMAT='musical-visits-and-intervals';
export const INTERVAL_TIMING_VERSION=1;
// Local reviewed draft/profile only. An incoming verified lesson cannot use it.
export const REVIEWED_PASSAGES_FORMAT='reviewed-musical-passages';
// A reviewed recording can score a known attack even when the full written hold cannot be timed.
export class CrossingSustainError extends Error {}
const MAX_VISITS=4096,MAX_EXPLANATIONS=4096,MAX_ANCHORS=16384,MAX_SECONDS=86400;
const fail=message=>{throw new Error('Explanation timing: '+message);};
const integer=value=>Number.isSafeInteger(value)&&value>0&&value<=MAX_VISITS;
const seconds=value=>Number.isFinite(value)&&value>=0&&value<=MAX_SECONDS;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value)&&!/^(?:https?|file|data|javascript):/i.test(value);
function object(value,keys,label) {
  if(!value || typeof value!=='object' || Array.isArray(value) ||
      Object.keys(value).some(key=>!keys.includes(key)))fail('Invalid '+label+' fields.');
}
function array(value,min,max,label) {
  if(!Array.isArray(value)||value.length<min||value.length>max)fail('Invalid '+label+' count.');
  for(let i=0;i<value.length;i++)if(!(i in value))fail('Missing '+label+' entry.');
}
function hash(value,label) {
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/i.test(value))fail('Invalid '+label+' SHA-256.');
  return value.toLowerCase();
}
function freeze(value,seen=new Set()) {
  if(value && typeof value==='object' && !seen.has(value)) {
    seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);
  }
  return value;
}
const referenceKeys=['visit','scoreMeasure','occurrence','originalVisit'];
function reference(value,visits,label) {
  if(value===null)return null;
  object(value,referenceKeys,label);
  if(!referenceKeys.every(key=>integer(value[key])))fail('Invalid '+label+' reference.');
  const expected=visits[value.visit-1];
  if(!expected || !referenceKeys.every(key=>value[key]===expected[key]))fail(label+' does not identify its musical visit.');
  return Object.fromEntries(referenceKeys.map(key=>[key,value[key]]));
}

export function validateTimingPlan(input,{allowReviewed=false}={}) {
  const partial=allowReviewed && input?.format===REVIEWED_PASSAGES_FORMAT;
  const extended=partial || input?.format===INTERVAL_TIMING_FORMAT;
  object(input,['format','version','scoreSha256','sourceSha256','timingSha256','recordingId',
    'originalPlaybackOrder','musicalVisits','repeatResolution',...(extended?['intervals','scoreOmissions']:['explanations'])],'plan');
  if(input.version!==1 || (!partial && ![EXPLANATION_TIMING_FORMAT,INTERVAL_TIMING_FORMAT].includes(input.format)))fail('Unsupported plan format or version.');
  const scoreSha256=hash(input.scoreSha256,'score'),sourceSha256=hash(input.sourceSha256,'source'),timingSha256=hash(input.timingSha256,'timing');
  if(!id(input.recordingId))fail('Recording identity must be a bounded opaque identifier, not a URL or path.');
  array(input.originalPlaybackOrder,1,MAX_VISITS,'original traversal');
  const originalPlaybackOrder=input.originalPlaybackOrder.map(value=>{if(!integer(value))fail('Invalid original measure number.');return value;});
  const occurrenceCounts=new Map(),originalOccurrences=originalPlaybackOrder.map(measure=>{
    const occurrence=(occurrenceCounts.get(measure)??0)+1;occurrenceCounts.set(measure,occurrence);return occurrence;
  });
  array(input.musicalVisits,1,MAX_VISITS,'musical visit');
  let totalAnchors=0,lastOriginalVisit=0;
  const musicalVisits=input.musicalVisits.map((visit,index)=>{
    object(visit,[...referenceKeys,'startSeconds','endSeconds','anchors'],'musical visit');
    if(!referenceKeys.every(key=>integer(visit[key])) || visit.visit!==index+1 || visit.originalVisit<=lastOriginalVisit ||
        originalPlaybackOrder[visit.originalVisit-1]!==visit.scoreMeasure || originalOccurrences[visit.originalVisit-1]!==visit.occurrence)
      fail('Musical visits must follow the original traversal with exact measure/occurrence references.');
    lastOriginalVisit=visit.originalVisit;
    if(!seconds(visit.startSeconds)||!seconds(visit.endSeconds)||visit.endSeconds<=visit.startSeconds)fail('Invalid musical interval.');
    if(index && visit.startSeconds<input.musicalVisits[index-1].endSeconds)fail('Musical intervals overlap or are out of order.');
    array(visit.anchors,2,MAX_ANCHORS,'musical anchor');totalAnchors+=visit.anchors.length;
    if(totalAnchors>MAX_ANCHORS)fail('Too many musical anchors.');
    let previousOffset=-1,previousSeconds=-1;
    const anchors=visit.anchors.map(anchor=>{
      object(anchor,['offset480','seconds'],'anchor');
      if(!Number.isFinite(anchor.offset480)||anchor.offset480<0||anchor.offset480>480||!seconds(anchor.seconds)||
          anchor.offset480<=previousOffset||anchor.seconds<=previousSeconds||anchor.seconds<visit.startSeconds||anchor.seconds>visit.endSeconds)
        fail('Musical anchors must increase inside their own visit.');
      previousOffset=anchor.offset480;previousSeconds=anchor.seconds;
      return {offset480:anchor.offset480,seconds:anchor.seconds};
    });
    if(anchors[0].offset480!==0||anchors[0].seconds!==visit.startSeconds||anchors.at(-1).offset480!==480||anchors.at(-1).seconds!==visit.endSeconds)
      fail('Every musical visit needs exact complete start and end anchors.');
    return {...Object.fromEntries(referenceKeys.map(key=>[key,visit[key]])),startSeconds:visit.startSeconds,endSeconds:visit.endSeconds,anchors};
  });
  object(input.repeatResolution,['kind','omittedOriginalVisits'],'repeat resolution');
  const resolution=input.repeatResolution;
  if(!['unchanged','source-visit-plan'].includes(resolution.kind))fail('Unsupported repeat resolution.');
  array(resolution.omittedOriginalVisits,0,MAX_VISITS,'omitted original visit');
  const selected=new Set(musicalVisits.map(visit=>visit.originalVisit));
  let scoreOmissions=[],omitted;
  if(extended) {
    array(input.scoreOmissions,0,MAX_VISITS,'silent score omission');
    let previous=0;
    scoreOmissions=input.scoreOmissions.map(omission=>{
      object(omission,['originalVisit','scoreMeasure','occurrence','reason'],'silent score omission');
      const {originalVisit,scoreMeasure,occurrence,reason}=omission;
      if(![originalVisit,scoreMeasure,occurrence].every(integer)||originalVisit<=previous||
          originalPlaybackOrder[originalVisit-1]!==scoreMeasure||originalOccurrences[originalVisit-1]!==occurrence||reason!=='unmatched-full-rest')
        fail('Silent score omissions must be ordered exact native references with reason unmatched-full-rest.');
      previous=originalVisit;
      return {originalVisit,scoreMeasure,occurrence,reason};
    });
    omitted=[...resolution.omittedOriginalVisits];
    if(omitted.some((visit,index)=>!integer(visit)||visit>originalPlaybackOrder.length||index&&visit<=omitted[index-1]))
      fail('Repeat omissions must be listed once in original traversal order.');
    const accounted=new Set(selected);
    for(const visit of [...omitted,...scoreOmissions.map(omission=>omission.originalVisit)]) {
      if(accounted.has(visit))fail('Kept visits, repeat omissions and silent score omissions must be disjoint.');
      accounted.add(visit);
    }
    if(!partial && accounted.size!==originalPlaybackOrder.length)fail('Every original visit must be kept or explicitly omitted exactly once.');
  } else {
    omitted=originalPlaybackOrder.flatMap((_,index)=>selected.has(index+1)?[]:[index+1]);
    if(resolution.omittedOriginalVisits.length!==omitted.length || omitted.some((visit,index)=>resolution.omittedOriginalVisits[index]!==visit))
      fail('Every omitted original visit must be explicitly listed in order.');
  }
  if(omitted.some(visit=>originalOccurrences[visit-1]===1))fail('The first occurrence of every written musical measure must remain.');
  if((resolution.kind==='unchanged')!==!omitted.length)fail('Repeat resolution must disclose the changed traversal.');
  const rawIntervals=extended?input.intervals:input.explanations;
  array(rawIntervals,0,MAX_EXPLANATIONS,extended?'recording interval':'explanation');
  const ids=new Set();
  const explanations=rawIntervals.map((explanation,index)=>{
    object(explanation,['id','label','startSeconds','endSeconds','boundary',...(extended?['kind']:[])],extended?'recording interval':'explanation');
    if(extended&&!['explanation','unmatched-source-rest'].includes(explanation.kind))fail('Unsupported recording interval kind.');
    if(!id(explanation.id)||ids.has(explanation.id))fail('Explanation IDs must be unique bounded identifiers.');ids.add(explanation.id);
    if(typeof explanation.label!=='string'||!explanation.label.trim()||explanation.label.length>240||/[\x00-\x1f]/.test(explanation.label))fail('Invalid explanation label.');
    if(!seconds(explanation.startSeconds)||!seconds(explanation.endSeconds)||explanation.endSeconds<=explanation.startSeconds||
        index && explanation.startSeconds<rawIntervals[index-1].endSeconds)fail('Explanation intervals must be ordered and nonoverlapping.');
    object(explanation.boundary,['after','before'],'explanation boundary');
    const after=reference(explanation.boundary.after,musicalVisits,'After boundary'),before=reference(explanation.boundary.before,musicalVisits,'Before boundary');
    if(!after&&!before || after&&before&&before.visit!==after.visit+1 || !after&&before.visit!==1 || !before&&after.visit!==musicalVisits.length)
      fail('An explanation must identify an adjacent musical boundary.');
    if(after&&explanation.startSeconds<musicalVisits[after.visit-1].endSeconds || before&&explanation.endSeconds>musicalVisits[before.visit-1].startSeconds)
      fail('An explanation lies outside its declared musical boundary.');
    return {id:explanation.id,...(extended?{kind:explanation.kind}:{}),label:explanation.label,startSeconds:explanation.startSeconds,endSeconds:explanation.endSeconds,boundary:{after,before}};
  });
  const intervals=[...musicalVisits,...explanations].sort((a,b)=>a.startSeconds-b.startSeconds);
  for(let i=1;i<intervals.length;i++)if(intervals[i].startSeconds<intervals[i-1].endSeconds || !partial && intervals[i].startSeconds!==intervals[i-1].endSeconds)
    fail('Music and explanations must cover every internal interval without gaps or overlaps.');
  return freeze({format:input.format,version:input.version,scoreSha256,sourceSha256,timingSha256,
    recordingId:input.recordingId,originalPlaybackOrder,musicalVisits,...(extended?{intervals:explanations,scoreOmissions}:{explanations}),
    repeatResolution:{kind:resolution.kind,omittedOriginalVisits:[...omitted]}});
}

// Raw validated plans retain their own format; this is a read-only common view.
export function timingPlanIntervals(plan) {return plan.intervals??plan.explanations;}

function timelineKey(timeline) {
  if(!timeline||!Number.isFinite(timeline.endTick)||timeline.endTick<=0||!Number.isFinite(timeline.ticksPerQuarter)||timeline.ticksPerQuarter<=0||
      !Array.isArray(timeline.measures)||!timeline.measures.length||!Array.isArray(timeline.tempoMap)||!timeline.tempoMap.length||!Array.isArray(timeline.events))
    fail('The original score timeline is not ready.');
  let end=0;
  const counts=new Map(),measures=timeline.measures.map((measure,index)=>{
    const occurrence=(counts.get(measure.measureNumber)??0)+1;counts.set(measure.measureNumber,occurrence);
    const emptyPickup=index===0 && measure.measureNumber===1 && measure.isFullRest===true && measure.endTick===0;
    if(!integer(measure.measureNumber)||measure.occurrence!==occurrence||measure.playbackMeasureIndex!==index||
        !Number.isFinite(measure.startTick)||!Number.isFinite(measure.endTick)||measure.startTick!==end||
        (measure.endTick<=measure.startTick && !emptyPickup))
      fail('The native expanded traversal is invalid.');
    end=measure.endTick;return [measure.measureNumber,measure.occurrence,measure.playbackMeasureIndex,measure.startTick,measure.endTick];
  });
  if(end!==timeline.endTick)fail('Native traversal does not cover the score endpoint.');
  const tempos=timeline.tempoMap.map(t=>[t.tick,t.bpm,t.timeMs]);
  if(tempos.some(row=>row.some(value=>!Number.isFinite(value))))fail('Invalid native tempo map.');
  return JSON.stringify([timeline.ticksPerQuarter,timeline.endTick,measures,tempos]);
}

function guardBoundaries(timeline,visits,explanations,ambiguousHolds,reviewedPassages) {
  const cuts=new Set(),intervalCuts=new Set();
  if(visits[0].startTick>0)cuts.add(visits[0].startTick);
  for(let i=1;i<visits.length;i++)if(visits[i].startMs>visits[i-1].endMs || visits[i].originalVisit!==visits[i-1].originalVisit+1) {
    cuts.add(visits[i-1].endTick);cuts.add(visits[i].startTick);
    if(visits[i].startMs>visits[i-1].endMs)intervalCuts.add(visits[i-1].endTick);
  }
  if(visits.at(-1).endTick<timeline.endTick)cuts.add(visits.at(-1).endTick);
  for(const explanation of explanations) {
    const {after,before}=explanation.boundary;
    if(after){cuts.add(visits[after.visit-1].endTick);intervalCuts.add(visits[after.visit-1].endTick);}
    if(before){cuts.add(visits[before.visit-1].startTick);intervalCuts.add(visits[before.visit-1].startTick);}
  }
  for(const event of timeline.events)for(const note of event.notes??[]) {
    const start=note.startTick??event.startTick,end=note.endTick??event.endTick;
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)fail('Cannot verify note sustain at explanation boundaries.');
    // Reviewed practice grades the attack and caps its window at the synced passage end.
    if(reviewedPassages)continue;
    for(const cut of cuts)if(start<cut&&end>cut || start===cut&&note.attack===false){
      const side=visits.find(v=>v.endTick===cut)??visits.find(v=>v.startTick===cut);
      throw new CrossingSustainError('A tied or sustained note crosses the recording boundary near measure '+(side?.scoreMeasure??'?')+'.');
    }
  }
  if(reviewedPassages)return;
  // A fresh attack may close a native let-ring range exactly at this tick, but
  // inserting recording time before that attack would delay its termination.
  for(const hold of ambiguousHolds)for(const cut of cuts)
    if(hold.startTick<cut&&(cut<hold.endTick||(hold.openEnded||intervalCuts.has(cut))&&cut===hold.endTick))
      throw new CrossingSustainError('An ambiguous expressive or let-ring hold crosses an unscored interval or omitted traversal boundary.');
}

function nativeAmbiguousHolds(timeline) {
  if(timeline.ambiguousHoldEvidenceComplete!==true)fail('The original native score does not provide complete expressive hold evidence.');
  const ranges=timeline.ambiguousHoldRanges;
  if(!Array.isArray(ranges))fail('Cannot verify native expressive hold ranges.');
  for(const range of ranges)if(!range||!Number.isFinite(range.startTick)||!Number.isFinite(range.endTick)||
      range.endTick<range.startTick||typeof range.openEnded!=='boolean')fail('Cannot verify native expressive hold ranges.');
  return ranges;
}

// An uncertain release from an earlier measure cannot prove that an omitted rest
// was silent. A local reviewed plan may leave that visit unmapped instead.
function verifiedScoreOmissions(timeline,omissions,ambiguousHolds,reviewedPassages) {
  return omissions.filter(omission=>{
    const measure=timeline.measures[omission.originalVisit-1];
    if(measure.measureNumber!==omission.scoreMeasure||measure.occurrence!==omission.occurrence)
      fail('A silent omission differs from the native measure occurrence.');
    const incomingHold=ambiguousHolds.some(hold=>hold.startTick<measure.startTick &&
      (hold.endTick>measure.startTick||hold.openEnded&&hold.endTick===measure.startTick));
    for(const event of timeline.events)for(const note of event.notes??[]) {
      const start=note.startTick??event.startTick,end=note.endTick??event.endTick;
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)fail('Cannot verify note sustain at a silent score omission.');
      if(start>=measure.startTick&&start<measure.endTick || start<measure.startTick&&end>measure.startTick)
        fail('A note or sustained hold overlaps an omitted silent score measure.');
    }
    if(ambiguousHolds.some(hold=>hold.startTick>=measure.startTick && hold.startTick<measure.endTick))
      fail('An ambiguous expressive or let-ring hold starts in an omitted silent score measure.');
    if(incomingHold){
      if(reviewedPassages)return false;
      throw new CrossingSustainError('An ambiguous expressive or let-ring hold overlaps an omitted silent score measure.');
    }
    if(measure.isFullRest!==true)fail('An omitted score measure is not independently verified as a complete silent rest.');
    return true;
  });
}

export function validateTimingPlanDuration(planOrCompiled,durationMs) {
  if(!Number.isFinite(durationMs)||durationMs<=0)fail('Load a recording with a known positive duration.');
  const plan=planOrCompiled.plan??planOrCompiled;
  const end=Math.max(...plan.musicalVisits.map(visit=>visit.endSeconds),...timingPlanIntervals(plan).map(interval=>interval.endSeconds))*1000;
  if(end>durationMs+1)fail('An interval ends beyond the selected recording duration.');
  return true;
}

export function compileTimingPlan(input,{timeline,scoreSha256,recordingId,durationMs=null,allowReviewed=false}={}) {
  let plan=validateTimingPlan(input,{allowReviewed});
  const originalTimelineKey=timelineKey(timeline);
  if(plan.scoreSha256!==hash(scoreSha256,'selected score'))fail('The original score bytes do not match this plan.');
  if(plan.recordingId!==recordingId)fail('The selected recording identity does not match this plan.');
  if(plan.originalPlaybackOrder.length!==timeline.measures.length || plan.originalPlaybackOrder.some((measure,index)=>measure!==timeline.measures[index].measureNumber))
    fail('The original native playback order does not match this plan.');
  const visits=plan.musicalVisits.map(visit=>{
    const native=timeline.measures[visit.originalVisit-1];
    if(native.measureNumber!==visit.scoreMeasure||native.occurrence!==visit.occurrence)fail('A musical visit differs from the native measure occurrence.');
    const anchors=visit.anchors.map(anchor=>({tick:native.startTick+(native.endTick-native.startTick)*anchor.offset480/480,timeMs:anchor.seconds*1000}));
    if(anchors.some((anchor,index)=>index&&(anchor.tick<=anchors[index-1].tick||anchor.timeMs<=anchors[index-1].timeMs)))
      fail('Musical anchors are too close to preserve their order in the native timeline.');
    return {...visit,startTick:native.startTick,endTick:native.endTick,startMs:visit.startSeconds*1000,endMs:visit.endSeconds*1000,anchors};
  });
  const intervals=timingPlanIntervals(plan).map(interval=>({...interval,kind:interval.kind??'explanation',startMs:interval.startSeconds*1000,endMs:interval.endSeconds*1000}));
  const explanations=intervals.filter(interval=>interval.kind==='explanation');
  const ambiguousHolds=plan.format===EXPLANATION_TIMING_FORMAT?[]:nativeAmbiguousHolds(timeline);
  const reviewedPassages=plan.format===REVIEWED_PASSAGES_FORMAT;
  const omissions=verifiedScoreOmissions(timeline,plan.scoreOmissions??[],ambiguousHolds,reviewedPassages);
  if(reviewedPassages && omissions.length!==plan.scoreOmissions.length)plan={...plan,scoreOmissions:omissions};
  guardBoundaries(timeline,visits,intervals,ambiguousHolds,reviewedPassages);
  const segments=[...visits.map(visit=>({kind:'music',startMs:visit.startMs,endMs:visit.endMs,visit})),
    ...intervals.map(interval=>({kind:interval.kind,startMs:interval.startMs,endMs:interval.endMs,interval,
      ...(interval.kind==='explanation'?{explanation:interval}:{})}))].sort((a,b)=>a.startMs-b.startMs);
  const compiled={plan,visits,intervals,explanations,segments,startMs:segments[0].startMs,endMs:segments.at(-1).endMs,originalTimelineKey};
  if(durationMs!==null)validateTimingPlanDuration(compiled,durationMs);
  return freeze(compiled);
}

function interpolate(anchors,value,input,output) {
  let index=0;while(index<anchors.length-2&&value>=anchors[index+1][input])index++;
  const a=anchors[index],b=anchors[index+1];
  return a[output]+(value-a[input])/(b[input]-a[input])*(b[output]-a[output]);
}

export function planPositionAtTime(compiled,timeMs) {
  if(!compiled||!Number.isFinite(timeMs))return null;
  const first=compiled.visits[0],last=compiled.visits.at(-1);
  if(timeMs<compiled.startMs)return {kind:'before',tick:first.startTick,visit:first,interval:null,explanation:null};
  if(timeMs>=compiled.endMs)return {kind:'after',tick:last.endTick,visit:last,interval:null,explanation:null};
  let low=0,high=compiled.segments.length;
  while(low+1<high){const middle=(low+high)>>1;if(compiled.segments[middle].startMs<=timeMs)low=middle;else high=middle;}
  const segment=compiled.segments[low];
  if(timeMs>=segment.endMs){
    const previous=compiled.visits.findLast(v=>v.endMs<=timeMs);
    return {kind:'unmapped',tick:previous?Math.max(previous.startTick,previous.endTick-1):first.startTick,
      visit:null,interval:null,explanation:null};
  }
  if(segment.kind==='music')return {kind:'music',tick:interpolate(segment.visit.anchors,timeMs,'timeMs','tick'),visit:segment.visit,interval:null,explanation:null};
  const interval=segment.interval,{after,before}=interval.boundary;
  const previous=after?compiled.visits[after.visit-1]:null,next=before?compiled.visits[before.visit-1]:null;
  return {kind:interval.kind,tick:previous?.endTick??next.startTick,visit:next??previous,interval,explanation:interval.kind==='explanation'?interval:null};
}

export function planTimeAtTick(compiled,tick,edge='start') {
  if(!compiled||!Number.isFinite(tick))return null;
  if(!['start','end'].includes(edge))throw new Error('Choose start or end when projecting a score boundary.');
  const visit=compiled.visits.find(visit=>edge==='end'?tick>visit.startTick&&tick<=visit.endTick:tick>=visit.startTick&&tick<visit.endTick);
  if(visit)return interpolate(visit.anchors,tick,'tick','timeMs');
  if(edge==='end'&&tick===compiled.visits[0].startTick)return compiled.visits[0].startMs;
  if(edge==='start'&&tick===compiled.visits.at(-1).endTick)return compiled.visits.at(-1).endMs;
  return null;
}

export function planIncludesEvent(compiled,event) {
  return Boolean(compiled&&Number.isFinite(event?.startTick)&&compiled.visits.some(visit=>event.startTick>=visit.startTick&&event.startTick<visit.endTick));
}
