import test from 'node:test';
import assert from 'node:assert/strict';
import {precedingTake,suggestPrecedingMeasures,suggestInteriorMeasures} from '../js/audio-sync-backward.js';

import {recordingFeatures,SAMPLE_RATE} from '../js/audio-sync-match.js';

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

// Repeat the phrase once outside the pins. Within them, vary the length of the
// first two measures so an evenly spaced answer would miss the internal beat.
function passageFixture(count, silentMeasure=-1, clipped=false) {
  const bars = [], edges = [0], notes = [];
  const pcm = new Float32Array((2*count+8)*SAMPLE_RATE);
  const starts = [4];
  for (let i=0; i<count+2; i++) {
    const sequence = i%2 ? [64,67,65,60] : [69,62,65,67];
    const probes = [];
    sequence.forEach((midi,j) => {
      const onset = j/2;
      probes.push({time:onset+0.10,onset,pitches:[midi%12],weight:1},
        {time:onset+0.35,pitches:[midi%12],weight:1});
      notes.push({start:2*i+onset,end:2*i+onset+0.50,pitch:midi%12});
    });
    bars.push({duration:2,distinct:4,register:{low:Math.min(...sequence),high:Math.max(...sequence)},probes});
    edges.push(2*i+2);
    if (i===0 || i>count) continue;
    const start = starts.at(-1), length = i===1 ? 2.24 : i===2 ? 1.76 : 2;
    starts.push(start+length);
    function play(from) {
      for (let frame=0; frame<Math.round(length*SAMPLE_RATE); frame++) {
        const beat = 4*frame/(length*SAMPLE_RATE);
        if (clipped && beat%1 > 0.45) continue;
        const hz = 440*2**((sequence[Math.floor(beat)]-69)/12);
        pcm[Math.round(from*SAMPLE_RATE)+frame] = Math.sin(2*Math.PI*hz*frame/SAMPLE_RATE)/2;
      }
    }
    if (i===1) play(0);
    if (i!==silentMeasure) play(start);
  }
  const left = {start:2,end:4}, right = {start:starts.at(-1),end:starts.at(-1)+2};
  const other = {start:0,end:2.24};
  const matches = [[left],...Array.from({length:count},()=>[other]),[right]];
  const choices = [0,...Array(count).fill(-1),0];
  suggestInteriorMeasures(bars,matches,choices,pcm,{edges,notes},recordingFeatures(pcm));
  assert.equal(matches[0][0],left);
  assert.equal(matches.at(-1)[0],right);
  assert(matches.slice(1,-1).every(row=>row[0]===other));
  return {starts,matches,choices};
}

test('two to four missing bars follow local tempo between fixed pins and retain other takes',()=>{
  for (const count of [2,3,4]) {
    const {starts,matches,choices} = passageFixture(count);
    assert.deepEqual(choices,[0,...Array(count).fill(1),0]);
    for (let i=1;i<=count;i++) {
      const take = matches[i][choices[i]];
      assert(take.betweenMeasures);
      assert(Math.abs(take.start-starts[i-1])<0.10);
      assert.equal(take.end, i===count ? starts.at(-1) : matches[i+1][choices[i+1]].start);
    }
  }
});

test('short articulations can confirm a passage through attacks in each measure',()=>{
  assert.deepEqual(passageFixture(3,-1,true).choices,[0,1,1,1,0]);
});

test('a quiet measure rejects the entire passage even with a correct take outside the pins',()=>{
  for (const silent of [1,2,3]) {
    const {matches,choices} = passageFixture(3,silent);
    assert.deepEqual(choices,[0,-1,-1,-1,0]);
    assert(matches.every(row=>row.length===1));
  }
  assert.deepEqual(passageFixture(5).choices,[0,-1,-1,-1,-1,-1,0]);
});
