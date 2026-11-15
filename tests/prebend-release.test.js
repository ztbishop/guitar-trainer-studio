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
  master.timeSignatureNumerator=3;master.tripletFeel=m.TripletFeel.Triplet8th;
  master.isRepeatStart=true;master.repeatCount=2;
  score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
  const beat=duration=>{const b=new m.Beat();b.duration=duration;voice.addBeat(b);return b;};
  const note=(b,string,fret,points=[],tie=false)=>{
    const n=new m.Note();n.string=string;n.fret=fret;n.isTieDestination=tie;
    for(const [offset,value] of points)n.addBendPoint(new m.BendPoint(offset,value));
    b.addNote(n);return n;
  };
  beat(m.Duration.Eighth);
  const chord=beat(m.Duration.Eighth);
  note(chord,5,5,[[0,4],[60,0]]).gtsTiedBend=marked;
  note(chord,6,3);
  note(beat(m.Duration.Quarter),5,5,[[0,0],[60,0]],true);
  beat(m.Duration.Quarter);
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
  return {attacks,wheels,bars:Array.from(gen.tickLookup.masterBars,b=>[b.start,b.end])};
}
test('marked swung pre-bend releases continuously through the written tie on both visits',()=>{
  for(const lib of [a,core]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const origin=model.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0];
    assert(origin.gtsTiedBend&&origin.tieDestination.tieOrigin===origin);
    const result=playback(lib,model);
    assert.deepEqual(result.bars,[[0,2880],[2880,5760]]);
    assert.deepEqual(result.attacks,[[640,1280,66,0],[640,320,67,0],[3520,1280,66,0],[3520,320,67,0]]);
    for(const start of [640,3520]){
      const curve=result.wheels.filter(([tick,key])=>key===66&&tick>=start&&tick<=start+1280);
      assert.equal(curve.length,257);
      assert.deepEqual(curve.map(([tick,,wheel])=>[tick,wheel]),Array.from({length:257},(_,i)=>
        [start+i*5,Math.round(8192+6144*Math.log2(1+(2**(-2/12)-1)*i/256))]));
    }
    assert(result.wheels.filter(([,key])=>key===67).every(([, ,wheel])=>wheel===8192));
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
    assert.notDeepEqual(playback(lib,read(false)).attacks,result.attacks);
  }
});

function shortSwingFixture(marked) {
  const score=new m.Score(),track=new m.Track(),staff=new m.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  track.playbackInfo.program=27;
  track.playbackInfo.secondaryChannel=1;
  staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
  const voices=[];
  for(let i=0;i<2;i++){
    const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
    master.tripletFeel=m.TripletFeel.Triplet8th;
    master.isRepeatStart=i===0;
    master.repeatCount=i===1?2:0;
    score.addMasterBar(master);
    staff.addBar(bar);
    bar.addVoice(voice);
    voices.push(voice);
  }
  const beat=(bar,duration,triplet=false)=>{
    const b=new m.Beat(); b.duration=duration;
    if(triplet){ b.tupletNumerator=3; b.tupletDenominator=2; }
    voices[bar].addBeat(b);
    return b;
  };
  const note=(b,string,fret,points=[],tie=false)=>{
    const n=new m.Note(); n.string=string; n.fret=fret; n.isTieDestination=tie;
    for(const [offset,value] of points)n.addBendPoint(new m.BendPoint(offset,value));
    b.addNote(n); return n;
  };
  const staccato=note(beat(0,m.Duration.Eighth),5,0);
  staccato.isStaccato=true;
  staccato.gtsSourceArticulation=marked?1:0;
  for(let i=0;i<3;i++)beat(0,m.Duration.Sixteenth,true);
  const swung=beat(0,m.Duration.Eighth);
  note(swung,4,5,[[0,0],[60,4]]).gtsTiedBend=marked;
  beat(0,m.Duration.Eighth);
  beat(0,m.Duration.Quarter);
  const rising=beat(0,m.Duration.Eighth,true);
  note(rising,5,5,[[0,0],[60,2]]).gtsTiedBend=marked;
  note(rising,6,3);
  beat(0,m.Duration.Eighth,true);
  const release=beat(0,m.Duration.Eighth,true);
  note(release,5,5,[[0,2],[60,0]]).gtsTiedBend=marked;
  note(release,6,3);
  note(beat(1,m.Duration.Whole),5,5,[[0,0],[60,0]],true);
  score.finish(new a.Settings());
  return new a.exporter.Gp7Exporter().export(score,new a.Settings());
}

