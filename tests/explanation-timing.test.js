import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as native from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {validateTimingPlan,compileTimingPlan,validateTimingPlanDuration,planPositionAtTime,planTimeAtTick,planIncludesEvent} from '../js/explanation-timing.js';

const scoreHash='a'.repeat(64),sourceHash='b'.repeat(64),timingHash='c'.repeat(64),recordingId='test:recording:1';
const ref=visit=>visit?Object.fromEntries(['visit','scoreMeasure','occurrence','originalVisit'].map(key=>[key,visit[key]])):null;
function fixture({order=[1,2],omit=[],breaks={1:[6]},prefix=0}={}) {
  const occurrences=new Map(),musicalVisits=[],gaps=[];let cursor=prefix;
  for(const [index,scoreMeasure] of order.entries()) {
    const occurrence=(occurrences.get(scoreMeasure)??0)+1;occurrences.set(scoreMeasure,occurrence);
    if(omit.includes(index+1))continue;
    const visit=musicalVisits.length+1;
    for(const duration of breaks[visit-1]??[]){gaps.push({boundary:visit-1,startSeconds:cursor,endSeconds:cursor+duration});cursor+=duration;}
    musicalVisits.push({visit,scoreMeasure,occurrence,originalVisit:index+1,startSeconds:cursor,endSeconds:cursor+2,
      anchors:[{offset480:0,seconds:cursor},{offset480:480,seconds:cursor+2}]});cursor+=2;
  }
  for(const duration of breaks[musicalVisits.length]??[]){gaps.push({boundary:musicalVisits.length,startSeconds:cursor,endSeconds:cursor+duration});cursor+=duration;}
  const explanations=gaps.map((gap,index)=>({id:'explanation-'+(index+1),label:'Explanation '+(index+1),startSeconds:gap.startSeconds,endSeconds:gap.endSeconds,
    boundary:{after:ref(musicalVisits[gap.boundary-1]),before:ref(musicalVisits[gap.boundary])}}));
  const plan={format:'musical-visits-and-explanations',version:1,scoreSha256:scoreHash,sourceSha256:sourceHash,timingSha256:timingHash,
    recordingId,originalPlaybackOrder:order,musicalVisits,explanations,repeatResolution:{kind:omit.length?'source-visit-plan':'unchanged',omittedOriginalVisits:omit}};
  occurrences.clear();
  const measures=order.map((measureNumber,index)=>{const occurrence=(occurrences.get(measureNumber)??0)+1;occurrences.set(measureNumber,occurrence);
    return {measureNumber,occurrence,playbackMeasureIndex:index,startTick:index*960,endTick:(index+1)*960};});
  const timeline={ticksPerQuarter:960,endTick:order.length*960,tempoMap:[{tick:0,bpm:120,timeMs:0}],measures,
    events:measures.map(m=>({id:'e'+m.playbackMeasureIndex,startTick:m.startTick,endTick:m.endTick,notes:[{id:'n'+m.playbackMeasureIndex,startTick:m.startTick,endTick:m.endTick,attack:true}]}))};
  return {plan,timeline,durationMs:(cursor+5)*1000};
}
const compile=f=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256:scoreHash,recordingId,durationMs:f.durationMs});

test('independent musical boundaries hold through commentary without stretching either visit',()=>{
  const f=fixture(),compiled=compile(f),copy=structuredClone(f.plan);
  assert.deepEqual(f.plan,copy);assert.deepEqual(compiled.visits.map(v=>[v.startTick,v.endTick,v.startMs,v.endMs]),[[0,960,0,2000],[960,1920,8000,10000]]);
  assert.equal(planTimeAtTick(compiled,960,'end'),2000);assert.equal(planTimeAtTick(compiled,960,'start'),8000);
  assert.equal(planTimeAtTick(compiled,480),1000);assert.equal(planTimeAtTick(compiled,1440),9000);
  assert.equal(planPositionAtTime(compiled,1999).kind,'music');
  const held=planPositionAtTime(compiled,2000);assert.equal(held.kind,'explanation');assert.equal(held.tick,960);assert.equal(held.visit.visit,2);
  assert.equal(planPositionAtTime(compiled,7999).kind,'explanation');assert.equal(planPositionAtTime(compiled,8000).visit.visit,2);
  assert.equal(planPositionAtTime(compiled,8000).kind,'music');assert.equal(planPositionAtTime(compiled,10000).kind,'after');
  assert.equal(planPositionAtTime(compiled,14000).tick,1920,'unclassified tail does not extend final music');
  assert(Object.isFrozen(compiled.plan.musicalVisits[0].anchors));assert.throws(()=>{compiled.visits[0].anchors[0].timeMs=12;});
});

