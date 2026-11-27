import test from 'node:test';
import assert from 'node:assert/strict';
import {measureIntervals,putAnchor,recordingLoop,shiftAnchors,tapPassages} from '../js/pdf-recording-timing.js';

test('sparse downbeats interpolate locally and an interior correction leaves outer pins fixed',()=>{
  let pins=[{time:1,measure:1},{time:9,measure:5}];
  assert.deepEqual(measureIntervals(pins).map(v=>v.start),[1,3,5,7]);
  pins=putAnchor(pins,{time:5.5,measure:3});
  pins=putAnchor(pins,{time:6,measure:3},5.5);
  assert.deepEqual(measureIntervals(pins).map(v=>[v.start,v.end]),[[1,3.5],[3.5,6],[6,7.5],[7.5,9]]);
  assert.throws(()=>putAnchor(pins,{time:6,measure:4}));
});
test('passage ends preserve breaks and loop selection follows the nearest repeated take',()=>{
  const spans=measureIntervals([{time:2,measure:1},{time:8,measure:2,end:true},
    {time:35,measure:1},{time:39,measure:2,end:true}]);
  assert.deepEqual(spans.map(s=>[s.start,s.end]),[[2,5],[5,8],[35,37],[37,39]]);
  assert.equal(recordingLoop(spans,1,2,36).start,35);
  assert.equal(recordingLoop(spans,1,2,3).end,8);
  assert.equal(recordingLoop(spans,1,3,3),null);
});

test('reviewed estimates belong to the exact two taps and take, with a continuous loop and unchanged breaks',()=>{
  const taps=[{measure:1,time:3},{measure:3,time:9,end:true},{measure:1,time:13},{measure:4,time:22}];
  const [first,second]=tapPassages(taps);
  const overrides={[first.id]:[4.8,6.9],[second.id]:[14.1,19.5]};
  const raw=JSON.stringify(taps),spans=measureIntervals(taps,overrides);
  assert.deepEqual(spans.map(s=>[s.start,s.end]),[[3,4.8],[4.8,6.9],[6.9,9],[13,14.1],[14.1,19.5],[19.5,22]]);
  assert.equal(recordingLoop(spans,2,3,16).start,14.1);
  assert.equal(JSON.stringify(taps),raw);
  for(const invalid of [[5,4],[3,7],[5,9],[NaN,7],[]])
    assert.deepEqual(measureIntervals(taps,{[first.id]:invalid}),measureIntervals(taps));
  const changed=putAnchor(taps,{measure:2,time:5.25});
  assert.deepEqual(measureIntervals(changed,overrides).map(s=>s.start),[3,5.25,7.125,13,14.1,19.5]);
});

test('a repeat join closes the first pass and starts the second at the same timestamp',()=>{
  let pins=[{measure:35,time:1}];
  pins=putAnchor(pins,{measure:45,time:12,end:true});
  pins=putAnchor(pins,{measure:35,time:12});
  pins=putAnchor(pins,{measure:46,time:23});
  const spans=measureIntervals(pins);
  assert.deepEqual(spans.slice(10,12),[{measure:45,start:11,end:12},{measure:35,start:12,end:13}]);
  const start=pins[2];
  assert.equal(putAnchor(pins,{...start,time:12.5},start)[1].end,true);
});

test('bulk shift preserves repeat timestamps and rejects a missing destination before changing taps',()=>{
  const taps=[{measure:2,time:1},{measure:4,time:5,end:true},{measure:2,time:5},{measure:5,time:10}];
  const measures=[1,2,3,4,5];
  const shifted=shiftAnchors(taps,measures,2,4,1);
  assert.deepEqual(shifted.map(a=>a.measure),[3,5,3,5]);
  assert.deepEqual(shifted.map(a=>a.time),taps.map(a=>a.time));
  assert.equal(shifted[1].end,true);
  assert.deepEqual(taps.map(a=>a.measure),[2,4,2,5]);
  assert.throws(()=>shiftAnchors(taps,measures,2,5,1),/Measure 6 has no PDF box/);
  assert.throws(()=>shiftAnchors(taps,measures,4,2,1),/ordered measure range/);
});
