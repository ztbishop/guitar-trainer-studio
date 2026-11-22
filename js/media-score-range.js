// Recording/score boundary projection only. Never changes anchors or score bytes.
import {mediaTimeAtTick} from './media-sync.js';
import {planPositionAtTime} from './explanation-timing.js';
import {practiceTimingPlan} from './media-practice.js';

export function recordingScoreRange(points,timeline,duration=Infinity,timingPlan=null) {
  if(timingPlan)return {start:Math.min(duration,timingPlan.visits[0].startMs),end:Math.min(duration,timingPlan.visits.at(-1).endMs)};
  if(!timeline || points?.length<2 || !points)return null;
  const start=Math.min(duration,mediaTimeAtTick(points,timeline,0));
  const end=Math.min(duration,mediaTimeAtTick(points,timeline,timeline.endTick));
  return end>start?{start,end}:null;
}
export function recordingRegion(points,timeline,time,timingPlan=null) {
  if(timingPlan && Number.isFinite(time))return planPositionAtTime(timingPlan,time).kind;
  const range=recordingScoreRange(points,timeline);
  return !range || !Number.isFinite(time)?'music':time<range.start?'before':time>=range.end?'after':'music';
}
// Ranges are ordered, disjoint recording spans with a tracked score position.
export function nextMusicStart(ranges,timeMs) {
  let low=0,high=ranges.length;
  while(low<high) {
    const mid=(low+high)>>>1;
    if(ranges[mid].endMs<=timeMs)low=mid+1;else high=mid;
  }
  const next=ranges[low];
  return next && timeMs<next.startMs ? next.startMs : null;
}
export function fullRecordingPractice(state) {
  return Boolean(state.media?.preview && !state.media.returning && !state.media.editing &&
    state.mode==='realtime' && !state.practiceLoop?.enabled);
}
export function outsideRecordingScore(state,time=state.media?.clock?.timeMs) {
  const plan=practiceTimingPlan(state);
  const enabled=plan ? state.mode==='realtime' && !state.media.editing : fullRecordingPractice(state);
  return Boolean(enabled && recordingRegion(state.media.points,state.playbackTimeline,time,plan)!=='music');
}
