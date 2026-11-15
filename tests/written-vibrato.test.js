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

function fixture(marked, heldRise = false) {
  const score = new m.Score(), track = new m.Track(), staff = new m.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  track.playbackInfo.program = 27;
  track.playbackInfo.secondaryChannel = 1;
  staff.stringTuning = new m.Tuning('Standard', [64,59,55,50,45,40], false);
  const voices = [];
  for (let i = 0; i < 4; i++) {
    const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
    master.isRepeatStart = i === 0;
    master.repeatCount = i === 3 ? 2 : 0;
    score.addMasterBar(master);
    staff.addBar(bar);
    bar.addVoice(voice);
    voices.push(voice);
  }
  const beat = (bar,duration) => {
    const b = new m.Beat();
    b.duration = duration;
    voices[bar].addBeat(b);
    return b;
  };
  function add(beat,string,fret,points=[],tie=false,vibrato=false) {
    const n = new m.Note();
    n.string=string;
    n.fret=fret;
    n.isTieDestination=tie;
    n.vibrato=vibrato?m.VibratoType.Slight:m.VibratoType.None;
    n.gtsWrittenVibrato=marked&&vibrato;
    for(const [offset,value] of points)n.addBendPoint(new m.BendPoint(offset,value));
    beat.addNote(n);
    return n;
  }
  const chord=beat(0,m.Duration.Whole);
  add(chord,5,12,[],false,true);
  add(chord,4,12);
  for(let i=0;i<7;i++)beat(1,m.Duration.Eighth);
  const pickup=beat(1,m.Duration.Eighth);
  add(pickup,4,8,heldRise?[[0,0],[60,2]]:[[0,0],[30,4],[60,0]]).gtsTiedBend=true;
  add(pickup,5,9);
  add(beat(2,m.Duration.Whole),4,8,heldRise?[[0,2],[60,2]]:[[0,0],[60,0]],true,true);
  add(beat(3,m.Duration.Half),4,8,heldRise?[[0,2],[60,2]]:[[0,0],[60,0]],true,true);
  beat(3,m.Duration.Half);
  score.finish(new a.Settings());
  return score;
}

function playback(library,score,smf=false) {
  const notes=[],wheels=[],midi=new library.midi.MidiFile();
  const handler=new library.midi.AlphaSynthMidiFileHandler(midi,smf);
  handler.addNote=(_t,tick,length,key)=>notes.push([tick,length,key]);
  handler.addNoteBend=(_t,tick,_c,key,wheel)=>wheels.push([tick,key,wheel]);
  const g=new library.midi.MidiFileGenerator(score,new library.Settings(),handler);
  g.generate();
  return {notes,wheels,order:Array.from(g.tickLookup.masterBars,b=>b.masterBar.index)};
}

test('marked vibrato keeps its GP notation, steady dyad and uninterrupted tied peak on both passes', () => {
  const bytes=new a.exporter.Gp7Exporter().export(fixture(true),new a.Settings());
  for(const library of [a,core]){
    const score=library.importer.ScoreLoader.loadScoreFromBytes(bytes,new library.Settings());
    const model=library===a
      ? JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),new a.Settings())
      : score;
    const bars=model.tracks[0].staves[0].bars;
    const dyad=bars[0].voices[0].beats[0].notes;
    assert.deepEqual(Array.from(dyad,n=>[n.vibrato,n.gtsWrittenVibrato]),[[m.VibratoType.Slight,true],[m.VibratoType.None,false]]);
    const origin=bars[1].voices[0].beats[7].notes[0],tail=origin.tieDestination;
    assert(tail.gtsWrittenVibrato&&tail.tieDestination.gtsWrittenVibrato);
    assert.equal(tail.vibrato,m.VibratoType.Slight);
    const {notes,wheels,order}=playback(library,model);
    assert.deepEqual(order,[0,1,2,3,0,1,2,3]);
    for(const offset of [0,15360]){
      assert.deepEqual(notes.filter(([tick])=>tick===offset),[[offset,3840,71],[offset,3840,67]]);
      assert(wheels.filter(([tick])=>tick>=offset&&tick<offset+3840).every(([, ,value])=>value===8192));
      assert(notes.some(n=>n.join()===[offset+7200,6240,63].join()));
      assert(notes.some(n=>n.join()===[offset+7200,480,68].join()));
      assert(wheels.some(n=>n.join()===[offset+10320,63,9216].join()));
      assert(wheels.some(n=>n.join()===[offset+13440,63,8192].join()));
    }
    assert(playback(library,model,true).wheels.some(([tick,key,w])=>tick<3840&&key===71&&w!==8192));
    const ordinary=library.importer.ScoreLoader.loadScoreFromBytes(new a.exporter.Gp7Exporter().export(fixture(false),new a.Settings()),new library.Settings());
    assert(playback(library,ordinary).wheels.some(([tick,key,w])=>tick<3840&&key===71&&w!==8192));
  }
});

