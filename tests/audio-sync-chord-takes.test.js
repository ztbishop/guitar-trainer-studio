import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverChordVariations} from '../js/audio-sync-chord-takes.js';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';

const chords=[[0,4,7],[2,5,9],[4,7,11],[5,9,0],[7,11,2],[9,0,4]];

function lesson(earlyChords=chords) {
  const samples=new Float32Array(35*SAMPLE_RATE);
  const hop=SAMPLE_RATE*0.04,features=new Float32Array(Math.ceil(samples.length/hop)*12);
  const edges=[0,1,2,3,4,5,6,8,10,12], notes=[];
  for (let i=0;i<12;i++) for (const pitch of chords[i%6]) notes.push({pitch,start:i,end:i+1});
  // The learner hears the opening, a break, then two performances. Mark
  // strums in the waveform and their audible pitch classes in the feature grid.
  for (const [start,played] of [[0,chords],[10,earlyChords],[25,chords]]) {
    for (const [j,chord] of played.entries()) {
      const sample=(start+j)*SAMPLE_RATE;
      samples.fill(0.08,sample,sample+Math.floor(SAMPLE_RATE*0.8));
      for (let frame=Math.round(sample/hop);frame<(sample+SAMPLE_RATE*0.82)/hop;frame++) {
        for (const p of chord) features[frame*12+p]=1/Math.sqrt(chord.length);
      }
    }
  }
  const matches=edges.slice(0,-1).map((start,i)=>i<6?[{start,end:start+1}]:
    [10,25].map(t=>({start:t+start-6,end:t+start-4})));
  const choices=matches.map((_,i)=>i<6?0:1);
  return {samples,features,score:{edges,notes},matches,choices};
}

function run(d) {
  recoverChordVariations(d.score,d.samples,d.features,d.matches,d.choices);
  return d.matches.map((row,i)=>row[d.choices[i]]);
}

test('the preceding progression supports the earlier complete variation and preserves prior alternatives',()=>{
  const data=lesson(),previous=structuredClone(data.matches);
  const selected=run(data);
  assert.deepEqual(selected.slice(0,6),previous.slice(0,6).map(row=>row[0]));
  for (let i=6;i<9;i++) {
    assert.ok(Math.abs(selected[i].start-previous[i][0].start)<=0.08);
    assert.deepEqual(data.matches[i].slice(0,2),previous[i]);
  }
  assert.ok(selected[6].start-selected[5].end>3);
});

test('silence, shared pitches without the changes, and chords in reverse order keep the later take',()=>{
  for (const played of [[],chords.map(()=>chords[0]),[...chords].reverse()]) {
    const data=lesson(played),previous=structuredClone(data.matches);
    run(data);
    assert.deepEqual(data.matches,previous);
  }
});

test('an isolated earlier bar candidate cannot move the rest of a phrase',()=>{
  const data=lesson();
  for (let i=7;i<9;i++) {
    data.matches[i].shift();
    data.choices[i]=0;
  }
  const previous=structuredClone(data.matches);
  run(data);
  assert.deepEqual(data.matches,previous);
});

test('written rests between strums are ineligible for continuous chord recovery',()=>{
  const data=lesson(),previous=structuredClone(data.matches);
  for (const n of data.score.notes) if (n.start===8) n.end=n.start+0.25;
  run(data);
  assert.deepEqual(data.matches,previous);
});
