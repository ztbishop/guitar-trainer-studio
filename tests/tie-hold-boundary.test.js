import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {compileTimingPlan} from '../js/explanation-timing.js';

const probe=tapProbe(),classic=probe.at,hash='a'.repeat(64);
function parse(at,tex='. 0.6.2 -.6.2 | r.1 | 2.6.1') {
  const parser=new at.importer.AlphaTexImporter();parser.initFromString(tex,new at.Settings());return parser.readScore();
}
function generate(at,score) {
  const midi=new at.midi.MidiFile(),g=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));
  g.generate();return {cache:g.tickLookup,timeline:buildPlaybackTimeline(g.tickLookup,{score,tempo:score.tempo,ticksPerQuarter:midi.division})};
}
const notes=score=>score.tracks.flatMap(t=>Array.from(t.staves,s=>Array.from(s.bars,b=>Array.from(b.voices,v=>Array.from(v.beats,beat=>Array.from(beat.notes,n=>({measure:b.index+1,voice:v.index,beat:beat.index,string:n.string,fret:n.fret,midi:n.realValue,start:beat.playbackStart,duration:beat.playbackDuration,origin:n.tieOrigin?.id??null,destination:n.tieDestination?.id??null,tied:n.isTieDestination}))))))).flat(5);
function planFor(timeline,{omit=[2],cutAfter=1}={}) {
  const kept=timeline.measures.filter((_,i)=>!omit.includes(i+1));let cursor=0;
  const visits=kept.map((m,i)=>{if(i===cutAfter)cursor+=3;const start=cursor;cursor+=2;return {visit:i+1,originalVisit:m.playbackMeasureIndex+1,scoreMeasure:m.measureNumber,occurrence:m.occurrence,startSeconds:start,endSeconds:cursor,anchors:[{offset480:0,seconds:start},{offset480:480,seconds:cursor}]};});
  const ref=v=>Object.fromEntries(['visit','originalVisit','scoreMeasure','occurrence'].map(k=>[k,v[k]]));
  return {format:'musical-visits-and-intervals',version:1,scoreSha256:hash,sourceSha256:hash,timingSha256:hash,recordingId:'finite-tie',originalPlaybackOrder:timeline.measures.map(m=>m.measureNumber),musicalVisits:visits,
    intervals:[{id:'discussion',kind:'explanation',label:'Discussion',startSeconds:visits[cutAfter-1].endSeconds,endSeconds:visits[cutAfter].startSeconds,boundary:{after:ref(visits[cutAfter-1]),before:ref(visits[cutAfter])}}],
    scoreOmissions:omit.map(visit=>({originalVisit:visit,scoreMeasure:timeline.measures[visit-1].measureNumber,occurrence:timeline.measures[visit-1].occurrence,reason:'unmatched-full-rest'})),repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]}};
}
const compile=(plan,timeline)=>compileTimingPlan(plan,{timeline,scoreSha256:plan.scoreSha256,recordingId:plan.recordingId,durationMs:214000});
function readers(bytes) {
  return [[classic,probe.read(bytes)],[classic,probe.p.JsonConverter.jsObjectToScore(structuredClone(probe.p.JsonConverter.scoreToJsObject(probe.read(bytes))),new classic.Settings())],
    [core,core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings())]];
}

test('a complete plain within-bar tie releases at its written endpoint across classic/core/worker readbacks',()=>{
  const source=parse(classic),bytes=probe.gp(source);
  for(const [at,score] of [[classic,source],...readers(bytes)]) {
    const before=notes(score),{cache,timeline}=generate(at,score);
    assert.deepEqual(notes(score),before);assert.deepEqual(timeline.ambiguousHoldRanges,[]);assert.equal(timeline.ambiguousHoldEvidenceComplete,true);
    assert.deepEqual(timeline.measures.map(m=>m.isFullRest),[false,true,false]);
    assert.deepEqual(timeline.events.flatMap(e=>e.notes).map(n=>[n.attack,n.startTick,n.endTick]),[[true,0,3840],[false,1920,3840],[true,7680,11520]]);
    assert.deepEqual(buildPlaybackTimeline(cache,{score}).events,timeline.events);
    const compiled=compile(planFor(timeline),timeline);assert.equal(compiled.visits.length,2);assert.equal(compiled.intervals.length,1);assert.equal(compiled.visits[0].endTick,3840);
  }
});

