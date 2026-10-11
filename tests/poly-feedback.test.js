import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {noteStatesFromRecords} from '../js/practice-visuals.js';
import {buildPolyMistakeMarks,buildPolyWrongFretMarks,inferPolyExpectedNoteIds} from '../js/poly-feedback.js';
import {buildTabErrorTargets,buildWrongFretMarks} from '../js/tab-feedback.js';
import {AppState} from '../js/app-state.js';

const event={id:'a',startTick:0,startTimeMs:0,notes:[
  {id:'low',sourceNoteId:'low',midi:60,string:2,fret:1},
  {id:'high',sourceNoteId:'high',midi:64,string:1,fret:0}]};
const note=midi=>({midi,channel:1,at:0});
const track={staves:[{tuning:[64,59,55,50,45,40],capo:0,transpositionPitch:0}]};
const projection=(s,extra={})=>buildPolyMistakeMarks({events:[event],currentEvent:event,
  history:s.feedbackHistory(),liveWrongNotes:[...s.liveWrong.values()],noteStates:noteStatesFromRecords(s.records),enabled:true,...extra});

test('Poly inference defaults off and identifies only a single distinct remaining written note',()=>{
  assert.equal(AppState.ui.inferPolyMistakes,false);
  assert.deepEqual(inferPolyExpectedNoteIds([{noteIds:['a'],hit:true},{noteIds:['b'],hit:false}]),['b']);
  for(const slots of [[],[{noteIds:['a','b'],hit:false}],[{noteIds:['a'],missed:true}],
    [{noteIds:['a'],hit:false},{noteIds:['b'],hit:false}]])assert.deepEqual(inferPolyExpectedNoteIds(slots),[]);
});

test('Poly Wait correct first tone stays green; unique wrong tone gets optional live and retained red',()=>{
  const s=new WaitSession([event]);s.noteOn(0,note(60));s.noteOn(0,note(65));
  assert.deepEqual(s.records[0].wrongNotes[0].inferredNoteIds,['high']);
  assert.deepEqual(projection(s).map(m=>[m.sourceNoteId,m.state,m.inferred]),[['high','wrong',true]]);
  assert.deepEqual(projection(s,{enabled:false}),[]);
  s.noteOff(note(65));assert.deepEqual(projection(s),[]);
  s.noteOn(0,note(64));
  assert.deepEqual(noteStatesFromRecords(s.records),{low:'correct',high:'correct'});
  assert.deepEqual(projection(s).map(m=>[m.sourceNoteId,m.state]),[['high','completed-with-errors']]);
  assert.deepEqual(buildTabErrorTargets([event],null,s.feedbackHistory(),{inputMode:'single-channel'}),[]);
});

test('Poly visibility toggles never change grades/history and never create detected fret labels',()=>{
  const s=new WaitSession([event]);s.noteOn(0,note(60));s.noteOn(0,note(65));s.noteOn(0,note(64));
  const before=JSON.stringify([s.stats(),s.feedbackHistory()]);
  for(const enabled of [true,false,true])projection(s,{enabled});
  assert.equal(JSON.stringify([s.stats(),s.feedbackHistory()]),before);
  assert.deepEqual(buildWrongFretMarks({events:[event],currentEvent:event,history:s.feedbackHistory(),inputMode:'single-channel'}),[]);
});

test('ambiguous errors stay unassigned after later correction and duplicates do not create inference',()=>{
  const s=new WaitSession([event]);s.noteOn(0,note(65));s.noteOn(0,note(60));s.noteOn(0,note(60));s.noteOn(0,note(64));
  assert.deepEqual(s.records[0].wrongNotes[0].inferredNoteIds,[]);
  assert.deepEqual(projection(s),[]);
  assert.deepEqual(noteStatesFromRecords(s.records),{low:'correct',high:'correct'});
  assert.equal(s.records[0].wrongNotes.length,1);assert.equal(s.stats().wrong,2);
});

test('multiple independent Poly releases and current repeat occurrences clear stale inferred marks',()=>{
  const s=new WaitSession([event]);s.noteOn(0,note(60));s.noteOn(0,note(65));s.noteOn(0,note(66));
  assert.equal(projection(s).length,1);s.noteOff(note(66));assert.equal(projection(s).length,1);
  s.noteOff(note(65));assert.deepEqual(projection(s),[]);s.noteOn(0,note(64));
  const repeat={...event,id:'b',notes:event.notes.map(n=>({...n,id:n.id+'-repeat'}))};
  assert.deepEqual(projection(s,{events:[event,repeat],currentEvent:repeat}),[]);
});

