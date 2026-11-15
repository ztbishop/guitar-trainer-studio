import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code=fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),end=code.lastIndexOf('});');
const context=vm.createContext({process,console,Map,TextEncoder,TextDecoder});
vm.runInContext(code.slice(0,end)+'exports.probe={JsonConverter};'+code.slice(end),context);
const a=context.alphaTab,m=a.model,{JsonConverter}=a.probe,settings=new a.Settings();
function fixture(marked){
 const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
 score.addTrack(track);track.addStaff(staff);
 track.playbackInfo.program=27;track.playbackInfo.secondaryChannel=1;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 const voices=[];
 for(let i=0;i<4;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voices.push(voice);
  master.tripletFeel=m.TripletFeel.Triplet8th;master.isRepeatStart=i===0;master.repeatCount=i===3?2:0;
 }
 const beat=(bar,duration=m.Duration.Quarter)=>{const b=new m.Beat();voices[bar].addBeat(b);b.duration=duration;return b;};
 const note=(b,s,f,options={})=>{
  const n=new m.Note();n.string=s;n.fret=f;
  if(options.bend){n.addBendPoint(new m.BendPoint(0,options.bend[0]));n.addBendPoint(new m.BendPoint(60,options.bend[1]));}
  n.isTieDestination=!!options.tie;n.isHammerPullOrigin=!!options.hammer;
  n.gtsSourceArticulation=marked?(options.kind||0):0;
  if(options.kind===11){n.isStaccato=true;n.accentuated=m.AccentuationType.Normal;}
  b.addNote(n);return n;
 };
 for(let i=0;i<3;i++)beat(0);
 const q=beat(0);note(q,5,6,{kind:11});note(q,6,8,{kind:11});
 for(let i=0;i<6;i++){
  const b=beat(1);b.ottava=m.Ottavia._8va;b.tupletNumerator=3;b.tupletDenominator=2;
  note(b,5,7,{kind:11});note(b,6,9,{kind:11});
 }
 beat(2);beat(2);
 const first=beat(2),restart=beat(2),hold=beat(3,m.Duration.Whole);
 note(first,4,11);note(first,5,12);note(first,6,11);
 note(restart,4,11,{tie:true,bend:[0,4],kind:12});note(restart,6,11,{tie:true,hammer:true});
 note(hold,4,11,{tie:true,bend:[4,4]});note(hold,6,12,{kind:13});
 score.finish(settings);return new a.exporter.Gp7Exporter().export(score,settings);
}
function trace(library,score,smf=false){
 const attacks=[],wheels=[],midi=new library.midi.MidiFile();
 const handler=new library.midi.AlphaSynthMidiFileHandler(midi,smf);
 handler.addNote=(_t,tick,len,key,_vel,_c,offset=0)=>attacks.push([tick,len,key,offset]);
 handler.addNoteBend=(_t,tick,_c,key,w)=>wheels.push([tick,key,w]);
 new library.midi.MidiFileGenerator(score,new library.Settings(),handler).generate();
 return {attacks,wheels};
}
test('swung GP reattacks, octave dyads and cross-bar hammer match both repeat visits',()=>{
 for(const library of [a,core]){
  const load=marked=>library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new library.Settings());
  let score=load(true);
  if(library===a)score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  const bars=score.tracks[0].staves[0].bars;
  assert(bars[1].voices[0].beats.every(b=>b.ottava===m.Ottavia._8va&&b.notes.every(n=>n.isStaccato)));
  const reattack=bars[2].voices[0].beats[3].notes.find(n=>n.string===4),hammer=bars[3].voices[0].beats[0].notes.find(n=>n.string===6);
  assert(reattack.tieOrigin&&reattack.tieDestination&&reattack.gtsSourceArticulation===12);
  assert(hammer.hammerPullOrigin?.isTieDestination&&hammer.gtsSourceArticulation===13);
  const {attacks,wheels}=trace(library,score),eq=(a,b)=>a.join()===b.join();
  for(const shift of [0,15360]){
   for(const e of [[2880,240,65,0],[2880,240,72,0],[3840,160,66,0],[3840,160,73,0],
    [9600,960,66,0],[10560,4800,66,0],[9600,1920,75,0],[11520,3840,76,200]]){
    assert(attacks.some(a=>eq(a,[e[0]+shift,...e.slice(1)])),e.join());
   }
   const expected=Array.from({length:961},(_,i)=>[shift+10560+i*5,66,
    Math.round(8192+6144*Math.log2(1+(2**(2/12)-1)*i*5/4800))]);
   assert.deepEqual(wheels.filter(w=>w[1]===66&&w[0]>=shift+10560&&w[0]<=shift+15360),expected);
  }
  assert(trace(library,load(false)).attacks.every(n=>n[3]===0));
  assert.deepEqual(trace(library,score,true),trace(library,load(false),true),'standard MIDI stays native');
 }
});
