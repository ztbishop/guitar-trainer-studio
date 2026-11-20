import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {AppState} from '../js/app-state.js';
import {buildExpectedEventsFromPracticeTrack,updateActiveTargetsFromPlayback,refreshTrainerMatchState} from '../js/practice-engine.js';
const probe=tapProbe(),classic=probe.at;
function make(at=core,tex='. (0.1 0.2).1 | r.1 | r.1') {
  const p=new at.importer.AlphaTexImporter();p.initFromString(tex,new at.Settings());const s=p.readScore();
  const bars=s.tracks[0].staves[0].bars;
  for(const b of bars.slice(1)){b.simileMark=1;for(const v of b.voices)for(const e of v.beats){e.notes=[];e.isEmpty=true;}}
  s.finish(new at.Settings());return s;
}
function cache(at,s){const midi=new at.midi.MidiFile(),notes=[],handler=new at.midi.AlphaSynthMidiFileHandler(midi),original=handler.addNote.bind(handler);handler.addNote=(...args)=>{notes.push(args.slice(0,4));original(...args);};const g=new at.midi.MidiFileGenerator(s,new at.Settings(),handler);g.generate();return {lookup:g.tickLookup,notes};}
const project=(at,s,c=cache(at,s))=>buildPlaybackTimeline(c.lookup,{score:s,tempo:s.tempo});
const shape=s=>s.tracks.map(t=>t.staves.map(st=>({tuning:[...st.tuning],capo:st.capo,bars:st.bars.map(b=>({simile:b.simileMark,voices:b.voices.map(v=>v.beats.map(e=>[e.id,e.playbackStart,e.playbackDuration,e.notes.map(n=>[n.id,n.realValue,n.string,n.fret,n.tieOrigin?.id,n.tieDestination?.id])]))}))})));
function variants(tex){const bytes=probe.gp(make(classic,tex)),s=probe.read(bytes);return [['classic',classic,s],['classic worker',classic,probe.p.JsonConverter.jsObjectToScore(structuredClone(probe.p.JsonConverter.scoreToJsObject(s)),new classic.Settings())],['core',core,core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings())]];}
test('simple/chained similes expose all native attacks without editing the score in classic/core/worker',()=>{
 for(const [name,at,s]of variants()){
  const before=shape(s),c=cache(at,s),t=project(at,s,c),events=getPracticeEvents(t,0);
  assert.equal(t.similePracticeIssues,undefined,name);assert.deepEqual(shape(s),before,name);
  assert.deepEqual(events.map(e=>[e.measureNumber,e.startTick,e.notes.map(n=>n.midi)]),[[1,0,[64,59]],[2,3840,[64,59]],[3,7680,[64,59]]],name);
  assert.equal(events.reduce((n,e)=>n+e.notes.length,0),c.notes.length,name);
  assert.equal(new Set(events.flatMap(e=>e.notes.map(n=>n.id))).size,6,name);
  for(const e of events.slice(1)){
   const placeholder=s.tracks[0].staves[0].bars[e.measureNumber-1].voices[0].beats[0];
   assert.equal(e.sourceBeatId,String(placeholder.id));assert.equal(e.writtenStartTick,placeholder.absolutePlaybackStart);
   assert.equal(e.donorMeasureNumber,1);assert(e.notes.every(n=>n.sourceNoteId.startsWith('simile:') && n.donorSourceNoteId));
  }
  assert.equal(t.ambiguousHoldEvidenceComplete,false,'repeat placeholders never prove recording silence');
 }
});
test('multi-beat donor retains chord positions, rests, tuning/capo and a fresh attack at each repeated visit',()=>{
 const s=make(core,String.raw`. (0.1 5.2).4 r.4 2.3.2 | \ro r.1 | \rc 2 r.1`),staff=s.tracks[0].staves[0];staff.capo=2;
 s.finish(new core.Settings());
 const c=cache(core,s),before=shape(s),t=project(core,s,c),ev=getPracticeEvents(t,0);
 assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(shape(s),before);assert.equal(ev.length,10);
 assert.equal(ev.reduce((n,e)=>n+e.notes.length,0),c.notes.length);assert.equal(new Set(ev.flatMap(e=>e.notes.map(n=>n.id))).size,15);
 assert.deepEqual(ev.map(e=>[e.measureNumber,e.occurrence]),[[1,1],[1,1],[2,1],[2,1],[3,1],[3,1],[2,2],[2,2],[3,2],[3,2]]);
 for(const e of ev.filter(e=>e.donorMeasureNumber))assert(e.notes.every(n=>n.attack && n.attackNoteId===n.id));
});
test('a reciprocal plain tie wholly inside a donor retains one sustained attack per simile occurrence',()=>{
 for(const [name,at,s]of variants('. 0.1.2 -.1.2 | r.1 | r.1')){
 const before=shape(s),t=project(at,s),ev=getPracticeEvents(t,0);
 assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(shape(s),before);assert.equal(ev.length,3);
 assert.deepEqual(ev.map(e=>[e.startTick,e.notes[0].endTick]),[[0,3840],[3840,7680],[7680,11520]]);
 for(const dest of t.events.flatMap(e=>e.notes).filter(n=>!n.attack))assert(dest.attackNoteId);
 assert.equal(new Set(ev.map(e=>e.notes[0].attackNoteId)).size,3);
 }
});
test('split/duplicated native highlights do not duplicate projected simile attacks',()=>{
 const s=make(),c=cache(core,s),v=c.lookup.masterBars[1];v.firstBeat.highlightedBeats.push(...v.firstBeat.highlightedBeats);
 const t=project(core,s,c);assert.equal(getPracticeEvents(t,0).length,3);
});
test('a proved full rest donor stays silent across simple similes',()=>{
 const s=make(core,'. r.1 | r.1 | r.1'),t=project(core,s);
 assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(getPracticeEvents(t,0),[]);
 assert.equal(t.events.length,3);assert(t.events.every(e=>e.isRest && !e.notes.length));
});
const negatives={
 'double simile':(s)=>s.tracks[0].staves[0].bars[1].simileMark=2,
 'missing donor':s=>s.tracks[0].staves[0].bars[0].simileMark=1,
 'changed meter':s=>s.masterBars[1].timeSignatureNumerator=3,
 'changed key':s=>s.tracks[0].staves[0].bars[1].keySignature=2,
 'notes in placeholder':s=>{const b=s.tracks[0].staves[0].bars;b[1].voices[0].beats[0].notes=b[0].voices[0].beats[0].notes;},
 'incomplete donor clock':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].playbackDuration=960,
 'unproved bend donor':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].bendType=1,
 'shortened articulation':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].isStaccato=true,
 'palm-muted donor':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].isPalmMute=true,
 'swung donor':s=>{for(const b of s.masterBars)b.tripletFeel=1;},
 'grace donor':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].graceType=1,
 'tremolo donor':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].tremoloPicking=8,
 'unproved tie':s=>s.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].isTieDestination=true,
 'missing highlight':(s,c)=>{c.lookup.masterBars[1].firstBeat.highlightedBeats=[];},
 'incomplete second voice':s=>{const b=s.tracks[0].staves[0].bars[0],v=new core.model.Voice(),e=new core.model.Beat(),n=new core.model.Note();b.addVoice(v);v.addBeat(e);n.string=1;n.fret=1;e.addNote(n);e.isEmpty=false;}
};
for(const [name,mutate]of Object.entries(negatives))test('guard incomplete practice instead of silently omitting repeat notes: '+name,()=>{
 const s=make(),c=cache(core,s);mutate(s,c);const t=project(core,s,c);
 assert(t.similePracticeIssues?.length);assert.deepEqual(getPracticeEvents(t,0),[]);
 const healthy={...t,events:[{trackId:'1',startTick:0,endTick:960,sourceBeatId:'healthy',notes:[{attack:true,midi:60}]}]};
 assert.equal(getPracticeEvents(healthy,1).length,1,'only the affected track is guarded');
});
test('unsupported repeat explanation survives cursor and practice-state refreshes',()=>{
 const s=make();s.tracks[0].staves[0].bars[1].simileMark=2;
 AppState.tracks=s.tracks;AppState.practiceTrackId='0';AppState.playbackTimeline=project(core,s);
 AppState.practiceLoop={enabled:false,range:null};AppState.inputMode='single-channel';
 assert.deepEqual(buildExpectedEventsFromPracticeTrack(),[]);
 for(const update of [()=>{},()=>updateActiveTargetsFromPlayback(3840),()=>refreshTrainerMatchState(3840)]){
  update();assert.match(AppState.trainer.status,/repeat-bar notation needs an expanded practice score/);
  assert.match(AppState.trainer.summary,/Repeat bar 2/);assert.deepEqual(AppState.activeTargets,[]);
 }
});