test('introduction, ending, consecutive explanations and unclassified prefix/suffix retain half-open boundaries',()=>{
  const compiled=compile(fixture({breaks:{0:[1,2],1:[3,1],2:[2,4]},prefix:5}));
  assert.equal(compiled.startMs,5000);assert.equal(compiled.endMs,22000);
  assert.equal(planPositionAtTime(compiled,4999).kind,'before');
  assert.equal(planPositionAtTime(compiled,5000).explanation.id,'explanation-1');
  assert.equal(planPositionAtTime(compiled,6000).explanation.id,'explanation-2');
  assert.equal(planPositionAtTime(compiled,8000).kind,'music');
  assert.equal(planPositionAtTime(compiled,10000).explanation.id,'explanation-3');
  assert.equal(planPositionAtTime(compiled,14000).visit.visit,2);
  assert.equal(planPositionAtTime(compiled,16000).explanation.id,'explanation-5');
  assert.equal(planPositionAtTime(compiled,18000).explanation.id,'explanation-6');
  assert.equal(planPositionAtTime(compiled,22000).kind,'after');
  assert.equal(planTimeAtTick(compiled,0),8000,'score start means music start, not introduction');
  assert.equal(planTimeAtTick(compiled,1920,'end'),16000,'score end means music end, not ending commentary');
});

test('explicit repeated visits and alternate-ending order preserve original coordinates and occurrence identity',()=>{
  const f=fixture({order:[1,2,1,3],breaks:{2:[5]}}),compiled=compile(f);
  assert.equal(compiled.explanations[0].boundary.before.scoreMeasure,1);assert.equal(compiled.explanations[0].boundary.before.occurrence,2);
  assert.equal(planPositionAtTime(compiled,9000).visit.originalVisit,3);
  assert.equal(planPositionAtTime(compiled,11000).visit.scoreMeasure,3);
  assert.equal(planIncludesEvent(compiled,{startTick:1920}),true);
  assert.equal(planIncludesEvent(compiled,{startTick:3840}),false);
});

test('only explicitly listed extra repeat visits can be omitted and omitted ticks are not projected',()=>{
  const f=fixture({order:[1,2,1,2,3],omit:[3,4],breaks:{}}),compiled=compile(f);
  assert.deepEqual(compiled.visits.map(v=>v.originalVisit),[1,2,5]);
  assert.equal(planIncludesEvent(compiled,{startTick:1920}),false);assert.equal(planIncludesEvent(compiled,{startTick:3840}),true);
  assert.equal(planTimeAtTick(compiled,1920),null);assert.equal(planTimeAtTick(compiled,2400),null);
  assert.equal(planTimeAtTick(compiled,1920,'end'),4000);assert.equal(planTimeAtTick(compiled,3840),4000);
  assert.equal(planPositionAtTime(compiled,4000).tick,3840);
  for(const change of [p=>p.repeatResolution.omittedOriginalVisits=[],p=>p.repeatResolution.omittedOriginalVisits=[4,3],p=>p.repeatResolution.kind='unchanged']) {
    const p=structuredClone(f.plan);change(p);assert.throws(()=>validateTimingPlan(p));
  }
  assert.throws(()=>validateTimingPlan(fixture({order:[1,2,1,2,3],omit:[1,2],breaks:{}}).plan),/first occurrence/);
});

test('ordinary rests and slow musical spans remain music; no explanation is inferred',()=>{
  const f=fixture({breaks:{}});f.timeline.events[0].isRest=true;f.timeline.events[0].notes=[];
  f.plan.musicalVisits[0].endSeconds=60;f.plan.musicalVisits[0].anchors[1].seconds=60;
  f.plan.musicalVisits[1].startSeconds=60;f.plan.musicalVisits[1].endSeconds=62;
  f.plan.musicalVisits[1].anchors=[{offset480:0,seconds:60},{offset480:480,seconds:62}];f.durationMs=67000;
  const compiled=compile(f);assert.equal(compiled.explanations.length,0);assert.equal(planPositionAtTime(compiled,30000).kind,'music');
});

