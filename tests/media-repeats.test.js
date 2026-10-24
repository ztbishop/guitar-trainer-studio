import test from 'node:test';
import assert from 'node:assert/strict';
import {repeatCases,repeatFixture} from './media-repeat-fixtures.js';
import {pointTick,validatePoints,tickAtMediaTime,mediaTimeAtTick} from '../js/media-sync.js';
for(const spec of repeatCases)test(`native media sync preserves separate visits through ${spec.name}`,()=>{
  const {timeline,points,generator,expectedTicks}=repeatFixture(spec);
  assert.deepEqual(timeline.measures.map(m=>m.measureNumber),spec.order);
  assert.equal(generator.syncPoints.length,points.length);
  assert.deepEqual(generator.syncPoints.map(p=>p.synthTick),expectedTicks);
  assert.deepEqual(generator.syncPoints.map(p=>p.syncTime),points.map(p=>p.millisecondOffset));
  assert.deepEqual(generator.syncPoints.map(p=>p.masterBarOccurence),points.map(p=>p.barOccurence));
  assert.deepEqual(validatePoints(points,timeline),points);
  for(let i=0;i<points.length;i++) {
    const tick=pointTick(points[i],timeline);
    assert.equal(tickAtMediaTime(points,timeline,points[i].millisecondOffset),tick);
    assert.equal(mediaTimeAtTick(points,timeline,tick),points[i].millisecondOffset);
    if(i) {
      assert(tick>expectedTicks[i-1]);assert(generator.syncPoints[i].synthTime>generator.syncPoints[i-1].synthTime);
      const mid=(points[i-1].millisecondOffset+points[i].millisecondOffset)/2;
      assert.equal(tickAtMediaTime(points,timeline,mid),(expectedTicks[i-1]+tick)/2);
    }
  }
});
