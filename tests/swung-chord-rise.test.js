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

function fixture(marked) {
  const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
  score.addTrack(track);track.addStaff(staff);
  track.playbackInfo.program=27;track.playbackInfo.secondaryChannel=1;
  staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
  const voices=Array.from({length:3},(_,i)=>{
    const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
    master.timeSignatureNumerator=3;master.tripletFeel=m.TripletFeel.Triplet8th;
    master.isRepeatStart=i===0;master.repeatCount=i===2?2:0;
    score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
    return voice;
  });
  const beat=(i,duration)=>{const b=new m.Beat();b.duration=duration;voices[i].addBeat(b);return b;};
  const note=(b,string,fret,points=[],tie=false)=>{
    const n=new m.Note();n.string=string;n.fret=fret;n.isTieDestination=tie;
    for(const [offset,value] of points)n.addBendPoint(new m.BendPoint(offset,value));
    b.addNote(n);return n;
  };
  const standalone=beat(0,m.Duration.Half);
  note(standalone,5,5,[[0,0],[60,2]]).gtsTiedBend=marked;
  note(standalone,4,2);
  beat(0,m.Duration.Quarter);
  const tied=beat(1,m.Duration.Quarter);
  note(tied,5,5,[[0,0],[60,4]]).gtsTiedBend=true;
  note(tied,4,2);
  note(tied,3,2);
  note(beat(1,m.Duration.Half),5,5,[[0,4],[60,4]],true);
  note(beat(2,m.Duration.Half),5,5,[[0,4],[60,4]],true);
  beat(2,m.Duration.Quarter);
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
test('marked 3/4 chord rise keeps the partner and exact internal curve across repeats',()=>{
  for(const lib of [a,core]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const origin=model.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
    assert(origin.gtsTiedBend&&!origin.isTieOrigin);
    const result=playback(lib,model);
    assert.deepEqual(result.bars,Array.from({length:6},(_,i)=>[i%3,i*2880,(i+1)*2880]));
    for(const pass of [0,8640]){
      for(const [start,length,semitones] of [[pass,1920,1],[pass+2880,4800,2]]){
        const curve=result.wheels.filter(([tick,key])=>key===64&&tick>=start&&tick<=start+length);
        assert.deepEqual(curve,Array.from({length:length/5+1},(_,i)=>
          [start+i*5,64,Math.round(8192+6144*Math.log2(1+(2**(semitones/12)-1)*i*5/length))]));
      }
    }
    assert.deepEqual(result.attacks, [0,8640].flatMap(i=>[
      [i,1920,64,0],[i,1920,57,0],[i+2880,4800,64,0],[i+2880,960,57,0],[i+2880,960,52,0]]));
    assert(result.wheels.filter(([,key])=>key!==64).every(([,,w])=>w===8192));
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
    assert.notDeepEqual(playback(lib,read(false)).wheels,result.wheels);
  }
});
