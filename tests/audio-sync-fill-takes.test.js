import test from 'node:test';
import assert from 'node:assert/strict';
import {sparseFillTakes} from '../js/audio-sync-sparse.js';
import {selectPhraseTakes} from '../js/audio-sync-phrase-takes.js';

test('fill proposals follow sounding events and leave written silent bars open',()=>{
  const edges=[0,1,2,3,4], notes=[{start:0.5,end:0.75,pitch:2},{start:2,end:2.25,pitch:7},
    {start:2.5,end:2.75,pitch:11},{start:3,end:3.5,pitch:4}];
  const audio=new Float32Array(250*12);
  assert.deepEqual(sparseFillTakes({edges,notes},audio,10),[]);
  for(const n of notes)audio[(50+Math.round((n.start+0.55*(n.end-n.start))/0.04))*12+n.pitch]=1;
  const takes=sparseFillTakes({edges,notes},audio,10);
  assert.deepEqual(takes.map(t=>t.index),[0,2,3]);
  for(const t of takes) assert.ok(t.sparseFill && Math.abs(t.start-2-edges[t.index])<0.09);
});

test('phrase support replaces an isolated take and preserves a manual pin',()=>{
  const edges=[0,1,2,3,4];
  const rows=edges.slice(1).map((_,i)=>[{start:10+i,end:11+i,quality:0.7}]);
  rows[0].push({start:1,end:2,quality:0.9});
  const choices=[1,0,0,0];
  selectPhraseTakes(edges,rows,choices);
  assert.deepEqual(choices,[0,0,0,0]);
  rows[0][1].pinnedStart=true;choices[0]=1;
  selectPhraseTakes(edges,rows,choices);
  assert.deepEqual(choices,[1,0,0,0]);
});