test('normalized offset480 respects whole-measure duration and preserves fractional timestamps',()=>{
  const f=fixture({breaks:{},prefix:0.1234567890123});
  f.timeline.measures[0].endTick=1440;f.timeline.measures[1].startTick=1440;f.timeline.measures[1].endTick=5280;f.timeline.endTick=5280;
  f.timeline.events=[];
  const time=0.7777777777777;f.plan.musicalVisits[0].anchors.splice(1,0,{offset480:120,seconds:time});
  const compiled=compile(f);assert.equal(compiled.visits[0].anchors[1].tick,360);assert.equal(compiled.visits[0].anchors[1].timeMs,time*1000);
  assert.equal(planTimeAtTick(compiled,360),time*1000);assert.equal(planPositionAtTime(compiled,time*1000).tick,360);
  assert.equal(compiled.plan.musicalVisits[0].startSeconds,0.1234567890123);
});

test('schema, identity, anchors and complete explanation coverage reject ambiguous input',()=>{
  const changes=[p=>p.version=2,p=>p.format='legacy',p=>p.syncPoints=[],p=>p.scoreSha256='bad',p=>p.sourceSha256='x'.repeat(64),
    p=>p.recordingId='https://private.example/video?token=secret',p=>p.recordingId='C:\\private.wav',
    p=>p.musicalVisits[0].anchors.shift(),p=>p.musicalVisits[0].anchors[0].offset480=1,
    p=>p.musicalVisits[0].anchors[1].seconds=1,p=>p.musicalVisits[0].anchors.push({offset480:480,seconds:2}),
    p=>p.musicalVisits[1].occurrence=2,p=>p.musicalVisits[1].originalVisit=1,
    p=>p.explanations=[],p=>p.explanations[0].endSeconds=7,p=>p.explanations[0].startSeconds=1,
    p=>p.explanations[0].boundary.after.visit=2,p=>p.explanations[0].boundary.before=null,
    p=>p.explanations[0].label='',p=>p.explanations.push(structuredClone(p.explanations[0])),
    p=>p.originalPlaybackOrder=Array(4097).fill(1),p=>p.musicalVisits=Array(4097).fill(p.musicalVisits[0]),
    p=>delete p.originalPlaybackOrder[0],p=>p.explanations[0].startSeconds=NaN];
  for(const change of changes){const p=fixture().plan;change(p);assert.throws(()=>validateTimingPlan(p),change.toString());}
  const f=fixture();assert.throws(()=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256:'d'.repeat(64),recordingId}),/score bytes/);
  assert.throws(()=>compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256:scoreHash,recordingId:'other'}),/recording identity/);
  f.timeline.measures[1].measureNumber=3;assert.throws(()=>compile(f),/playback order/);
});

test('duration is checked against actual media and may be checked after structural compilation',()=>{
  const f=fixture(),compiled=compileTimingPlan(f.plan,{timeline:f.timeline,scoreSha256:scoreHash,recordingId});
  assert.equal(validateTimingPlanDuration(compiled,10000),true);assert.equal(validateTimingPlanDuration(compiled.plan,10000),true);
  assert.throws(()=>validateTimingPlanDuration(compiled,9998),/beyond/);assert.throws(()=>compile({...f,durationMs:9000}),/beyond/);
  for(const duration of [0,-1,NaN,Infinity])assert.throws(()=>validateTimingPlanDuration(compiled,duration));
});

test('sustains and ties crossing commentary or omitted traversal reject; contiguous musical ties remain valid',()=>{
  const f=fixture({breaks:{}});f.timeline.events[0].notes[0].endTick=1440;
  f.timeline.events[1].notes[0]={id:'tie',startTick:960,endTick:1440,attack:false,tieOriginId:'n0',attackNoteId:'n0'};
  assert.doesNotThrow(()=>compile(f));
  const g=fixture();g.timeline.events=f.timeline.events;assert.throws(()=>compile(g),/sustained note/);
  const h=fixture({order:[1,2,1,2,3],omit:[3,4],breaks:{}});h.timeline.events[1].notes[0].endTick=2200;
  assert.throws(()=>compile(h),/sustained note/);
  const incoming=fixture();incoming.timeline.events[1].notes[0].attack=false;incoming.timeline.events[1].notes[0].tieOriginId='missing';
  assert.throws(()=>compile(incoming),/sustained note/);
});

