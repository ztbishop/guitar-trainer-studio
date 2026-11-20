import test from 'node:test';
import assert from 'node:assert/strict';
import {INTERVAL_TIMING_FORMAT,INTERVAL_TIMING_VERSION,validateTimingPlan,compileTimingPlan,
  timingPlanIntervals,validateTimingPlanDuration,planPositionAtTime,planTimeAtTick,planIncludesEvent} from '../js/explanation-timing.js';

const scoreSha256='a'.repeat(64),recordingId='matched:recording';
const ref=visit=>visit?Object.fromEntries(['visit','originalVisit','scoreMeasure','occurrence'].map(key=>[key,visit[key]])):null;
function fixture({order=[1,2,3,4,5],scoreOmit=[1,3,5],repeatOmit=[],restVisits=scoreOmit,
  breaks={0:[['unmatched-source-rest',1]],1:[['unmatched-source-rest',1],['explanation',2]],2:[['unmatched-source-rest',1]]},prefix=0}={}) {
  const counts=new Map(),measures=order.map((measureNumber,index)=>{
    const occurrence=(counts.get(measureNumber)??0)+1;counts.set(measureNumber,occurrence);
    return {measureNumber,occurrence,playbackMeasureIndex:index,startTick:index*960,endTick:(index+1)*960,isFullRest:restVisits.includes(index+1)};
  });
  const musicalVisits=[],gaps=[];let cursor=prefix;
  const addGaps=boundary=>{for(const [kind,duration] of breaks[boundary]??[]){gaps.push({kind,boundary,startSeconds:cursor,endSeconds:cursor+duration});cursor+=duration;}};
  for(const measure of measures) {
    const originalVisit=measure.playbackMeasureIndex+1;if(scoreOmit.includes(originalVisit)||repeatOmit.includes(originalVisit))continue;
    addGaps(musicalVisits.length);
    musicalVisits.push({visit:musicalVisits.length+1,originalVisit,scoreMeasure:measure.measureNumber,occurrence:measure.occurrence,
      startSeconds:cursor,endSeconds:cursor+2,anchors:[{offset480:0,seconds:cursor},{offset480:480,seconds:cursor+2}]});cursor+=2;
  }
  addGaps(musicalVisits.length);
  const intervals=gaps.map((gap,index)=>({id:'interval-'+(index+1),kind:gap.kind,label:gap.kind==='explanation'?'Explanation':'Unmatched source rest',
    startSeconds:gap.startSeconds,endSeconds:gap.endSeconds,boundary:{after:ref(musicalVisits[gap.boundary-1]),before:ref(musicalVisits[gap.boundary])}}));
  const plan={format:INTERVAL_TIMING_FORMAT,version:INTERVAL_TIMING_VERSION,scoreSha256,sourceSha256:'b'.repeat(64),timingSha256:'c'.repeat(64),
    recordingId,originalPlaybackOrder:[...order],musicalVisits,intervals,
    scoreOmissions:scoreOmit.map(originalVisit=>({originalVisit,scoreMeasure:order[originalVisit-1],occurrence:measures[originalVisit-1].occurrence,reason:'unmatched-full-rest'})),
    repeatResolution:{kind:repeatOmit.length?'source-visit-plan':'unchanged',omittedOriginalVisits:[...repeatOmit]}};
  const timeline={ticksPerQuarter:960,endTick:order.length*960,tempoMap:[{tick:0,bpm:120,timeMs:0}],measures,ambiguousHoldEvidenceComplete:true,ambiguousHoldRanges:[],
    events:measures.map(measure=>({startTick:measure.startTick,endTick:measure.endTick,isRest:measure.isFullRest,
      notes:measure.isFullRest?[]:[{id:'n'+measure.playbackMeasureIndex,startTick:measure.startTick,endTick:measure.endTick,attack:true,midi:60}]}))};
  return {plan,timeline,durationMs:(cursor+5)*1000};
}
const compile=f=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256,recordingId,durationMs:f.durationMs});

