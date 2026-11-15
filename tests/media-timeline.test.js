import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineGuides,boundedAnchorTime,boundedAnchorShift,timeFromClientX,zoomWindow,anchorIndex,visibleWaveform,syncPointLabel,timelineRuler,scoreTargetForBeat} from '../js/media-timeline.js';
const timeline={endTick:800,measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400},{measureNumber:1,occurrence:2,startTick:400,endTick:800}]};
const score={masterBars:[{timeSignatureNumerator:4}]};
const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:1000},{barIndex:0,barOccurence:1,barPosition:1,millisecondOffset:9000}];
test('score click follows native repeat occurrence and keeps fractional beat targets',()=>{
  const expanded={...timeline,events:[{sourceBeatId:'7',startTick:50,playbackMeasureIndex:0},{sourceBeatId:'7',startTick:450,playbackMeasureIndex:1}]};
  assert.deepEqual(scoreTargetForBeat(expanded,7,450),{measureIndex:1,barPosition:0.125});
  assert.deepEqual(scoreTargetForBeat(expanded,7,50),{measureIndex:0,barPosition:0.125});
  assert.equal(scoreTargetForBeat(expanded,8,50),null);
  const guides=timelineGuides(score,timeline,points,{measureIndex:1,beat:1.5});
  assert.equal(guides.find(g=>g.measureIndex===1 && g.beat===1.5).millisecondOffset,5500);
});
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

const anchors=times=>Object.freeze(times.map(millisecondOffset=>Object.freeze({millisecondOffset})));
test('a selected interior anchor group shifts uniformly between its outside neighbors',()=>{
  const original=anchors([1000,2000.25,2400.75,4000,7000]);
  for(const [requested,expected] of [[125.5,125.5],[-10000,-999.25],[10000,2999]]) {
    const delta=boundedAnchorShift(original,1,3,requested,10000);
    assert.equal(delta,expected);
    const shifted=original.map((p,index)=>p.millisecondOffset+(index>=1 && index<=3?delta:0));
    assert.equal(shifted[0],1000);assert.equal(shifted[4],7000);
    assert.equal(shifted[2]-shifted[1],400.5);assert.equal(shifted[3]-shifted[2],1599.25);
    assert(shifted[1]>=shifted[0]+1);assert(shifted[3]<=shifted[4]-1);
  }
  assert.deepEqual(original.map(p=>p.millisecondOffset),[1000,2000.25,2400.75,4000,7000]);
});

test('group shifts include Start or End without moving outside the recording',()=>{
  const original=anchors([1000,2000,4000,7000]);
  assert.equal(boundedAnchorShift(original,0,1,-10000,10000),-1000);
  assert.equal(boundedAnchorShift(original,0,1,10000,10000),1999);
  assert.equal(boundedAnchorShift(original,2,3,-10000,10000),-1999);
  assert.equal(boundedAnchorShift(original,2,3,10000,10000),3000);
  assert.equal(boundedAnchorShift(original,0,3,-10000,10000),-1000);
  assert.equal(boundedAnchorShift(original,0,3,10000,10000),3000);
});

test('pinned groups have zero movement and a no-op never changes tightly spaced anchors',()=>{
  const original=anchors([0,1,100,101,1000]);
  assert.equal(boundedAnchorShift(original,1,2,-50,1000),0);
  assert.equal(boundedAnchorShift(original,1,2,50,1000),0);
  assert.equal(boundedAnchorShift(original,0,4,-50,1000),0);
  assert.equal(boundedAnchorShift(original,0,4,50,1000),0);
  const tight=anchors([0,0.5,2]);
  assert.equal(boundedAnchorShift(tight,1,1,0,10),0);
  assert.equal(boundedAnchorShift(tight,1,1,-0.25,10),0);
  assert.equal(boundedAnchorShift(tight,1,1,0.25,10),0);
  assert.equal(boundedAnchorShift(tight,1,1,0.5,10),0.5);
});

test('single-anchor shifts retain drag bounds and invalid selections cannot produce movement',()=>{
  assert.equal(boundedAnchorShift(points,0,0,-2000,10000),-1000);
  assert.equal(boundedAnchorShift(points,1,1,2000,10000),1000);
  for(const [first,last] of [[-1,1],[1,0],[0,2],[0.5,1]])assert.equal(boundedAnchorShift(points,first,last,100,10000),0);
  assert.equal(boundedAnchorShift([],0,0,100,10000),0);
  assert.equal(boundedAnchorShift(points,0,1,NaN,10000),0);
  assert.equal(boundedAnchorShift(points,0,1,100,NaN),0);
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

// A long recording at extreme zoom must stay cheap and have distinct fine labels.
test('ruler uses round, finer intervals at high zoom with viewport-bounded tick counts',()=>{
  const full=timelineRuler(980212,1280,0,1280);
  const zoomed=timelineRuler(980212,1280*256,50000,1280);
  assert(zoomed.stepMs<full.stepMs);assert(zoomed.stepMs<=1000);
  assert(full.ticks.length<20 && zoomed.ticks.length<20);
  assert.equal(new Set(zoomed.ticks.map(t=>t.label)).size,zoomed.ticks.length);
  assert(zoomed.ticks.every(t=>t.time%zoomed.stepMs===0));
  const fine=timelineRuler(12000,1280*256,10000,1280);
  assert(fine.ticks.some(t=>/\.\d{3}$/.test(t.label)));
  assert.deepEqual(timelineRuler(0,1280,0,1280).ticks,[]);
});