function nativeTimeline(score,settings=new native.Settings()) {
  const midi=new native.midi.MidiFile(),generator=new native.midi.MidiFileGenerator(score,settings,new native.midi.AlphaSynthMidiFileHandler(midi));
  generator.generate();return buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division});
}

test('native repeat and alternate-ending traversal is validated instead of assuming written measure order',()=>{
  const settings=new native.Settings(),parser=new native.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . \ro 0.6.1 | \ae 1 \rc 2 2.6.1 | \ae 2 3.6.1`,settings);
  const timeline=nativeTimeline(parser.readScore(),settings),f=fixture({order:[1,2,1,3],breaks:{2:[3]}});f.timeline=timeline;
  const compiled=compile(f);assert.deepEqual(compiled.visits.map(v=>v.startTick),timeline.measures.map(m=>m.startTick));
  assert.equal(compiled.explanations[0].boundary.before.occurrence,2);
});

const evidence=process.env.GTS_EXPLANATION_EVIDENCE,original=process.env.GTS_EXPLANATION_ORIGINAL;
test('external verified lesson retains all 77 musical visits, 20 explanations and 106 supplied times',{skip:!evidence||!original},()=>{
  const file=fs.statSync(evidence).isDirectory()?path.join(evidence,'verified-preparation.json'):evidence;
  const preparation=JSON.parse(fs.readFileSync(file,'utf8')),bytes=fs.readFileSync(original),actualHash=createHash('sha256').update(bytes).digest('hex');
  const keys=['visit','scoreMeasure','occurrence','originalVisit','startSeconds','endSeconds'];
  const plan={format:'musical-visits-and-explanations',version:1,scoreSha256:preparation.score.sha256,
    sourceSha256:preparation.source.sha256,timingSha256:preparation.timing.sha256,recordingId:preparation.recording.id,
    originalPlaybackOrder:preparation.originalPlaybackOrder,
    musicalVisits:preparation.musicalVisits.map(v=>({...Object.fromEntries(keys.map(key=>[key,v[key]])),anchors:v.anchors.map(a=>({offset480:a.offset480,seconds:a.seconds}))})),
    explanations:preparation.explanations.map(e=>({id:e.id,label:e.label,startSeconds:e.startSeconds,endSeconds:e.endSeconds,boundary:e.boundary})),
    repeatResolution:{kind:'source-visit-plan',omittedOriginalVisits:preparation.repeatDifference.extraOriginalVisits.map(v=>v.visit)}};
  const settings=new native.Settings(),score=native.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),settings),timeline=nativeTimeline(score,settings);
  const compiled=compileTimingPlan(plan,{timeline,scoreSha256:actualHash,recordingId:preparation.recording.id,durationMs:666000});
  assert.equal(timeline.measures.length,81);assert.equal(compiled.visits.length,77);assert.equal(compiled.explanations.length,20);
  assert.deepEqual(compiled.plan.repeatResolution.omittedOriginalVisits,[50,51,52,53]);
  assert.equal(new Set([...compiled.visits.flatMap(v=>v.anchors.map(a=>a.timeMs)),...compiled.explanations.flatMap(e=>[e.startMs,e.endMs])]).size,106);
  assert.deepEqual(compiled.visits.filter(v=>[67,68,69,70,71,72].includes(v.scoreMeasure)).map(v=>v.scoreMeasure),[67,68,69,67,68,69,70,71,70,71,72]);
  assert.equal(compiled.visits.at(-1).startMs,645.4191069999994*1000);assert.equal(compiled.visits.at(-1).endMs,648.3715609999994*1000);
  assert.equal(planPositionAtTime(compiled,650000).kind,'after');
  for(const visit of compiled.visits)for(const anchor of visit.anchors)assert.equal(planTimeAtTick(compiled,anchor.tick,anchor.tick===visit.endTick?'end':'start'),anchor.timeMs);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),actualHash);
});
