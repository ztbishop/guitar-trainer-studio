import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineGuides,boundedAnchorTime,timeFromClientX,zoomWindow,anchorIndex,visibleWaveform,syncPointLabel} from '../js/media-timeline.js';
const timeline={endTick:800,measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400},{measureNumber:1,occurrence:2,startTick:400,endTick:800}]};
const score={masterBars:[{timeSignatureNumerator:4}]};
const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:1000},{barIndex:0,barOccurence:1,barPosition:1,millisecondOffset:9000}];
test('point labels distinguish the last measure start, intermediate beats, repeats and score end',()=>{
  assert.equal(syncPointLabel(points[0],score,timeline),'Start');
  assert.equal(syncPointLabel({...points[1],barPosition:0},score,timeline),'1 (2)');
  assert.equal(syncPointLabel({...points[1],barPosition:0.5},score,timeline),'1 (2) · beat 3');
  assert.equal(syncPointLabel(points[1],score,timeline),'End');
  assert.equal(syncPointLabel({...points[0],barPosition:1},score,timeline),'1 · beat 5');
});
test('estimated beat guides distinguish repeat passes and do not become saved anchors',()=>{
  const original=structuredClone(points),guides=timelineGuides(score,timeline,points);
  assert.equal(guides.length,8);assert.equal(guides[4].millisecondOffset,5000);
  assert.equal(guides[0].anchor,0);assert.equal(guides[4].anchor,-1);
  assert.equal(guides[4].barOccurence,1);assert.deepEqual(points,original);
  assert.equal(anchorIndex(points,{barIndex:0,barOccurence:0,barPosition:0},timeline),0);
});
test('drag coordinates include endpoint padding, scroll offsets and arbitrary widths',()=>{
  for(const width of [390,1280,6000]) {
    const rect={left:-320,width};
    assert.equal(timeFromClientX(rect.left+width*12/1024,rect,10000),0);
    assert.equal(timeFromClientX(rect.left+width*512/1024,rect,10000),5000);
    assert.equal(timeFromClientX(rect.left+width*1012/1024,rect,10000),10000);
  }
});
test('nudges and repeated reverse drags respect neighboring anchors and media bounds',()=>{
  assert.equal(boundedAnchorTime(points,0,5000,10000),5000);
  assert.equal(boundedAnchorTime(points,0,2000,10000),2000);
  assert.equal(boundedAnchorTime(points,0,-20,10000),0);
  assert.equal(boundedAnchorTime(points,0,9500,10000),8999);
  assert.equal(boundedAnchorTime(points,1,0,10000),1001);
  assert.equal(boundedAnchorTime(points,1,20000,10000),10000);
});
test('zoom preserves selected anchor screen position',()=>{
  const before=0.5*1000*4-1500;
  const scroll=zoomWindow(4,4.8,1500,1000,0.5);
  assert.equal(0.5*1000*4.8-scroll,before);
});
test('visible waveform preserves narrow peaks and renders only the requested region',()=>{
  const peaks=new Array(10000).fill(0);peaks[5050]=1;peaks[10]=0.8;
  const samples=visibleWaveform(peaks,0.5,0.6,100);
  assert.equal(samples.length,100);assert.equal(Math.max(...samples),1);
  assert.equal(Math.max(...visibleWaveform(peaks,0.6,0.7,100)),0);
});
