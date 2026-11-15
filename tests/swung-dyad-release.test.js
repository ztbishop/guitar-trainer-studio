import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({process,console,Map,TextEncoder,TextDecoder});
vm.runInContext(code.slice(0,end)+'exports.probe={JsonConverter};'+code.slice(end),context);
const a = context.alphaTab, m = a.model, settings = new a.Settings();

function fixture(marked) {
 const score = new m.Score(), track = new m.Track(), staff = new m.Staff();
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program = 27;
 track.playbackInfo.secondaryChannel = 1;
 staff.stringTuning = new m.Tuning('Standard',[64,59,55,50,45,40],false);
 const voices = [];
 for (let i=0;i<5;i++) {
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
  master.tripletFeel = m.TripletFeel.Triplet8th;
  master.isRepeatStart = i===0;
  master.repeatCount = i===4?2:0;
 }
 const {Quarter:Q,Half:H,Eighth:E,Sixteenth:S} = m.Duration;
 const beat = (bar,d=Q,{octave=false,dots=0}={}) => {
  const b = new m.Beat();
  voices[bar].addBeat(b);
  b.duration=d; b.dots=dots;
  if(octave)b.ottava=m.Ottavia._8va;
  return b;
 };
 const note = (b,string,fret,{bend,tie=false,slide=false,held=false,falling=false,kind=0}={}) => {
  const n = new m.Note();
  n.string=string; n.fret=fret; n.isTieDestination=tie;
  if(bend)for(const [offset,value] of bend)n.addBendPoint(new m.BendPoint(offset,value));
  if(slide)n.slideOutType=m.SlideOutType.Legato;
  n.gtsTiedBend=marked&&held; n.gtsFallingTie=marked&&falling; n.gtsSourceArticulation=marked?kind:0;
  b.addNote(n);
 };
 const bend = (x,y) => [[0,x],[60,y]];
 beat(0,H); beat(0);
 const start=beat(0);
 note(start,5,5,{bend:bend(2,0),held:true,kind:16}); note(start,6,7,{kind:16});
 const tail=beat(1), target=beat(1), landing=beat(1,E);
 note(tail,5,5,{bend:bend(0,0),tie:true,slide:true}); note(tail,6,7,{tie:true,slide:true});
 note(target,5,8,{slide:true,kind:17}); note(target,6,9,{slide:true,kind:17});
 note(landing,5,13); note(landing,6,14);
 beat(1,E);
 const rise=beat(1);
 note(rise,5,15,{bend:bend(0,4),falling:true}); note(rise,6,18);
 note(beat(2,S),5,15,{bend:bend(4,0),tie:true,kind:18});
 note(beat(2,S),5,15,{bend:bend(0,0),tie:true});
 beat(2,E); beat(2); beat(2,H);
 const long=beat(3,E,{octave:true});
 note(long,5,17,{bend:bend(0,4),held:true,kind:19}); note(long,6,20);
 note(beat(3,Q,{dots:1,octave:true}),5,17,{bend:bend(4,4),tie:true});
 note(beat(3,H,{octave:true}),5,17,{bend:bend(4,4),tie:true});
 note(beat(4,H,{octave:true}),5,17,{bend:bend(4,4),tie:true});
 beat(4,H);
 score.finish(settings);
 return new a.exporter.Gp7Exporter().export(score,settings);
}

function trace(library,score,smf=false) {
 const attacks=[];
 const handler=new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(),smf);
 handler.addNote=(_track,tick,length,key,_velocity,channel,offset=0)=>attacks.push([tick,length,key,offset,channel]);
 handler.addNoteBend=()=>{};
 new library.midi.MidiFileGenerator(score,new library.Settings(),handler).generate();
 return attacks;
}

test('swung release dyads keep independent samples and written holds through GP and worker readback',()=>{
 for(const library of [a,core]){
  const load=marked=>library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked),new library.Settings());
  let score=load(true);
  if(library===a){
   const {JsonConverter}=a.probe;
   score=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings);
  }
  const attacks=trace(library,score);
  for(const shift of [0,19200]){
   const expected=[
    [2880,1920,65,0,1],[2880,1920,71,0,0],[4656,72,65,200,0],[4728,72,66,200,0],
    [4800,816,67,0,0],[4800,816,73,0,0],
    [5760,640,72,0,0],[5760,640,78,0,0],[6720,960,74,0,1],[7680,640,76,300,1],
    [11520,5760,76,0,1],[11520,640,84,0,0],
   ];
   for (let i=0;i<4;i++)for(const key of [68,74])expected.push([5616+36*i,36,key+i,200,0]);
   for (const [tick,...event] of expected)
    assert(attacks.some(x=>x.join()===[tick+shift,...event].join()),[tick+shift,...event].join());
  }
  assert.equal(attacks.filter(e=>e[3]===200).length,20);
  assert.equal(attacks.filter(e=>e[3]===300).length,2);
  assert.deepEqual(trace(library,score,true),trace(library,load(false),true));
 }
});
