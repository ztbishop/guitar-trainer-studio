import test from 'node:test';
import assert from 'node:assert/strict';
import {FretboardHeldNotes} from '../js/fretboard-held-notes.js';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {noteStatesFromRecords,buildFretboardModel,buildNotationMarks} from '../js/practice-visuals.js';

const track={staves:[{tuning:[64,59,55,50,45,40]}]};
const events=[{id:'chord',startTick:0,startTimeMs:0,notes:[{id:'e',sourceNoteId:'e',midi:64,string:1,fret:0},{id:'b',sourceNoteId:'b',midi:59,string:2,fret:0}]},
  {id:'next',startTick:960,startTimeMs:1000,notes:[{id:'d',sourceNoteId:'d',midi:62,string:2,fret:3}]}];
const attack=(midi,channel=1,stringHint=null)=>({type:'note-on',midi,channel,stringHint,at:0});

for(const hex of [false,true])for(const chordMode of ['collect','together'])test(`${chordMode} ${hex?'Hex':'Poly'} replayed collected attacks hide after chord completion without additional credit/errors`,()=>{
  const session=new WaitSession(events,{hex,chordMode}),tracker=new FretboardHeldNotes();
  const a=attack(64,hex?6:1,1),b=attack(59,hex?5:1,2),active=new Map([[`${a.channel}:64`,a]]);
  const first=session.noteOn(0,a,0);tracker.remember(a,first,active);
  session.noteOff({...a,type:'note-off',at:5});active.delete(`${a.channel}:64`);
  let replay;
  for(const at of [10,20]) {
    replay={...a,at};active.set(`${a.channel}:64`,replay);
    const outcome=session.noteOn(0,replay,at);assert.equal(outcome.type,'ignored-collected-tone');
    const states=noteStatesFromRecords(session.records,true,{hex});
    const before=JSON.stringify({records:session.records,stats:session.stats(),held:[...session.held],active:[...active]});
    assert(tracker.remember(replay,outcome,active,{events,noteStates:states}));
    assert.deepEqual(tracker.visible([replay],{currentEvent:events[0],noteStates:states}),[replay],'still shown while solving current chord');
    assert.equal(JSON.stringify({records:session.records,stats:session.stats(),held:[...session.held],active:[...active]}),before);
    if(at===10){session.noteOff({...replay,type:'note-off',at:15});active.delete(`${a.channel}:64`);}
  }
  active.set(`${b.channel}:59`,b);const done=session.noteOn(0,b,25);tracker.remember(b,done,active);
  assert.equal(session.stats().correct,2);assert.equal(session.stats().wrong,0);
  const states=noteStatesFromRecords(session.records,true,{hex});
  assert.deepEqual(tracker.visible([...active.values()],{currentEvent:events[1],noteStates:states}),[]);
  const fresh={...a,at:200};
  assert.deepEqual(tracker.visible([fresh],{currentEvent:events[1],noteStates:states}),[fresh]);
});

test('collected replay requires its own existing credited event/pitch and never treats wrong/filter outcomes as accepted',()=>{
  const tracker=new FretboardHeldNotes(),a=attack(64),active=new Map([['1:64',a]]);
  const outcome={type:'ignored-collected-tone',eventId:'chord',midi:64};
  assert.equal(tracker.remember(a,outcome,active,{events,noteStates:{b:'correct'}}),false);
  assert.equal(tracker.remember(a,{...outcome,eventId:'missing'},active,{events,noteStates:{e:'correct'}}),false);
  for(const type of ['wrong','pending-off-target','ignored-strum-tail','ignored-brief-off-target'])
    assert.equal(tracker.remember(a,{...outcome,type},active,{events,noteStates:{e:'correct'}}),false);
});

test('captured four-tone Poly collection/replay pattern leaves no accepted rings on the next target',()=>{
  const notes=[{midi:49,string:6,fret:9},{midi:58,string:4,fret:8},{midi:64,string:3,fret:9},{midi:69,string:2,fret:10}]
    .map((note,index)=>({...note,id:`captured:${index}`,sourceNoteId:String(index)}));
  const targets=[{id:'captured-chord',notes},{id:'following',notes:[{id:'following:0',midi:72,string:1,fret:8}]}];
  const session=new WaitSession(targets),tracker=new FretboardHeldNotes(),active=new Map();
  const send=(midi,channel,at,release=false)=>{
    const key=`${channel}:${midi}`,source={type:release?'note-off':'note-on',midi,channel,at};
    if(release){active.delete(key);session.noteOff(source);return;}
    active.set(key,source);const outcome=session.noteOn(0,source,at);
    tracker.remember(source,outcome,active,{events:targets,noteStates:noteStatesFromRecords(session.records)});
    return outcome;
  };
  send(49,6,7034.5);send(58,4,7602.4);send(64,2,8212.4);
  send(49,6,8914.5,true);send(64,2,9675.4,true);send(58,4,9709.5,true);
  for(const [midi,channel,at] of [[58,4,10360.5],[49,6,10418.4],[64,2,10424.5]])assert.equal(send(midi,channel,at).type,'ignored-collected-tone');
  assert.equal(send(69,9,11463.5).complete,true);
  const stats=session.stats(),states=noteStatesFromRecords(session.records);
  assert.equal(stats.correct,4);assert.equal(stats.wrong,0);assert.equal(active.size,4);
  assert.deepEqual(tracker.visible([...active.values()],{currentEvent:targets[1],noteStates:states}),[]);
  assert.deepEqual(session.stats(),stats);
});

