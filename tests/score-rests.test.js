import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {compileTimingPlan} from '../js/explanation-timing.js';
import {intervalLesson} from './lesson-import-interval-fixture.js';

const probe=tapProbe(),classic=probe.at;
function parse(at,tex='. r.1 | 0.6.1 | r.1 | 2.6.1 | r.1 | 3.6.1 | r.1') {
  const parser=new at.importer.AlphaTexImporter();parser.initFromString(tex,new at.Settings());return parser.readScore();
}
function generate(at,score) {
  const midi=new at.midi.MidiFile(),generator=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));
  generator.generate();return {cache:generator.tickLookup,timeline:buildPlaybackTimeline(generator.tickLookup,{score,ticksPerQuarter:midi.division,tempo:score.tempo})};
}
const flags=timeline=>Array.from(timeline.measures,measure=>measure.isFullRest);
const beatAt=(score,index=0)=>score.tracks[0].staves[0].bars[index].voices[0].beats[0];
function addVoice(at,bar,{sounding=false,empty=false}={}) {
  const voice=new at.model.Voice();bar.addVoice(voice);
  if(empty)return voice;
  const beat=new at.model.Beat();beat.duration=at.model.Duration.Whole;voice.addBeat(beat);
  if(sounding){const note=new at.model.Note();note.string=6;note.fret=3;beat.addNote(note);}
  return voice;
}
function addStaff(at,score,track,soundingBar=-1) {
  const staff=new at.model.Staff();track.addStaff(staff);staff.stringTuning=new at.model.Tuning('Test',[64,59,55,50,45,40],true);
  for(let index=0;index<score.masterBars.length;index++){const bar=new at.model.Bar();staff.addBar(bar);addVoice(at,bar,{sounding:index===soundingBar});}
  return staff;
}

test('native leading, interior, retained and trailing rests have detached proof in classic/core and worker score roundtrip',()=>{
  const source=parse(classic),bytes=probe.gp(source),worker=probe.p.JsonConverter.jsObjectToScore(
    structuredClone(probe.p.JsonConverter.scoreToJsObject(probe.read(bytes))),new classic.Settings());
  for(const [at,score] of [[classic,source],[classic,probe.read(bytes)],[classic,worker],[core,core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings())]]) {
    const {cache,timeline}=generate(at,score);assert.deepEqual(flags(timeline),[true,false,true,false,true,false,true]);
    assert.deepEqual(timeline.ambiguousHoldRanges,[]);assert.equal(timeline.measures[0].startTick,0);
    assert.equal(timeline.ambiguousHoldEvidenceComplete,true);
    assert.equal(timeline.measures.at(-1).endTick,26880);
    assert.deepEqual(flags(buildPlaybackTimeline(cache)),flags(timeline),'native score backlink is a supported fallback');
    assert.equal(typeof timeline.measures[0].isFullRest,'boolean');assert.equal(Object.hasOwn(timeline.measures[0],'score'),false);
  }
});

test('full silence is checked across every track, staff and voice, including hidden or muted tracks',()=>{
  for(const layer of ['track','staff','voice']) {
    const score=parse(core,'. r.1 | r.1');
    if(layer==='track') {
      const track=new core.model.Track();score.addTrack(track);track.playbackInfo.isMute=true;track.isVisible=false;
      addStaff(core,score,track,0);
    } else if(layer==='staff')addStaff(core,score,score.tracks[0],0);
    else score.tracks[0].staves[0].bars.forEach((bar,index)=>addVoice(core,bar,{sounding:index===0}));
    score.finish(new core.Settings());
    assert.deepEqual(flags(generate(core,score).timeline),[false,true],layer);
  }
});

test('active rest voices require complete coverage while native unused extra voices do not fabricate sound',()=>{
  const score=parse(core,'. r.2 r.2 | r.1');
  for(const bar of score.tracks[0].staves[0].bars){addVoice(core,bar);addVoice(core,bar,{empty:true});}
  score.finish(new core.Settings());const {cache}=generate(core,score);
  assert.deepEqual(flags(buildPlaybackTimeline(cache)),[true,true]);
  beatAt(score).playbackDuration=100;
  assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false,'a gap in any active rest voice rejects');
});

