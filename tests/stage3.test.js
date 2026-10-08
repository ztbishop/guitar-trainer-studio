import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeSession} from '../js/realtime-session.js';
import {AppState} from '../js/app-state.js';
import {buildExpectedEventsFromPracticeTrack,handlePlaybackPosition,handlePlaybackState,handleMidiEvent,advanceRealtimeClock,finishRealtimeSession,resetRealtimeSession} from '../js/practice-engine.js';
const event=(id,time,pitches)=>({id,startTimeMs:time,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:6-i}))});
const note=(midi,channel=1,at=0)=>({type:'note-on',midi,channel,at});
function session(events,options={}) {
 const s=new RealtimeSession(events,options);s.started=true;s.anchorPosition(0,1000);return s;
}
test('timing edges accept attacks inside the window and reject outside',()=>{
 for(const [time,expected] of [[879,'wrong'],[880,'correct'],[1000,'correct'],[1160,'correct'],[1161,'wrong']]) {
  const s=session([event('a',1000,[60])]);assert.equal(s.noteOn(note(60),time).type,expected);
 }
});
test('repeated pitches require separate attacks; an attack cannot grade two events',()=>{
 const s=session([event('a',1000,[60]),event('b',1500,[60])]);
 s.noteOn(note(60),1000);s.advance(1800);
 assert.equal(s.stats().correct,1);assert.equal(s.stats().missed,1);
 assert.equal(s.records[1].slots[0].hit,null);
});
test('chord attacks accumulate after release and fail excessive spread',()=>{
 const s=session([event('a',1000,[60,64,67])]);
 assert.equal(s.noteOn(note(60),960).type,'correct');
 assert.equal(s.noteOn(note(64),1000).type,'correct');
 assert.equal(s.noteOn(note(67),1020).type,'correct');
 assert.equal(s.stats().correct,3);
 const t=session([event('a',1000,[60,64])]);
 t.noteOn(note(60),960);assert.equal(t.noteOn(note(64),1021).type,'wrong');
 t.advance(1300);assert.equal(t.stats().missed,1);
});
test('wrong notes remain penalized while correct chord notes still count',()=>{
 const s=session([event('a',1000,[60,64])]);
 s.noteOn(note(61),1000);s.noteOn(note(60),1000);s.noteOn(note(64),1010);
 assert.deepEqual(s.stats(),{correct:2,wrong:1,missed:0,pending:0,total:2,accuracy:67});
});
test('nearest unmatched occurrence wins when repeated-note windows overlap',()=>{
 const s=session([event('a',1000,[60]),event('b',1200,[60])]);
 const hit=s.noteOn(note(60),1140);assert.equal(hit.eventId,'b');
 s.noteOn(note(60),1145);assert.equal(s.records[0].slots[0].hit.deltaMs,145);
});
test('single-channel unisons share one pitch target; hex unisons require different channels',()=>{
 const e=event('a',1000,[60,60]);
 const single=session([e]);single.noteOn(note(60),1000);assert.equal(single.stats().total,1);
 assert.equal(single.records[0].slots[0].noteIds.length,2);
 const hex=session([e],{hex:true});
 hex.noteOn(note(60,1),1000);assert.equal(hex.noteOn(note(60,1),1010).type,'wrong');
 assert.equal(hex.noteOn(note(60,2),1020).type,'correct');assert.equal(hex.stats().correct,2);
});
test('latency correction applies both to matching and miss deadlines',()=>{
 const s=session([event('a',1000,[60])],{latencyMs:100});
 assert.equal(s.noteOn(note(60),1250).type,'correct');
 const t=session([event('a',1000,[60])],{latencyMs:100});
 t.advance(1250-t.latencyMs);assert.equal(t.stats().missed,0);
 t.advance(1261-t.latencyMs);assert.equal(t.stats().missed,1);
});
test('speed scales score time but keeps timing tolerance in real milliseconds',()=>{
 const s=session([event('a',1000,[60])]);
 assert.equal(s.noteOn(note(60),1080,0.5).type,'correct');
 const t=session([event('a',1000,[60])]);assert.equal(t.noteOn(note(60),1081,0.5).type,'wrong');
});
test('finish finalizes misses once; reset skips earlier passages without counting them missed',()=>{
 const s=session([event('a',0,[60]),event('b',1000,[62])]);
 s.noteOn(note(60),0);s.finish();s.finish();assert.equal(s.stats().missed,1);
 s.reset(1000);s.started=true;s.finish();assert.equal(s.stats().missed,1);assert.equal(s.stats().total,1);
 assert.equal(s.stats().wrong,0);
});
function setup() {
 AppState.inputMode='single-channel';AppState.tickPosition=0;AppState.isPlaying=false;AppState.trainer.latencyMs=0;
 AppState.playbackSpeed=1;AppState.midi.activeNotes.clear();AppState.midi.activeNotesByChannel.clear();
 const events=[event('a',500,[60,64]),event('b',1000,[60])].map((e,i)=>({...e,trackId:'0',sourceBeatId:String(i),measureNumber:1,beatIndex:i,startTick:e.startTimeMs*1.92,endTick:(e.startTimeMs+500)*1.92,notes:e.notes.map(n=>({...n,attack:true}))}));
 AppState.tracks=[{index:0,name:'Guitar'}];AppState.practiceTrackId='0';
 AppState.playbackTimeline={events,endTick:2880,tempoMap:[{tick:0,bpm:120,timeMs:0}],ticksPerQuarter:960};
 buildExpectedEventsFromPracticeTrack();
 handlePlaybackPosition({currentTick:0,at:1000});
}
test('engine ignores paused attacks, grades from event timestamps, and does not grade note-offs',()=>{
 setup();handleMidiEvent(note(60,1,1500));assert.equal(AppState.trainer.results.correct,0);
 AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:1500});
 handleMidiEvent(note(60,1,1500));handleMidiEvent({...note(60,1,1510),type:'note-off'});handleMidiEvent(note(64,1,1540));
 assert.equal(AppState.trainer.results.correct,2);
 handlePlaybackPosition({currentTick:1920,at:2000});advanceRealtimeClock(2200);
 assert.equal(AppState.trainer.results.missed,1);
});
test('engine resets on explicit forward seek, backward loop and stop/reset',()=>{
 setup();AppState.isPlaying=true;handlePlaybackPosition({currentTick:960,at:1500});handleMidiEvent(note(60,1,1500));
 assert.equal(AppState.trainer.results.correct,1);
 handlePlaybackPosition({currentTick:1920,at:1600,isSeek:true});assert.equal(AppState.trainer.results.correct,0);
 assert.equal(AppState.trainer.results.total,1);
 handlePlaybackPosition({currentTick:0,at:1700});assert.equal(AppState.trainer.results.total,3);
 AppState.isPlaying=false;resetRealtimeSession('stop',0);assert.equal(AppState.trainer.sessionStarted,false);
});
test('pause/resume keeps hits, ignores paused input, and completion flushes remaining misses',()=>{
 setup();AppState.isPlaying=true;handlePlaybackPosition({currentTick:960,at:1500});handleMidiEvent(note(60,1,1500));
 AppState.isPlaying=false;handlePlaybackState();handleMidiEvent(note(64,1,1520));assert.equal(AppState.trainer.results.correct,1);
 AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:3000});handleMidiEvent(note(64,1,3040));
 assert.equal(AppState.trainer.results.correct,2);finishRealtimeSession();
 assert.equal(AppState.trainer.results.missed,1);assert.equal(AppState.trainer.sessionCompleted,true);
});
test('seeking just past a target onset keeps its still-open late window',()=>{
 const s=session([event('a',0,[60])]);s.reset(1);s.started=true;
 assert.equal(s.noteOn(note(60),10).type,'correct');
});
