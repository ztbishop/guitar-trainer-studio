import test from 'node:test';
import assert from 'node:assert/strict';
import {compareAudioEstimates} from '../js/pdf-audio-estimates.js';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';

// Taps at 1 and 21 s put evenly spaced starts at 6, 11 and 16 s.
// The 7 s attack also falls on a faster pulse from the first tap when
// the recording contains accents at both 4 and 10 s.
function comparePulses(reverse,extraAccents) {
  const samples=new Float32Array(22*SAMPLE_RATE);
  const accents=[[1,1],[7,1],[11.7,.9],[16,.9],[21,1],...extraAccents];
  for(const [time,level] of accents){
    const start=Math.round((reverse?22-time:time)*SAMPLE_RATE);
    for(let i=0;i<1500;i++)
      samples[start+i]+=level*Math.sin(i*2*Math.PI*100/SAMPLE_RATE)*Math.exp(-i/280);
  }
  return compareAudioEstimates(samples,0,1,21,4);
}

for(const reverse of [false,true]){
  test('review checks for a competing pulse from the '+(reverse?'end':'start')+' tap',()=>{
    const even=[6,11,16];
    const clear=comparePulses(reverse,[]);
    assert.equal(clear.hasCompetingPulse,false);
    assert.equal(clear.suggested.filter((t,i)=>t!==even[i]).length,2);
    for(const isolated of [[[4,.42]],[[10,1]]]){
      const single=comparePulses(reverse,isolated);
      assert.equal(single.hasCompetingPulse,false);
      assert.deepEqual(single.suggested,clear.suggested);
    }
    const ambiguous=comparePulses(reverse,[[4,.42],[10,1]]);
    assert.equal(ambiguous.hasCompetingPulse,true);
    assert.deepEqual(ambiguous.suggested,even);
    assert.deepEqual(ambiguous.audio,clear.audio);
  });
}
