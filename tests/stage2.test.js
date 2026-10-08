import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildPlaybackTimeline, getPracticeEvents, tickToTimeMs, timeMsToTick } from '../js/score-playback.js';
import { buildExpectedEventsFromPracticeTrack, updateActiveTargetsFromPlayback } from '../js/practice-engine.js';
import { AppState } from '../js/app-state.js';
const context=vm.createContext({console,process});
vm.runInContext(fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const at=context.alphaTab;
function generate(tex, alter=()=>{}, settings=new at.Settings()) {
  const parser=new at.importer.AlphaTexImporter(); parser.initFromString(tex,settings);
  const score=parser.readScore(); alter(score);
  const midi=new at.midi.MidiFile();
  const generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));
  generator.generate();
  return {score,cache:generator.tickLookup,midi,timeline:buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division})};
}
function select({score,timeline}, trackId='0') {
  AppState.tracks=score.tracks; AppState.playbackTimeline=timeline; AppState.practiceTrackId=trackId;
  return buildExpectedEventsFromPracticeTrack();
}
test('actual alphaTab repeats generate distinct occurrences and return to the same written notes',()=>{
  const data=generate(String.raw`\tempo 120 . \ro 0.6.1 | \rc 2 2.6.1 | 3.6.1`);
  assert.deepEqual(data.timeline.measures.map(m=>m.measureNumber),[1,2,1,2,3]);
  const events=select(data);
  assert.deepEqual(events.map(e=>e.startTick),[0,3840,7680,11520,15360]);
  assert.deepEqual(events.map(e=>e.pitches[0]),[40,42,40,42,43]);
  assert.equal(events[0].sourceBeatId,events[2].sourceBeatId);
  assert.notEqual(events[0].notes[0].id,events[2].notes[0].id);
  assert.equal(updateActiveTargetsFromPlayback(7680).measureNumber,1);
  assert.equal(updateActiveTargetsFromPlayback(15360).measureNumber,3);
  assert.equal(updateActiveTargetsFromPlayback(19200),null);
  assert.equal(updateActiveTargetsFromPlayback(0).measureNumber,1);
});
test('alternate endings use the actual generated sequence',()=>{
  const data=generate(String.raw`\tempo 120 . \ro 0.6.1 | \ae 1 \rc 2 2.6.1 | \ae 2 3.6.1`);
  assert.deepEqual(data.timeline.measures.map(m=>m.measureNumber),[1,2,1,3]);
  assert.deepEqual(select(data).map(e=>e.pitches[0]),[40,42,40,43]);
});
test('ties retain continuation identity and extend duration without creating new required attacks',()=>{
  const data=generate(String.raw`\tempo 120 . 0.6.2 -.6.2 | -.6.2 2.6.2`);
  const notes=data.timeline.events.flatMap(e=>e.notes);
  assert.deepEqual(notes.map(n=>n.attack),[true,false,false,true]);
  assert.equal(notes[0].durationTicks,5760);
  assert.equal(notes[1].attackNoteId,notes[0].id);
  assert.equal(notes[2].attackNoteId,notes[0].id);
  assert.equal(notes[0].endTimeMs,3000);
  const events=select(data); assert.equal(events.length,2);
  assert.equal(updateActiveTargetsFromPlayback(1920),null);
  assert.equal(updateActiveTargetsFromPlayback(5760).pitches[0],42);
});
test('rests and silence do not prematurely target the next attack',()=>{
  const data=generate(String.raw`\tempo 120 . r.2 0.6.2 | r.1 | 2.6.1`);
  assert.equal(data.timeline.events.filter(e=>e.isRest).length,2);
  select(data);
  assert.equal(updateActiveTargetsFromPlayback(0),null);
  assert.equal(updateActiveTargetsFromPlayback(1920).pitches[0],40);
  assert.equal(updateActiveTargetsFromPlayback(3840),null);
  assert.equal(updateActiveTargetsFromPlayback(7679),null);
  assert.equal(updateActiveTargetsFromPlayback(7680).pitches[0],42);
});
test('same-pitch chord notes remain separate on different strings',()=>{
  const data=generate(String.raw`\tempo 120 . (5.6 0.5).1`);
  const events=getPracticeEvents(data.timeline,'0');
  assert.equal(events[0].notes.length,2); assert.deepEqual(events[0].pitches,[45]);
  assert.notEqual(events[0].notes[0].id,events[0].notes[1].id);
  assert.deepEqual(events[0].notes.map(n=>n.string).sort(),[5,6]);
});
test('tempo changes, repeated tempo segments, and speed conversion round-trip',()=>{
  const data=generate(String.raw`\tempo 120 . \ro 0.6.1 | \tempo 60 \rc 2 2.6.1 | \tempo 120 3.6.1`);
  assert.deepEqual(data.timeline.tempoMap.map(t=>t.bpm),[120,60,120,60,120]);
  for(const tick of [0,960,3840,5000,7680,11520,15360,19200]) {
    for(const speed of [0.5,1,1.5]) assert.ok(Math.abs(timeMsToTick(data.timeline,tickToTimeMs(data.timeline,tick,speed),speed)-tick)<0.00001);
  }
  assert.equal(tickToTimeMs(data.timeline,3840),2000);
  assert.equal(tickToTimeMs(data.timeline,7680),6000);
});
test('split highlight spans from overlapping voices do not duplicate attacks or hide later targets',()=>{
  const data=generate(String.raw`\tempo 120 . 0.6.1`,score=>{
    const bar=score.tracks[0].staves[0].bars[0];
    const voice=new at.model.Voice(); bar.addVoice(voice);
    for(let i=0;i<4;i++) {
      const beat=new at.model.Beat(); beat.duration=at.model.Duration.Quarter;
      voice.addBeat(beat); const note=new at.model.Note();note.string=5;note.fret=i;beat.addNote(note);
    }
    score.finish(new at.Settings());
  });
  const events=select(data);
  assert.equal(data.timeline.events.length,5);
  assert.equal(events.length,4); assert.equal(events[0].notes.length,2);
  assert.equal(updateActiveTargetsFromPlayback(960).startTick,960);
  assert.equal(updateActiveTargetsFromPlayback(1920).startTick,1920);
});
test('track filtering and timeline invalidation remove previous targets',()=>{
  const data=generate(String.raw`\tempo 120 . 0.6.1`);
  select(data); assert.equal(AppState.expectedEvents.length,1);
  assert.deepEqual(getPracticeEvents(data.timeline,'99'),[]);
  AppState.playbackTimeline=null;buildExpectedEventsFromPracticeTrack();
  assert.deepEqual(AppState.expectedEvents,[]);assert.equal(AppState.trainer.currentEvent,null);
  assert.match(AppState.trainer.status,/Preparing/);
});
test('swing uses generated onset ticks rather than written beat starts',()=>{
  const data=generate(String.raw`\tempo 120 . 0.6.8 1.6.8 2.6.8 3.6.8 4.6.8 5.6.8 6.6.8 7.6.8`,score=>{
    score.masterBars[0].tripletFeel=at.model.TripletFeel.Triplet8th;
  });
  const events=select(data);
  assert.deepEqual(events.slice(0,3).map(e=>e.startTick),[0,640,960]);
  assert.equal(events[1].writtenStartTick,480);
  assert.equal(updateActiveTargetsFromPlayback(640).pitches[0],41);
});
test('tempo change inside a measure integrates both segments',()=>{
  const data=generate(String.raw`\tempo 120 . 0.6.1`,score=>{
    score.masterBars[0].tempoAutomations.push(at.model.Automation.buildTempoAutomation(false,0.5,60,2));
  });
  assert.equal(tickToTimeMs(data.timeline,1920),1000);
  assert.equal(tickToTimeMs(data.timeline,3840),3000);
  assert.equal(timeMsToTick(data.timeline,2000),2880);
});