test('Realtime preserves accepted green tones; inferred pending/missing note turns red without new penalties',()=>{
  const s=new RealtimeSession([event]);s.started=true;
  s.noteOn(note(60),0);s.noteOn(note(65),0);
  assert.equal(projection(s,{mode:'realtime'})[0].sourceNoteId,'high');
  s.finish();assert.equal(noteStatesFromRecords(s.records,false).low,'correct');
  assert.equal(noteStatesFromRecords(s.records,false).high,'missed');
  const before=JSON.stringify(s.stats());assert.equal(projection(s,{mode:'realtime'}).length,1);
  assert.equal(JSON.stringify(s.stats()),before);
  const corrected=new RealtimeSession([event]);corrected.started=true;
  corrected.noteOn(note(60),0);corrected.noteOn(note(65),0);corrected.noteOn(note(64),0);corrected.finish();
  assert.deepEqual(projection(corrected,{mode:'realtime'}),[]);
  assert.deepEqual(noteStatesFromRecords(corrected.records,false),{low:'correct',high:'correct'});
});

test('Wait controller keeps inferred mistake history through Pause/resume and clears it on new attempt',()=>{
  let state;const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s,()=>0);
  c.configure([event],960);c.toggle(0);c.noteOn({type:'note-on',...note(60)});c.noteOn({type:'note-on',...note(65)});
  const history=structuredClone(state.history);c.toggle(0);assert.deepEqual(state.history,history);
  c.toggle(0);assert.deepEqual(state.history,history);c.newAttemptHere();
  assert.equal(state.history[0].wrongNotes.length,0);
});

test('inferred fret numbers use the uniquely expected string for single notes and chord remainders',()=>{
  for(const target of [event,{...event,notes:[event.notes[1]]}])for(const mode of ['wait','realtime']) {
    const s=mode==='wait'?new WaitSession([target]):new RealtimeSession([target]);if(mode==='realtime')s.started=true;
    const attack=pitch=>mode==='wait'?s.noteOn(0,note(pitch)):s.noteOn(note(pitch),0);
    if(target.notes.length===2)attack(60);attack(66);
    const args=()=>({track,events:[target],currentEvent:target,history:s.feedbackHistory(),liveWrongNotes:[...s.liveWrong.values()],mode,enabled:true});
    const live=buildPolyWrongFretMarks(args());
    assert.deepEqual(live.map(m=>[m.sourceNoteId,m.string,m.fret,m.inferred,m.retained]),[['high',1,2,true,false]]);
    assert.deepEqual(buildPolyWrongFretMarks({...args(),enabled:false}),[]);
    s.noteOff(note(66));assert.deepEqual(buildPolyWrongFretMarks(args()),[]);
    attack(64);if(mode==='realtime')s.finish();
    const before=JSON.stringify([s.stats(),s.feedbackHistory()]);
    assert.equal(buildPolyWrongFretMarks(args())[0].retained,true);
    assert.equal(JSON.stringify([s.stats(),s.feedbackHistory()]),before);
  }
});

test('ambiguous, invalid tuning, out-of-range and repeated Poly fret details stay omitted',()=>{
  const s=new WaitSession([event]);s.noteOn(0,note(66));s.noteOn(0,note(60));s.noteOn(0,note(64));
  const args={track,events:[event],history:s.feedbackHistory(),enabled:true};
  assert.deepEqual(buildPolyWrongFretMarks(args),[]);
  const single={...event,notes:[event.notes[1]]},w=new WaitSession([single]);w.noteOn(0,note(66));w.noteOn(0,note(64));
  const good={...args,events:[single],history:w.feedbackHistory()};
  for(const invalidTrack of [{staves:[{tuning:[64,59,55,50]}]},{staves:[{...track.staves[0],capo:1}]}])
    assert.deepEqual(buildPolyWrongFretMarks({...good,track:invalidTrack}),[]);
  const repeat={...single,id:'b',notes:[{...single.notes[0],id:'next'}]};
  assert.deepEqual(buildPolyWrongFretMarks({...good,events:[single,repeat],currentEvent:repeat}),[]);
  w.records[0].wrongNotes[0].midi=20;assert.deepEqual(buildPolyWrongFretMarks({...good,history:w.feedbackHistory()}),[]);
});
