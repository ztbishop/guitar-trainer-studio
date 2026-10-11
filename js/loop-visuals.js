// Passive score shading. A written bar stays visible if any selected occurrence uses it.
export function outsideLoopBounds(timeline, loop, bounds) {
  if(!loop?.enabled || !loop.range || !timeline?.measures.length) return [];
  if(loop.startIndex===0 && loop.endIndex===timeline.measures.length-1)return [];
  const included=new Set(timeline.measures.slice(loop.startIndex,loop.endIndex+1).map(measure=>measure.measureNumber-1));
  const rectangles=[];
  for(const system of bounds?.staffSystems || [])for(const bar of system.bars || []) {
    if(included.has(bar.index))continue;
    const x=bar.realBounds?.x,y=bar.visualBounds?.y,w=bar.realBounds?.w,h=bar.visualBounds?.h;
    if([x,y,w,h].every(Number.isFinite) && w>0 && h>0)rectangles.push({x,y,w,h});
  }
  return rectangles;
}

export function wholeMeasureSelection(timeline, range) {
  if(!range || !(range.endTick>range.startTick))return null;
  const measures=timeline?.measures || [];
  const startIndex=measures.findIndex(measure=>range.startTick>=measure.startTick && range.startTick<measure.endTick);
  const endIndex=measures.findIndex(measure=>range.endTick>measure.startTick && range.endTick<=measure.endTick);
  if(startIndex<0 || endIndex<startIndex)return null;
  return {startIndex,endIndex,range:{startTick:measures[startIndex].startTick,endTick:measures[endIndex].endTick}};
}