test('finite tie proof survives a shorter release, independent chord attacks and repeated native visits',()=>{
  for(const tex of ['. 0.6.4 -.6.4 r.2 | r.1 | 2.6.1','. (0.6 2.5).2 (-.6 3.5).2 | r.1 | 2.6.1',String.raw`. \ro 0.6.2 -.6.2 | \rc 2 r.1 | 2.6.1`]) {
    const score=parse(core,tex),before=notes(score),{timeline}=generate(core,score);
    assert.deepEqual(timeline.ambiguousHoldRanges,[]);assert.deepEqual(notes(score),before);
    for(const event of timeline.events)for(const note of event.notes)if(!note.attack)assert(note.endTick<=timeline.measures[event.playbackMeasureIndex].endTick);
    if(timeline.measures.length===5){assert.deepEqual(timeline.measures.map(m=>m.isFullRest),[false,true,false,true,false]);assert.equal(timeline.events.flatMap(e=>e.notes).filter(n=>!n.attack).length,2);}
  }
});

test('expressive or let-ring marks anywhere in a finite tie chain retain the ambiguous-hold guard',()=>{
  for(const destination of [false,true])for(const field of ['isLetRing','vibrato','bendType','gtsTiedBend']) {
    const score=parse(core),{cache}=generate(core,score),beat=score.tracks[0].staves[0].bars[0].voices[0].beats[destination?1:0];beat.notes[0][field]=1;
    const timeline=buildPlaybackTimeline(cache,{score});assert(timeline.ambiguousHoldRanges.length,field);assert.throws(()=>compile(planFor(timeline),timeline),/ambiguous|silent rest/);
  }
});

test('broken reciprocal, pitch/string, clock and grace evidence cannot discharge a tied hold',()=>{
  for(const mutate of [(a,b)=>{b.tieOrigin=null;},(a,b)=>{a.tieDestination=null;},(a,b)=>{b.fret++;},(a,b)=>{b.string--;},(a,b)=>{b.beat.playbackStart++;},(a,b)=>{b.beat.graceType=1;},(a,b)=>{const ghost=Object.assign(Object.create(Object.getPrototypeOf(b)),b);a.tieDestination=ghost;ghost.tieOrigin=a;},(a,b)=>{a.tieOrigin=b;a.isTieDestination=true;b.tieDestination=a;}]) {
    const score=parse(core),{cache}=generate(core,score),beats=score.tracks[0].staves[0].bars[0].voices[0].beats;mutate(beats[0].notes[0],beats[1].notes[0]);
    const timeline=buildPlaybackTimeline(cache,{score});assert(timeline.ambiguousHoldRanges.length);assert.throws(()=>compile(planFor(timeline),timeline));
  }
});

test('actual ties across a recording break remain sustained and are still rejected',()=>{
  const score=parse(core,'. 0.6.1 | -.6.1 | 2.6.1'),before=notes(score),{timeline}=generate(core,score);
  assert.deepEqual(notes(score),before);assert.deepEqual(timeline.ambiguousHoldRanges,[]);
  assert.equal(timeline.events[0].notes[0].endTick,7680);assert.equal(timeline.events[1].notes[0].attack,false);
  assert.throws(()=>compile(planFor(timeline,{omit:[]}),timeline),/tied or sustained|ambiguous/);
});

