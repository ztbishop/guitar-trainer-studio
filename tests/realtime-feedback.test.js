import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeSession} from '../js/realtime-session.js';
import {WaitSession} from '../js/wait-session.js';
const events=[{id:'a',startTimeMs:1000,notes:[{id:'n',midi:60,string:2}]}];
const note=(midi,channel=5,stringHint=2)=>({midi,channel,stringHint,at:1000});
test('Realtime retains assigned wrong-pitch string metadata after finalization and releases live errors independently',()=>{
  const s=new RealtimeSession(events,{hex:true});s.started=true;
  s.noteOn(note(61),1000);s.noteOn(note(62,4,3),1000);
  assert.equal(s.liveWrong.size,2);assert.equal(s.feedbackHistory()[0].completed,false);
  s.advance(2000);assert.equal(s.feedbackHistory()[0].completed,true);
  assert.equal(s.feedbackHistory()[0].wrongNotes[1].stringHint,3);
  s.noteOff(note(61));assert.equal(s.liveWrong.size,1);
  assert.equal(s.feedbackHistory()[0].wrongNotes.length,2);
  s.reset();assert.equal(s.liveWrong.size,0);assert.equal(s.feedbackHistory()[0].wrongNotes.length,0);
});
test('out-of-window attacks and duplicate required pitches do not fabricate string-position mistakes',()=>{
  const s=new RealtimeSession(events,{hex:true});s.started=true;
  s.noteOn(note(61),0);assert.equal(s.liveWrong.size,0);
  s.noteOn(note(60),1000);s.noteOn(note(60),1000);
  assert.equal(s.wrongNotes.length,2);assert.equal(s.feedbackHistory()[0].wrongNotes.length,0);
});
test('same MIDI pitch on a different string counts correct in both modes',()=>{
  const s=new RealtimeSession(events,{hex:true});s.started=true;
  assert.equal(s.noteOn(note(60,4,3),1000).type,'correct');
  const w=new WaitSession(events,{hex:true});assert.equal(w.noteOn(0,note(60,4,3)).type,'correct');
});

test('engine publishes Realtime feedback/history and processes releases while paused without resetting grades',async()=>{
  const {AppState}=await import('../js/app-state.js');
  const {buildExpectedEventsFromPracticeTrack,handlePlaybackState,handlePlaybackPosition,handleMidiEvent}=await import('../js/practice-engine.js');
  AppState.practiceLoop={enabled:false,range:null};AppState.inputMode='hex-6ch';AppState.trainer.latencyMs=0;
  AppState.tracks=[{index:0}];AppState.practiceTrackId='0';AppState.playbackSpeed=1;AppState.tickPosition=0;AppState.isPlaying=false;
  AppState.playbackTimeline={ticksPerQuarter:960,tempoMap:[{tick:0,bpm:120,timeMs:0}],endTick:1920,
    events:[{id:'a',trackId:'0',startTick:0,endTick:960,startTimeMs:0,endTimeMs:500,notes:[{id:'n',midi:60,string:2,attack:true}],measureNumber:1}]};
  buildExpectedEventsFromPracticeTrack();AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:0,at:1000});
  handleMidiEvent({type:'note-on',...note(61)});
  assert.equal(AppState.trainer.liveWrongNotes.length,1);
  handlePlaybackPosition({currentTick:960,at:1500});assert.equal(AppState.trainer.history[0].completed,true);
  const stats=structuredClone(AppState.trainer.results);AppState.isPlaying=false;handlePlaybackState();
  handleMidiEvent({type:'note-off',...note(61)});
  assert.equal(AppState.trainer.liveWrongNotes.length,0);assert.deepEqual(AppState.trainer.results,stats);
  assert.equal(AppState.trainer.history[0].wrongNotes.length,1);
});
