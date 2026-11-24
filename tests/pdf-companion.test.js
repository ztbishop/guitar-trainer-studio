import test from 'node:test';
import assert from 'node:assert/strict';
import {writtenMeasureAt, measureBox, expectedPdfNotes} from '../js/pdf-companion.js';
import {SCORE_EXTENSIONS} from '../js/library-store.js';
import {midiToMusicXml} from '../js/midi-score-import.js';

test('a PDF box follows written repeats and clears outside music', () => {
  const visits = [1, 2, 1, 3].map((measureNumber, i) => ({measureNumber, startTick:i*100, endTick:(i+1)*100}));
  assert.deepEqual([-1,0,99,100,200,399,400].map(t => writtenMeasureAt(visits,t)), [null,1,1,2,1,3,null]);
});
test('measure boxes use page coordinates in either drag direction and ignore clicks', () => {
  const a = {x:0.25,y:0.125}, b = {x:0.75,y:0.375};
  assert.deepEqual(measureBox(2,b,a), {page:2,x:0.25,y:0.125,w:0.5,h:0.25});
  assert.deepEqual(measureBox(2,a,b), measureBox(2,b,a));
  assert.equal(measureBox(2,a,a), null);
});
test('waiting on a chord shows only its remaining pitches', () => {
  const event = {notes:[{id:'a',midi:60},{id:'b',midi:67}], pitches:[60,67]};
  assert.equal(expectedPdfNotes(event,{a:'correct'},true),'G4');
  assert.equal(expectedPdfNotes(event,{},false),'C4 + G4');
});
test('MIDI accepts standard filenames and rejects invalid headers before starting a worker', async () => {
  assert.ok(SCORE_EXTENSIONS.test('Practice.MID') && SCORE_EXTENSIONS.test('Practice.midi'));
  await assert.rejects(midiToMusicXml(new Uint8Array(4)), /Standard MIDI File/);
});
