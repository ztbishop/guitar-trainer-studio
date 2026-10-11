import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {notationFeedbackGeometry} from '../js/notation-feedback.js';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {noteStatesFromRecords,buildNotationMarks,buildWrongPitchMarks,standardBeatForNote} from '../js/practice-visuals.js';
import {buildPlaybackTimeline as buildNativeTimeline} from '../js/score-playback.js';
import {AppState} from '../js/app-state.js';
import {buildExpectedEventsFromPracticeTrack,handlePlaybackPosition,handlePlaybackState,handleMidiEvent,finishRealtimeSession} from '../js/practice-engine.js';
const target=(id,pitches=[60],source=id)=>({id,startTick:0,startTimeMs:0,measureNumber:1,occurrence:1,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,sourceNoteId:`${source}:${i}`,midi,string:1+i}))});
const on=(midi,channel=1,at=0)=>({type:'note-on',midi,channel,at});
const off=(midi,channel=1)=>({type:'note-off',midi,channel});
function harness(events,loop=false,settings={}) {
 let state;let time=0;
 const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s,()=>time);
 c.configure(events,1920,false,loop,settings);c.toggle(0);
 return {c,get state(){return state},set time(value){time=value}};
}
test('Poly Wait retains wrong pitches after release without recoloring accepted chord tones',()=>{
 const s=new WaitSession([target('a',[60,64])]);s.noteOn(0,on(61));s.noteOff(off(61));
 assert.equal(s.liveWrong.size,0);assert.equal(s.records[0].wrongNotes.length,1);
 s.noteOn(0,on(60));assert.deepEqual(noteStatesFromRecords(s.records),{'a:0':'correct'});
 s.noteOn(0,on(64));assert.deepEqual(noteStatesFromRecords(s.records),{'a:0':'correct','a:1':'correct'});
 assert.equal(s.feedbackHistory()[0].outcome,'completed-with-errors');assert.equal(s.stats().accuracy,67);
});
test('clean completion stays green and duplicate required pitches keep scoring without false pitch history',()=>{
 const s=new WaitSession([target('a',[60,64])]);s.noteOn(0,on(60));s.noteOn(0,on(60));s.noteOn(0,on(64));
 assert.equal(s.stats().wrong,1);assert.equal(s.records[0].wrongNotes.length,0);
 assert.deepEqual(noteStatesFromRecords(s.records),{'a:0':'correct','a:1':'correct'});
});
test('multiple channels and pitches release independently, including while paused',()=>{
 const h=harness([target('a')]);h.c.noteOn(on(61,1));h.c.noteOn(on(61,2));h.c.noteOn(on(63,1));
 assert.equal(h.state.liveWrongNotes.length,3);h.c.toggle();h.c.noteOn(off(61,1));
 assert.deepEqual(h.state.liveWrongNotes.map(n=>[n.channel,n.midi]),[[2,61],[1,63]]);
 h.c.noteOn(on(62));assert.equal(h.state.results.wrong,3);
 h.c.noteOn(off(61,2));h.c.noteOn(off(63,1));h.c.toggle();
 assert.equal(h.state.liveWrongNotes.length,0);assert.equal(h.state.history[0].wrongNotes.length,3);
});
test('Pause/Resume preserves completed results, current partial chord, wrong history and Together active time',()=>{
 const h=harness([target('a'),{...target('b',[62,65]),startTick:960}],false,{mode:'together',windowMs:200});
 h.c.noteOn(on(61));h.c.noteOn(on(60));h.c.noteOn(on(62,1,10));
 h.time=50;h.c.toggle();const before=structuredClone(h.state);
 h.time=10050;h.c.toggle();h.c.noteOn(on(65,1,10100));
 assert.equal(before.results.correct,2);assert.equal(before.results.wrong,1);
 assert.equal(h.state.results.correct,3);assert.equal(h.state.results.wrong,1);assert.equal(h.state.results.retries,0);
 assert.equal(h.state.noteStates['a:0'],'correct');assert.equal(h.state.phase,'complete');
});
test('Together expiry adds only a retry and retains received-wrong history',()=>{
 const h=harness([target('a',[60,64])],false,{mode:'together',windowMs:200});
 h.c.noteOn(on(61));h.c.noteOn(on(60));h.c.advance(201);
 assert.equal(h.state.results.retries,1);assert.equal(h.state.results.wrong,1);assert.equal(h.state.results.missed,0);
 assert.equal(h.state.history[0].wrongNotes.length,1);assert.deepEqual(h.state.noteStates,{});
 h.c.noteOn(on(60,1,300));h.c.noteOn(on(64,1,400));assert.equal(h.state.noteStates['a:0'],'correct');
});
test('completion clears temporary errors; loop passes keep distinct review history and fresh scoring',()=>{
 const h=harness([target('a')],true);h.c.noteOn(on(61));h.c.noteOn(on(60));
 assert.equal(h.state.pass,2);assert.equal(h.state.results.correct,0);assert.equal(h.state.results.wrong,0);
 assert.equal(h.state.liveWrongNotes.length,0);assert.deepEqual(h.state.noteStates,{});
 assert.equal(h.state.passHistory[0].pass,1);assert.equal(h.state.passHistory[0].wrongNotes[0].midi,61);
 h.c.noteOn(on(63));h.c.noteOn(on(60));assert.equal(h.state.passHistory[1].pass,2);
 h.c.stop();assert.deepEqual(h.state.passHistory,[]);assert.equal(h.state.history[0].wrongNotes.length,0);
});
test('repeat occurrences have independent histories and current occurrence hides older score detail',()=>{
 const a=target('a',[60],'written'),b={...target('b',[60],'written'),startTick:960,occurrence:2};
 const h=harness([a,b]);h.c.noteOn(on(61));h.c.noteOn(on(60));
 assert.equal(h.state.history[0].wrongNotes.length,1);assert.equal(h.state.history[1].wrongNotes.length,0);
 assert.deepEqual(buildWrongPitchMarks([a,b],b,h.state.history,h.state.liveWrongNotes),[]);
 assert.equal(buildNotationMarks([a,b],b,h.state.noteStates)[0].state,'expected');
 h.c.noteOn(on(63));h.c.noteOn(on(60));
 const marks=buildWrongPitchMarks([a,b],b,h.state.history,h.state.liveWrongNotes);
 assert.equal(marks.length,1);assert.deepEqual(marks[0].pitches,[63]);assert.equal(marks[0].retained,true);
});
test('feedback visibility only filters live/history display, never history or scoring',()=>{
 const a=target('a'),s=new WaitSession([a]);s.noteOn(0,on(61));
 assert.match(buildWrongPitchMarks([a],a,s.feedbackHistory(),[...s.liveWrong.values()])[0].label,/C#4 \(61\)/);
 assert.deepEqual(buildWrongPitchMarks([a],a,s.feedbackHistory(),[...s.liveWrong.values()],{showLive:false}),[]);
 s.noteOn(0,on(60));assert.deepEqual(buildWrongPitchMarks([a],null,s.feedbackHistory(),[],{showHistory:false}),[]);
 assert.equal(s.stats().wrong,1);assert.equal(s.feedbackHistory()[0].wrongNotes.length,1);
});
test('seek and new attempt clear old Wait history and live errors',()=>{
 const h=harness([target('a'),{...target('b',[62]),startTick:960}]);h.c.noteOn(on(61));h.c.noteOn(on(60));
 h.c.positionChanged({currentTick:960,isSeek:true}); // gate acknowledgement
 h.c.positionChanged({currentTick:0,isSeek:true}); // explicit seek
 assert.equal(h.state.results.wrong,0);assert.equal(h.state.liveWrongNotes.length,0);
 h.c.noteOn(on(60));h.c.noteOn(on(62));h.c.toggle(1920);
 assert.equal(h.state.results.correct,0);assert.equal(h.state.history.every(r=>!r.completed),true);
});
function realtimeSetup() {
 AppState.practiceLoop={enabled:false,range:null};AppState.inputMode='single-channel';AppState.tickPosition=0;
 AppState.trainer.latencyMs=0;AppState.playbackSpeed=1;AppState.isPlaying=false;AppState.tracks=[{index:0}];AppState.practiceTrackId='0';
 AppState.playbackTimeline={ticksPerQuarter:960,tempoMap:[{tick:0,bpm:120,timeMs:0}],endTick:1920,
 events:[{...target('a'),trackId:'0',startTick:960,endTick:1920,startTimeMs:500,endTimeMs:1000,notes:[{id:'a:0',midi:60,attack:true}]}]};
 buildExpectedEventsFromPracticeTrack();AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:1000});handleMidiEvent(on(60,1,1000));
}
test('Realtime same-position native seek during Pause/Resume preserves percentage and note states',()=>{
 realtimeSetup();const before=structuredClone(AppState.trainer.results);
 AppState.isPlaying=false;AppState.tickPosition=960;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:1100,isSeek:true});
 assert.deepEqual(AppState.trainer.results,before);assert.equal(AppState.trainer.sessionStarted,true);
 AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:8000,isSeek:true});
 assert.deepEqual(AppState.trainer.results,before);assert.equal(AppState.trainer.noteStates['a:0'],'correct');
 handlePlaybackPosition({currentTick:0,at:8100,isSeek:true});assert.equal(AppState.trainer.results.correct,0);
});
test('Realtime native completion rewind retains summary; replay starts fresh',()=>{
 realtimeSetup();finishRealtimeSession();const before=structuredClone(AppState.trainer.results);
 handlePlaybackPosition({currentTick:0,at:2000,isSeek:true});AppState.tickPosition=0;AppState.isPlaying=false;handlePlaybackState();
 assert.deepEqual(AppState.trainer.results,before);assert.equal(AppState.trainer.sessionCompleted,true);
 AppState.isPlaying=true;handlePlaybackState();assert.equal(AppState.trainer.results.correct,0);assert.equal(AppState.trainer.sessionCompleted,false);
});
test('Realtime marked Pause beat snap retains mixed results and Resume; explicit seeks still reset',()=>{
 realtimeSetup();handleMidiEvent(on(61,1,1000));
 handlePlaybackPosition({currentTick:1440,at:1250});
 const before=structuredClone(AppState.trainer.results);assert.equal(before.accuracy,50);
 AppState.isPlaying=false;
 handlePlaybackPosition({currentTick:960,at:1300,isSeek:true,isPauseSnap:true});handlePlaybackState();
 assert.deepEqual(AppState.trainer.results,before);assert.equal(AppState.trainer.noteStates['a:0'],'correct');
 handleMidiEvent(on(61,1,5000));assert.deepEqual(AppState.trainer.results,before);
 AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:8000});
 assert.deepEqual(AppState.trainer.results,before);
 handlePlaybackPosition({currentTick:0,at:8100,isSeek:true});assert.equal(AppState.trainer.results.accuracy,null);
});
test('queued non-seek position rollback while paused preserves Realtime results',()=>{
 realtimeSetup();handleMidiEvent(on(61,1,1000));const before=structuredClone(AppState.trainer.results);
 AppState.isPlaying=false;handlePlaybackState();
 handlePlaybackPosition({currentTick:1440,at:1100});handlePlaybackPosition({currentTick:960,at:1200});
 assert.deepEqual(AppState.trainer.results,before);assert.equal(AppState.trainer.sessionStarted,true);
 handlePlaybackPosition({currentTick:0,at:1300,isSeek:true});assert.equal(AppState.trainer.results.correct,0);
});
const context=vm.createContext({console,process});vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);const at=context.alphaTab;
test('bundled native render bounds place wrong noteheads only on standard notation through profiles and zoom',()=>{
 for(const profile of [0,1,2,3,4])for(const scale of [0.75,1,1.5]) {
  const settings=new at.Settings();settings.core.engine='svg';settings.core.includeNoteBounds=true;settings.display.staveProfile=profile;settings.display.scale=scale;
  const p=new at.importer.AlphaTexImporter();p.initFromString(String.raw`\tempo 120 . 0.6.4 (1.2 0.1).4`,settings);const score=p.readScore();
  const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=1000;renderer.error.on(error=>{throw error});renderer.renderScore(score,[0]);
  const note=score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
  const mark={sourceNoteId:String(note.id),kind:'wrong-pitches',label:'Heard: F2 (41)',pitches:[41]};
  const standard=standardBeatForNote(note,renderer.boundsLookup,profile);
  const engraving=settings.display.resources.engravingSettings;
  const labels=notationFeedbackGeometry([mark],new Map([[String(note.id),note]]),renderer.boundsLookup,
   {profile,scale,oneStaffSpace:engraving.oneStaffSpace,staffLineThickness:engraving.staffLineThickness,
   noteHeadWidth:engraving.glyphWidths.get(0xe0a4),noteHeadHeight:engraving.glyphHeights.get(0xe0a4)}).wrongNotes;
  assert.equal(labels.length,profile<=2?1:0);
  if(labels.length) {
   const sr=renderer.layout.getRendererForBar('score',note.beat.voice.bar);
   const b=standard.notes.find(bound=>bound.note.id===note.id).noteHeadBounds;
   assert.ok(Math.abs((standard.barBounds.visualBounds.y+sr.getNoteY(note,2)*scale)-(b.y+b.h/2))<1);
   assert.equal(labels[0].cx,b.x+b.w/2);assert.ok(Math.abs(labels[0].cy-(b.y+b.h/2-engraving.oneStaffSpace*scale/2))<1);
   assert.equal(labels[0].spelling,'F3');assert.equal(labels[0].accidental,'♮');
  }
 }
});
test('Default tab-only flags, hidden notes and unfinished bounds never fabricate wrong noteheads',()=>{
 const settings=new at.Settings();settings.core.engine='svg';settings.core.includeNoteBounds=true;
 const p=new at.importer.AlphaTexImporter();p.initFromString('0.6.4',settings);const score=p.readScore();const staff=score.tracks[0].staves[0];staff.showStandardNotation=false;
 const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=800;renderer.renderScore(score,[0]);const note=staff.bars[0].voices[0].beats[0].notes[0];
 assert.equal(standardBeatForNote(note,renderer.boundsLookup),null);
 assert.deepEqual(notationFeedbackGeometry([{sourceNoteId:String(note.id)}],new Map([[String(note.id),note]]),{isFinished:false},{}).wrongNotes,[]);
 assert.deepEqual(notationFeedbackGeometry([{sourceNoteId:'hidden'}],new Map(),renderer.boundsLookup,{}).wrongNotes,[]);
});

