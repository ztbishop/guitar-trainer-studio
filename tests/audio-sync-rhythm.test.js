import test from 'node:test';
import assert from 'node:assert/strict';
import {rhythmicMatches} from '../js/audio-sync-rhythm.js';

test('rhythmic search separates takes at two speeds and leaves written rests unplaced', () => {
  const edges = [0,1,2,3,4,5,6];
  const notes = [0,1,4,5].flatMap(bar => [0,7,10].map((pitch,i) => ({
    start:bar+i*0.32,end:bar+i*0.32+0.16,pitch
  })));
  const duration = 24, features = new Float32Array(duration / 0.04 * 12);
  for (const [start,scale] of [[2,1],[12,1.25]]) {
    for (const n of notes) {
      for (let i = Math.ceil((start+scale*n.start)/0.04); i < (start+scale*n.end)/0.04; i++) {
        features[i*12+n.pitch] = 0.68;
        features[i*12+(n.pitch+7)%12] = 0.73;
      }
    }
  }
  const rows = rhythmicMatches({edges,notes},features,duration);
  for (const i of [0,1,4,5]) {
    assert.equal(rows[i].length,2);
    assert.ok(Math.abs(rows[i][0].start-(2+i)) < 0.12);
    assert.ok(Math.abs(rows[i][1].start-(12+i*1.25)) < 0.12);
  }
  assert.deepEqual(rows.slice(2,4),[[],[]]);
  for (let i = 0; i < features.length; i++) features[i] = [0,7,10].includes(i%12) ? 1/Math.sqrt(3) : 0;
  assert.ok(rhythmicMatches({edges,notes},features,duration).every(row => !row.length));
});
