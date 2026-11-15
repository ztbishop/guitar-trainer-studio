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
  const staccato=beat(0,m.Duration.Eighth);
  for(const [string,fret] of [[5,5],[4,2],[3,2]]){
    const n=note(staccato,string,fret);
    n.isStaccato=true;
    n.gtsSourceArticulation=marked?1:0;
  }
  beat(0,m.Duration.Eighth);
  beat(0,m.Duration.Quarter);
  const exit=note(beat(0,m.Duration.Eighth),5,7);
  exit.slideOutType=m.SlideOutType.OutDown;
  exit.gtsSourceArticulation=marked?2:0;
  beat(0,m.Duration.Eighth);
  const tied=beat(1,m.Duration.Quarter);
  const origin=note(tied,5,5,[[0,0],[30,2],[60,0]]);
  origin.gtsSourceArticulation=marked?3:0;
  origin.gtsTiedBend=marked;
  note(tied,4,2);
  note(tied,3,2);
  const tail=note(beat(1,m.Duration.Quarter),5,5,[[0,0],[60,0]],true);
  tail.slideOutType=m.SlideOutType.Legato;
  note(beat(1,m.Duration.Eighth),5,3);
  beat(1,m.Duration.Eighth);
  beat(2,m.Duration.Half);
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
test('marked source staccato and sampled exits preserve written marks and playback across repeats',()=>{
  for(const lib of [a,core]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const [first,second]=model.tracks[0].staves[0].bars;
    assert(first.voices[0].beats[0].notes.every(n=>n.gtsSourceArticulation===1&&n.isStaccato));
    assert.equal(first.voices[0].beats[3].notes[0].slideOutType,m.SlideOutType.OutDown);
    const peak=second.voices[0].beats[0].notes[0];
    assert.equal(peak.gtsSourceArticulation,3);
    assert.equal(peak.tieDestination.slideOutType,m.SlideOutType.Legato);
    assert.equal(peak.tieDestination.slideTarget,second.voices[0].beats[2].notes[0]);
    const result=playback(lib,model);
    assert.deepEqual(result.bars,Array.from({length:6},(_,i)=>[i%3,i*2880,(i+1)*2880]));
    assert.deepEqual(result.attacks, [0,8640].flatMap(i=>[
      [i,160,64,0],[i,160,57,0],[i,160,52,0],
      [i+1920,544,66,0],[i+2464,48,64,200],[i+2512,48,63,200],
      [i+4656,144,63,200],[i+2880,1920,64,0],[i+2880,960,57,0],[i+2880,960,52,0],[i+4800,640,62,0]]));
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
    assert.notDeepEqual(playback(lib,read(false)).attacks,result.attacks);
  }
});