class Emitter {handlers=[];on(fn){this.handlers.push(fn)}trigger(value){for(const fn of this.handlers)fn(value)}}
test('bundled synth Pause/Resume preserves engine grading and its Finished/Stop rewind preserves final results',()=>{
 const output={sampleRate:44100,ready:new Emitter(),sampleRequest:new Emitter(),samplesPlayed:new Emitter(),open(){this.ready.trigger()},pause(){},play(){},activate(){},resetSamples(){this.last=0},addSamples(s){this.last=s.length/2},close(){}};
 const synth=new at.synth.AlphaSynth(output,100);synth.loadSoundFont(new Uint8Array(readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2',import.meta.url))),false);
 const settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();parser.initFromString(String.raw`\tempo 120 . 0.6.4 2.6.4 3.6.4 5.6.4`,settings);const score=parser.readScore();
 const midi=new at.midi.MidiFile(),gen=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));gen.generate();synth.loadMidiFile(midi);
 AppState.practiceLoop={enabled:false,range:null};AppState.inputMode='single-channel';AppState.tickPosition=0;AppState.playbackSpeed=1;AppState.isPlaying=false;AppState.trainer.latencyMs=0;
 AppState.tracks=score.tracks;AppState.practiceTrackId='0';
 // Use the actual generated repeat-aware timeline, as the host does.
 const timelineModule=buildNativeTimeline(gen.tickLookup);AppState.playbackTimeline=timelineModule;buildExpectedEventsFromPracticeTrack();
 let clock=1000;
 synth.stateChanged.on(event=>{AppState.isPlaying=event.state===1;handlePlaybackState()});
 synth.positionChanged.on(event=>{AppState.tickPosition=event.currentTick;handlePlaybackPosition({currentTick:event.currentTick,at:clock,isSeek:event.isSeek,speed:1})});
 synth.finished.on(()=>finishRealtimeSession());synth.play();synth.tickPosition=0;handleMidiEvent(on(40,1,clock));
 assert.equal(AppState.trainer.results.correct,1);synth.pause();const paused=structuredClone(AppState.trainer.results);
 clock+=10000;handleMidiEvent(on(41,1,clock));assert.deepEqual(AppState.trainer.results,paused);
 synth.play();synth.tickPosition=0;assert.deepEqual(AppState.trainer.results,paused);
 for(let i=0;i<150;i++){clock+=100;output.sampleRequest.trigger();output.samplesPlayed.trigger(output.last||0)}
 assert.equal(synth.state,0);assert.equal(AppState.trainer.sessionCompleted,true);assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.results.missed,3);
 const finished=structuredClone(AppState.trainer.results);handlePlaybackState();assert.deepEqual(AppState.trainer.results,finished);
 synth.play();assert.equal(AppState.trainer.results.correct,0);assert.equal(AppState.trainer.sessionCompleted,false);
});
