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
 for(let i=0;i<9;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voices.push(voice);
  master.isRepeatStart=i===0;
  master.repeatCount=i===8?4:0;
  if(i===0)master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,128,2,true));
 }
 function beat(bar,duration,details){
  const b=new m.Beat();b.duration=duration;voices[bar].addBeat(b);
  if(!details)return;
  const {string,fret,points,qualified=true,...effects}=details;
  const n=new m.Note();n.string=string;n.fret=fret;Object.assign(n,effects);b.addNote(n);
  if(marked&&qualified)n.gtsSourceArticulation=27;
  for(const [x,y] of points??[])n.addBendPoint(new m.BendPoint(x,y));
 }
 const {Whole,Half,Quarter,Eighth}=m.Duration;
 const incoming=m.SlideInType.IntoFromBelow;
 for(let i=0;i<9;i++)if(![0,2,3,7].includes(i))beat(i,Whole);
 beat(0,Eighth,{string:3,fret:5,isHammerPullOrigin:true,qualified:false});
 beat(0,Eighth,{string:3,fret:7});
 beat(0,Quarter);beat(0,Half);
 beat(2,Half);beat(2,Quarter);beat(2,Quarter,{string:2,fret:7,slideInType:incoming});
 beat(3,Half,{string:2,fret:9,slideInType:incoming,points:[[0,0],[60,2]]});beat(3,Half);
 beat(7,Half);beat(7,Quarter);beat(7,Quarter,{string:1,fret:12,points:[[0,0],[30,6],[60,0]]});
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score,settings);
}
function playback(library,score,smf=false){
 const midi=new library.midi.MidiFile();
 const player=new library.midi.MidiFileGenerator(score,new library.Settings(),new library.midi.AlphaSynthMidiFileHandler(midi,smf));
 player.generate();
 return {midi,order:Array.from(player.tickLookup.masterBars,b=>[b.masterBar.index,b.start,b.end])};
}
const events=midi=>Array.from(midi.events,e=>[e.type,e.tick,e.channel,e.noteKey,e.sampleOffsetMs,e.value]);
test('rock lead preserves fractional worker samples, unison channels, bends and the silent repeat',()=>{
 const bytes=fixture(true),unmarked=fixture(false);
 const codec=classic.probe.JsonConverter;
 for(const library of [classic,core]){
  const load=b=>library.importer.ScoreLoader.loadScoreFromBytes(b,new library.Settings());
  const score=load(bytes),scores=[score];
  if(library===classic)scores.push(codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(score)),settings));
  for(const read of scores){
   const bars=read.tracks[0].staves[0].bars;
   const bend=bars[3].voices[0].beats[0].notes[0];
   assert.equal(bars[8].voices[0].beats[0].isRest,true);
   assert.equal(bend.gtsSourceArticulation,27);
   assert.equal(bend.slideInType,library.model.SlideInType.IntoFromBelow);
   assert.deepEqual(Array.from(bend.bendPoints,p=>[p.offset,p.value]),[[0,0],[60,2]]);
   const {midi,order}=playback(library,read);
   assert.deepEqual(order,Array.from({length:36},(_,i)=>[i%9,i*3840,(i+1)*3840]));
   const notes=Array.from(midi.events).filter(e=>e instanceof library.midi.NoteOnEvent);
   const bends=Array.from(midi.events).filter(e=>e instanceof library.midi.NoteBendEvent);
   for(const pass of [0,34560,69120,103680]){
    const landing=pass+11520,held=notes.find(n=>n.tick===landing-960&&n.noteKey===52);
    const sampled=notes.find(n=>n.tick===landing-204.8&&n.noteKey===52);
    assert(held&&sampled);
    assert.equal(sampled.sampleOffsetMs,200);
    assert.notEqual(held.channel,sampled.channel);
    assert(notes.some(n=>n.tick===pass+480&&n.sampleOffsetMs===200));
    assert.equal(bends.filter(b=>b.noteKey===54&&b.tick>=landing&&b.tick<=landing+1920).length,386);
    const peak=pass+7*3840+3360;
    assert(bends.some(b=>b.noteKey===52&&b.tick===peak));
   }
   const worker=codec.jsObjectToMidiFile(structuredClone(codec.midiFileToJsObject(midi)));
   assert.deepEqual(events(worker),events(midi));
   assert.deepEqual(events(playback(library,read,true).midi),events(playback(library,load(unmarked),true).midi));
  }
 }
});