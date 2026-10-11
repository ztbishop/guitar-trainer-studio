import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {noteStatesFromRecords,buildNotationMarks} from '../js/practice-visuals.js';
import {buildTabErrorTargets,buildWrongFretMarks} from '../js/tab-feedback.js';
import {normalizeMidiMessage} from '../js/midi-router.js';

const track={staves:[{tuning:[64,59,55,50,45,40]}]};
// First written dyad in measure 85: Bb3 on G-string fret 3 and Bb4 on high E fret 6.
const dyad={id:'85',startTick:0,startTimeMs:0,staffIndex:0,notes:[
  {id:'low',sourceNoteId:'low',midi:58,string:3,fret:3},
  {id:'high',sourceNoteId:'high',midi:70,string:1,fret:6}]};
const midi=(channel,pitch,time=0)=>normalizeMidiMessage({data:[0x90+channel-1,pitch,100],receivedTime:time},
  {inputMode:'hex-6ch',hexChannelBase:1});

test('Wait completed Hex dyad preserves clean lower tone and marks only upper-string mistakes',()=>{
  let state;
  const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s);
  c.configure([dyad,{...dyad,id:'next',startTick:960}],1920,true);c.toggle(0);
  c.noteOn(midi(4,58));c.noteOn(midi(6,68));c.noteOn(midi(6,70));
  assert.deepEqual(state.noteStates,{low:'correct',high:'completed-with-errors'});
  assert.equal(state.results.wrong,1);
  assert.equal(buildTabErrorTargets([dyad],null,state.history,{inputMode:'hex-6ch'})[0].sourceNoteId,'high');
  const marks=buildWrongFretMarks({track,events:[dyad],history:state.history,inputMode:'hex-6ch'});
  assert.deepEqual(marks.map(m=>[m.string,m.fret]),[[1,4]]);
});

test('both correct dyad pitches on channel 4 remain green with no wrong fret in Wait and Realtime',()=>{
  // Measure 83 first dyad: D4/G-string 7 and D5/high E 10.
  const event={...dyad,id:'83',notes:[{...dyad.notes[0],midi:62,fret:7},{...dyad.notes[1],midi:74,fret:10}]};
  for(const mode of ['wait','realtime']) {
    const s=mode==='wait'?new WaitSession([event],{hex:true}):new RealtimeSession([event],{hex:true});
    if(mode==='realtime')s.started=true;
    for(const pitch of [62,74]) {
      const input=midi(4,pitch);
      const result=mode==='wait'?s.noteOn(0,input):s.noteOn(input,0);
      assert.equal(result.type,'correct');
    }
    if(mode==='realtime')s.finish();
    assert.deepEqual(noteStatesFromRecords(s.records,true,{hex:true}),{low:'correct',high:'correct'});
    assert.equal(s.stats().wrong,0);assert.equal(s.stats().accuracy,100);
    const history=s.feedbackHistory();assert.equal(history[0].wrongNotes.length,0);
    assert.deepEqual(buildTabErrorTargets([event],null,history,{inputMode:'hex-6ch'}),[]);
    assert.deepEqual(buildWrongFretMarks({track,events:[event],history,inputMode:'hex-6ch',mode}),[]);
  }
});

test('Realtime completed Hex summaries follow error strings while Poly accepted pitches stay green',()=>{
  const s=new RealtimeSession([dyad],{hex:true});s.started=true;
  s.noteOn(midi(4,58),0);s.noteOn(midi(6,68),0);s.noteOn(midi(6,70),0);s.finish();
  const history=s.feedbackHistory();
  assert.deepEqual(buildTabErrorTargets([dyad],null,history,{inputMode:'hex-6ch'}).map(m=>m.sourceNoteId),['high']);
  assert.equal(buildTabErrorTargets([dyad],null,history,{inputMode:'single-channel'}).length,0);
  assert.deepEqual(buildNotationMarks([dyad],null,noteStatesFromRecords(s.records,false)).map(m=>m.state),['correct','correct']);
});

test('Hex unknown-string errors stay target-level and errors on absent strings do not accuse clean tones',()=>{
  const s=new WaitSession([dyad],{hex:true});s.noteOn(0,midi(5,69));
  s.noteOn(0,midi(4,58));s.noteOn(0,midi(6,70));
  assert.deepEqual(noteStatesFromRecords(s.records,true,{hex:true}),{low:'correct',high:'correct'});
  assert.deepEqual(buildTabErrorTargets([dyad],null,s.feedbackHistory(),{inputMode:'hex-6ch'}),[]);
  s.records[0].wrongNotes[0].stringHint=null;
  assert.deepEqual(noteStatesFromRecords(s.records,true,{hex:true}),{low:'completed-with-errors',high:'completed-with-errors'});
  assert.equal(buildTabErrorTargets([dyad],null,s.feedbackHistory(),{inputMode:'hex-6ch'}).length,2);
});
