import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {practiceEvents,mediaPracticeTime} from '../js/media-practice.js';
import {resetRealtimeSession,handlePlaybackPosition,handleMidiEvent,handlePlaybackState} from '../js/practice-engine.js';
const timeline={endTick:800,ticksPerQuarter:100,tempoMap:[{tick:0,timeMs:0,bpm:120}],measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400},{measureNumber:2,occurrence:1,startTick:400,endTick:800}]};
const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:1000},{barIndex:1,barOccurence:0,barPosition:0,millisecondOffset:3000},{barIndex:1,barOccurence:0,barPosition:1,millisecondOffset:11000}];
const event=(id,tick,midi)=>({id,startTick:tick,endTick:tick+50,targetEndTick:tick+50,startTimeMs:tick*5,measureNumber:tick<400?1:2,pitches:[midi],notes:[{id:id+':note',midi,string:1}]});
function setup(speed=1) {
  AppState.playbackTimeline=timeline;AppState.expectedEvents=[event('a',100,60),event('b',600,64)];
  AppState.mode='realtime';AppState.inputMode='single-channel';AppState.playbackSpeed=speed;
  AppState.media={preview:true,returning:false,points,clock:{timeMs:7000,at:1000,playing:true}};
  AppState.isPlaying=true;AppState.tickPosition=600;AppState.trainer.latencyMs=0;
  AppState.practiceLoop={enabled:false,range:null};resetRealtimeSession('test',600);
}
test('recording grading projects onsets through nonlinear sync points without changing original score events',()=>{
  setup();const original=structuredClone(AppState.expectedEvents),events=practiceEvents(AppState);
  assert.equal(events[0].startTimeMs,1500);assert.equal(events[1].startTimeMs,7000);
  assert.deepEqual(AppState.expectedEvents,original);
});
test('Realtime pitch grading remains active on aligned media at 50%, 100% and 150% speed',()=>{
  for(const speed of [0.5,1,1.5]) {
    setup(speed);handlePlaybackPosition({currentTick:600,at:1000,speed});
    handleMidiEvent({type:'note-on',midi:64,channel:1,at:1050});
    assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.lastFeedback.eventId,'b');
    assert.ok(Math.abs(AppState.trainer.lastFeedback.deltaMs-50)<1e-8);
    AppState.isPlaying=false;handlePlaybackState();
    handleMidiEvent({type:'note-on',midi:60,channel:1,at:1100});assert.equal(AppState.trainer.results.correct,1);
  }
});
test('provider samples freeze grading interpolation during buffering or pause and bound stale samples',()=>{
  setup(1.5);assert.equal(mediaPracticeTime(AppState,1050,0),7075);
  AppState.media.clock.playing=false;assert.equal(mediaPracticeTime(AppState,1100,0),7000);
  AppState.media.clock.playing=true;assert.equal(mediaPracticeTime(AppState,999999,0),7150);
  AppState.isPlaying=false;assert.equal(mediaPracticeTime(AppState,1100,0),7000);
  AppState.media.preview=false;assert.equal(mediaPracticeTime(AppState,1100,123),123);
  assert.equal(practiceEvents(AppState),AppState.expectedEvents);
});
