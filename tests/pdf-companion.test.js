import test from 'node:test';
import assert from 'node:assert/strict';
import {writtenMeasureAt, measureBox, expectedPdfNotes} from '../js/pdf-companion.js';
import {SCORE_EXTENSIONS} from '../js/library-store.js';
import {midiToMusicXml} from '../js/midi-score-import.js';
import {editPageBoxes,availableVisit,replacePageBoxes,addScoreBoxes} from '../js/pdf-box-review.js';
import {sharedBarline,moveBarline} from '../js/pdf-barline-controls.js';
import {detectMeasureBoxes} from '../js/pdf-measure-detection.js';

test('whole-score acceptance keeps hand edits and rejects conflicting or excess boxes as a unit',()=>{
  const manual={page:1,x:.15}, later={page:3,x:.3};
  const saved={1:manual,4:later};
  const detected=[{page:1,x:.1},{page:2,x:.2}];
  assert.deepEqual(addScoreBoxes(saved,[1,2],detected),{...saved,2:detected[1]});
  assert.equal(addScoreBoxes(saved,[3,4],detected),null);
  assert.equal(addScoreBoxes(saved,[1],detected),null);
  assert.deepEqual(saved,{1:manual,4:later});
});

test('pairs notation with TAB and ignores a stem with no corresponding TAB barline',()=>{
  const width=360,height=180,ink=new Uint8Array(width*height).fill(255);
  for(const [top,count] of [[20,5],[90,6]]) {
    for(let n=0;n<count;n++) ink.fill(0,(top+n*6)*width+10,(top+n*6)*width+350);
    for(const x of [10,160,349]) for(let y=top;y<=top+(count-1)*6;y++) ink[y*width+x]=0;
  }
  for(let y=14;y<48;y++)ink[y*width+70]=0;
  const boxes=detectMeasureBoxes(ink,width,height,3);
  assert.equal(boxes.length,2);
  assert.equal(boxes[1].x,160/width);
  assert.ok(boxes.every(b=>b.page===3 && b.y<20/height && b.y+b.h>120/height));
});

test('a changing digit contour and a tie crossing produce different barline decisions',()=>{
  const width=480,height=110,gap=12,top=25,bottom=73;
  const pixels=new Uint8Array(width*height).fill(255);
  for(let y=top;y<=bottom;y++) {
    if((y-top)%gap===0)pixels.fill(0,y*width+10,y*width+471);
    for(const x of [10,150,156,320,470])pixels[y*width+x]=0;
    // A central column survives thresholding through both meter digits.
    const side=(y-top)%4;
    pixels.fill(0,y*width+173-side,y*width+175+(3-side));
  }
  for(let x=305;x<336;x++) {
    const y=bottom-8+Math.round((x-320)**2/110);
    for(let dy=0;dy<4;dy++) pixels[(y+dy)*width+x]=0;
  }
  const divisions=detectMeasureBoxes(pixels,width,height,1).map(box=>Math.round(box.x*width));
  assert.deepEqual(divisions,[10,150,320]);
});

test('moving a shared edge clamps both boxes and preserves their outside edges',()=>{
  const a={page:1,x:.2,y:.1,w:.2,h:.1}, b={...a,x:.4},range=sharedBarline(a,b);
  const [left,right]=moveBarline(a,b,range,100);
  assert.equal(left.x,a.x);
  assert.equal(left.x+left.w,right.x);
  assert.ok(right.w>=.005-1e-12);
  assert.equal(right.x+right.w,b.x+b.w);
  assert.ok(moveBarline(a,b,range,-100)[0].w>=.005-1e-12);
  assert.equal(sharedBarline(a,{...b,page:2}),null);
  assert.equal(sharedBarline(a,{...b,y:.5}),null);
  assert.equal(sharedBarline(a,{...b,x:.5}),null);
});

test('replacing a reviewed page releases obsolete numbers and protects other pages',()=>{
  const first={page:1}, second={page:2}, replacement={page:1,x:.3};
  const saved={1:first,2:first,3:second};
  assert.deepEqual(replacePageBoxes(saved,1,[1],[replacement]),{1:replacement,3:second});
  assert.equal(replacePageBoxes(saved,1,[2,3],[replacement,replacement]),null);
  assert.deepEqual(saved,{1:first,2:first,3:second});
});
test('page corrections stay in reading order and preserve the original proposal',()=>{
  const first={page:1,x:.1,y:.1,w:.4,h:.1}, last={...first,y:.4};
  const original=[first,last], split=editPageBoxes(original,0,'split',.25);
  assert.equal(split.length,3);
  assert.deepEqual(editPageBoxes(split,0,'join'),original);
  assert.deepEqual(editPageBoxes(original,0,'join'),original);
  const middle={...first,x:.6};
  assert.deepEqual(editPageBoxes(original,-1,'draw',0,middle),[first,middle,last]);
  assert.deepEqual(editPageBoxes(original,0,'remove'),[last]);
  assert.deepEqual(original,[first,last]);
});
test('PDF seeking chooses the current repeated pass, constrained by loop and recording',()=>{
  const bars=[1,2,1,2].map((measureNumber,i)=>({measureNumber,startTick:i*100,endTick:i*100+100}));
  assert.equal(availableVisit(bars,1,260,null,null),bars[2]);
  assert.equal(availableVisit(bars,1,0,{startTick:100,endTick:300},null),bars[2]);
  assert.equal(availableVisit(bars,2,0,null,{visits:[bars[3]]}),bars[3]);
  assert.equal(availableVisit(bars,2,0,{startTick:0,endTick:100},null),null);
});

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
