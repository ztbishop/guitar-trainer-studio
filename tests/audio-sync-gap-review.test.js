import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestionDraft} from '../js/audio-sync-score.js';
import {insertTimedMeasure} from '../js/missing-measure.js';

test('audio draft auditions a missing measure without applying the nearby or distant take',async()=>{
  const edges=[0,2,4,6,8,10], pitches=[0,4,7,2];
  const notes=edges.slice(0,-1).flatMap(start=>pitches.map((pitch,beat)=>({
    pitch,start:start+beat/2,end:start+(beat+1)/2
  })));
  const features=new Float32Array(12*600);
  for(let frame=0;frame<150;frame++) features[12*frame+pitches[Math.floor(frame*0.08)%4]]=1;
  const measures=edges.slice(1).map((_,i)=>({measureNumber:i+1,occurrence:1}));
  const matches=[[{start:0,end:2}],[{start:2,end:4}],[{start:20,end:22},{start:4.1,end:6.1}],
    [{start:12,end:14}],[{start:14,end:16}]];
  const input={measures,matches,choices:[0,0,-1,0,0],trackId:'0',scoreSha256:'a'.repeat(64),sourceSha256:'b'.repeat(64)};
  const plain=await suggestionDraft(input);
  const draft=await suggestionDraft({...input,gapSearch:{score:{edges,notes},features}});
  assert.deepEqual(draft.matchingEvidence.gapSuggestions,[{number:3,takes:[{start:4,end:6},{start:20,end:22}]}]);
  assert.deepEqual(draft.candidatePlan,plain.candidatePlan);
  assert.equal(draft.originalTimingText,plain.originalTimingText);
  assert.equal(plain.matchingEvidence.gapSuggestions,undefined);
  const added=insertTimedMeasure(draft.candidatePlan,measures,3,4,6,24);
  assert.deepEqual(added.musicalVisits.map(v=>[v.originalVisit,v.startSeconds,v.endSeconds]),
    [[1,0,2],[2,2,4],[3,4,6],[4,12,14],[5,14,16]]);
  assert.deepEqual(added.intervals.map(v=>[v.startSeconds,v.endSeconds]),[[6,12]]);
  assert.throws(()=>insertTimedMeasure(draft.candidatePlan,measures,3,20,22,24),/cross/);
});
