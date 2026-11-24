import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverPinnedPhrases} from '../js/audio-sync-pinned-phrases.js';

function fixture() {
  const count = 10, seconds = 2, pitches = [0,4,7,2];
  const edges = Array.from({length:count+1}, (_,i)=>i*seconds);
  const notes = edges.slice(0,-1).flatMap(start=>pitches.map((pitch,beat)=>({
    start:start+beat/2, end:start+(beat+1)/2, pitch
  })));
  const features = new Float32Array(12*count*seconds/0.04);
  for(let t=0; t<features.length/12; t++) {
    features[t*12+pitches[Math.floor(t*0.04*2)%4]]=1;
  }
  const choices = edges.slice(0,-1).map((_,i)=>i>=2&&i<8?-1:0);
  const matches = choices.map((choice,i)=>choice<0
    ? [{start:100+i*seconds,end:100+(i+1)*seconds,reviewOnly:true}]
    : [{start:edges[i],end:edges[i+1],quality:0.8}]);
  return {score:{edges,notes},features,choices,matches};
}

test('fills a six-bar phrase while preserving all pins and competing takes',()=>{
  const {score,features,choices,matches}=fixture();
  const before=structuredClone(matches);
  recoverPinnedPhrases(score,features,matches,choices);
  assert.deepEqual(choices,[0,0,1,1,1,1,1,1,0,0]);
  for(const [i,row] of matches.entries()){
    assert.deepEqual(row[0],before[i][0]);
    if(choices[i]===1) {
      assert.ok(row[1].betweenMeasures);
      assert.deepEqual([row[1].start,row[1].end],score.edges.slice(i,i+2));
    }
  }
});

test('requires musical evidence throughout and independent timing on both sides',()=>{
  for(const change of ['unpitched middle','long break','unsupported right pin']){
    const {score,features,choices,matches}=fixture();
    if(change==='unpitched middle')features.fill(0,200*12,250*12);
    if(change==='long break')for(const row of matches.slice(8)){row[0].start+=15;row[0].end+=15;}
    if(change==='unsupported right pin')choices[9]=-1;
    const before=structuredClone({choices,matches});
    recoverPinnedPhrases(score,features,matches,choices);
    assert.deepEqual({choices,matches},before,change);
  }
});
