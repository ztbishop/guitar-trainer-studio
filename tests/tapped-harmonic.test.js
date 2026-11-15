import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code=fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8');
const end=code.lastIndexOf('});');
const context=vm.createContext({process,console,Map,TextEncoder,TextDecoder});
vm.runInContext(code.slice(0,end)+'exports.probe={JsonConverter};'+code.slice(end),context);
const a=context.alphaTab,m=a.model,{JsonConverter}=a.probe;
const settings=new a.Settings();
function fixture(marked){
 const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
 score.addTrack(track);track.addStaff(staff);
 track.playbackInfo.program=27;track.playbackInfo.secondaryChannel=1;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 const voices=[];
 for(let i=0;i<3;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
  master.timeSignatureNumerator=3;master.timeSignatureDenominator=4;
  master.isRepeatStart=i===0;master.repeatCount=i===2?2:0;
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voices.push(voice);
 }
 const add=(bar,duration,dots,string,fret,node,ticks,tie=false,vibrato=false)=>{
  const b=new m.Beat(),n=new m.Note();
  b.duration=duration;b.dots=dots;voices[bar].addBeat(b);
  n.string=string;n.fret=fret;n.harmonicType=m.HarmonicType.Tap;n.harmonicValue=node;
  n.gtsTappedHarmonicTicks=marked?ticks:0;n.isTieDestination=tie;
  n.vibrato=vibrato?m.VibratoType.Slight:m.VibratoType.None;
  b.addNote(n);
 };
 for(const [string,fret,node] of [[6,5,7],[5,9,3.2],[6,5,7]])add(0,m.Duration.Quarter,0,string,fret,node,960);
 add(1,m.Duration.Half,1,3,7,5,5760,false,true);
 add(2,m.Duration.Half,1,3,7,5,-1,true,true);
 score.finish(settings);
 return new a.exporter.Gp7Exporter().export(score,settings);
}
function trace(library,score,smf){
 const notes=[],wheels=[],midi=new library.midi.MidiFile();
 const handler=new library.midi.AlphaSynthMidiFileHandler(midi,smf);
 handler.addNote=(_t,tick,length,key)=>notes.push([tick,length,key]);
 handler.addNoteBend=(_t,_tick,_c,_key,value)=>wheels.push(value);
 const g=new library.midi.MidiFileGenerator(score,new library.Settings(),handler);
 g.generate();
 return {notes,wheels,order:Array.from(g.tickLookup.masterBars,b=>b.masterBar.index)};
}
test('marked taps retain nodes and a steady cross-bar tie on both repeat passes',()=>{
 for(const library of [a,core]){
  const load=marked=>library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new library.Settings());
  let score=load(true);
  if(library===a)score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  const bars=score.tracks[0].staves[0].bars;
  const note=bars[0].voices[0].beats[1].notes[0],origin=bars[1].voices[0].beats[0].notes[0];
  assert.deepEqual([note.string,note.fret,note.harmonicType,note.harmonicValue,note.realValue],[5,9,m.HarmonicType.Tap,3.2,71]);
  assert.equal(origin.tieDestination,bars[2].voices[0].beats[0].notes[0]);
  for(const n of [origin,origin.tieDestination])assert.equal(n.vibrato,m.VibratoType.Slight);
  for(const smf of [false,true]){
   const {notes,wheels,order}=trace(library,score,smf);
   assert.deepEqual(order,[0,1,2,0,1,2]);
   assert.deepEqual(notes,[0,8640].flatMap(t=>[[t,960,76],[t+960,960,71],[t+1920,960,76],[t+2880,5760,62]]));
   assert(wheels.every(w=>w===8192));
  }
  const ordinary=load(false),control=trace(library,ordinary,false);
  assert.deepEqual(control.notes.slice(0,3).map(n=>n[2]),[88,99,88]);
  assert(control.wheels.some(w=>w!==8192));
 }
});

test('pitch-only tap preserves the native duration and tie across GP and worker readback',()=>{
 const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
 const bar=new m.Bar(),voice=new m.Voice();
 score.addTrack(track);track.addStaff(staff);
 score.addMasterBar(new m.MasterBar());staff.addBar(bar);bar.addVoice(voice);
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 for(const [i,length] of [m.Duration.Eighth,m.Duration.Quarter,m.Duration.Quarter].entries()){
  const b=new m.Beat(),n=new m.Note();
  b.duration=length;voice.addBeat(b);
  n.string=1;n.fret=10;n.harmonicType=m.HarmonicType.Tap;n.harmonicValue=7;
  n.gtsTappedHarmonicTicks=-2;n.isTieDestination=i>0;
  b.addNote(n);
 }
 const rest=new m.Beat();rest.duration=m.Duration.Quarter;rest.dots=1;voice.addBeat(rest);
 score.finish(settings);
 const write=()=>new a.exporter.Gp7Exporter().export(score,settings);
 const marked=write();
 for(const beat of voice.beats)for(const note of beat.notes)note.gtsTappedHarmonicTicks=0;
 const ordinary=write();
 for(const library of [a,core]){
  const read=bytes=>library.importer.ScoreLoader.loadScoreFromBytes(bytes,new library.Settings());
  let parsed=read(marked);
  if(library===a)parsed=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(parsed)),settings);
  const notes=Array.from(parsed.tracks[0].staves[0].bars[0].voices[0].beats).flatMap(b=>Array.from(b.notes));
  assert.deepEqual(notes.map(n=>[n.string,n.fret,n.harmonicValue,n.gtsTappedHarmonicTicks,n.realValue]),
   Array.from({length:3},()=>[1,10,7,-2,57]));
  assert.equal(notes[0].tieDestination,notes[1]);
  assert.equal(notes[1].tieDestination,notes[2]);
  assert.deepEqual(trace(library,parsed,false).notes,[[0,2400,57]]);
  assert.deepEqual(trace(library,read(ordinary),false).notes,[[0,2400,69]]);
 }
});
