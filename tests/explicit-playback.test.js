import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';

const probe=tapProbe(),a=probe.at;
function fixture(){
 const m=a.model,s=new m.Score(),track=new m.Track(),staff=new m.Staff();s.addTrack(track);track.addStaff(staff);staff.stringTuning=new m.Tuning('Test',[64,59,55,50,45,40],false);
 for(let i=0;i<4;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),upper=new m.Voice();
  if(i===1)master.gtsPerformedBarTicks=3360;
  if(i===2){master.timeSignatureNumerator=7;master.timeSignatureDenominator=8;master.gtsPerformedBarTicks=3840;master.isRepeatStart=true;master.repeatCount=2;}
  s.addMasterBar(master);staff.addBar(bar);bar.addVoice(upper);
  function note(v,d,string){const b=new m.Beat(),n=new m.Note();v.addBeat(b);b.duration=d;b.isEmpty=false;n.string=string;n.fret=0;b.addNote(n);return n;}
  for(let j=0;j<(i===1||i===2?7:8);j++){
   const n=note(upper,m.Duration.Eighth,i===0&&j===0?1:2);
   if(i===0&&j===0){n.isLetRing=true;n.gtsFineBendMidpoint=12;n.addBendPoint(new m.BendPoint(0,0));n.addBendPoint(new m.BendPoint(60,1));}
  }
  const lower=new m.Voice();bar.addVoice(lower);
  if(i===2)for(let j=0;j<2;j++)note(lower,m.Duration.Half,3);
  else {const empty=new m.Beat();empty.isEmpty=true;empty.duration=m.Duration.Whole;lower.addBeat(empty);}
 }
 s.finish(new a.Settings());return s;
}
const bent=s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
function performance(at,s){
 const settings=new at.Settings(),midi=new at.midi.MidiFile(),handler=new at.midi.AlphaSynthMidiFileHandler(midi),g=new at.midi.MidiFileGenerator(s,settings,handler);g.generate();
 const midiEvents=Array.from(midi.tracks[0].events),timeline=buildPlaybackTimeline(g.tickLookup,{tempo:s.tempo});
 return {bars:Array.from(g.tickLookup.masterBars,b=>[b.masterBar.index+1,b.start,b.end]),timeline:timeline.measures.map(b=>[b.startTick,b.endTick]),
  bends:midiEvents.filter(e=>e instanceof at.midi.NoteBendEvent&&e.noteKey===40).map(e=>[e.tick,e.value]),
  midi:midiEvents.flatMap(e=>e instanceof at.midi.NoteOnEvent?[[e.tick,'on',e.noteKey,e.noteVelocity]]:e instanceof at.midi.NoteOffEvent?[[e.tick,'off',e.noteKey]]:[])};
}
test('both bundles preserve fine-bend engraving and explicit repeated bar clocks across GP and worker transport',()=>{
 const bytes=probe.gp(fixture()),s=probe.read(bytes),codec=probe.p.JsonConverter;
 const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(s)),new a.Settings());
 const settings=new core.Settings(),read=bytes=>core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),settings);
 const moduleScore=read(bytes),moduleAgain=read(new core.exporter.Gp7Exporter().export(moduleScore,settings));
 const expected=performance(a,s);
 assert.deepEqual(expected.bars,[[1,0,3840],[2,3840,7200],[3,7200,11040],[3,11040,14880],[4,14880,18720]]);
 assert.deepEqual(expected.timeline,expected.bars.map(b=>b.slice(1)));
 for(const [at,score] of [[a,worker],[a,probe.read(probe.gp(s))],[core,moduleAgain]]){
  const n=bent(score);assert(n.isLetRing);assert.equal(n.gtsFineBendMidpoint,12);assert.equal(n.bendPoints.at(-1).value,1);
  assert.equal(score.masterBars[2].timeSignatureNumerator,7);assert.equal(score.masterBars[2].timeSignatureDenominator,8);
  assert.deepEqual(performance(at,score),expected);
 }
 const xml=probe.xml(probe.gp(s));assert.match(xml,/<Property name="BendMiddleValue">\s*<Float>12<\/Float>/);
 assert.match(xml,/<GtsPerformedBarTicks>3360<\/GtsPerformedBarTicks>/);assert.match(xml,/<GtsPerformedBarTicks>3840<\/GtsPerformedBarTicks>/);
 assert(expected.midi.some(e=>e[0]===480&&e[1]==='off'&&e[2]===40));
 assert(expected.bends.some(([tick,value])=>tick===480&&value===2281701376));
 assert.deepEqual(expected.midi.filter(e=>e[2]===50&&e[1]==='off').map(e=>e[0]),[9120,11040,12960,14880]);
});
test('unmarked playback stays native and a forged clock cannot alter the timeline',()=>{
 const bytes=probe.gp(fixture()),s=probe.read(bytes),ordinary=probe.read(bytes);bent(ordinary).gtsFineBendMidpoint=0;
 const marked=performance(a,s),plain=performance(a,ordinary);
 assert(plain.bends.some(([tick,value])=>tick===480&&value===2214592512));
 assert(plain.midi.some(e=>e[0]>480&&e[1]==='off'&&e[2]===40));
 assert.deepEqual(plain.midi.filter(e=>e[2]!==40),marked.midi.filter(e=>e[2]!==40));
 const xml=probe.xml(bytes);
 assert.throws(()=>probe.read(probe.pack(xml.replace('<GtsPerformedBarTicks>3840</GtsPerformedBarTicks>','<GtsPerformedBarTicks>3360</GtsPerformedBarTicks>'))),/explicit GP measure playback length/);
 assert.throws(()=>probe.read(probe.pack(xml.replace('<GtsPerformedBarTicks>3840</GtsPerformedBarTicks>','<GtsPerformedBarTicks>4294967295</GtsPerformedBarTicks>'))),/explicit GP measure playback length/);
});
test('a marked fretted whole note in 6/8 preserves the clock through GP and worker readback',()=>{
 const m=a.model,score=new m.Score(),track=new m.Track(),staff=new m.Staff();
 score.addTrack(track);track.addStaff(staff);staff.stringTuning=new m.Tuning('Test',[64,59,55,50,45,40],false);
 for(let i=0;i<3;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice(),beat=new m.Beat(),note=new m.Note();
  if(i===1){master.timeSignatureNumerator=6;master.timeSignatureDenominator=8;master.gtsPerformedBarTicks=3840;}
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voice.addBeat(beat);beat.duration=m.Duration.Whole;beat.isEmpty=false;
  note.string=i===1?2:1;note.fret=0;beat.addNote(note);
 }
 score.finish(new a.Settings());
 const bytes=probe.gp(score),classic=probe.read(bytes),codec=probe.p.JsonConverter;
 const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(classic)),new a.Settings());
 const moduleScore=core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings());
 for(const [at,read] of [[a,classic],[a,worker],[core,moduleScore]]){
  const actual=read.masterBars[1], result=performance(at,read);
  assert.deepEqual([actual.timeSignatureNumerator,actual.timeSignatureDenominator,actual.gtsPerformedBarTicks],[6,8,3840]);
  assert.deepEqual(result.bars,[[1,0,3840],[2,3840,7680],[3,7680,11520]]);
  assert(result.midi.some(e=>e[0]===3840&&e[1]==='on'&&e[2]===45));
  assert(result.midi.some(e=>e[0]===7680&&e[1]==='off'&&e[2]===45));
 }
 classic.tracks[0].staves[0].bars[1].voices[0].beats[0].notes=[];
 assert.throws(()=>classic.finish(new a.Settings()),/Invalid explicit GP measure playback length/);
});
test('swung grace marker fixes the adjacent eighths and the held release in both readers',()=>{
 const m=a.model,score=new m.Score(),track=new m.Track(),staff=new m.Staff(),master=new m.MasterBar(),bar=new m.Bar(),upper=new m.Voice(),lower=new m.Voice();
 score.addTrack(track);track.addStaff(staff);track.playbackInfo.program=25;staff.stringTuning=new m.Tuning('Test',[64,59,55,50,45,40],false);
 score.addMasterBar(master);master.tripletFeel=m.TripletFeel.Triplet8th;staff.addBar(bar);bar.addVoice(upper);bar.addVoice(lower);
 function beat(v,d,notes){const b=new m.Beat();v.addBeat(b);b.duration=d;b.isEmpty=false;for(const [string,fret] of notes){const n=new m.Note();n.string=string;n.fret=fret;b.addNote(n);}return b;}
 for(let i=0;i<3;i++)beat(upper,m.Duration.Eighth,[[3,0]]);
 const grace=beat(upper,m.Duration.Quarter,[[4,5],[5,5]]);grace.graceType=m.GraceType.OnBeat;
 grace.notes[0].isHammerPullOrigin=true;for(const n of grace.notes)n.gtsSourceArticulation=32;
 const main=beat(upper,m.Duration.Eighth,[[4,6],[5,5]]);main.notes[1].isTieDestination=true;
 const end=beat(upper,m.Duration.Half,[[4,6],[5,5]]);for(const n of end.notes)n.isTieDestination=true;
 beat(lower,m.Duration.Whole,[[1,0]]);score.finish(new a.Settings());
 const bytes=probe.gp(score),classic=probe.read(bytes),codec=probe.p.JsonConverter;
 const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(classic)),new a.Settings());
 const moduleScore=core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings());
 for(const [at,read] of [[a,classic],[a,worker],[core,moduleScore]]){
  const marked=read.tracks[0].staves[0].bars[0].voices[0].beats[3];
  assert.deepEqual(Array.from(marked.notes,n=>n.gtsSourceArticulation),[32,32]);
  const events=performance(at,read).midi;
  assert(events.some(e=>e[0]===1600&&e[1]==='on'&&e[2]===64));
  assert(events.some(e=>e[0]===3840&&e[1]==='off'&&e[2]===64));
  assert(events.some(e=>e[0]===1720&&e[1]==='on'&&e[2]===61));
  assert(events.some(e=>e[0]===3840&&e[1]==='off'&&e[2]===40));
 }
 for(const n of classic.tracks[0].staves[0].bars[0].voices[0].beats[3].notes)n.gtsSourceArticulation=0;
 assert(performance(a,classic).midi.some(e=>e[0]===1440&&e[1]==='on'&&e[2]===64));
});
