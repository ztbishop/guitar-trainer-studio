import test from 'node:test';
import assert from 'node:assert/strict';
import {refineContextBoundaries} from '../js/audio-sync-boundaries.js';
import {SAMPLE_RATE} from '../js/audio-sync-match.js';

const chord = [0,4,7], otherChord = [2,5,9];
const take = (start,end)=>({start,end,quality:0.8});
const probe = (onset,pitches=chord)=>({onset,pitches});
const frame = 0.04;

function fixture({hasPhrase=true,hasChord=true,hasAttack=true,gap=0.32,sustain=false,nextChord=chord}={}) {
  const old = [take(0,2),take(3,5),take(7,9)];
  const next = take(12.16,16), following = take(16+gap,19);
  const matches = [[old[0],take(9.2,10)],[old[1],next],[old[2],following]];
  const choices = [0,1,1];
  const routes = [[null,next,following],[hasPhrase ? take(9.32,12.12) : null,next,following]];
  const bars = [{duration:4,span:2,probes:[probe(0),probe(2,otherChord)]},
    {duration:2,probes:[probe(0),probe(1,otherChord)]},
    {duration:2,span:sustain ? 2 : undefined,probes:[probe(0)]}];
  const samples = new Float32Array(20*SAMPLE_RATE);
  const features = new Float32Array(20/frame*12);
  function sound(at,pitches,attack=true) {
    if (attack) samples.fill(0.1,Math.round(at*SAMPLE_RATE),Math.round((at+0.56)*SAMPLE_RATE));
    for (let i=Math.round(at/frame); i<Math.round((at+0.56)/frame); i++) {
      for (const p of pitches) features[i*12+p] = 1/Math.sqrt(pitches.length);
    }
  }
  sound(9.12,hasChord ? chord : otherChord,hasAttack);
  sound(12,chord);
  sound(15.76,otherChord);
  sound(16.48,nextChord);
  refineContextBoundaries(bars,samples,features,matches,choices,old,routes);
  return {old,matches,timed:choices.map((c,i)=>matches[i][c])};
}

test('a corroborated chord and local attacks replace the stale take and close the following bar line',()=>{
  const {old,matches,timed} = fixture();
  assert.deepEqual(timed.map(t=>[t.start,t.end].map(s=>Math.round(s*1000))),
    [[9120,12000],[12000,16480],[16480,19000]]);
  assert.deepEqual(matches.map(row=>row[0]),old);
});

test('a long phrase, the written chord and an attack are all required to replace an isolated chord',()=>{
  for (const options of [{hasPhrase:false},{hasChord:false},{hasAttack:false}]) {
    const {old,timed} = fixture(options);
    assert.equal(timed[0],old[0]);
  }
});

test('a longer gap stays open even with a nearby chord attack',()=>{
  const {timed} = fixture({gap:0.6});
  assert.equal(timed[1].end,16);
  assert.equal(timed[2].start,16.6);
});

test('a delayed sustained chord can move a nearly shared boundary without moving earlier attacks',()=>{
  const {timed} = fixture({gap:0.04,sustain:true});
  assert.deepEqual(timed.map(t=>[t.start,t.end].map(s=>Math.round(s*1000))),
    [[9120,12000],[12000,16480],[16480,19000]]);
  for (const options of [{sustain:false},{sustain:true,nextChord:otherChord}]) {
    const {timed:unconfirmed} = fixture({gap:0.04,...options});
    assert.equal(unconfirmed[1].end,16);
    assert.equal(unconfirmed[2].start,16.04);
  }
});
