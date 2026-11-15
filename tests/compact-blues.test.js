import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0, end) + 'exports.probe={JsonConverter};' + code.slice(end), context);
const classic = context.alphaTab, m = classic.model, settings = new classic.Settings();

function fixture(marked) {
 const score=new m.Score(), track=new m.Track(), staff=new m.Staff();
 score.addTrack(track); track.addStaff(staff);
 track.playbackInfo.program=27;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 const master=new m.MasterBar(), bar=new m.Bar(), voice=new m.Voice();
 master.tripletFeel=m.TripletFeel.Triplet8th;
 score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice);
 master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,116,2,true));
 function beat(duration,props={},details) {
  const b=new m.Beat(); b.duration=duration; Object.assign(b,props); voice.addBeat(b);
  if(!details)return;
  const {string,fret,mark=true,bend,...effects}=details;
  const n=new m.Note(); n.string=string; n.fret=fret; Object.assign(n,effects); b.addNote(n);
  if(marked&&mark)n.gtsSourceArticulation=25;
  if(bend){
   n.gtsFineBendMidpoint=12;
   n.addBendPoint(new m.BendPoint(0,0)); n.addBendPoint(new m.BendPoint(60,1));
  }
 }
 const {Sixteenth,Eighth,Half,ThirtySecond}=m.Duration;
 beat(Eighth); beat(Sixteenth);
 beat(Sixteenth,{}, {string:1,fret:3,bend:true});
 beat(Half);
 beat(ThirtySecond,{}, {string:3,fret:0,mark:false,isHammerPullOrigin:true});
 beat(Sixteenth,{dots:1}, {string:3,fret:2});
 beat(Eighth,{}, {string:3,fret:0});
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score,settings);
}

function trace(library,score,smf=false) {
 const notes=[], bends=new Map();
 const handler=new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(),smf);
 handler.addNote=(_track,tick,length,key,_velocity,_channel,offset=0)=>notes.push([tick,length,key,offset]);
 handler.addNoteBend=(_track,tick,_channel,key,wheel)=>{if(key===43)bends.set(tick,wheel);};
 new library.midi.MidiFileGenerator(score,new library.Settings(),handler).generate();
 return {notes,bends};
}

test('compact blues preserves the short fine bend and swung hammer clock',()=>{
 const bytes=fixture(true), unmarked=fixture(false);
 for(const library of [classic,core]){
  const load=source=>library.importer.ScoreLoader.loadScoreFromBytes(source,new library.Settings());
  const score=load(bytes);
  const loaded=[score];
  if(library===classic){
   const {JsonConverter}=classic.probe;
   loaded.push(JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings));
  }
  for(const read of loaded){
   const beats=read.tracks[0].staves[0].bars[0].voices[0].beats;
   assert.equal(beats[2].notes[0].gtsFineBendMidpoint,12);
   assert.equal(beats[2].notes[0].gtsSourceArticulation,25);
   assert.equal(beats[4].notes[0].hammerPullDestination,beats[5].notes[0]);
   const {notes,bends}=trace(library,read);
   assert.deepEqual(notes,[[720,240,43,0],[2880,120,50,0],[3000,520,52,200],[3520,320,50,0]]);
   assert.equal(bends.size,49);
   assert.equal(bends.get(720),8192);
   assert.equal(bends.get(960),8704);
   assert.deepEqual(trace(library,read,true),trace(library,load(unmarked),true));
  }
 }
});