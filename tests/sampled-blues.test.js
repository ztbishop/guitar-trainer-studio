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
 const score = new m.Score(), track = new m.Track(), staff = new m.Staff(), voices = [];
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program = 27;
 track.playbackInfo.secondaryChannel = 1;
 staff.stringTuning = new m.Tuning('Standard', [64,59,55,50,45,40], false);
 for (let i=0;i<6;i++) {
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
  master.isRepeatStart = i===0;
  master.repeatCount = i===3 ? 2 : 0;
  if(i===5)master.tripletFeel=m.TripletFeel.Triplet8th;
  if(i===0||i===5)master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,i===0?160:100,2,true));
 }
 const {Quarter,Eighth,Half} = m.Duration;
 function beat(bar,duration,notes=[],effect={}) {
  const b = new m.Beat(); b.duration=duration; voices[bar].addBeat(b);
  for (const [string,fret,plain] of notes) {
   const n=new m.Note();
   n.string=string; n.fret=fret;
   if(!plain)Object.assign(n,effect);
   n.gtsSlidePlayback=marked&&!plain?4:0;
   b.addNote(n);
  }
 }
 const high=[[2,7],[3,9],[4,9]], low=[[2,2],[3,4],[4,4]], mid=[[2,4],[3,6],[4,6]];
 const {Shift,Legato,OutDown}=m.SlideOutType;
 beat(0,Quarter,high,{isStaccato:true}); beat(0,Eighth);
 beat(0,Eighth,low,{slideInType:m.SlideInType.IntoFromAbove}); beat(0,Half);
 beat(1,Half); beat(1,Quarter,[[2,0],[3,2],[4,2],[5,0,true]],{slideOutType:Legato});
 beat(1,Eighth,high); beat(1,Eighth);
 beat(2,Quarter,high,{slideOutType:OutDown}); beat(2,Half); beat(2,Quarter,mid,{slideOutType:Shift});
 beat(3,Eighth,low); beat(3,Eighth,low,{slideOutType:Shift}); beat(3,Eighth,high); beat(3,Eighth); beat(3,Half);
 beat(4,Eighth,[[1,0]],{isStaccato:true}); beat(4,Eighth); beat(4,Quarter); beat(4,Half);
 beat(5,Eighth,[[1,0],[2,2]],{isPalmMute:true});
 beat(5,Eighth,[[1,0],[2,2]],{isPalmMute:true});
 beat(5,Eighth,[[2,2]],{isPalmMute:true});
 beat(5,Eighth,[[3,1,true]]);
 beat(5,Eighth,[[3,1,true]]);
 const tie=voices[5].beats.at(-1).notes[0];tie.isTieDestination=true;tie.isLetRing=true;
 beat(5,Eighth,[[3,1]],{isLetRing:true}); beat(5,Eighth,[[2,2,true]]); beat(5,Eighth,[[3,1,true]]);
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score,settings);
}

function trace(library, score, smf=false) {
 const events=[];
 const handler=new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(),smf);
 handler.addNote=(_track,start,len,key,_velocity,channel,offset=0)=>events.push([start,len,key,channel,offset]);
 const player=new library.midi.MidiFileGenerator(score,new library.Settings(),handler);
 player.generate();
 return events;
}

test('sampled blues slides and releases round-trip with independent unison channels',()=>{
 const bytes=fixture(true),unmarked=fixture(false);
 for(const library of [classic,core]){
  const load=source=>library.importer.ScoreLoader.loadScoreFromBytes(source,new library.Settings());
  let score=load(bytes);
  if(library===classic){
   const {JsonConverter}=classic.probe;
   score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  }
  const events=trace(library,score);
  const expect=row=>assert(events.some(e=>e.join()===row.join()),JSON.stringify(row));
  for(const pass of [0,15360]){
   for(const [start,len,key,channel,offset] of [[0,240,52,0,0],[1184,128,49,0,200],[1440,480,47,0,200],
    [5760,960,59,0,0],[6600,24,59,1,200],[6720,480,64,0,200],
    [8496,72,50,0,200],[8568,72,49,0,200],[11376,144,48,0,200],[11520,480,47,0,200],[12462,18,51,0,200],[12480,480,52,0,200]])
     expect([start+pass,len,key,channel,offset]);
  }
  for(const row of [[30720,120,40,0,0],[34560,80,40,0,400],[35200,40,47,0,400],[37120,320,51,0,0]])expect(row);
  assert.deepEqual(trace(library,score,true),trace(library,load(unmarked),true));
  score.masterBars[2].repeatCount=2;
  score.masterBars[3].repeatCount=0;
  assert(!trace(library,score).some(e=>e[0]===11376&&e[4]===200));
 }
});