test('missing native structure or explicit full-rest evidence cannot prove a silent measure',()=>{
  for(const mutate of [score=>score.tracks[0].staves[0].bars[0].voices.splice(0),
    score=>score.tracks[0].staves[0].bars.splice(0,1),score=>{beatAt(score).graceType=undefined;},
    score=>{beatAt(score).notes=undefined;}]) {
    const score=parse(core,'. r.1 | 0.6.1'),{cache}=generate(core,score);mutate(score);
    // Keep the normalization lookup independent of the deliberately damaged
    // silent native bar; the following sounding bar remains ordinary evidence.
    cache.masterBars[0].firstBeat=null;
    assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false);
  }
  const {cache}=generate(core,parse(core,'. r.1'));
  cache.masterBars[0].masterBar.score=null;assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false);
});

test('dead, hidden, grace and unsupported notes cannot become verified rests',()=>{
  for(const kind of ['dead','hidden','grace','unsupported']) {
    const score=parse(core,'. 0.6.1 | r.1'),{cache}=generate(core,score),beat=beatAt(score),note=beat.notes[0];
    if(kind==='dead')note.isDead=true;
    if(kind==='hidden'){note.isVisible=false;beat.isEmpty=true;}
    if(kind==='grace')beat.graceType=core.model.GraceType.BeforeBeat;
    if(kind==='unsupported')Object.defineProperty(note,'realValue',{value:NaN});
    assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false,kind);
  }
  for(const effect of ['deadSlapped','isLetRing','fermata','golpe','vibrato']) {
    const score=parse(core,'. r.1'),{cache}=generate(core,score);beatAt(score)[effect]=true;
    assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false,effect);
  }
});

test('before-beat grace stealing time from a rest and notes extending over a bar reject silence',()=>{
  const score=parse(core,'. r.1 | 0.6.1'),{cache}=generate(core,score),beat=beatAt(score,1);
  beat.playbackStart=-120;beat.playbackDuration=240;beat.graceType=core.model.GraceType.BeforeBeat;
  assert.equal(buildPlaybackTimeline(cache).measures[0].isFullRest,false);
  const held=parse(core,'. 0.6.1 | r.1'),generated=generate(core,held);
  beatAt(held).playbackDuration=4800;
  assert.equal(buildPlaybackTimeline(generated.cache).measures[1].isFullRest,false);
});

test('unsupported pedal, simile, raw note and grace evidence cannot authorize new interval plans',()=>{
  for(const mutate of [score=>score.tracks[0].staves[0].bars[0].sustainPedals.push({}),
    score=>{score.tracks[0].staves[0].bars[0].simileMark=1;},
    score=>{beatAt(score,1).notes[0].beat=null;},score=>{beatAt(score,1).graceType=99;}]) {
    const score=parse(core),{cache}=generate(core,score);mutate(score);
    cache.masterBars.forEach(bar=>{bar.firstBeat=null;});
    assert.equal(buildPlaybackTimeline(cache).ambiguousHoldEvidenceComplete,false);
  }
});

test('let-ring, ties and expressive playback hold evidence survives silent bars until a fresh same-string attack',()=>{
  for(const field of ['isLetRing','isTieDestination','gtsTiedBend','gtsFallingTie','gtsSourceArticulation','gtsSlidePlayback','gtsTappedHarmonicTicks']) {
    const score=parse(core,'. 0.6.1 | r.1 | 2.6.1 | r.1'),{cache}=generate(core,score);
    beatAt(score).notes[0][field]=field==='gtsTappedHarmonicTicks'?960:1;
    const timeline=buildPlaybackTimeline(cache);
    assert.deepEqual(flags(timeline),[false,false,false,true],field);
    assert.deepEqual(timeline.ambiguousHoldRanges,[{startTick:0,endTick:7680,openEnded:false}],field);
    assert.equal(timeline.events[0].notes[0].endTick,3840,'safety evidence does not stretch graded duration');
  }
});

