import test from 'node:test';
import assert from 'node:assert/strict';
import {insertTimedMeasure} from '../js/missing-measure.js';
import {selectedVisits} from '../js/audio-sync-score.js';

const measures=[{measureNumber:1,occurrence:1},{measureNumber:2,occurrence:1},
  {measureNumber:1,occurrence:2},{measureNumber:2,occurrence:2}];
const visits=selectedVisits(measures,[[{start:5,end:10}],[],[],[{start:25,end:30}]],[0,-1,-1,0]);
const ref=({visit,originalVisit,scoreMeasure,occurrence})=>({visit,originalVisit,scoreMeasure,occurrence});
const gap={id:'gap-3',kind:'explanation',label:'Unscored recording gap',startSeconds:10,endSeconds:25,
  boundary:{after:ref(visits[0]),before:ref(visits[1])}};
const plan={musicalVisits:visits,intervals:[gap]};

test('insert a repeated measure inside an analyzer gap and keep both remaining gaps attached to their neighbors',()=>{
  const result=insertTimedMeasure(plan,measures,3,12,20,30);
  const [left,inserted,right]=result.musicalVisits;
  assert.deepEqual([inserted.scoreMeasure,inserted.occurrence,inserted.originalVisit],[1,2,3]);
  assert.deepEqual(result.intervals.map(i=>[i.startSeconds,i.endSeconds,i.boundary]),[
    [10,12,{after:ref(left),before:ref(inserted)}],[20,25,{after:ref(inserted),before:ref(right)}]]);
  assert.equal(new Set(result.intervals.map(i=>i.id)).size,2);
  assert.deepEqual(right,{...visits[1],visit:3});
  assert.deepEqual(plan.musicalVisits,visits);assert.deepEqual(plan.intervals,[gap]);
});

test('a measure can fill the entire generated gap, but cannot replace a labeled break or overlap existing music',()=>{
  assert.deepEqual(insertTimedMeasure(plan,measures,2,10,25,30).intervals,[]);
  assert.throws(()=>insertTimedMeasure({...plan,intervals:[{...gap,label:'Instructor introduction'}]},measures,2,10,25,30),/labeled break/);
  assert.throws(()=>insertTimedMeasure(plan,measures,2,9,25,30),/cross another measure/);
  assert.throws(()=>insertTimedMeasure(plan,measures,1,0,4,30),/assignments/);
  assert.throws(()=>insertTimedMeasure(plan,measures,3,25,25,30),/later end/);
});