test('tapped and reciprocal hammer/pull donor attacks remain distinct in each repeated bar',()=>{
 for(const at of [classic,core]){
  const s=make(at,'. 0.1.4 2.1.4 3.1.4 5.1.4 | r.1 | r.1'),v=s.tracks[0].staves[0].bars[0].voices[0];
  v.beats[0].notes[0].isHammerPullOrigin=true;v.beats[2].notes[0].isRightHandTapped=true;v.beats[3].notes[0].isLeftHandTapped=true;s.finish(new at.Settings());
  const before=shape(s),c=cache(at,s),t=project(at,s,c),events=getPracticeEvents(t,0);
  assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(shape(s),before);assert.equal(events.length,12);
  assert.deepEqual(events.map(e=>e.notes.map(n=>n.midi)),Array.from({length:3},()=>[[64],[66],[67],[69]]).flat());
  assert.equal(events.flatMap(e=>e.notes).length,c.notes.length);assert.equal(new Set(events.flatMap(e=>e.notes.map(n=>n.id))).size,12);
 }
});
test('multiple complete voices retain simultaneous unisons, original positions and independent note identities',()=>{
 for(const at of [classic,core]){
  const s=make(at,'. 0.1.1 | r.1 | r.1');
  for(const bar of s.tracks[0].staves[0].bars){const v=new at.model.Voice(),b=new at.model.Beat();bar.addVoice(v);v.addBeat(b);b.duration=at.model.Duration.Whole;b.isEmpty=true;if(!bar.index){const n=new at.model.Note();n.string=5;n.fret=5;b.addNote(n);b.isEmpty=false;}}
  s.finish(new at.Settings());
  const before=shape(s),c=cache(at,s),t=project(at,s,c),events=getPracticeEvents(t,0);
  assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(shape(s),before);assert.equal(events.length,3);
  assert(events.every(e=>e.notes.length===2 && e.notes.every(n=>n.midi===64)));assert.equal(events.flatMap(e=>e.notes).length,c.notes.length);
  assert.equal(new Set(events.flatMap(e=>e.notes.map(n=>n.id))).size,6);
  for(const e of t.events.filter(e=>e.donorMeasureNumber))assert.equal(e.sourceBeatId,String(s.tracks[0].staves[0].bars[e.measureNumber-1].voices[0].beats[0].id));
  const silent= s.tracks[0].staves[0].bars[0].voices[0].beats[0];silent.notes=[];silent.isEmpty=true;s.finish(new at.Settings());
  const secondOnly=project(at,s),secondEvents=getPracticeEvents(secondOnly,0);assert.equal(secondOnly.similePracticeIssues,undefined);assert.equal(secondEvents.length,3);assert(secondEvents.every(e=>e.notes.length===1 && e.notes[0].midi===64));
 }
});
test('let-ring notes and inherited empty-placeholder flags retain complete internal tied releases',()=>{
 for(const at of [classic,core]){
  const s=make(at,'. 0.1.2 -.1.2 | r.1 | r.1');
  for(const b of s.tracks[0].staves[0].bars)for(const v of b.voices)for(const beat of v.beats){beat.isLetRing=true;for(const n of beat.notes)n.isLetRing=true;}
  const before=shape(s),t=project(at,s),events=getPracticeEvents(t,0);
  assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(shape(s),before);
  assert.deepEqual(events.map(e=>[e.startTick,e.notes[0].endTick]),[[0,3840],[3840,7680],[7680,11520]]);
  assert(t.events.flatMap(e=>e.notes).filter(n=>!n.attack).every(n=>n.attackNoteId));assert.equal(t.ambiguousHoldEvidenceComplete,false);
 }
});
test('repeat endings visit only the played donor occurrences and isolate all tied roots',()=>{
 const s=make(core,String.raw`. \ro 0.1.2 -.1.2 | \ae 1 \rc 2 r.1 | \ae 2 r.1`),t=project(core,s),events=getPracticeEvents(t,0);
 assert.equal(t.similePracticeIssues,undefined);assert.deepEqual(events.map(e=>[e.measureNumber,e.occurrence]),[[1,1],[2,1],[1,2],[3,1]]);
 assert.equal(new Set(events.map(e=>e.notes[0].id)).size,4);assert(events.every(e=>e.notes[0].endTick-e.startTick===3840));
});
test('a donor continuation tied from another written bar cannot borrow an earlier performed root',()=>{
 const p=new core.importer.AlphaTexImporter();p.initFromString('. 0.1.1 | -.1.1 | r.1',new core.Settings());const s=p.readScore(),bar=s.tracks[0].staves[0].bars[2];bar.simileMark=1;bar.voices[0].beats[0].isEmpty=true;s.finish(new core.Settings());
 const before=shape(s),t=project(core,s);assert.deepEqual(shape(s),before);assert.deepEqual(getPracticeEvents(t,0),[]);assert.match(t.similePracticeIssues[0].reason,/tie leaves/);
});
test('unproved reciprocal hammer endpoints are guarded without deleting any written note',()=>{
 const s=make(core,'. 0.1.2 2.1.2 | r.1 | r.1'),v=s.tracks[0].staves[0].bars[0].voices[0];v.beats[0].notes[0].isHammerPullOrigin=true;s.finish(new core.Settings());const c=cache(core,s);v.beats[1].notes[0].hammerPullOrigin=null;
 const before=shape(s),t=project(core,s,c);assert.deepEqual(shape(s),before);assert.deepEqual(getPracticeEvents(t,0),[]);assert.match(t.similePracticeIssues[0].reason,/hammer/);
});
test('native explicit full-rest simile placeholders keep the same complete donor targets as empty GPX placeholders',()=>{
 for(const at of [classic,core]){
  const s=make(at);for(const b of s.tracks[0].staves[0].bars.slice(1))for(const beat of b.voices[0].beats)beat.isEmpty=false;s.finish(new at.Settings());
  const t=project(at,s);assert.equal(t.similePracticeIssues,undefined);assert.equal(getPracticeEvents(t,0).length,3);assert.equal(getPracticeEvents(t,0).flatMap(e=>e.notes).length,6);
 }
});
