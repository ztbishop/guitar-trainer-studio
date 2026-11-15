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
  const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
  master.isRepeatStart=true;master.repeatCount=2;
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
  const beat=(duration,triplet=false)=>{
    const b=new m.Beat();b.duration=duration;
    if(triplet){b.tupletNumerator=3;b.tupletDenominator=2;}
    voice.addBeat(b);return b;
  };
  const origin=beat(m.Duration.Eighth,true),fall=beat(m.Duration.Eighth,true);
  const exit=beat(m.Duration.Eighth,true),landing=beat(m.Duration.Eighth);
  for(const [string,fret,height] of [[5,5,2],[4,2,4]]){
    const note=(b,position,tied=false)=>{
      const n=new m.Note();n.string=string;n.fret=position;n.isTieDestination=tied;b.addNote(n);return n;
    };
    const first=note(origin,fret);
    first.gtsSourceArticulation=marked?4:0;
    first.gtsFallingTie=marked;
    first.addBendPoint(new m.BendPoint(0,0));
    first.addBendPoint(new m.BendPoint(60,height));
    const restart=note(fall,fret,true);
    restart.addBendPoint(new m.BendPoint(0,height));
    restart.addBendPoint(new m.BendPoint(60,0));
    const tail=note(exit,fret,true);
    tail.addBendPoint(new m.BendPoint(0,0));
    tail.addBendPoint(new m.BendPoint(60,0));
    tail.slideOutType=m.SlideOutType.Legato;
    note(landing,fret-2);
  }
  beat(m.Duration.Eighth);
  beat(m.Duration.Half);
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
test('paired falling exits preserve both sampled restarts and fresh targets through both passes',()=>{
  for(const lib of [a,core]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const notes=model.tracks[0].staves[0].bars[0].voices[0].beats[0].notes;
    assert(notes.every(n=>n.gtsFallingTie&&n.gtsSourceArticulation===4&&
      n.tieDestination.tieDestination.slideOutType===m.SlideOutType.Legato));
    const result=playback(lib,model);
    assert.deepEqual(result.bars,[[0,0,3840],[0,3840,7680]]);
    assert.deepEqual(result.attacks, [0,3840].flatMap(i=>[
      [i,320,64,0],[i+320,640,65,300],[i+912,48,63,200],
      [i,320,57,0],[i+320,640,59,300],[i+912,48,56,200],
      [i+960,480,62,0],[i+960,480,55,0]]));
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
  }
});
