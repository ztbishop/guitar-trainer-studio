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

function playback(lib,score,smf=false) {
  const attacks=[],wheels=[];
  const handler=new lib.midi.AlphaSynthMidiFileHandler(new lib.midi.MidiFile(),smf);
  handler.addNote=(_t,tick,length,key,_v,_ch,offset=0)=>attacks.push([tick,length,key,offset]);
  handler.addNoteBend=(_t,tick,_c,key,wheel)=>wheels.push([tick,key,wheel]);
  const gen=new lib.midi.MidiFileGenerator(score,new lib.Settings(),handler);
  gen.generate();
  return {attacks,wheels,bars:Array.from(gen.tickLookup.masterBars,b=>[b.start,b.end])};
}
function fixture(marked) {
  const score=new m.Score(), track=new m.Track(), staff=new m.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  track.playbackInfo.program=27;
  track.playbackInfo.secondaryChannel=1;
  staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
  const voices=Array.from({length:6},(_,i)=>{
    const master=new m.MasterBar(), bar=new m.Bar(), voice=new m.Voice();
    master.tripletFeel=m.TripletFeel.Triplet8th;
    master.isRepeatStart=i===0;
    master.repeatCount=i===5?2:0;
    score.addMasterBar(master);
    staff.addBar(bar);
    bar.addVoice(voice);
    return voice;
  });
  const beat=(bar,duration,{triplet=false,dots=0}={})=>{
    const b=new m.Beat();
    b.duration=duration; b.dots=dots;
    if(triplet){b.tupletNumerator=3; b.tupletDenominator=2;}
    voices[bar].addBeat(b);
    return b;
  };
  const note=(b,string,fret,{kind=0,tie=false,slide=false,mute=false,curve=[],bend=false}={})=>{
    const n=new m.Note();
    n.string=string; n.fret=fret; n.isTieDestination=tie; n.isPalmMute=mute;
    if(slide)n.slideOutType=m.SlideOutType.Legato;
    n.gtsSourceArticulation=marked?kind:0;
    n.gtsTiedBend=marked&&bend;
    for(const [offset,value] of curve)n.addBendPoint(new m.BendPoint(offset,value));
    b.addNote(n);
    return n;
  };
  const D=m.Duration;
  beat(0,D.Eighth);
  note(beat(0,D.Eighth),2,5,{kind:5,slide:true});
  note(beat(0,D.Eighth),2,4,{kind:5,slide:true});
  note(beat(0,D.Eighth),2,5);
  beat(0,D.Half);
  // The open-string mute takes the second eighth of the final quarter.
  voices[0].beats.pop();
  beat(0,D.Quarter);
  beat(0,D.Eighth);
  note(beat(0,D.Eighth),2,0,{kind:6,mute:true});
  for(let i=0;i<3;i++)beat(1,D.Quarter);
  beat(1,D.Eighth);
  note(beat(1,D.Eighth),2,9,{kind:5,slide:true});
  note(beat(2,D.Eighth),2,14);
  beat(2,D.Eighth);
  beat(2,D.Quarter);
  beat(2,D.Half);
  for(let i=0;i<3;i++)beat(3,D.Quarter);
  const origin=beat(3,D.Eighth,{triplet:true});
  note(origin,3,15,{kind:8});
  note(origin,4,12,{kind:7,bend:true,curve:[[0,0],[30,4],[60,0]]});
  const tail=beat(3,D.Quarter,{triplet:true});
  note(tail,3,15,{tie:true,slide:true});
  note(tail,4,12,{tie:true,slide:true,curve:[[0,0],[60,0]]});
  const target=beat(4,D.Eighth);
  note(target,3,13); note(target,4,10);
  beat(4,D.Eighth);
  beat(4,D.Quarter);
  beat(4,D.Half);
  const held=beat(5,D.Eighth);
  note(held,4,5,{kind:9,bend:true,curve:[[0,0],[60,4]]});
  note(held,5,6);
  note(beat(5,D.Quarter,{dots:1}),4,5,{tie:true,curve:[[0,4],[60,4]]});
  note(beat(5,D.Half),4,5,{tie:true,curve:[[0,4],[60,4]]});
  score.finish(new a.Settings());
  return new a.exporter.Gp7Exporter().export(score,new a.Settings());
}

test('marked slide visits, palm-mute sample and written mixed swing survive GP and worker round-trips',()=>{
  const expected=[
    [640,320,50,0],[960,640,49,0],[1600,320,50,0],[3520,40,45,400],
    [7360,272,54,0],[7632,12,55,200],[7644,12,56,200],[7656,12,57,200],[7668,12,58,200],[7680,640,59,0],
    [14400,960,65,0],[14400,960,67,0],[15264,96,66,200],[15360,640,63,0],[15360,640,65,0],
    [19200,3840,60,0],[19200,640,65,0],
  ];
  for(const lib of [a,core]){
    const settings=new lib.Settings();
    const read=marked=>lib.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),settings);
    const score=read(true);
    const model=lib===a?JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings):score;
    const beats=model.tracks[0].staves[0].bars[5].voices[0].beats;
    assert.deepEqual(Array.from(beats,b=>b.playbackDuration),[480,1440,1920]);
    const actual=playback(lib,model);
    assert.equal(actual.bars.length,12);
    const sorted=events=>events.map(x=>x.join(',')).sort();
    assert.deepEqual(sorted(actual.attacks),sorted([0,23040].flatMap(start=>expected.map(([tick,...e])=>[start+tick,...e]))));
    assert(actual.wheels.some(([tick,key,wheel])=>tick===14880&&key===67&&wheel===9216));
    assert(actual.wheels.some(([tick,key,wheel])=>tick===23040&&key===60&&wheel===9216));
    assert.deepEqual(playback(lib,model,true),playback(lib,read(false),true));
  }
});
