import test from 'node:test';
import assert from 'node:assert/strict';
import {measureIntervals,putAnchor,recordingLoop} from '../js/pdf-recording-timing.js';

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