for(const hex of [false,true])for(const mode of ['collect','together','realtime'])test(`${mode} ${hex?'Hex':'Poly'} hides accepted tails without changing scores, tabs or held evidence`,()=>{
  const session=mode==='realtime'?new RealtimeSession(events,{hex}):new WaitSession(events,{hex,chordMode:mode});
  if(mode==='realtime')session.started=true;
  const tracker=new FretboardHeldNotes(),a=attack(64,hex?6:1,1),b=attack(59,hex?5:1,2);
  const active=new Map([[`${a.channel}:64`,a],[`${b.channel}:59`,b]]);
  for(const source of [a,b]) {
    const outcome=mode==='realtime'?session.noteOn(source,0):session.noteOn(0,source,0);
    assert.equal(outcome.type,'correct');tracker.remember(source,outcome,active);
  }
  const states=noteStatesFromRecords(session.records,true,{hex});
  const before=JSON.stringify({records:session.records,stats:session.stats(),held:[...session.held],active:[...active],marks:buildNotationMarks(events,events[1],states)});
  assert.equal(tracker.visible([...active.values()],{currentEvent:events[0],noteStates:states}).length,2,'current accepted chord feedback remains');
  const visible=tracker.visible([...active.values()],{currentEvent:events[1],noteStates:states});
  assert.deepEqual(visible,[]);
  const model=buildFretboardModel({track,currentEvent:events[1],noteStates:states,activeNotes:visible,inputMode:hex?'hex-6ch':'single-channel'});
  assert.deepEqual(model.played,[],'tails disappear, never become wrong markers');
  assert.equal(JSON.stringify({records:session.records,stats:session.stats(),held:[...session.held],active:[...active],marks:buildNotationMarks(events,events[1],states)}),before);
  const wrong=attack(65,hex?3:1,4),fresh=attack(60,hex?2:1,5);
  const trainer={currentEvent:events[1],noteStates:states,liveWrongNotes:[{midi:65,channel:wrong.channel}]};
  const mixed=tracker.visible([a,b,wrong,fresh],trainer);
  assert.deepEqual(mixed,[wrong,fresh]);
  const feedback=buildFretboardModel({track,currentEvent:events[1],noteStates:states,activeNotes:mixed,liveWrongNotes:trainer.liveWrongNotes,inputMode:hex?'hex-6ch':'single-channel'});
  assert(feedback.played.some(n=>n.midi===65 && n.state==='wrong'));
  assert(feedback.played.some(n=>n.midi===60 && n.state==='played'));
  if(!hex)assert(feedback.played.filter(n=>n.state==='wrong').length>1,'all possible wrong positions remain red');
  const reattack={...a,at:2000};
  assert.deepEqual(tracker.visible([reattack],trainer),[reattack],'release/replay of same pitch while paused is fresh ungraded input');
});

test('display attribution uses attack object identity, not pitch/channel/time coincidence',()=>{
  const tracker=new FretboardHeldNotes(),a=attack(64),other={...a},active=new Map([['1:64',a]]);
  tracker.remember(a,{type:'correct',eventId:'chord',midi:64,noteIds:['e']},active);
  assert.deepEqual(tracker.visible([a,other],{currentEvent:events[1],noteStates:{e:'correct'}}),[other]);
  assert.deepEqual(tracker.visible([a],{currentEvent:events[1],noteStates:{}}),[a],'new attempt/reset does not reuse old attribution');
  assert.deepEqual(tracker.visible([a],{currentEvent:events[1],noteStates:{e:'completed-with-errors'}}),[],'accepted pitch from an errored chord is still a tail');
  assert.deepEqual(tracker.visible([a],{currentEvent:events[1],noteStates:{e:'correct'},liveWrongNotes:[{midi:64,channel:1}]}),[a],'existing live wrong attribution wins');
});

test('onset correction can attribute the raw held attack; current held credit remains visible',()=>{
  const tracker=new FretboardHeldNotes(),a=attack(63,6,1),active=new Map([['6:63',a]]);
  assert(tracker.remember({type:'pitch-bend',channel:6},{type:'pitch-corrected',midi:64,eventId:'chord',noteIds:['e'],correction:{rawMidi:63}},active));
  assert.deepEqual(tracker.visible([a],{currentEvent:events[1],noteStates:{e:'correct'}}),[]);
  const repeated={id:'repeat',notes:[{id:'held',midi:64}]};
  assert.deepEqual(tracker.visible([a],{currentEvent:repeated,noteStates:{e:'correct',held:'correct'}}),[a]);
  assert.equal(tracker.remember(a,{type:'wrong',eventId:'next'},active),false);
});

test('fresh paused input is neutral even when the last feedback has the same accepted or wrong pitch',()=>{
  const tracker=new FretboardHeldNotes(),fresh=attack(64),active=new Map([['1:64',fresh]]);
  assert(tracker.remember(fresh,null,active));
  assert(tracker.isUngraded(fresh));
  for(const type of ['correct','wrong']) {
    const model=buildFretboardModel({track,currentEvent:events[0],noteStates:{e:'correct'},
      activeNotes:[{...fresh,fretboardUngraded:tracker.isUngraded(fresh)}],lastFeedback:{type,midi:64}});
    assert(model.played.length>0);assert(model.played.every(n=>n.state==='played'));
    assert.equal(model.targets[0].state,'correct','retained target feedback remains independent');
  }
  tracker.remember(fresh,{type:'correct',eventId:'chord',midi:64,noteIds:['e']},active);
  assert.equal(tracker.isUngraded(fresh),false,'later genuine acceptance replaces neutral attribution');
});
