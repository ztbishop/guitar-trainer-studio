import test from 'node:test';
import assert from 'node:assert/strict';
import {precedingTake,suggestPrecedingMeasures} from '../js/audio-sync-backward.js';

const pitches=[4,7,5,0];
const bar={duration:2,distinct:4,probes:pitches.flatMap((pitch,i)=>[0.10,0.35].map(t=>({
  time:i/2+t,pitches:[pitch],weight:1
})))};
function recording(){
  const features=new Float32Array(250*12);
  for(let i=0;i<50;i++)features[(100+i)*12+pitches[Math.floor(i/12.5)]]=1;
  return features;
}
test('search the bar before a selected downbeat without moving existing takes or chaining estimates',()=>{
  const matches=[[],[],[{start:6,end:8,quality:0.9}]],choices=[-1,-1,0];
  suggestPrecedingMeasures([bar,bar,bar],matches,choices,recording());
  assert.deepEqual(choices,[-1,0,0]);
  assert(Math.abs(matches[1][0].start-4)<0.2);
  assert.equal(matches[1][0].end,6);assert.equal(matches[2][0].start,6);
});
test('a boundary cannot supply evidence for silence, a sustained chord, or a break before the downbeat',()=>{
  const silent=new Float32Array(250*12);
  assert.equal(precedingTake(bar,silent,6,2),null);
  assert.equal(precedingTake(bar,silent.fill(0.6),6,2),null);
  assert.equal(precedingTake(bar,recording(),7,2),null);
  assert.equal(precedingTake(bar,recording(),6,2,5.5),null);
});
