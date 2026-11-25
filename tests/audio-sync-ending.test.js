import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverPaddedEnding} from '../js/audio-sync-ending.js';
import {recordingFeatures,SAMPLE_RATE} from '../js/audio-sync-match.js';

function cadence(muteRun=false) {
  const edges=[0,2,4,6,8,10,12],notes=[],samples=new Float32Array(15*SAMPLE_RATE);
  function pluck(start,pitches,time,length=.35,release=start+.25) {
    for(const midi of pitches) {
      notes.push({start,end:release,midi,pitch:midi%12});
      if(muteRun && start>=6 && start<9)continue;
      for(let j=0;j<length*SAMPLE_RATE;j++) {
        const t=j/SAMPLE_RATE;
        samples[Math.round(time*SAMPLE_RATE)+j]+=.15*Math.exp(-3*t)*Math.sin(2*Math.PI*440*2**((midi-69)/12)*t);
      }
    }
  }
  const pitches=[60,64,67,62,71,69,65,59,62,64,67,69,74,76];
  for(const [i,m] of pitches.entries())pluck(2+i*.5,[m],2.5+i*.67);
  pluck(9,[50,54,57],12.1,1.4,10);
  const matches=[[{start:.5,end:2.5}],[],[{start:12.4,end:12.8}],[],[],[]],choices=[0,-1,0,-1,-1,-1];
  return {score:{edges,notes},samples,features:recordingFeatures(samples),matches,choices};
}
function run({score,samples,features,matches,choices}) {
  recoverPaddedEnding(score,samples,features,matches,choices);
}
test('a pitch-changing run into a ringing chord can locate sounding bars before trailing rests',()=>{
  const f=cadence();run(f);
  assert.deepEqual(f.choices,[0,-1,-1,0,0,-1]);
  assert.deepEqual(f.matches[2],[{start:12.4,end:12.8}]);
  const [a,b]=f.matches.slice(3,5).map(r=>r[0]);
  assert.ok(Math.abs(a.start-(2.5+8*.67))<.1);
  assert.ok(Math.abs(b.start-(2.5+12*.67))<.1);
  assert.equal(a.end,b.start);
  assert.ok(Math.abs(b.interior.at(-1).seconds-12.1)<.12);
  assert.ok(Math.abs(b.end-13.5)<.15);
});
test('the chord alone cannot recover a missing run or displace a protected choice',()=>{
  for(const muted of [true,false]) {
    const f=cadence(muted);
    if(!muted)f.matches[2][0].pinnedStart=true;
    const before=structuredClone([f.matches,f.choices]);run(f);
    assert.deepEqual([f.matches,f.choices],before);
  }
});
