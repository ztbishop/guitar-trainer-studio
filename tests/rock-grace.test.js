import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0, end) + 'exports.probe={JsonConverter};' + code.slice(end), context);
const classic = context.alphaTab;

function fixture() {
 const {model:m}=classic;
 const score=new m.Score(), track=new m.Track(), staff=new m.Staff();
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program=30;
 track.playbackInfo.secondaryChannel=1;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 for(let i=0;i<9;i++){
  const master=new m.MasterBar(), bar=new m.Bar(), voice=new m.Voice();
  score.addMasterBar(master);
  staff.addBar(bar);
  bar.addVoice(voice);
  if(i===0)master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,150,2,true));
  function beat(duration,fret,kind=0) {
   const b=new m.Beat();
   b.duration=duration;
   voice.addBeat(b);
   if(fret===null)return b;
   const n=new m.Note();
   n.string=2;
   n.fret=fret;
   n.gtsSourceArticulation=kind;
   b.addNote(n);
   return b;
  }
  if(i!==8){beat(m.Duration.Whole,null);continue;}
  beat(m.Duration.Half,null);
  beat(m.Duration.ThirtySecond,12,28).graceType=m.GraceType.OnBeat;
  const target=beat(m.Duration.Eighth,14,28);
  target.tupletNumerator=3;
  target.tupletDenominator=2;
  for(const kind of [29,0]){
   const b=beat(m.Duration.Eighth,10,kind);
   b.addWhammyBarPoint(new m.BendPoint(0,0));
   b.addWhammyBarPoint(new m.BendPoint(60,-4));
  }
  beat(m.Duration.Eighth,null);
 }
 const settings=new classic.Settings();
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score,settings);
}

test('on-beat grace and whammy markers survive GP and worker readback without affecting unmarked notes',()=>{
 const bytes=fixture(), markerList=score=>Array.from(score.tracks[0].staves[0].bars[8].voices[0].beats,
  beat=>beat.notes[0]?.gtsSourceArticulation??0);
 function play(lib,score,settings,smf=false){
  const handler=new lib.midi.AlphaSynthMidiFileHandler(new lib.midi.MidiFile());
  if(smf)handler._smf1Mode=true;
  const base=8*3840, attacks=[], wheels=[];
  handler.addNote=(_track,tick,length,key)=>attacks.push([Math.round((tick-base)*10)/10,Math.round(length*10)/10,key]);
  handler.addBend=(_track,tick,_channel,value)=>{if(value!==8192)wheels.push(tick-base);};
  new lib.midi.MidiFileGenerator(score,settings,handler).generate();
  return {attacks,wheels};
 }
 const settings=new classic.Settings();
 const loaded=classic.importer.ScoreLoader.loadScoreFromBytes(bytes,settings);
 const worker=classic.probe.JsonConverter;
 const decoded=worker.jsObjectToScore(structuredClone(worker.scoreToJsObject(loaded)),settings);
 const coreSettings=new core.Settings();
 const coreRead=core.importer.ScoreLoader.loadScoreFromBytes(bytes,coreSettings);
 for(const [lib,score,options] of [[classic,loaded,settings],[classic,decoded,settings],[core,coreRead,coreSettings]]){
  assert.deepEqual(markerList(score),[0,28,28,29,0,0]);
  const {attacks,wheels}=play(lib,score,options);
  assert.deepEqual(attacks.slice(0,2),[[1920,76.8,57],[1996.8,243.2,59]]);
  assert(wheels.length>0 && wheels.every(tick=>tick>=2720));
  const native=play(lib,score,options,true);
  assert.equal(native.attacks[0][1],120);
  assert(native.wheels.some(tick=>tick>=2240 && tick<2720));
 }
});
