import test from 'node:test';
import assert from 'node:assert/strict';
import {precedingTake,suggestPrecedingMeasures,suggestInteriorMeasures} from '../js/audio-sync-backward.js';

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

function playedBar(sequence, registerShift=0) {
  const sampleRate=11025, samples=new Float32Array(8*sampleRate);
  const low=2*Math.PI*73.416/sampleRate;
  for(let i=0;i<2*sampleRate;i++){
    const beat=Math.floor(i/(sampleRate/2)),pitch=sequence[beat];
    const frequency=440*2**((pitch+registerShift-69)/12);
    samples[4*sampleRate+i]=0.8*Math.sin(low*i)+0.12*Math.sin(2*Math.PI*frequency*i/sampleRate);
  }
  return samples;
}
test('recover an interior measure in its guitar register despite candidates for other takes',()=>{
  const query={...bar,register:{low:60,high:67}};
  const earlier={start:0,end:2},left={start:2,end:4},right={start:6,end:8};
  const alternatives=[earlier];
  const matches=[[left],alternatives,[right]],choices=[0,-1,0];
  suggestInteriorMeasures([query,query,query],matches,choices,playedBar([64,67,65,60]));
  assert.deepEqual(choices,[0,1,0]);assert.equal(matches[1][0],earlier);
  assert.deepEqual(alternatives,[earlier]);
  const added=matches[1][1];
  assert(added.betweenMeasures);assert.equal(added.start,left.end);assert.equal(added.end,right.start);
  suggestInteriorMeasures([query,query,query],matches,choices,new Float32Array());
  assert.equal(matches[1].length,2);assert.equal(matches[0][0],left);assert.equal(matches[2][0],right);
});
test('interior recovery needs both neighbors, matching tempo and a changing pitch pattern in the score register',()=>{
  const query={...bar,register:{low:60,high:67}}, correct=playedBar([64,67,65,60]);
  for(const [samples,nextStart,choices] of [
    [new Float32Array(8*11025),6,[0,-1,0]],
    [playedBar([64,64,64,64]),6,[0,-1,0]],
    [playedBar([60,65,67,64]),6,[0,-1,0]],
    [playedBar([64,67,65,60],-24),6,[0,-1,0]],
    [correct,7,[0,-1,0]],[correct,6,[-1,-1,0]],[correct,6,[0,-1,-1]]
  ]){
    const matches=[[{start:2,end:4}],[],[{start:nextStart,end:nextStart+2}]];
    suggestInteriorMeasures([query,query,query],matches,choices,samples);
    assert.equal(choices[1],-1);assert.equal(matches[1].length,0);
  }
});
