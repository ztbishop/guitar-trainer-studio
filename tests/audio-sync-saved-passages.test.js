import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {suggestInteriorMeasures} from '../js/audio-sync-backward.js';
import {checkContextTakes} from '../js/audio-sync-context.js';
import {matchSingleMeasures,SAMPLE_RATE} from '../js/audio-sync-match.js';

// Local captures contain the worker's score queries, choices, decoded audio
// and full-range chroma. The publisher times below are used only in assertions.
function savedLesson(id) {
  const file = suffix => new URL('./.media-fixtures/interior-match/'+id+suffix,import.meta.url);
  if (!['-updated.json','.pcm','.bin'].every(suffix => existsSync(file(suffix)))) return null;
  const floats = suffix => {
    const data = readFileSync(file(suffix));
    return new Float32Array(data.buffer,data.byteOffset,data.byteLength/4);
  };
  return {...JSON.parse(readFileSync(file('-updated.json'),'utf8')),samples:floats('.pcm'),features:floats('.bin')};
}

function recover(lesson,first,last) {
  const {queries,matches,choices,samples,features} = lesson;
  choices.fill(-1,first,last+1);
  suggestInteriorMeasures(queries.bars,matches,choices,samples,queries.score,features);
  return choices.slice(first,last+1).map((choice,i)=>matches[first+i][choice]);
}

test('Jazz Discovery recovers 15–17 and rejects a tempo-matched window in the introduction', t=>{
  const lesson = savedLesson('98027');
  if (!lesson) return t.skip('Local Jazz Discovery capture unavailable');
  const points = recover(lesson,14,16);
  const reference = [74.478047,76.817703,79.040010,81.314378];
  assert(points.every(p=>p?.betweenMeasures));
  const edges = [...points.map(p=>p.start),points.at(-1).end];
  edges.forEach((s,i)=>assert(Math.abs(s-reference[i]) < (i===0 ? 0.20 : 0.10)));
  // Move both pins into the introduction while preserving their duration and tempo.
  const left = lesson.matches[13][lesson.choices[13]], right = lesson.matches[17][lesson.choices[17]];
  const delta = left.end-10;
  for (const pin of [left,right]) { pin.start-=delta; pin.end-=delta; }
  assert(recover(lesson,14,16).every(p=>!p));
});

test('Low Bass Note selects the second pass when three repeated bars are withheld', t=>{
  const lesson = savedLesson('97330');
  if (!lesson) return t.skip('Local Low Bass Note capture unavailable');
  const points = recover(lesson,11,13);
  const starts = [49.840,51.924,53.941];
  points.forEach((point,i)=>assert(point?.betweenMeasures && Math.abs(point.start-starts[i])<0.15));
});

for (const [id,title,published] of [
  ['98109','Quartal Harmony',116.05],['87755','Connecting Intervals',416.27]
]) {
  test(title+' surrounding measures identify the published take for measure 9',t=>{
    const lesson = savedLesson(id);
    if (!lesson) return t.skip('Local '+title+' capture unavailable');
    const {queries,matches,choices,samples,features} = lesson;
    const duration = samples.length/SAMPLE_RATE;
    const singles = matchSingleMeasures(queries.bars,features,duration);
    const old = choices.map((c,i)=>matches[i][c]);
    checkContextTakes(queries.score,queries.bars,samples,duration,singles,matches,choices,()=>{});
    assert(Math.abs(matches[8][choices[8]].start-published)<0.25);
    assert(matches[8].includes(old[8]));
    if (id==='98109') {
      const timed = choices.slice(7,11).map((c,i)=>matches[i+7][c]);
      const bounds = timed.map(take=>take.start);
      [111.262,116.049,121.638,124.447].forEach((seconds,i)=>assert(Math.abs(bounds[i]-seconds)<0.16));
      assert.equal(timed[0].end,timed[1].start);
      assert.equal(timed[1].end,timed[2].start);
      assert.equal(timed[2].end,timed[3].start);
    } else {
      assert.equal(choices[14],-1);
      for (let i=15;i<old.length;i++) assert.equal(matches[i][choices[i]],old[i]);
    }
  });
}
