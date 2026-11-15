import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';

const probe=tapProbe(),a=probe.at;
function fixture(){
 const m=a.model,score=new m.Score(),track=new m.Track(),staff=new m.Staff();score.addTrack(track);track.addStaff(staff);
 staff.stringTuning=new m.Tuning('Test',[64,57,54,50,45,38],false);
 for(let i=0;i<3;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),upper=new m.Voice(),lower=new m.Voice();
  if(!i){master.timeSignatureNumerator=2;master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,124,2,false));}
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(upper);bar.addVoice(lower);
  const beat=(voice,duration)=>{const b=new m.Beat();voice.addBeat(b);b.duration=duration;b.isEmpty=false;return b;};
  const note=(b,string,fret)=>{const n=new m.Note();n.string=string;n.fret=fret;b.addNote(n);return n;};
  if(!i){
   for(let j=0;j<3;j++)beat(upper,m.Duration.Eighth);
   const b=beat(upper,m.Duration.Eighth);
   for(const [string,fret] of [[1,2],[3,0],[4,0],[5,2],[6,2]]){
    const n=note(b,string,fret);n.isStaccato=true;n.gtsSlidePlayback=1;
    if(string===1)n.slideOutType=m.SlideOutType.OutUp;if(string===4)n.slideOutType=m.SlideOutType.Shift;
   }
   const empty=new m.Beat();empty.isEmpty=true;empty.duration=m.Duration.Whole;lower.addBeat(empty);
  }else{
   note(beat(upper,m.Duration.Whole),4,5);const n=note(beat(lower,m.Duration.Whole),1,5);
   if(i===1){n.slideInType=m.SlideInType.IntoFromBelow;n.gtsSlidePlayback=2;}
   else n.isTieDestination=true;
  }
 }
 score.finish(new a.Settings());return score;
}
function playback(at,score,smf=false){
 const settings=new at.Settings(),midi=new at.midi.MidiFile(),handler=new at.midi.AlphaSynthMidiFileHandler(midi,smf),g=new at.midi.MidiFileGenerator(score,settings,handler);g.generate();
 const timeline=buildPlaybackTimeline(g.tickLookup,{tempo:score.tempo});
 return {midi,notes:Array.from(midi.events,e=>e instanceof at.midi.NoteOnEvent?[e.tick,e.noteKey,1]:e instanceof at.midi.NoteOffEvent?[e.tick,e.noteKey,0]:null).filter(Boolean),
  bars:timeline.measures.map(b=>[b.startTick,b.endTick]),practice:timeline.events.flatMap(e=>e.notes.map(n=>[e.startTick,n.midi,n.sourceString]))};
}
const has=(data,tick,key,on)=>data.notes.some(e=>Math.abs(e[0]-tick)<1e-8&&e[1]===key&&e[2]===on);
test('slide profiles survive GP, worker score transport and both bundles with fractional note steps',()=>{
 const gp=probe.gp(fixture()),s=probe.read(gp),codec=probe.p.JsonConverter,settings=new core.Settings();
 const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(s)),new a.Settings());
 const coreRead=bytes=>core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),settings);
 const reexport=coreRead(new core.exporter.Gp7Exporter().export(coreRead(gp),settings));
 const expected=playback(a,s),xml=probe.xml(probe.gp(s));assert.equal([...xml.matchAll(/name="GtsSlidePlayback"/g)].length,6);
 for(const [library,model] of [[a,worker],[a,probe.read(probe.gp(s))],[core,reexport]]){
  const bars=model.tracks[0].staves[0].bars,chord=bars[0].voices[0].beats[3].notes,tied=bars[1].voices[1].beats[0].notes[0];
  assert(chord.every(n=>n.gtsSlidePlayback===1&&n.isStaccato));assert.equal(chord[0].slideOutType,library.model.SlideOutType.OutUp);
  assert.equal(chord[2].slideTarget.realValue,59);assert.equal(tied.gtsSlidePlayback,2);assert.equal(tied.tieDestination.gtsSlidePlayback,0);
  const actual=playback(library,model);assert.deepEqual(actual.notes,expected.notes);assert.deepEqual(actual.bars,expected.bars);assert.deepEqual(actual.practice,expected.practice);
 }
 assert(has(expected,1546.5,56,1)&&has(expected,1551,56,0));
 assert(has(expected,1721.6,41,1)&&has(expected,1820.8,42,1)&&has(expected,1920,43,1)&&has(expected,9600,43,0));
 assert(!has(expected,5760,43,1));
 const workerMidi=codec.jsObjectToMidiFile(structuredClone(codec.midiFileToJsObject(expected.midi)));
 assert(Array.from(workerMidi.events).some(e=>e.tick===1546.5&&e.noteKey===56));
});
test('ordinary GP keeps its native slide playback and SMF export does not get fractional source steps',()=>{
 const s=probe.read(probe.gp(fixture())),smf=playback(a,s,true);assert(smf.notes.every(x=>Number.isInteger(x[0])));
 const marked=playback(a,s);for(const bar of s.tracks[0].staves[0].bars)for(const v of bar.voices)for(const b of v.beats)for(const n of b.notes)n.gtsSlidePlayback=0;
 const stock=playback(a,s);assert.deepEqual(stock.bars,marked.bars);assert.deepEqual(stock.practice,marked.practice);
 assert(!has(stock,1546.5,56,1)&&!has(stock,1721.6,41,1));assert(has(stock,1920,43,1));
});
