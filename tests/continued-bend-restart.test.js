import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0,end) + 'exports.probe={JsonConverter};' + code.slice(end), context);
const a = context.alphaTab, m = a.model, {JsonConverter} = a.probe;

function fixture(swung,marked) {
  const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
  score.addTrack(track);track.addStaff(staff);
  track.playbackInfo.program=27;track.playbackInfo.secondaryChannel=1;
  staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
  const voices=Array.from({length:swung?1:2},(_,i)=>{
    const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
    master.isRepeatStart=i===0;master.repeatCount=i===(swung?0:1)?2:0;
    if(swung)master.tripletFeel=m.TripletFeel.Triplet8th;
    score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
    return voice;
  });
  const beat=(duration,bar=0)=>{const b=new m.Beat();b.duration=duration;voices[bar].addBeat(b);return b;};
  const note=(b,string,fret,points=[],tie=false)=>{
    const n=new m.Note();n.string=string;n.fret=fret;n.isTieDestination=tie;
    for(const [offset,value] of points)n.addBendPoint(new m.BendPoint(offset,value));
    b.addNote(n);return n;
  };
  if(swung){
    const beats=Array.from({length:6},()=>beat(m.Duration.Eighth));
    note(beats[0],5,5,[[0,0],[60,2]]).gtsFallingTie=marked;
    note(beats[1],5,5,[[0,2],[60,2]],true);
    note(beats[2],5,5,[],true);
    note(beats[3],5,5,[[0,2],[60,0]],true);
    note(beats[4],5,5,[[0,0],[60,0]],true);
    for(const i of [2,3,4])note(beats[i],4,2);
    beat(m.Duration.Quarter);
  }else{
    const chord=beat(m.Duration.Eighth);
    note(chord,5,9,[[0,0],[60,4]]).gtsTiedBend=marked;
    note(chord,4,2);
    beat(m.Duration.Eighth);
    beat(m.Duration.Half);
    const origin=beat(m.Duration.Eighth);
    note(origin,5,5,[[0,0],[60,2]]).gtsFallingTie=marked;
    note(origin,4,2);
    note(beat(m.Duration.Eighth),5,5,[[0,2],[30,4],[60,4]],true);
    note(beat(m.Duration.Whole,1),5,5,[[0,4],[60,4]],true);
  }
  score.finish(new a.Settings());
  return new a.exporter.Gp7Exporter().export(score,new a.Settings());
}
function playback(lib,score,smf=false) {
  const attacks=[],wheels=[];
  const handler=new lib.midi.AlphaSynthMidiFileHandler(new lib.midi.MidiFile(),smf);
  handler.addNote=(_t,tick,length,key,_v,_ch,offset=0)=>attacks.push([tick,length,key,offset]);
  handler.addNoteBend=(_t,tick,_c,key,wheel)=>wheels.push([tick,key,wheel]);
  const gen=new lib.midi.MidiFileGenerator(score,new lib.Settings(),handler);
  gen.generate();
  return {attacks,wheels,bars:Array.from(gen.tickLookup.masterBars,b=>[b.masterBar.index,b.start,b.end])};
}
test('rising and staggered restarts preserve sample offsets and release times on both passes',()=>{
  for(const lib of [a,core])for(const swung of [false,true]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(swung,marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const result=playback(lib,model);
    const first=swung?1600:480, second=swung?960:4320, origin=swung?0:2880;
    const period=swung?3840:7680;
    for(const t of [origin,period+origin]){
      assert.deepEqual(result.attacks.filter(([tick,,key])=>[64,65].includes(key)&&tick>=t&&tick<t+first+second),
        [[t,first,64,0],[t+first,second,65,300]]);
      const curve=result.wheels.filter(([tick,key])=>key===65&&tick>=t+first&&tick<=t+first+second);
      assert.equal(curve.length,second/5+1);
      assert.deepEqual(curve[0],[t+first,65,8192]);
      assert.deepEqual(curve.at(-1),[t+first+second,65,swung?7680:8704]);
    }
    if(!swung)assert.equal(result.wheels.filter(([tick,key])=>key===68&&tick<=480).length,97);
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
  }
});
