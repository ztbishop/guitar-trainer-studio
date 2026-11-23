import test from 'node:test';
import assert from 'node:assert/strict';
import {continuousPerformance} from '../js/audio-sync-continuous.js';
import {setPerformanceAnchors,selectedVisits,takePosition,followTake} from '../js/audio-sync-score.js';
import {draftPosition} from '../js/draft-alignment.js';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';

// One measure's first note is held for two extra beats. Subsequent notes
// accelerate to meet the next downbeat. The ordinary search left it blank.
function fixture(silence=false) {
  const edges=[0,2,4,6,8,10], notes=[];
  const times=[1,1.5,2,2.5,3,3.5,4,4.5,5,6.45,6.65,6.85,7,7.5,8,8.5,9,9.5,10,10.5,11];
  const samples=new Float32Array(12*SAMPLE_RATE),features=new Float32Array(300*12);
  for (let i=0;i<20;i++) {
    const pitch=[2,6,9,4,11,5,7][i%7];
    notes.push({start:i/2,end:(i+1)/2,pitch});
    const muted=silence && i>=8 && i<12;
    if (!muted) {
      samples.fill(0.1,Math.round(times[i]*SAMPLE_RATE),Math.round(times[i+1]*SAMPLE_RATE));
      for (let j=Math.round(times[i]/0.04);j<Math.round(times[i+1]/0.04);j++) features[j*12+pitch]=1;
    }
  }
  const matches=edges.slice(0,-1).map((s,i)=>i===2?[]:[{start:s+1,end:s+3}]);
  const choices=[0,0,-1,0,0];
  continuousPerformance({edges,notes},samples,features,matches,choices);
  return {matches,choices};
}

test('continuous alignment finds attacks inside a held measure between known downbeats',()=>{
  const {matches,choices}=fixture();
  const take=matches[2][choices[2]];
  assert.ok(take);
  assert.ok(Math.abs(take.start-5)<0.10 && Math.abs(take.end-7)<0.10);
  assert.ok(take.interior.some(p=>p.scoreTime===4.5 && Math.abs(p.seconds-6.45)<0.12));
  for (const i of [0,1,3,4]) assert.equal(matches[i][choices[i]].start,i*2+1);
});

test('an empty recording span between convincing neighbors stays ungraded',()=>{
  const {choices}=fixture(true);
  assert.equal(choices[2],-1);
});

test('audition, score seeking and the draft use the same interior tick through an authored tempo change',()=>{
  const timeline={ticksPerQuarter:480,tempoMap:[{tick:0,timeMs:0,bpm:120},{tick:480,timeMs:500,bpm:60}],
    measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:1920}]};
  const take={start:1,end:7,interior:[{scoreTime:1.5,seconds:5.5}]};
  setPerformanceAnchors(timeline,[[take]]);
  assert.deepEqual(take.anchors,[{offset480:240,seconds:5.5}]);
  const musicalVisits=selectedVisits(timeline.measures,[[take]],[0]);
  assert.equal(takePosition(take,0.5,true),5.5);
  assert.equal(takePosition(take,5.5,false),0.5);
  assert.equal(draftPosition({musicalVisits,intervals:[]},timeline,5.5).fraction,0.5);
});

test('continuing a take does not automatically accept a review-only continuous suggestion',()=>{
  assert.deepEqual(followTake([[{start:0,end:2}],[{start:2,end:4,reviewOnly:true}]],[0,-1],0),[0,-1]);
});