test('mixed swing preserves a short rise, staccato and cross-bar release on each repeat',()=>{
  for(const lib of [a,core]){
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(shortSwingFixture(marked),new lib.Settings());
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read(true))),new a.Settings()):read(true);
    const tail=model.tracks[0].staves[0].bars[1].voices[0].beats[0].notes[0];
    assert(tail.tieOrigin.gtsTiedBend&&tail.tieOrigin.tieDestination===tail);
    const result=playback(lib,model);
    assert.deepEqual(result.bars,[[0,3840],[3840,7680],[7680,11520],[11520,15360]]);
    for(const start of [0,7680]){
      const expected=[[0,120,59,0],[960,640,60,0],[2880,320,64,0],[2880,320,67,0],[3520,4160,65,0],[3520,320,67,0]];
      assert.deepEqual(result.attacks.filter(([tick])=>tick>=start&&tick<start+7680),
        expected.map(([tick,...rest])=>[start+tick,...rest]));
      for(const [key,onset,duration,semitones] of [[60,960,640,2],[64,2880,320,1],[65,3520,4160,-1]]){
        const range=result.wheels.filter(([tick,k])=>k===key&&tick>=start+onset&&tick<=start+onset+duration);
        assert.deepEqual(range,Array.from({length:duration/5+1},(_,i)=>[
          start+onset+i*5,key,Math.round(8192+6144*Math.log2(1+(2**(semitones/12)-1)*i*5/duration))
        ]));
      }
    }
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
    assert.notDeepEqual(playback(lib,read(false)).attacks,result.attacks);
  }
});

test('paired barline slide and pre-bent release keep separate attacks through a skipped ending', () => {
  const score = new m.Score(), track = new m.Track(), staff = new m.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  track.playbackInfo.program = 27;
  track.playbackInfo.secondaryChannel = 1;
  staff.stringTuning = new m.Tuning('Standard', [64,59,55,50,45,40], false);
  const voices = Array.from({length: 4}, (_, i) => {
    const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
    master.tripletFeel = m.TripletFeel.Triplet8th;
    master.isRepeatStart = i === 0;
    master.repeatCount = i === 2 ? 2 : 0;
    master.alternateEndings = i === 2 ? 1 : 0;
    score.addMasterBar(master);
    staff.addBar(bar);
    bar.addVoice(voice);
    return voice;
  });
  function beat(bar, duration, dots = 0) {
    const b = new m.Beat();
    b.duration = duration;
    b.dots = dots;
    voices[bar].addBeat(b);
    return b;
  }
  function add(b, string, fret, continuation = false, values = []) {
    const n = new m.Note();
    n.string = string;
    n.fret = fret;
    n.isTieDestination = continuation;
    for (const [i, value] of values.entries()) n.addBendPoint(new m.BendPoint(i * 60, value));
    b.addNote(n);
    return n;
  }
  beat(0, m.Duration.Half, 1);
  const origin = beat(0, m.Duration.Quarter);
  add(origin, 5, 6, false, [2, 0]).gtsTiedBend = true;
  add(origin, 6, 8).slideOutType = m.SlideOutType.Legato;
  const first = beat(1, m.Duration.Whole), last = beat(2, m.Duration.Half, 1);
  add(first, 5, 6, true, [0, 0]);
  add(first, 6, 9);
  add(last, 5, 6, true, [0, 0]);
  add(last, 6, 9, true);
  beat(2, m.Duration.Quarter);
  beat(3, m.Duration.Whole);
  const settings = new a.Settings();
  score.finish(settings);
  const bytes = new a.exporter.Gp7Exporter().export(score, settings);
  for (const lib of [a, core]) {
    const loaded = lib.importer.ScoreLoader.loadScoreFromBytes(bytes, new lib.Settings());
    const read = lib === a
      ? JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(loaded)), settings)
      : loaded;
    const chord = read.tracks[0].staves[0].bars[0].voices[0].beats[1].notes;
    const bend = chord.find(n => n.gtsTiedBend), slide = chord.find(n => n.slideOutType === m.SlideOutType.Legato);
    assert(bend.tieDestination.tieDestination);
    assert(slide.slideTarget.tieDestination);
    const result = playback(lib, read);
    const starts = [2880, 14400];
    assert.deepEqual(result.attacks, starts.flatMap(start => [[start,7680,66,0],[start,960,72,0],[start+960,6720,73,0]]));
    assert.deepEqual(result.bars.at(-1), [19200,23040]);
    for (const start of starts) {
      const curve = result.wheels.filter(([tick,key]) => key === 66 && tick >= start && tick <= start + 7680);
      assert.deepEqual(curve, Array.from({length: 1537}, (_, i) => [start+i*5,66,
        Math.round(8192 + 6144 * Math.log2(1 + (2 ** (-1 / 12) - 1) * i / 1536))]));
    }
    assert.notDeepEqual(playback(lib,read,true).attacks, result.attacks);
  }
});
