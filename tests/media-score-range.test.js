import test from 'node:test';
import assert from 'node:assert/strict';
import {draftMusicRanges} from '../js/draft-alignment.js';
import {nextMusicStart,recordingScoreRange,recordingRegion,fullRecordingPractice,outsideRecordingScore} from '../js/media-score-range.js';
const timeline={endTick:800,measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400},{measureNumber:1,occurrence:2,startTick:400,endTick:800}]};
const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:2000},{barIndex:0,barOccurence:1,barPosition:0,millisecondOffset:5000},{barIndex:0,barOccurence:1,barPosition:1,millisecondOffset:6000}];
test('recording regions use score endpoints through repeat-aware nonlinear mapping without changing anchors',()=>{
  const original=JSON.stringify(points);
  assert.deepEqual(recordingScoreRange(points,timeline,8000),{start:2000,end:6000});
  assert.deepEqual([0,1999,2000,5000,5999,6000,8000].map(t=>recordingRegion(points,timeline,t)),['before','before','music','music','music','after','after']);
  assert.equal(JSON.stringify(points),original);
  assert.equal(recordingScoreRange([],timeline),null);
});
test('skip uses the next uniquely tracked span, including edited draft anchors',()=>{
  const visit={originalVisit:1,scoreMeasure:1,occurrence:1,anchors:[{offset480:120,seconds:2},{offset480:480,seconds:5}]};
  const plan={musicalVisits:[visit,{...visit,originalVisit:2,occurrence:2,startSeconds:4,endSeconds:9,anchors:[]}],
    intervals:[{startSeconds:7,endSeconds:8}]};
  const spans=draftMusicRanges(plan,timeline);
  assert.deepEqual(spans,[{startMs:2000,endMs:4000},{startMs:5000,endMs:7000},{startMs:8000,endMs:9000}]);
  assert.deepEqual([0,2000,3999,4000,5000,7000,9000].map(ms=>nextMusicStart(spans,ms)),[2000,null,null,5000,null,8000,null]);
  assert.equal(nextMusicStart([],0),null);
});

test('full-recording practice excludes Wait, explicit loops, editing and source restoration',()=>{
  const state={mode:'realtime',media:{preview:true,points,clock:{timeMs:7000}},playbackTimeline:timeline,practiceLoop:{enabled:false}};
  assert(fullRecordingPractice(state));assert(outsideRecordingScore(state));
  for(const modified of [{...state,mode:'wait'},{...state,practiceLoop:{enabled:true}},{...state,media:{...state.media,editing:true}},{...state,media:{...state.media,returning:true}}])assert.equal(fullRecordingPractice(modified),false);
});