test('new format preserves mixed interval kinds and original silent-omission coordinates without converting to explanation format',()=>{
  const f=fixture(),before=structuredClone(f),compiled=compile(f);
  assert.deepEqual(f,before);assert.deepEqual(compiled.plan,f.plan);assert(!Object.hasOwn(compiled.plan,'explanations'));
  assert.equal(timingPlanIntervals(compiled.plan),compiled.plan.intervals);
  assert.equal(compiled.intervals.length,4);assert.equal(compiled.explanations.length,1);
  assert.deepEqual(compiled.visits.map(v=>[v.originalVisit,v.startTick,v.endTick]),[[2,960,1920],[4,2880,3840]]);
  const blank=planPositionAtTime(compiled,3000),explanation=planPositionAtTime(compiled,4000);
  assert.equal(blank.kind,'unmatched-source-rest');assert.equal(blank.interval.id,'interval-2');assert.equal(blank.explanation,null);assert.equal(blank.tick,1920);
  assert.equal(explanation.kind,'explanation');assert.equal(explanation.interval,explanation.explanation);assert.equal(explanation.tick,1920);
  assert.equal(planPositionAtTime(compiled,6000).kind,'music');assert.equal(planPositionAtTime(compiled,6000).tick,2880);
  assert(Object.isFrozen(compiled.plan.scoreOmissions[0]));assert(Object.isFrozen(compiled.intervals));
  assert.throws(()=>{compiled.plan.intervals[0].kind='explanation';});
});

test('leading, interior and trailing score blanks combine independently with source-rest intervals',()=>{
  for(let scoreMask=0;scoreMask<8;scoreMask++)for(let sourceMask=0;sourceMask<8;sourceMask++) {
    const scoreOmit=[1,3,5].filter((_,i)=>scoreMask&(1<<i)),kept=5-scoreOmit.length,breaks={};
    for(const [index,boundary] of [0,1,kept].entries())if(sourceMask&(1<<index))breaks[boundary]=[['unmatched-source-rest',1]];
    const f=fixture({scoreOmit,restVisits:[1,3,5],breaks,prefix:0.5}),compiled=compile(f);
    assert.deepEqual(compiled.visits.map(v=>v.originalVisit),[1,2,3,4,5].filter(v=>!scoreOmit.includes(v)));
    assert.equal(compiled.plan.repeatResolution.kind,'unchanged');assert.equal(compiled.explanations.length,0);
    for(const interval of compiled.intervals)assert.equal(planPositionAtTime(compiled,interval.startMs).kind,'unmatched-source-rest');
    for(const visit of compiled.visits)assert.equal(planPositionAtTime(compiled,visit.startMs).visit.originalVisit,visit.originalVisit);
    assert.equal(planPositionAtTime(compiled,499).kind,'before');assert.equal(planPositionAtTime(compiled,compiled.endMs).kind,'after');
    for(const originalVisit of scoreOmit)assert.equal(planTimeAtTick(compiled,(originalVisit-1)*960+480),null);
  }
});

test('matched ordinary rests remain musical even when the recording also has separate unscored rests',()=>{
  const f=fixture({order:[1,2,3],scoreOmit:[],restVisits:[2],breaks:{1:[['unmatched-source-rest',2]]}}),compiled=compile(f);
  assert.equal(compiled.visits.length,3);assert.equal(compiled.plan.scoreOmissions.length,0);
  assert.equal(planPositionAtTime(compiled,5000).kind,'music');assert.equal(planPositionAtTime(compiled,5000).visit.scoreMeasure,2);
  assert.equal(planIncludesEvent(compiled,{startTick:960}),true);
  assert.equal(planPositionAtTime(compiled,3000).kind,'unmatched-source-rest');
});

