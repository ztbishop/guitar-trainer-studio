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
 const score=new m.Score(),track=new m.Track(),staff=new m.Staff(),master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
 score.addTrack(track);track.addStaff(staff);score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
 track.playbackInfo.program=27;track.playbackInfo.secondaryChannel=1;
 staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 master.isRepeatStart=true;master.repeatCount=2;
 const beat=duration=>{const b=new m.Beat();voice.addBeat(b);b.duration=duration;return b;};
 const note=(b,s,f,options={})=>{
  const n=new m.Note();n.string=s;n.fret=f;
  if(options.points){n.addBendPoint(new m.BendPoint(0,options.points[0]));n.addBendPoint(new m.BendPoint(60,options.points[1]));}
  n.isTieDestination=!!options.tie;n.isHammerPullOrigin=!!options.hammer;
  n.gtsTiedBend=marked&&!!options.release;n.gtsSourceArticulation=marked&&options.target?10:0;
  b.addNote(n);return n;
 };
 const chord=beat(m.Duration.Eighth),hold=beat(m.Duration.Eighth);
 note(chord,4,14,{release:true,points:[4,0]});note(chord,5,15);note(chord,6,14,{hammer:true});
 note(hold,4,14,{tie:true,points:[0,0]});note(hold,6,15,{target:true});
 beat(m.Duration.Eighth);
 const pair=beat(m.Duration.Eighth),pairHold=beat(m.Duration.Half);
 note(pair,4,7,{release:true,points:[4,0]});note(pair,5,7,{release:true,points:[2,0]});
 note(pairHold,4,7,{tie:true,points:[0,0]});note(pairHold,5,7,{tie:true,points:[0,0]});
 score.finish(settings);return new a.exporter.Gp7Exporter().export(score,settings);
}
function trace(library,score,smf=false){
 const attacks=[],wheels=[],midi=new library.midi.MidiFile();
 const handler=new library.midi.AlphaSynthMidiFileHandler(midi,smf);
 handler.addNote=(_t,tick,len,key,vel,_c,offset=0)=>attacks.push([tick,len,key,offset,vel]);
 handler.addNoteBend=(_t,tick,_c,key,w)=>wheels.push([tick,key,w]);
 new library.midi.MidiFileGenerator(score,new library.Settings(),handler).generate();
 return {attacks,wheels};
}
const sort=rows=>rows.map(x=>x.join()).sort();
test('captured hammer attacks and independent chord releases survive GP and worker playback',()=>{
 for(const library of [a,core]){
  const load=marked=>library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new library.Settings());
  let score=load(true);
  if(library===a)score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  const beats=score.tracks[0].staves[0].bars[0].voices[0].beats;
  const target=beats[1].notes.find(n=>n.string===6);
  assert.equal(target.hammerPullOrigin.hammerPullDestination,target);assert.equal(target.gtsSourceArticulation,10);
  assert(beats[3].notes.every(n=>n.isTieOrigin&&n.tieDestination.beat===beats[4]));
  const {attacks,wheels}=trace(library,score);
  assert.deepEqual(sort(attacks.map(n=>n.slice(0,4))),sort([0,3840].flatMap(t=>
   [[t,960,71,0],[t,480,74,0],[t,480,78,0],[t+480,480,79,200],[t+1440,2400,64,0],[t+1440,2400,67,0]])));
  for(const t of [0,3840]){
   assert.equal(attacks.find(a=>a[0]===t&&a[2]===78)[4],attacks.find(a=>a[0]===t+480&&a[2]===79)[4]);
   for(const [start,len,key,drop] of [[t,960,71,2],[t+1440,2400,64,2],[t+1440,2400,67,1]]){
    const expected=Array.from({length:len/5+1},(_,i)=>[start+i*5,key,
     Math.round(8192+6144*Math.log2(1+(2**(-drop/12)-1)*i*5/len))]);
    assert.deepEqual(wheels.filter(w=>w[1]===key&&w[0]>=start&&w[0]<=start+len),expected);
   }
  }
  const ordinary=trace(library,load(false));
  assert(ordinary.attacks.every(n=>n[3]===0));
  assert.deepEqual(trace(library,score,true),trace(library,load(false),true),'standard MIDI stays native');
 }
});
