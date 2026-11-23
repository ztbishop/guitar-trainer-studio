import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseContextTakes} from '../js/audio-sync-context.js';

const take = (start,length=2)=>({start,end:start+length,quality:0.8});

test('both longer phrases identify a later take and keep the existing choices available',()=>{
  const baseline = [take(5),take(7),take(9),take(33)];
  const matches = baseline.map(t=>[t]);
  const choices = [0,0,0,0];
  const five = [take(19),take(21),take(23),take(33.04)];
  const seven = [take(19.04),take(21.04),take(23.04),take(33.08)];
  matches[0].push(seven[0]);
  chooseContextTakes(matches,choices,five,seven,[[],[],[],[]]);
  assert.deepEqual(choices,[1,1,1,0]);
  assert.equal(matches[0].length,2);
  assert.deepEqual(matches.map(row=>row[0]),baseline);
  assert.deepEqual(matches.map((row,i)=>row[choices[i]].start),[19.04,21.04,23.04,33]);
});

test('an isolated agreement, a spoken break or reused single-bar guesses cannot switch the take',()=>{
  const early = [take(2),take(4)];
  const later = [take(20),take(22)];
  for (const [five,seven,singles] of [
    [later,[later[0],take(40)],[[],[]]],
    [[later[0],take(40)],[later[0],take(40)],[[],[]]],
    [later,later,later.map(t=>[t])]
  ]) {
    const matches = early.map(t=>[t]), choices = [0,0];
    chooseContextTakes(matches,choices,five,seven,singles);
    assert.deepEqual(choices,[0,0]);
    assert(matches.every(row=>row.length===1));
  }
});

test('a changed take can leave conflicting visits unmapped and preserves nearby correct boundaries',()=>{
  const original = [take(2),take(4),take(21),take(30)];
  const matches = original.map(t=>[t]), choices = [0,0,0,0];
  const later = [take(20),take(22),null,take(30.04)];
  chooseContextTakes(matches,choices,later,later,[[],[],[],[]]);
  assert.deepEqual(choices,[1,1,-1,0]);
  assert.equal(matches[2][0],original[2]);
  assert.equal(matches[3][choices[3]],original[3]);
});