test('repeat omissions and verified silent omissions form a disjoint complete partition with kept visits',()=>{
  const f=fixture({order:[1,2,1,2,3],scoreOmit:[1],repeatOmit:[3,4],restVisits:[1,3],breaks:{}}),compiled=compile(f);
  assert.deepEqual(compiled.visits.map(v=>v.originalVisit),[2,5]);assert.deepEqual(compiled.plan.repeatResolution.omittedOriginalVisits,[3,4]);
  assert.deepEqual(compiled.plan.scoreOmissions.map(o=>o.originalVisit),[1]);
  const changes=[p=>p.scoreOmissions=[],p=>p.repeatResolution.omittedOriginalVisits=[4],p=>p.repeatResolution.omittedOriginalVisits=[4,3],
    p=>p.repeatResolution.omittedOriginalVisits=[3,3,4],p=>p.repeatResolution.omittedOriginalVisits=[1,3,4],
    p=>p.repeatResolution.omittedOriginalVisits=[2,3,4],p=>p.repeatResolution.kind='unchanged',
    p=>p.scoreOmissions.push({...p.scoreOmissions[0],originalVisit:3,occurrence:2}),
    p=>p.scoreOmissions.push({...p.scoreOmissions[0],originalVisit:5,scoreMeasure:3}),
    p=>p.scoreOmissions[0].occurrence=2,p=>p.scoreOmissions[0].reason='repeat',p=>p.scoreOmissions[0].originalVisit=99];
  for(const change of changes){const plan=structuredClone(f.plan);change(plan);assert.throws(()=>validateTimingPlan(plan),change.toString());}
  const firstRepeat=fixture({order:[1,2,1],scoreOmit:[],repeatOmit:[1],breaks:{}});
  assert.throws(()=>validateTimingPlan(firstRepeat.plan),/first occurrence/);
});

test('sorted silent omissions are required and repeat kind describes only repeat omissions',()=>{
  const f=fixture({breaks:{}});assert.equal(validateTimingPlan(f.plan).repeatResolution.kind,'unchanged');
  for(const change of [p=>p.scoreOmissions.reverse(),p=>p.scoreOmissions.push(p.scoreOmissions[0]),
    p=>p.repeatResolution.kind='source-visit-plan',p=>delete p.scoreOmissions,p=>p.scoreOmissions=Array(4097).fill(p.scoreOmissions[0]),
    p=>delete p.scoreOmissions[1]]) {
    const plan=structuredClone(f.plan);change(plan);assert.throws(()=>validateTimingPlan(plan),change.toString());
  }
});

test('silent omissions require independent true proof and never trust a sender or the absence of practice notes',()=>{
  for(const value of [undefined,false,1,'true']) {
    const f=fixture();f.timeline.measures[0].isFullRest=value;
    assert.throws(()=>compile(f),/independently verified/);
  }
  const f=fixture();f.plan.scoreOmissions[0].isFullRest=true;assert.throws(()=>validateTimingPlan(f.plan),/fields/);
  const sounding=fixture({order:[1,2],scoreOmit:[1],restVisits:[],breaks:{}});sounding.timeline.events[0].notes=[];
  assert.throws(()=>compile(sounding),/independently verified/);
});

test('all native notes, dead attacks, zero-length attacks and sustained overlaps defeat claimed silent omissions',()=>{
  for(const note of [
    {startTick:960,endTick:2400,attack:true},
    {startTick:1920,endTick:2000,attack:true,midi:NaN,isDead:true},
    {startTick:1920,endTick:1920,attack:true},
    {startTick:2300,endTick:2400,attack:false},
    {startTick:1920,endTick:NaN,attack:true},
  ]) {
    const f=fixture({breaks:{}});f.timeline.events.push({trackIndex:99,startTick:note.startTick,endTick:note.endTick,notes:[note]});
    assert.throws(()=>compile(f),/omission|omitted silent/);
  }
});

test('leading, interior and trailing omitted-score cuts guard orphan ties and expressive holds',()=>{
  for(const originalVisit of [1,3,5]) {
    const f=fixture({scoreOmit:[originalVisit],restVisits:[originalVisit],breaks:{}}),measure=f.timeline.measures[originalVisit-1];
    if(originalVisit<5)f.timeline.events[originalVisit].notes[0].attack=false;
    else f.timeline.events[3].notes[0].endTick=measure.startTick+1;
    assert.throws(()=>compile(f),/sustained|overlaps/);
  }
  const exact=fixture({scoreOmit:[3],restVisits:[3],breaks:{}});assert.doesNotThrow(()=>compile(exact),'a note ending exactly at the omitted rest is safe');
});