test('written vibrato on a rising tie preserves one attack and the partner release', () => {
  const settings=new a.Settings(), exporter=new a.exporter.Gp7Exporter();
  const bytes=exporter.export(fixture(true,true),settings);
  const ordinary=exporter.export(fixture(false,true),settings);
  for(const library of [a,core]){
    const load=bytes=>library.importer.ScoreLoader.loadScoreFromBytes(bytes,new library.Settings());
    const score=load(bytes), model=library===a
      ? JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings)
      : score;
    const origin=model.tracks[0].staves[0].bars[1].voices[0].beats[7].notes[0];
    const tail=origin.tieDestination, end=tail.tieDestination;
    for(const note of [tail,end]){
      assert(note.gtsWrittenVibrato&&note.vibrato===m.VibratoType.Slight);
      assert.deepEqual(Array.from(note.bendPoints,p=>p.value),[2,2]);
    }
    const {notes,wheels,order}=playback(library,model);
    assert.deepEqual(order,[0,1,2,3,0,1,2,3]);
    for(const start of [7200,22560]){
      const end=start+6240;
      assert.deepEqual(notes.filter(([tick])=>tick>=start&&tick<end),[[start,6240,63],[start,480,68]]);
      const ramp=Array.from({length:1249},(_,i)=>{
        const offset=i*5;
        return [start+offset,63,Math.round(8192+6144*Math.log2(1+(2**(1/12)-1)*offset/6240))];
      });
      assert.deepEqual(wheels.filter(([tick,key])=>key===63&&tick>=start&&tick<=end),ramp);
      assert.deepEqual(wheels.filter(([tick,key])=>key===68&&tick>=start&&tick<=end),[[start,68,8192]]);
    }
    assert.deepEqual(playback(library,model,true),playback(library,load(ordinary),true));
  }
});

test('held rise follows a skipped first ending into its silent final bar', () => {
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
  function addBeat(bar, duration, triplet = false) {
    const beat = new m.Beat();
    beat.duration = duration;
    if (triplet) {
      beat.tupletNumerator = 3;
      beat.tupletDenominator = 2;
    }
    voices[bar].addBeat(beat);
    return beat;
  }
  function addBend(beat, continuation) {
    const note = new m.Note();
    note.string = 3;
    note.fret = 13;
    note.isTieDestination = continuation;
    note.gtsTiedBend = !continuation;
    note.gtsWrittenVibrato = continuation;
    note.vibrato = continuation ? m.VibratoType.Slight : m.VibratoType.None;
    note.addBendPoint(new m.BendPoint(0, continuation ? 2 : 0));
    note.addBendPoint(new m.BendPoint(60, 2));
    beat.addNote(note);
  }
  for (let i = 0; i < 11; i++) addBeat(0, m.Duration.Eighth, true);
  addBend(addBeat(0, m.Duration.Eighth, true), false);
  for (let i = 0; i < 2; i++) addBend(addBeat(1, m.Duration.Half), true);
  addBend(addBeat(2, m.Duration.Quarter), true);
  addBeat(2, m.Duration.Quarter);
  addBeat(2, m.Duration.Half);
  addBeat(3, m.Duration.Whole);
  const settings = new a.Settings();
  score.finish(settings);
  const bytes = new a.exporter.Gp7Exporter().export(score, settings);
  for (const library of [a, core]) {
    const read = library.importer.ScoreLoader.loadScoreFromBytes(bytes, new library.Settings());
    const model = library === a
      ? JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(read)), settings)
      : read;
    const origin = model.tracks[0].staves[0].bars[0].voices[0].beats[11].notes[0];
    let tail = origin;
    for (let i = 0; i < 3; i++) {
      tail = tail.tieDestination;
      assert.equal(tail.vibrato, m.VibratoType.Slight);
      assert.equal(tail.gtsWrittenVibrato, true);
    }
    const result = playback(library, model);
    assert.deepEqual(result.order, [0,1,2,0,1,3]);
    const starts = [3520, 15040];
    assert.deepEqual(result.notes, starts.map(tick => [tick, 5120, 63]));
    const curve = starts.flatMap(start => Array.from({length: 1025}, (_, i) =>
      [start + i * 5, 63, Math.round(8192 + 6144 * Math.log2(1 + (2 ** (1 / 12) - 1) * i / 1024))]));
    assert.deepEqual(result.wheels, curve);
    assert.notDeepEqual(playback(library, model, true).wheels, curve);
  }
});
