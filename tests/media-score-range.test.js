import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingScoreRange,recordingRegion,fullRecordingPractice,outsideRecordingScore} from '../js/media-score-range.js';
const timeline={endTick:800,measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400},{measureNumber:1,occurrence:2,startTick:400,endTick:800}]};
const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:2000},{barIndex:0,barOccurence:1,barPosition:0,millisecondOffset:5000},{barIndex:0,barOccurence:1,barPosition:1,millisecondOffset:6000}];
test('recording regions use score endpoints through repeat-aware nonlinear mapping without changing anchors',()=>{
  const original=JSON.stringify(points);
  assert.deepEqual(recordingScoreRange(points,timeline,8000),{start:2000,end:6000});
  assert.deepEqual([0,1999,2000,5000,5999,6000,8000].map(t=>recordingRegion(points,timeline,t)),['before','before','music','music','music','after','after']);
  assert.equal(JSON.stringify(points),original);
  assert.equal(recordingScoreRange([],timeline),null);
});
test('full-recording practice excludes Wait, explicit loops, editing and source restoration',()=>{
  const state={mode:'realtime',media:{preview:true,points,clock:{timeMs:7000}},playbackTimeline:timeline,practiceLoop:{enabled:false}};
  assert(fullRecordingPractice(state));assert(outsideRecordingScore(state));
  for(const modified of [{...state,mode:'wait'},{...state,practiceLoop:{enabled:true}},{...state,media:{...state.media,editing:true}},{...state,media:{...state.media,returning:true}}])assert.equal(fullRecordingPractice(modified),false);
});