test('contiguous musical ties survive but cannot cross either unscored interval kind',()=>{
  const f=fixture({order:[1,2],scoreOmit:[],breaks:{}});
  f.timeline.events[0].notes[0].endTick=1440;Object.assign(f.timeline.events[1].notes[0],{attack:false,tieOriginId:'n0'});
  assert.doesNotThrow(()=>compile(f));
  for(const kind of ['explanation','unmatched-source-rest']) {
    const g=fixture({order:[1,2],scoreOmit:[],breaks:{1:[[kind,2]]}});g.timeline.events=f.timeline.events;
    assert.throws(()=>compile(g),/sustained note/);
  }
});

test('native ambiguous hold evidence guards new intervals even without any omitted score measure',()=>{
  for(const kind of ['explanation','unmatched-source-rest']) {
    const f=fixture({order:[1,2],scoreOmit:[],breaks:{1:[[kind,2]]}});
    f.timeline.ambiguousHoldRanges=[{startTick:0,endTick:1440,openEnded:false}];
    assert.throws(()=>compile(f),/ambiguous expressive/);
    f.timeline.ambiguousHoldRanges=[{startTick:0,endTick:960,openEnded:true}];
    assert.throws(()=>compile(f),/ambiguous expressive/);
    f.timeline.ambiguousHoldRanges=[{startTick:0,endTick:960,openEnded:false}];
    assert.throws(()=>compile(f),/ambiguous expressive/,'the next attack cannot close a marked hold after an inserted recording gap');
    f.timeline.ambiguousHoldRanges=[{startTick:0,endTick:480,openEnded:false}];
    assert.doesNotThrow(()=>compile(f),'a resolved hold ending before the interval is safe');
  }
  const ending=fixture({order:[1],scoreOmit:[],breaks:{1:[['unmatched-source-rest',2]]}});
  ending.timeline.ambiguousHoldRanges=[{startTick:0,endTick:960,openEnded:true}];
  assert.throws(()=>compile(ending),/ambiguous expressive/);
  const contiguous=fixture({order:[1,2],scoreOmit:[],breaks:{}});
  contiguous.timeline.ambiguousHoldRanges=[{startTick:0,endTick:1920,openEnded:true}];
  assert.doesNotThrow(()=>compile(contiguous),'unchanged contiguous music has no artificial cut');
  const old={...ending.plan,format:'musical-visits-and-explanations',explanations:ending.plan.intervals.map(({kind,...interval})=>interval)};
  delete old.intervals;delete old.scoreOmissions;
  assert.doesNotThrow(()=>compile({...ending,plan:old}),'the existing explanation format keeps its prior hold policy');
});

test('ambiguous holds cannot overlap silent score omissions and malformed native hold proof fails closed',()=>{
  const f=fixture({breaks:{}});f.timeline.ambiguousHoldRanges=[{startTick:1800,endTick:2400,openEnded:false}];
  assert.throws(()=>compile(f),/ambiguous expressive.*overlaps/);
  for(const ranges of [undefined,{},[null],[{startTick:0,endTick:Infinity,openEnded:true}],
    [{startTick:1000,endTick:100,openEnded:false}],[{startTick:0,endTick:960}]]) {
    const g=fixture({order:[1,2],scoreOmit:[],breaks:{}});g.timeline.ambiguousHoldRanges=ranges;
    assert.throws(()=>compile(g),/Cannot verify native expressive/);
  }
  for(const proof of [undefined,false,1,'true']) {
    const g=fixture({order:[1,2],scoreOmit:[],breaks:{1:[['unmatched-source-rest',2]]}});g.timeline.ambiguousHoldEvidenceComplete=proof;
    assert.throws(()=>compile(g),/complete expressive hold evidence/,'missing native proof cannot validate interval-only plans');
  }
});

