import test from 'node:test';
import assert from 'node:assert/strict';
import {beatSegment, completedBeatColor, createPdfBeatGuide, playbackBeat} from '../js/pdf-beat-guide.js';
import {beatInset} from '../js/pdf-beat-anchors.js';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';

const chord = {
  id:'a', trackId:'0', playbackMeasureIndex:0, startTick:0, endTick:960,
  startTimeMs:0, endTimeMs:500, targetEndTimeMs:500,
  notes:[{id:'a1',midi:60},{id:'a2',midi:64}], pitches:[60,64], isRest:false
};
const note = (midi, at) => ({midi, channel:0, at});

test('PDF live chord feedback prioritizes a held wrong note and follows releases', () => {
  const wait = new WaitSession([chord]);
  wait.noteOn(0, note(60, 1), 1);
  assert.equal(wait.heldFeedbackColor(wait.records[0]), 'correct');
  wait.noteOn(0, note(61, 2), 2);
  assert.equal(wait.heldFeedbackColor(wait.records[0]), 'wrong');
  wait.noteOff(note(61, 3));
  assert.equal(wait.heldFeedbackColor(wait.records[0]), 'correct');
  wait.noteOff(note(60, 4));
  assert.equal(wait.heldFeedbackColor(wait.records[0]), null);
  wait.noteOn(0, note(64, 5), 5);
  assert.equal(completedBeatColor(wait.feedbackHistory()[0]), 'wrong', 'Wait correction retains the error');
  const clean = new WaitSession([chord]);
  clean.noteOn(0, note(60, 1), 1);
  clean.noteOn(0, note(64, 2), 2);
  assert.equal(completedBeatColor(clean.feedbackHistory()[0]), 'correct');
});

test('PDF Realtime results use final misses as well as wrong notes', () => {
  const session = new RealtimeSession([chord]);
  session.started = true;
  session.noteOn(note(60, 0), 0);
  assert.equal(completedBeatColor(session.feedbackHistory()[0]), null);
  session.advance(1000);
  assert.equal(completedBeatColor(session.feedbackHistory()[0]), 'wrong');
});

test('PDF beat geometry caps at the barline and uses grouped heads only as corroboration', () => {
  assert.deepEqual(beatSegment({startTick:120,endTick:200}, {startTick:100,endTick:180}), {start:.25,end:1});
  const rest = {...chord,startTick:960,endTick:1920,isRest:true};
  assert.equal(playbackBeat([chord,rest], 1000), rest);
  const box = {x:0,y:0,w:1,h:1};
  const clef = {x:.05,y:.2,text:'\uE050'};
  const first = {x:.2,y:.2,text:'\uE0A4'};
  const run = {x:.5,y:.2,text:'\uE0A4 \uE0A4',grouped:true};
  assert.equal(beatInset(box, [clef,first,run]), .2);
  assert.equal(beatInset(box, [clef,run]), 0);
  assert.equal(beatInset(box, [clef,{x:.15,y:.2,text:'\uE4E5'},first,run]), 0);
});

test('PDF results remain on pause, refresh on mapped repeat, and clear on loop or staff toggle', () => {
  const visits = [0,1,2].map(i=>({measureNumber:i+1,playbackMeasureIndex:i,startTick:i*1920,endTick:(i+1)*1920}));
  const events = [chord,{...chord,id:'b',playbackMeasureIndex:2,startTick:3840,endTick:4800}];
  const state = {playbackTimeline:{measures:visits,events},practiceTrackId:'0',expectedEvents:events,ui:{showNotationFeedback:true}};
  let rendered, active;
  const guide = createPdfBeatGuide(state, {updateBeatGuide(results, segment){rendered=results;active=segment;}}, ()=> 'correct');
  const trainer = {sessionStarted:true,history:[]};
  const sync = (i,tick,playing=true,loop) => guide.sync(trainer,visits[i],tick,[1,2,1],loop,playing);
  sync(0,0);
  assert.equal(active.color,'correct');
  trainer.history = [{eventId:'a',completed:true,allHit:true,wrongCount:0}];
  sync(0,1000);
  sync(0,1000,false);
  assert.equal(rendered.get(1).get('a').color,'correct');
  sync(2,3840);
  assert.equal(active.number,1);
  assert.equal(rendered.has(1),false);
  trainer.history.push({eventId:'b',completed:true,allHit:false,wrongCount:0});
  sync(2,4900);
  assert.equal(rendered.get(1).get('b').color,'wrong');
  trainer.history = [];
  sync(2,3840,true,new Set([1]));
  assert.equal(rendered.has(1),false);
  trainer.history = [{eventId:'b',completed:true,allHit:true,wrongCount:0}];
  sync(2,4900);
  state.ui.showNotationFeedback = false;
  sync(2,3840);
  assert.equal(active.color,'active');
  assert.equal(rendered.size,0);
  state.ui.showNotationFeedback = true;
  sync(2,4900);
  assert.equal(rendered.size,0);
});

test('PDF uses one shortest segment per mixed-duration chord in Realtime and Wait', () => {
  const visit = {measureNumber:1,playbackMeasureIndex:0,startTick:0,endTick:1920};
  const long = {...chord, endTick:1920};
  const short = {...chord, id:'upper', endTick:480};
  const next = {...chord, id:'next',startTick:600,endTick:960};
  const rest = {...chord,id:'rest',startTick:120,endTick:240,isRest:true};
  const timeline = {measures:[visit],events:[long,short,rest,next]};
  const graded = {eventId:long.id,completed:true,allHit:false,wrongCount:1};
  for (const mode of ['realtime','wait']) {
    const state = {mode,playbackTimeline:timeline,practiceTrackId:'0',expectedEvents:[long,next],ui:{showNotationFeedback:true}};
    let active, marks;
    const guide = createPdfBeatGuide(state, {updateBeatGuide(results, segment){active=segment;marks=results.get(1);}}, ()=> 'correct');
    const trainer = {currentEvent:long,sessionStarted:true,history:[]};
    guide.sync(trainer,visit,150,null,null,true);
    assert.deepEqual(active,{number:1,start:0,end:.25,color:'correct'});
    trainer.currentEvent = next;
    trainer.history = [graded];
    guide.sync(trainer,visit,600,null,null,true);
    assert.deepEqual(active,{number:1,start:.3125,end:.5,color:'correct'});
    assert.deepEqual([...marks.values()],[{start:0,end:.25,color:'wrong'}]);
    if (mode === 'realtime') {
      guide.sync(trainer,visit,1000,null,null,true);
      assert.equal(active,null,'the sustained voice does not bring back the earlier beat');
    }
  }
});
