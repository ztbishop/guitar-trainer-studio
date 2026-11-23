import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverSteadyPassages} from '../js/audio-sync-steady.js';
import {recoverChordSequences} from '../js/audio-sync-chord-sequence.js';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';

function sound(samples,start,duration,notes) {
  const offset=Math.round(start*SAMPLE_RATE);
  for (let i=0;i<Math.floor(duration*SAMPLE_RATE);i++) {
    const t=i/SAMPLE_RATE;
    const envelope=Math.min(1,t*80)*Math.exp(-2*t);
    for (const note of notes) {
      const hz=440*2**((note-69)/12);
      samples[offset+i]+=0.12*envelope*Math.sin(2*Math.PI*hz*t);
    }
  }
}

test('tempo consensus fills heard neighbors and requires the written bend attack and held target',()=>{
  for (const type of ['bend','starts high','unrelated']) {
    const samples=new Float32Array(17*SAMPLE_RATE);
    const bars=[],matches=[],choices=[],edges=[];
    for (let i=0;i<15;i++) {
      edges.push(i);
      bars.push({duration:1,probes:[{onset:0,time:0.12,weight:1,pitches:[0]},
        {onset:0.5,time:0.63,weight:1,pitches:[4]}],register:{low:60,high:64}});
      if ([0,1,5,9,13,14].includes(i)) {matches.push([{start:i+1,end:i+2,quality:1}]);choices.push(0);}
      else {matches.push([]);choices.push(-1);}
      if (i===7) {
        bars[i]={duration:1,bendTarget:62,register:{low:60,high:60},probes:[{onset:0,time:0.25,pitches:[0],weight:1}]};
        if (type==='bend') sound(samples,i+1,0.14,[60]);
        sound(samples,i+(type==='bend'?1.14:1),0.85,[type==='unrelated'?67:62]);
      } else if (i!==3) {
        sound(samples,i+1,0.45,[60]);sound(samples,i+1.5,0.45,[64]);
      }
    }
    edges.push(15);
    recoverSteadyPassages({edges},bars,samples,matches,choices);
    assert.equal(choices[3],-1);
    assert.ok(choices[6]>=0 && choices[8]>=0);
    assert.equal(choices[7]>=0,type==='bend');
  }
});

test('changing chord voices identify a phrase and two identical takes leave the original choice open',()=>{
  const voices=[64,66,69,71,66,64,71,69];
  const bars=[],notes=[],edges=[0,2,4,6,8];
  for (let i=0;i<4;i++) {
    const probes=[];
    for (let j=0;j<2;j++) {
      const pitches=[0,7,voices[i*2+j]%12];
      probes.push({onset:j,pitches});
      notes.push(...pitches.map(pitch=>({start:i*2+j,end:i*2+j+1,pitch})));
    }
    bars.push({duration:2,probes,register:{low:48,high:71}});
  }
  for (const copies of [0,1,2]) {
    const samples=new Float32Array(24*SAMPLE_RATE);
    for (const start of [2,13].slice(0,copies))
      voices.forEach((v,i)=>sound(samples,start+i,0.7,[48,55,v]));
    const matches=bars.map(()=>[]),choices=bars.map(()=>-1);
    recoverChordSequences({edges,notes},bars,samples,matches,choices);
    if (copies===1) {
      for (const [i,c] of choices.entries()) assert.ok(Math.abs(matches[i][c]?.start-(2+2*i))<0.12);
    } else assert.deepEqual(choices,[-1,-1,-1,-1]);
  }
});
