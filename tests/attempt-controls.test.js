import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {WaitController} from '../js/wait-controller.js';
import {initAttemptControls} from '../js/attempt-controls.js';
import {buildExpectedEventsFromPracticeTrack,handlePlaybackState,handlePlaybackPosition,handleMidiEvent,newRealtimeAttemptHere} from '../js/practice-engine.js';

const event=(id,tick,pitches)=>({id,startTick:tick,startTimeMs:tick/1.92,measureNumber:1,
  notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:i+1,attack:true}))});
const note=(midi,at=1000)=>({type:'note-on',midi,channel:1,at});

test('Wait new attempt clears partial chord/history/retries in place while paused and resumes normally',()=>{
  const calls=[];let state,time=1000;
  const c=new WaitController(Object.fromEntries(['acquire','hold','pause','release','finish'].map(name=>[name,(...args)=>calls.push([name,...args])])),s=>state=s,()=>time);
  c.configure([event('a',0,[60]),event('b',960,[62,65])],1920,false,false,{mode:'together',windowMs:200});
  c.toggle(0);c.positionChanged({currentTick:0,isSeek:true});c.noteOn(note(60));
  c.positionChanged({currentTick:960,isSeek:true});c.noteOn(note(61));c.noteOn(note(62));
  time=1300;c.advance(time);c.noteOn(note(62,time));c.toggle();
  assert.equal(state.results.retries,1);assert.equal(state.results.wrong,1);
  const callCount=calls.length;c.newAttemptHere(960);
  assert.equal(calls.length,callCount);assert.equal(state.phase,'paused');assert.equal(state.currentEvent.id,'b');
  assert.equal(state.results.accuracy,null);assert.equal(state.results.correct,0);assert.equal(state.results.retries,0);
  assert.equal(state.results.total,2);assert.deepEqual(state.noteStates,{});assert.deepEqual(state.liveWrongNotes,[]);
  assert.ok(state.history.every(r=>r.wrongNotes.length===0));
  time=9000;c.toggle();c.noteOn(note(62,time));c.noteOn(note(65,time+150));
  assert.equal(state.results.accuracy,100);assert.equal(state.phase,'complete');
});

test('Wait new attempt preserves a seeking gate and loop settings while clearing prior pass review',()=>{
  let state;const holds=[];
  const c=new WaitController({acquire(){},hold:t=>holds.push(t),pause(){},release(){},finish(){}},s=>state=s);
  c.configure([event('a',960,[60])],1920,false,true);c.toggle(960);
  c.noteOn(note(61));c.noteOn(note(60));assert.equal(state.pass,2);assert.equal(state.passHistory.length,1);
  const before=holds.length;c.newAttemptHere(960);
  assert.equal(holds.length,before);assert.equal(state.phase,'seeking');assert.equal(c.desiredTick,960);
  assert.equal(state.pass,1);assert.deepEqual(state.passHistory,[]);assert.equal(c.loop,true);
  c.positionChanged({currentTick:960,isSeek:true});c.noteOn(note(60));assert.equal(state.pass,2);
});

test('Realtime new attempt clears grades at the cursor without moving or changing Play/Pause state',()=>{
  AppState.practiceLoop={enabled:false,range:null};AppState.inputMode='single-channel';AppState.trainer.latencyMs=0;
  AppState.tracks=[{index:0}];AppState.practiceTrackId='0';AppState.playbackSpeed=1;AppState.tickPosition=0;AppState.isPlaying=false;
  AppState.playbackTimeline={ticksPerQuarter:960,tempoMap:[{tick:0,bpm:120,timeMs:0}],endTick:2880,
    events:[event('a',0,[60]),event('b',960,[62]),event('c',1920,[64])].map(e=>({...e,trackId:'0',endTick:e.startTick+960,endTimeMs:e.startTimeMs+500}))};
  buildExpectedEventsFromPracticeTrack();AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:0,at:1000});
  handleMidiEvent(note(60));handleMidiEvent(note(61));
  AppState.tickPosition=960;handlePlaybackPosition({currentTick:960,at:1500});
  AppState.isPlaying=false;handlePlaybackState();newRealtimeAttemptHere(2000);
  assert.equal(AppState.tickPosition,960);assert.equal(AppState.isPlaying,false);assert.equal(AppState.trainer.results.accuracy,null);
  assert.equal(AppState.trainer.results.total,2);assert.deepEqual(AppState.trainer.noteStates,{});
  handleMidiEvent(note(62,2000));assert.equal(AppState.trainer.results.correct,0);
  AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:3000});
  handleMidiEvent(note(62,3000));assert.equal(AppState.trainer.results.accuracy,100);
  newRealtimeAttemptHere(4000);assert.equal(AppState.isPlaying,true);assert.equal(AppState.tickPosition,960);
  assert.equal(AppState.trainer.results.correct,0);handleMidiEvent(note(62,4000));assert.equal(AppState.trainer.results.correct,1);
});

test('New attempt control is disabled until a player and practice targets are ready',()=>{
  let click,count=0;const button={addEventListener:(type,fn)=>{click=fn}};
  globalThis.document={getElementById:()=>button};AppState.playerReady=false;AppState.expectedEvents=[];
  const controls=initAttemptControls(()=>count++);assert.equal(button.disabled,true);click();assert.equal(count,0);
  AppState.playerReady=true;controls.sync();assert.equal(button.disabled,true);
  AppState.expectedEvents=[event('a',0,[60])];controls.sync();assert.equal(button.disabled,false);click();assert.equal(count,1);
});