test('repeated and alternate-ending visits preserve occurrence-specific interval references',()=>{
  const f=fixture({order:[1,2,1,3],scoreOmit:[],breaks:{2:[['unmatched-source-rest',1],['explanation',1]]}}),compiled=compile(f);
  assert.equal(compiled.intervals[0].boundary.before.scoreMeasure,1);assert.equal(compiled.intervals[0].boundary.before.occurrence,2);
  assert.equal(planPositionAtTime(compiled,6000).visit.originalVisit,3);assert.equal(planPositionAtTime(compiled,8000).visit.scoreMeasure,3);
  assert.deepEqual(compiled.visits.map(v=>v.startTick),[0,960,1920,2880]);
});

test('strict schemas keep old/new formats separate and reject incomplete or ambiguous interval coverage',()=>{
  const changes=[p=>p.explanations=[],p=>p.version=2,p=>p.scoreOmissions[0].extra=true,p=>delete p.intervals,
    p=>p.intervals[0].kind='rest',p=>delete p.intervals[0].kind,p=>p.intervals[0].startSeconds=NaN,
    p=>p.intervals[0].label='',p=>p.intervals[1].id=p.intervals[0].id,p=>p.intervals[1].endSeconds-=0.1,
    p=>p.intervals[2].startSeconds-=0.1,p=>p.intervals.splice(1,1),p=>p.intervals[1].boundary.before=null,
    p=>p.intervals[1].boundary.before.originalVisit=3,p=>p.intervals=Array(4097).fill(p.intervals[0]),
    p=>p.scoreSha256='wrong',p=>p.recordingId='https://private.example/video',p=>p.musicalVisits[0].anchors.pop()];
  for(const change of changes){const plan=fixture().plan;change(plan);assert.throws(()=>validateTimingPlan(plan),change.toString());}
  const old={...fixture({order:[1,2],scoreOmit:[],breaks:{1:[['explanation',2]]}}).plan,format:'musical-visits-and-explanations'};
  old.explanations=old.intervals.map(({kind,...interval})=>interval);delete old.intervals;delete old.scoreOmissions;
  assert.deepEqual(validateTimingPlan(old),old);assert.equal(timingPlanIntervals(validateTimingPlan(old))[0].kind,undefined);
  assert.throws(()=>validateTimingPlan({...old,scoreOmissions:[]}));assert.throws(()=>validateTimingPlan({...old,intervals:[]}));
});

test('exact internal anchors, source interval edges, final musical endpoint and unclassified suffix are preserved',()=>{
  const f=fixture({prefix:0.1234567890123}),visit=f.plan.musicalVisits[0],internal=visit.startSeconds+0.7777777777777;
  visit.anchors.splice(1,0,{offset480:120,seconds:internal});const compiled=compile(f);
  assert.equal(compiled.visits[0].anchors[1].tick,1200);assert.equal(planTimeAtTick(compiled,1200),internal*1000);
  assert.equal(planPositionAtTime(compiled,internal*1000).tick,1200);
  assert.equal(planTimeAtTick(compiled,1920,'end'),visit.endSeconds*1000);assert.equal(planTimeAtTick(compiled,1920),null);
  assert.equal(planTimeAtTick(compiled,2880),f.plan.musicalVisits[1].startSeconds*1000);
  assert.equal(planTimeAtTick(compiled,3840,'end'),f.plan.musicalVisits[1].endSeconds*1000);
  assert.equal(planPositionAtTime(compiled,compiled.endMs+1).kind,'after');assert.equal(planPositionAtTime(compiled,compiled.endMs+1).tick,3840);
  assert.equal(planIncludesEvent(compiled,{startTick:3840}),false);
  assert.equal(validateTimingPlanDuration(compiled,compiled.endMs),true);assert.equal(validateTimingPlanDuration(compiled.plan,compiled.endMs),true);
  assert.throws(()=>validateTimingPlanDuration(compiled,compiled.endMs-2),/beyond/);
  assert.throws(()=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256:'d'.repeat(64),recordingId}),/score bytes/);
  assert.throws(()=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256,recordingId:'other'}),/recording identity/);
});
