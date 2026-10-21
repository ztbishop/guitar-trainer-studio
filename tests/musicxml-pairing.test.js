import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {findNotationTabPairs,combineNotationTabPair} from '../js/musicxml-pairing.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {noteStatesFromRecords,buildNotationMarks} from '../js/practice-visuals.js';
const context=vm.createContext({console,process});
vm.runInContext(fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const at=context.alphaTab;
function fixture(){
  const settings=new at.Settings();settings.core.engine='svg';settings.core.enableLazyLoading=false;
  const parser=new at.importer.AlphaTexImporter();
  parser.initFromString('\\track "Guitar" 3.6.4 5.5.4 3.5.4 5.4.4 \\track "Guitar" 3.6.4 5.5.4 3.5.4 5.4.4',settings);
  const score=parser.readScore(),source=score.tracks[0].staves[0],target=score.tracks[1].staves[0];
  source.showTablature=false;target.showStandardNotation=false;
  for(const beat of source.bars[0].voices[0].beats)for(const note of beat.notes){const pitch=note.realValue;note.string=-1;note.fret=-1;note.octave=Math.floor(pitch/12);note.tone=pitch%12;}
  const chord=new at.model.Chord();chord.name='Gm7';source.addChord('gm',chord);source.bars[0].voices[0].beats[0].chordId='gm';
  return {score,source,target,settings};
}
test('repair retains one target stream, fingering and chord placement with native SVG and MIDI',()=>{
  const {score,target,settings}=fixture();
  const before=target.bars[0].voices[0].beats.flatMap(b=>b.notes.map(n=>[n.realValue,n.string,n.fret,b.playbackDuration]));
  const pairs=findNotationTabPairs(score,[[0,1]]);assert.equal(pairs.length,1);assert.deepEqual(pairs[0].differences,[]);
  combineNotationTabPair(score,pairs[0]);assert.equal(score.tracks.length,1);assert.equal(score.tracks[0].index,0);
  assert.ok(target.showStandardNotation && target.showTablature);
  assert.equal(target.chords.get(target.bars[0].voices[0].beats[0].chordId).name,'Gm7');
  assert.deepEqual(target.bars[0].voices[0].beats.flatMap(b=>b.notes.map(n=>[n.realValue,n.string,n.fret,b.playbackDuration])),before);
  const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=900;let chunks=0;
  renderer.error.on(error=>{throw error;});renderer.partialRenderFinished.on(r=>{if(r.renderResult)chunks++;});renderer.renderScore(score,[0]);assert.ok(chunks>0);
  const midi=new at.midi.MidiFile();assert.doesNotThrow(()=>new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi)).generate());
});
test('no candidate for ungrouped, ensemble, different music, mismatched names or conflicting chords',()=>{
  const base=fixture();
  assert.equal(findNotationTabPairs(base.score,[]).length,0);
  assert.equal(findNotationTabPairs(base.score,[[0,1,2]]).length,0);
  for(const mutate of [x=>{x.score.tracks[1].name='Bass';},x=>{x.target.bars[0].voices[0].beats[0].notes[0].fret++;},x=>{x.target.bars[0].voices[0].beats[0].chordId='existing';}]){
    const f=fixture();mutate(f);
    assert.equal(findNotationTabPairs(f.score,[]).length,0);
    assert.equal(findNotationTabPairs(f.score,[[0,1,2]]).length,0);
    assert.equal(findNotationTabPairs(f.score,[[0,1]]).length,0);
  }
});
test('duration discrepancies are disclosed and tab duration remains authoritative',()=>{
  const f=fixture();f.source.bars[0].voices[0].beats[0].playbackDuration=3840;
  const [pair]=findNotationTabPairs(f.score,[[0,1]]);assert.deepEqual(pair.differences,[1]);
  combineNotationTabPair(f.score,pair);assert.equal(f.target.bars[0].voices[0].beats[0].playbackDuration,960);
});

test('secondary gray voice remains pitched, grades in both modes and publishes correct feedback',()=>{
  const {score,source,target,settings}=fixture();
  for(const staff of [source,target]){
    const voice=new at.model.Voice();staff.bars[0].addVoice(voice);
    for(let i=0;i<4;i++){
      const beat=new at.model.Beat();beat.duration=at.model.Duration.Quarter;
      const note=new at.model.Note();
      if(staff===target){note.string=1;note.fret=0;}else{note.octave=3;note.tone=4;}
      beat.addNote(note);voice.addBeat(beat);
    }
  }
  score.finish(settings);
  const [pair]=findNotationTabPairs(score,[[0,1]]);assert.ok(pair);combineNotationTabPair(score,pair);
  const midi=new at.midi.MidiFile(),generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
  const timeline=buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division});
  const events=getPracticeEvents(timeline,'0');
  assert.equal(events.reduce((n,e)=>n+e.notes.length,0),8);
  assert.ok(timeline.events.some(e=>e.voiceIndex===1 && e.notes.length));
  assert.ok(target.bars[0].voices[1].beats.every(b=>b.notes.every(n=>!n.isPercussion)));
  assert.ok(events.every(e=>!e.isPercussive));
  for(const hex of [false,true]){
    for(const chordMode of ['collect','together']){
      const session=new WaitSession(events,{hex,chordMode});
      for(const [index,event] of events.entries())for(const note of event.notes){
        const input={midi:note.midi,channel:hex?7-note.string:1,stringHint:note.string,velocity:100,at:index*100};
        assert.equal(session.noteOn(index,input,input.at).type,'correct');session.noteOff({...input,at:input.at+1});
      }
      assert.equal(session.stats().accuracy,100);assert.equal(session.stats().correct,8);
      assert.equal(buildNotationMarks(events,null,noteStatesFromRecords(session.records)).filter(m=>m.state==='correct').length,8);
    }
    const realtime=new RealtimeSession(events,{hex});realtime.started=true;
    for(const event of events)for(const note of event.notes)assert.equal(realtime.noteOn({midi:note.midi,channel:hex?7-note.string:1,velocity:100},event.startTimeMs).type,'correct');
    realtime.finish();assert.equal(realtime.stats().accuracy,100);assert.equal(realtime.stats().correct,8);
  }
});
