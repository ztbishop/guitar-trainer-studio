// Timeline projections only; no native player or grading calls.
import {mediaTimeAtTick,pointTick} from './media-sync.js';

export function samePosition(a,b) {
  return a.barIndex===b.barIndex && a.barOccurence===b.barOccurence && Math.abs(a.barPosition-b.barPosition)<1e-8;
}

export function syncPointLabel(point,score,timeline) {
  const first=timeline?.measures[0];
  if(first && point.barIndex===first.measureNumber-1 && point.barOccurence===first.occurrence-1 && point.barPosition===0)return 'Start';
  const last=timeline?.measures.at(-1);
  if(last && point.barIndex===last.measureNumber-1 && point.barOccurence===last.occurrence-1 && point.barPosition===1)return 'End';
  const beat=1+point.barPosition*score.masterBars[point.barIndex].timeSignatureNumerator;
  return `${point.barIndex+1}${point.barOccurence?` (${point.barOccurence+1})`:''}${point.barPosition?` · beat ${Number(beat.toFixed(2))}`:''}`;
}

export function timelineGuides(score,timeline,points) {
  if(!timeline || points.length<2)return [];
  return timeline.measures.flatMap((measure,index)=>{
    const beats=score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    return Array.from({length:beats},(_,beat)=>{
      const point={barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:beat/beats};
      return {...point,measureIndex:index,beat:beat+1,millisecondOffset:mediaTimeAtTick(points,timeline,measure.startTick+(measure.endTick-measure.startTick)*beat/beats),anchor:points.findIndex(p=>samePosition(p,point))};
    });
  });
}

export function boundedAnchorTime(points,index,time,duration) {
  const min=index>0?points[index-1].millisecondOffset+1:0;
  const max=index<points.length-1?points[index+1].millisecondOffset-1:duration;
  return Math.max(min,Math.min(max,time));
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
