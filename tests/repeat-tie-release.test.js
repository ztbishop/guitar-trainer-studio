import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import { tapProbe } from './right-hand-tap-fixtures.cjs';

const probe = tapProbe(), a = probe.at;
function fixture(){
  const m=a.model,settings=new a.Settings(),score=new m.Score(),track=new m.Track(),staff=new m.Staff();
  score.addTrack(track);track.addStaff(staff);
  staff.stringTuning=new m.Tuning('Test',[64,57,54,50,45,38],false);
  for(const [index,numerator,denominator,ending] of [[0,4,4,0],[1,4,4,0],[2,2,4,1],[3,7,8,1],[4,7,16,2]]){
    const master=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();
    master.timeSignatureNumerator=numerator;master.timeSignatureDenominator=denominator;
    master.isRepeatStart=index===0;master.repeatCount=index===3?2:0;master.alternateEndings=ending;
    if(index===0)master.tempoAutomations.push(m.Automation.buildTempoAutomation(false,0,100,2,false));
    score.addMasterBar(master);staff.addBar(bar);bar.addVoice(voice);
    const beat=duration=>{const b=new m.Beat();voice.addBeat(b);b.duration=duration;b.isEmpty=false;return b;};
    const add=fret=>{const n=new m.Note();n.string=5;n.fret=fret;beat(m.Duration.Sixteenth).addNote(n);return n;};
    if(index===1){
      for(const duration of [m.Duration.Half,m.Duration.Quarter,m.Duration.Eighth])beat(duration);
      add(5).isHammerPullOrigin=true;
      add(0).gtsRepeatTieRelease=true;
    }else if(index===2){
      add(0).isTieDestination=true;
      for(const duration of [m.Duration.Quarter,m.Duration.Eighth,m.Duration.Sixteenth])beat(duration);
    }else beat(m.Duration.Whole);
  }
  score.finish(settings);
  return score;
}
const origin=s=>s.tracks[0].staves[0].bars[1].voices[0].beats.at(-1).notes[0];

function playback(library,score,smf=false){
  const midi=new library.midi.MidiFile();
  const handler=new library.midi.AlphaSynthMidiFileHandler(midi,smf);
  const generator=new library.midi.MidiFileGenerator(score,new library.Settings(),handler);
  generator.generate();
  const bars=Array.from(generator.tickLookup.masterBars,b=>[b.masterBar.index,b.start,b.end]);
  const notes=Array.from(midi.events,e=>e instanceof library.midi.NoteOnEvent?[e.tick,e.noteKey,1]:
    e instanceof library.midi.NoteOffEvent?[e.tick,e.noteKey,0]:null).filter(Boolean);
  return {bars,notes};
}

test('repeat-ending release survives GP, classic and core readers, and worker score transport',()=>{
  const bytes=probe.gp(fixture()),score=probe.read(bytes),codec=probe.p.JsonConverter;
  const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(score)),new a.Settings());
  const readCore=gp=>core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(gp),new core.Settings());
  const reexport=readCore(new core.exporter.Gp7Exporter().export(readCore(bytes),new core.Settings()));
  const expected=playback(a,score);
  assert.deepEqual(expected.bars.map(b=>b[0]),[0,1,2,3,0,1,4]);
  assert.deepEqual(expected.notes.filter(e=>e[1]===57),[[7440,57,1],[7920,57,0],[20400,57,1],[20850,57,0]]);
  assert.equal([...probe.xml(bytes).matchAll(/name="GtsRepeatTieRelease"/g)].length,1);
  for(const [library,model] of [[a,worker],[a,probe.read(probe.gp(score))],[core,reexport]]){
    const note=origin(model);
    assert.equal(note.gtsRepeatTieRelease,true);
    assert.equal(note.tieDestination.beat.voice.bar.index,2);
    assert.equal(note.hammerPullOrigin.fret,5);
    assert.deepEqual(playback(library,model),expected);
  }
});

test('unmarked playback, standard MIDI and a forged ending clock keep the native release',()=>{
  const score=probe.read(probe.gp(fixture()));
  const stock=playback(a,score,true);
  assert.deepEqual(stock.notes.filter(e=>e[1]===57),[[7440,57,1],[7920,57,0],[20400,57,1],[20880,57,0]]);
  origin(score).gtsRepeatTieRelease=false;
  assert.deepEqual(playback(a,score),stock);
  origin(score).gtsRepeatTieRelease=true;
  score.masterBars[4].timeSignatureNumerator=8;
  const forged=playback(a,score);
  assert.equal(forged.bars.at(-1)[2]-forged.bars.at(-1)[1],1920);
  assert.deepEqual(forged.notes,stock.notes);
});
