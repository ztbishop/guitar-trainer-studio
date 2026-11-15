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
 const score=new m.Score(), track=new m.Track(), staff=new m.Staff(), voices=[];
 score.addTrack(track);track.addStaff(staff);
 track.playbackInfo.program=30;track.playbackInfo.secondaryChannel=1;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 for(let i=0;i<12;i++){
  const master=new m.MasterBar(), bar=new m.Bar(), voice=new m.Voice();
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voices.push(voice);
  master.repeatCount=i===11?3:0;
  if(i===0)master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,130,2,true));
 }
 function beat(bar,duration,dots=0,details){
  const b=new m.Beat();b.duration=duration;b.dots=dots;voices[bar].addBeat(b);
  if(!details)return;
  const {string,fret,points,...effects}=details;
  const n=new m.Note();n.string=string;n.fret=fret;Object.assign(n,effects);b.addNote(n);
  if(marked)n.gtsSourceArticulation=26;
  for(const [x,y] of points??[])n.addBendPoint(new m.BendPoint(x,y));
 }
 const {Whole,Half,Quarter,Eighth,Sixteenth}=m.Duration;
 for(let i=0;i<12;i++)if(![1,2,6].includes(i))beat(i,Whole);
 beat(1,Half);beat(1,Quarter);beat(1,Sixteenth);
 beat(1,Sixteenth,0,{string:3,fret:7,slideOutType:m.SlideOutType.Legato});
 beat(1,Sixteenth,0,{string:3,fret:6});beat(1,Sixteenth);
 beat(2,Quarter);
 beat(2,Eighth,0,{string:3,fret:9,isStaccato:true});
 beat(2,Eighth,0,{string:2,fret:7,isStaccato:true});beat(2,Half);
 beat(6,Half);
 beat(6,Eighth,1,{string:6,fret:15});
 beat(6,Eighth,1,{string:6,fret:15,isTieDestination:true,points:[[0,0],[30,4],[60,0]]});
 beat(6,Eighth,0,{string:6,fret:15,isTieDestination:true,points:[[0,0],[60,4]]});
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score,settings);
}
function trace(library,score,smf=false){
 const notes=[],bends=[];
 const handler=new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(),smf);
 handler.addNote=(_track,tick,length,key,_velocity,_channel,offset=0)=>notes.push([tick,length,key,offset]);
 handler.addNoteBend=(_track,tick,_channel,key,wheel)=>bends.push([tick,key,wheel]);
 const player=new library.midi.MidiFileGenerator(score,new library.Settings(),handler);
 player.generate();
 return {notes,bends,order:Array.from(player.tickLookup.masterBars,b=>[b.masterBar.index,b.start,b.end])};
}
test('sampled rock restart keeps the written tie, separate attacks and the silent repeat',()=>{
 const bytes=fixture(true),unmarked=fixture(false);
 for(const library of [classic,core]){
  const load=b=>library.importer.ScoreLoader.loadScoreFromBytes(b,new library.Settings());
  const score=load(bytes),scores=[score];
  if(library===classic){
   const {JsonConverter}=classic.probe;
   scores.push(JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings));
  }
  for(const read of scores){
   const bars=read.tracks[0].staves[0].bars;
   assert.equal(bars[11].voices[0].beats[0].isRest,true);
   const [first,middle,tail]=Array.from(bars[6].voices[0].beats.slice(1),b=>b.notes[0]);
   assert.equal(first.tieDestination,middle);assert.equal(middle.tieDestination,tail);
   assert.equal(tail.gtsSourceArticulation,26);
   assert.deepEqual(Array.from(middle.bendPoints,p=>p.value),[0,4,4,0]);
   const {notes,bends,order}=trace(library,read);
   assert.deepEqual(order,Array.from({length:36},(_,i)=>[i%12,i*3840,(i+1)*3840]));
   const expected=[[3840+3120,240,57,0],[3840+3360,240,56,200],[7680+960,120,59,0],[7680+1440,120,52,0],
     [23040+1920,1440,79,0],[23040+3360,480,79,300]];
   assert.deepEqual(notes,[0,46080,92160].flatMap(pass=>expected.map(([tick,...rest])=>[tick+pass,...rest])));
   for(const start of [26400,72480,118560]){
    const wheels=new Map(bends.filter(([tick,key])=>key===79&&tick>=start&&tick<=start+480).map(([tick,,wheel])=>[tick,wheel]));
    assert.equal(wheels.size,97);assert.equal(wheels.get(start),8192);assert.equal(wheels.get(start+480),9216);
   }
   assert.deepEqual(trace(library,read,true),trace(library,load(unmarked),true));
  }
 }
});