test('saved 97483 keeps every native target/tie and accepts all supplied recording intervals',{skip:!process.env.GTS_HOLD_GPX||!process.env.GTS_HOLD_PLAN},()=>{
  const bytes=fs.readFileSync(process.env.GTS_HOLD_GPX),plan=JSON.parse(fs.readFileSync(process.env.GTS_HOLD_PLAN,'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),plan.scoreSha256);
  for(const [at,score] of readers(bytes)) {
    const before=notes(score),{timeline}=generate(at,score),targets=timeline.events.flatMap(e=>e.notes);
    assert.equal(before.length,131);assert.deepEqual(notes(score),before);assert.equal(targets.filter(n=>n.attack).length,128);assert.equal(targets.filter(n=>!n.attack).length,3);assert.deepEqual(timeline.ambiguousHoldRanges,[]);
    assert.deepEqual(targets.filter(n=>n.attack&&n.tieDestinationId).map(n=>[n.startTick,n.endTick,n.midi]),[[16560,19200,56],[44400,46080,50],[48720,49920,52]]);
    const compiled=compile(plan,timeline);assert.equal(compiled.visits.length,16);assert.equal(compiled.intervals.length,8);assert.equal(compiled.explanations.length,6);assert.deepEqual(compiled.plan,plan);
  }
});

test('a completed cross-bar tie releases before a later recording break in each actual repeat pass',()=>{
  for(const [at,score] of [[core,parse(core,'. 0.6.1 | -.6.1 | 2.6.1')],...readers(probe.gp(parse(classic,'. 0.6.1 | -.6.1 | 2.6.1')))]){
    const before=notes(score),{timeline}=generate(at,score);assert.deepEqual(notes(score),before);assert.deepEqual(timeline.ambiguousHoldRanges,[]);
    const compiled=compile(planFor(timeline,{omit:[],cutAfter:2}),timeline);assert.equal(compiled.visits.length,3);assert.equal(timeline.events[0].notes[0].endTick,7680);assert.equal(timeline.events[1].notes[0].attack,false);
    assert.throws(()=>compile(planFor(timeline,{omit:[],cutAfter:1}),timeline),/tied or sustained/);
  }
  const repeated=parse(core,String.raw`. \ro 0.6.1 | -.6.1 | \rc 2 2.6.1`),{timeline}=generate(core,repeated);
  assert.deepEqual(timeline.ambiguousHoldRanges,[]);assert.equal(timeline.events.flatMap(e=>e.notes).filter(n=>!n.attack).length,2);
  const jump=parse(core,String.raw`. 0.6.1 | \ro -.6.1 | \rc 2 2.6.1`),bad=generate(core,jump).timeline;
  assert(bad.ambiguousHoldRanges.length,'a repeat jump into a destination without its actual origin remains ambiguous');
});

test('plain vibrato has a finite native release; let-ring, bends and unknown vibrato values remain guarded',()=>{
  for(const value of [1,2]){
    const score=parse(core),beat=score.tracks[0].staves[0].bars[2].voices[0].beats[0];beat.notes[0].vibrato=value;
    const before=notes(score),{timeline}=generate(core,score);assert.deepEqual(notes(score),before);assert.deepEqual(timeline.ambiguousHoldRanges,[]);
    assert.equal(timeline.events.at(-1).notes[0].hasVibrato,true);assert.equal(timeline.events.at(-1).notes[0].endTick,11520);
    const ordinary=parse(core,'. 0.6.1 | r.1 | 2.6.1'),b=ordinary.tracks[0].staves[0].bars[0].voices[0].beats[0];b.notes[0].vibrato=value;let generated=generate(core,ordinary);assert.deepEqual(generated.timeline.ambiguousHoldRanges,[]);assert.equal(compile(planFor(generated.timeline),generated.timeline).visits.length,2);
    for(const mutate of [n=>n.isLetRing=true,n=>n.bendType=1,n=>n.gtsTiedBend=1,n=>n.vibrato=3]){const s=parse(core,'. 0.6.1 | r.1 | 2.6.1'),note=s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];note.vibrato=value;mutate(note);assert(generate(core,s).timeline.ambiguousHoldRanges.length);}
  }
});


test('saved finite-carry case keeps all bass notes/ties and validates every supplied interval',{skip:!process.env.GTS_FINITE_CARRY_GPX||!process.env.GTS_FINITE_CARRY_PLAN},()=>{
 const bytes=fs.readFileSync(process.env.GTS_FINITE_CARRY_GPX),plan=JSON.parse(fs.readFileSync(process.env.GTS_FINITE_CARRY_PLAN,'utf8'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),plan.scoreSha256);
 for(const [at,score] of readers(bytes)){
  const before=notes(score),{timeline}=generate(at,score),targets=timeline.events.flatMap(e=>e.notes);
  assert.deepEqual(notes(score),before);assert.equal(targets.length,142);assert.equal(targets.filter(n=>!n.attack).length,3);assert.deepEqual(timeline.ambiguousHoldRanges,[]);
  assert(targets.some(n=>n.attack&&n.tieDestinationId&&n.startTick===57120&&n.endTick===61440));assert(targets.some(n=>n.hasVibrato&&n.startTick===44160&&n.endTick===46080));
  assert.deepEqual(compileTimingPlan(plan,{timeline,scoreSha256:plan.scoreSha256,recordingId:plan.recordingId}).plan,plan);
 }
});
