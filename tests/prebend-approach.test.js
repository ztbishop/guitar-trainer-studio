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
 for(let i=0;i<3;i++){
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);voices.push(voice);
  master.isRepeatStart=i===0;master.repeatCount=i===2?2:0;
 }
 const beat=(bar,d=m.Duration.Eighth)=>{const b=new m.Beat();voices[bar].addBeat(b);b.duration=d;return b;};
 const note=(b,s,f,o={})=>{
  const n=new m.Note();n.string=s;n.fret=f;n.isTieDestination=!!o.tie;
  if(o.bend){n.addBendPoint(new m.BendPoint(0,o.bend[0]));n.addBendPoint(new m.BendPoint(60,o.bend[1]));}
  if(o.slide)n.slideOutType=o.slide;
  n.gtsTiedBend=marked&&!!o.origin;n.gtsSourceArticulation=marked?(o.kind||0):0;
  b.addNote(n);
 };
 beat(0,m.Duration.Half);beat(0,m.Duration.Quarter);beat(0);
 note(beat(0),5,6,{bend:[4,0],origin:true,kind:14});
 note(beat(1),5,6,{bend:[0,0],tie:true,slide:m.SlideOutType.Legato});
 note(beat(1),5,8,{bend:[0,2],origin:true});note(beat(1),5,8,{bend:[2,2],tie:true});
 for(let i=0;i<5;i++)beat(1);
 for(let i=0;i<3;i++)beat(2);
 note(beat(2),5,11,{slide:m.SlideOutType.OutUp,kind:15});
 for(let i=0;i<4;i++){
  const b=beat(2);b.ottava=m.Ottavia._8va;
  for(const [s,f] of [[5,19],[6,17]]){
   if(i===0)note(b,s,f);
   else if(i===1)note(b,s,f,{bend:[2,0],origin:true});
   else if(i===2)note(b,s,f,{bend:[0,0],tie:true});
   else note(b,s,f-1);
  }
 }
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
test('pre-bent approach and short paired releases survive GP and worker playback',()=>{
 for(const library of [a,core]){
  const load=marked=>library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new library.Settings());
  let score=load(true);
  if(library===a)score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  const bars=score.tracks[0].staves[0].bars,release=bars[0].voices[0].beats[3].notes[0],dyads=bars[2].voices[0].beats.slice(4);
  assert.equal(release.gtsSourceArticulation,14);
  assert.equal(release.tieDestination.slideTarget.tieDestination.fret,8);
  assert(dyads.every(b=>b.ottava===m.Ottavia._8va));
  assert.equal(bars[2].voices[0].beats[3].notes[0].gtsSourceArticulation,15);
  const {attacks,wheels}=trace(library,score);
  for(const shift of [0,11520]){
   for(const e of [[3360,960,67,0],[4248,72,66,200],[4320,960,67,0],
    [9120,408,70,0],[9528,36,72,200],[9564,36,73,200],
    [10080,960,79,0],[10080,960,82,0],[11040,480,77,0],[11040,480,80,0]]){
    assert(attacks.some(a=>a.join()===[e[0]+shift,...e.slice(1)].join()),e.join());
   }
   for(const [start,key,drop] of [[3360,67,2],[10080,79,1],[10080,82,1]]){
    const expected=Array.from({length:193},(_,i)=>[shift+start+i*5,key,
     Math.round(8192+6144*Math.log2(1+(2**(-drop/12)-1)*i*5/960))]);
    const observed=wheels.filter(w=>w[1]===key&&w[0]>=shift+start&&w[0]<=shift+start+960);
    assert.deepEqual(observed.slice(0,193),expected);
   }
  }
  assert.equal(attacks.filter(e=>e[3]===200).length,6);
  assert.deepEqual(trace(library,score,true),trace(library,load(false),true),'standard MIDI stays native');
 }
});
