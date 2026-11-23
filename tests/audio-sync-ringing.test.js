import test from 'node:test';
import assert from 'node:assert/strict';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';
import {observedChordRelease,refineOpeningChord} from '../js/audio-sync-ringing.js';

const triad=[60,64,67], other=[61,65,68];
const score={edges:[0,2,4],notes:[0,2].flatMap(start=>
  triad.map(note=>({pitch:note%12,start,end:start+2})))};

function recording(parts) {
  const samples=new Float32Array(5*SAMPLE_RATE);
  for (const [start,end,notes] of parts) {
    for (let i=Math.ceil(start*SAMPLE_RATE);i<Math.floor(end*SAMPLE_RATE);i++) {
      const elapsed=i/SAMPLE_RATE-start;
      for (const note of notes) {
        const frequency=440*2**((note-69)/12);
        samples[i]+=0.08*Math.exp(-0.35*elapsed)*Math.sin(2*Math.PI*frequency*elapsed);
      }
    }
  }
  return samples;
}

function opening(parts) {
  const matches=[[{start:1.88,end:3}],[{start:3,end:4}]], choices=[0,0];
  refineOpeningChord(score,recording(parts),matches,choices);
  assert.deepEqual(matches[0][0],{start:1.88,end:3});
  assert.deepEqual(matches[1],[{start:3,end:4}]);
  assert.equal(choices[1],0);
  return matches[0][choices[0]];
}

test('a sustained opening triad can begin before its selected take',()=>{
  const take=opening([[1,3,triad]]);
  assert.ok(Math.abs(take.start-1)<0.12);
  assert.equal(take.end,3);
});

test('an earlier demonstration separated by silence or other pitches stays separate',()=>{
  assert.equal(opening([[1,1.45,triad],[1.88,3,triad]]).start,1.88);
  assert.equal(opening([[1,1.40,triad],[1.40,1.80,other],[1.80,3,triad]]).start,1.88);
});

test('an extrapolated release can follow a ringing chord to its observed end',()=>{
  const end=observedChordRelease(score,recording([[1,3.52,triad]]),{start:1,end:3});
  assert.ok(Math.abs(end-3.52)<0.12);
});

test('a later strum after silence and a different chord cannot extend the ending',()=>{
  for (const parts of [
    [[1,3,triad],[3.16,3.8,triad]],
    [[1,3,triad],[3,3.8,other]],
    [[1,3.16,triad]],
    [[1,5,triad]]
  ]) assert.equal(observedChordRelease(score,recording(parts),{start:1,end:3}),undefined);
});

test('a written rest or single held pitch supplies no chord release evidence',()=>{
  const samples=recording([[1,3.52,triad]]),take={start:1,end:3};
  assert.equal(observedChordRelease({edges:[0,2],notes:[{pitch:0,start:0,end:2}]},samples,take),undefined);
  assert.equal(observedChordRelease({edges:[0,3],notes:score.notes.slice(0,3)},samples,take),undefined);
});
