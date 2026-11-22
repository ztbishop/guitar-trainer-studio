import {printedMeasure} from './printed-measure.js';
// Timeline projections only; no native player or grading calls.
import {mediaTimeAtTick,pointTick} from './media-sync.js';

// Follow the occurrence chosen by native score seeking, including repeats.
export function scoreTargetForBeat(timeline,beatId,tick) {
  const candidates=timeline?.events.filter(event=>event.sourceBeatId===String(beatId)) || [];
  const event=candidates.reduce((best,item)=>!best || Math.abs(item.startTick-tick)<Math.abs(best.startTick-tick)?item:best,null);
  if(!event)return null;
  const measure=timeline.measures[event.playbackMeasureIndex];
  if(!measure || measure.endTick<=measure.startTick)return null;
  return {measureIndex:event.playbackMeasureIndex,barPosition:(event.startTick-measure.startTick)/(measure.endTick-measure.startTick)};
}

export function samePosition(a,b) {
  return a.barIndex===b.barIndex && a.barOccurence===b.barOccurence && Math.abs(a.barPosition-b.barPosition)<1e-8;
}

export function syncPointLabel(point,score,timeline) {
  const first=timeline?.measures[0];
  if(first && point.barIndex===first.measureNumber-1 && point.barOccurence===first.occurrence-1 && point.barPosition===0)return 'Start';
  const last=timeline?.measures.at(-1);
  if(last && point.barIndex===last.measureNumber-1 && point.barOccurence===last.occurrence-1 && point.barPosition===1)return 'End';
  const beat=1+point.barPosition*score.masterBars[point.barIndex].timeSignatureNumerator;
  return `${printedMeasure(score,point.barIndex+1)}${point.barOccurence?` (${point.barOccurence+1})`:''}${point.barPosition?` · beat ${Number(beat.toFixed(2))}`:''}`;
}

export function timelineGuides(score,timeline,points,target=null) {
  if(!timeline || points.length<2)return [];
  return timeline.measures.flatMap((measure,index)=>{
    const beats=score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    const positions=Array.from({length:beats},(_,beat)=>beat);
    if(target?.measureIndex===index && target.beat>=1 && target.beat<=beats+1 && !positions.includes(target.beat-1))positions.push(target.beat-1);
    return positions.map(beat=>{
      const point={barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:beat/beats};
      return {...point,measureIndex:index,beat:beat+1,millisecondOffset:mediaTimeAtTick(points,timeline,measure.startTick+(measure.endTick-measure.startTick)*beat/beats),anchor:points.findIndex(p=>samePosition(p,point))};
    });
  });
}

export function boundedAnchorTime(points,index,time,duration) {
  const current=points[index].millisecondOffset;
  return current+boundedAnchorShift(points,index,index,time-current,duration);
}

// Move a contiguous saved-anchor selection by one shared delta. Only its outer
// edges constrain movement; internal spacing and all source points stay intact.
export function boundedAnchorShift(points,first,last,requestedDelta,duration) {
  if(!Array.isArray(points) || !Number.isInteger(first) || !Number.isInteger(last) ||
      first<0 || last<first || last>=points.length || !Number.isFinite(requestedDelta) ||
      !Number.isFinite(duration) || duration<0 || requestedDelta===0)return 0;
  const start=points[first].millisecondOffset,end=points[last].millisecondOffset;
  const min=(first>0?points[first-1].millisecondOffset+1:0)-start;
  const max=(last<points.length-1?points[last+1].millisecondOffset-1:duration)-end;
  if(!Number.isFinite(min) || !Number.isFinite(max) || min>max)return 0;
  const delta=Math.max(min,Math.min(max,requestedDelta));
  // Very tightly imported anchors can have less than a 1 ms gap already. Never
  // turn a nudge into a move in the opposite direction or a larger requested move.
  return Math.abs(delta)>Math.abs(requestedDelta) || delta*requestedDelta<0?0:delta || 0;
}

// Stretch from the first handle around the fixed last point. The shortest
// existing interval sets the compression limit for the entire selection.
export function moveAnchors(points,first,last,requested,duration,stretch=false) {
  let shift;
  const start=points[first].millisecondOffset, end=points[last].millisecondOffset;
  if(stretch) {
    let shortest=Infinity;
    for(let i=first+1;i<=last;i++) {
      shortest=Math.min(shortest,points[i].millisecondOffset-points[i-1].millisecondOffset);
    }
    const leftEdge=first>0 ? points[first-1].millisecondOffset+1 : 0;
    const compressionLimit=shortest>1 ? (end-start)*(1-1/shortest) : 0;
    shift=first===last ? 0 : Math.max(Math.min(0,leftEdge-start),Math.min(requested,compressionLimit));
  } else {
    shift=boundedAnchorShift(points,first,last,requested,duration);
  }
  if(!shift)return {points,shift:0};
  const moved=points.map((point,i)=>{
    if(i<first || i>last || (stretch && i===last))return point;
    const weight=stretch ? (end-point.millisecondOffset)/(end-start) : 1;
    return {...point,millisecondOffset:point.millisecondOffset+shift*weight};
  });
  return {points:moved,shift};
}

export function timeFromClientX(clientX,rect,duration) {
  // SVG uses preserveAspectRatio=none and includes 12 units of endpoint padding.
  return Math.max(0,Math.min(duration,((clientX-rect.left)/rect.width*1024-12)/1000*duration));
}

export function zoomWindow(oldZoom,nextZoom,scrollLeft,width,focusRatio) {
  const focus=focusRatio*width*oldZoom;
  const offset=focus-scrollLeft;
  return Math.max(0,focusRatio*width*nextZoom-offset);
}

export function anchorIndex(points,point,timeline) {
  const tick=pointTick(point,timeline);
  return points.findIndex(p=>Math.abs(pointTick(p,timeline)-tick)<1e-6);
}

// Keep the detailed envelope in memory; draw only visible screen columns.
export function visibleWaveform(peaks,start,end,columns) {
  const result=[];
  for(let column=0;column<columns;column++) {
    const from=Math.floor((start+(end-start)*column/columns)*peaks.length);
    const to=Math.ceil((start+(end-start)*(column+1)/columns)*peaks.length);
    let peak=0;
    for(let i=Math.max(0,from);i<Math.min(peaks.length,to);i++)peak=Math.max(peak,peaks[i]);
    result.push(peak);
  }
  return result;
}

// Choose round recording-time intervals and generate only the visible ruler.
export function timelineRuler(durationMs,fullWidth,scrollLeft,viewportWidth) {
  if(!(durationMs>0 && fullWidth>0 && viewportWidth>0))return {stepMs:0,ticks:[]};
  const msPerPixel=durationMs*1024/(1000*fullWidth);
  const desired=Math.max(1,msPerPixel*90),power=10**Math.floor(Math.log10(desired));
  const stepMs=[1,2,5,10].map(n=>n*power).find(n=>n>=desired);
  const start=Math.max(0,(scrollLeft/fullWidth*1024-12)/1000*durationMs);
  const end=Math.min(durationMs,((scrollLeft+viewportWidth)/fullWidth*1024-12)/1000*durationMs);
  const decimals=Math.max(0,Math.min(3,Math.ceil(Math.log10(1000/stepMs))));
  const ticks=[];
  for(let index=Math.ceil(start/stepMs);index*stepMs<=end+0.00001;index++) {
    const time=Math.round(index*stepMs),seconds=time/1000;
    const label=`${Math.floor(seconds/60)}:${(seconds%60).toFixed(decimals).padStart(decimals?3+decimals:2,'0')}`;
    ticks.push({time,label});
  }
  return {stepMs,ticks};
}