test('other strings and repeat visits do not discharge an unresolved held technique',()=>{
  const score=parse(core,'. 0.6.1 | r.1 | 0.5.1 | r.1'),{cache}=generate(core,score);
  beatAt(score).notes[0].isLetRing=true;
  const timeline=buildPlaybackTimeline(cache);
  assert.deepEqual(flags(timeline),[false,false,false,false]);
  assert.deepEqual(timeline.ambiguousHoldRanges,[{startTick:0,endTick:15360,openEnded:true}]);
  const repeated=parse(core,String.raw`. \ro r.1 | \rc 2 0.6.1 | r.1`),playback=generate(core,repeated);
  assert.deepEqual(flags(playback.timeline),[true,false,true,false,true]);
  assert.deepEqual(playback.timeline.measures.map(measure=>measure.occurrence),[1,1,2,2,1]);
  const voiced=parse(core,'. 0.6.1 | r.1 | r.1 | r.1');
  voiced.tracks[0].staves[0].bars.forEach((bar,index)=>addVoice(core,bar,{sounding:index===2}));voiced.finish(new core.Settings());
  const generated=generate(core,voiced);beatAt(voiced).notes[0].isLetRing=true;
  assert.equal(buildPlaybackTimeline(generated.cache).measures[3].isFullRest,false,'a separate voice cannot discharge the held voice');
});

test('real native full-rest proof permits only declared silent omissions while retaining the ordinary rest',()=>{
  const score=parse(classic),plan=intervalLesson({scoreBytes:probe.gp(score)}).timingPlan,{cache,timeline}=generate(classic,score);
  const options={timeline,scoreSha256:plan.scoreSha256,recordingId:plan.recordingId,durationMs:15000};
  const compiled=compileTimingPlan(plan,options);
  assert.deepEqual(compiled.visits.map(visit=>visit.originalVisit),[2,4,5,6]);
  assert.deepEqual(compiled.visits.map(visit=>visit.startTick),[3840,11520,15360,19200]);
  beatAt(score,1).notes[0].isLetRing=true;
  assert.throws(()=>compileTimingPlan(plan,{...options,timeline:buildPlaybackTimeline(cache)}),/silent rest|ambiguous/);
});

test('native expressive hold evidence rejects an inserted source blank even without any score omission',()=>{
  const score=parse(core,'. 0.6.1 | 2.6.1'),{cache}=generate(core,score),hash='a'.repeat(64);
  const visits=[0,1].map(index=>({visit:index+1,scoreMeasure:index+1,occurrence:1,originalVisit:index+1,
    startSeconds:index?3:0,endSeconds:index?5:2,anchors:[{offset480:0,seconds:index?3:0},{offset480:480,seconds:index?5:2}]}));
  const ref=visit=>Object.fromEntries(['visit','scoreMeasure','occurrence','originalVisit'].map(key=>[key,visit[key]]));
  const plan={format:'musical-visits-and-intervals',version:1,scoreSha256:hash,sourceSha256:hash,timingSha256:hash,recordingId:'native-hold',
    originalPlaybackOrder:[1,2],musicalVisits:visits,scoreOmissions:[],repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]},
    intervals:[{id:'blank',kind:'unmatched-source-rest',label:'Source blank',startSeconds:2,endSeconds:3,boundary:{after:ref(visits[0]),before:ref(visits[1])}}]};
  const compile=()=>compileTimingPlan(plan,{timeline:buildPlaybackTimeline(cache),scoreSha256:hash,recordingId:'native-hold',durationMs:6000});
  assert.equal(compile().intervals.length,1,'ordinary finite note ends at the boundary safely');
  beatAt(score).notes[0].isLetRing=true;
  assert.throws(compile,/ambiguous expressive/,'the next attack cannot terminate ringing until after the inserted recording time');
});
