// Recording/score boundary projection only. Never changes anchors or score bytes.
import {mediaTimeAtTick} from './media-sync.js';

export function recordingScoreRange(points,timeline,duration=Infinity) {
  if(!timeline || points?.length<2 || !points)return null;
  const start=Math.min(duration,mediaTimeAtTick(points,timeline,0));
  const end=Math.min(duration,mediaTimeAtTick(points,timeline,timeline.endTick));
  return end>start?{start,end}:null;
}
export function recordingRegion(points,timeline,time) {
  const range=recordingScoreRange(points,timeline);
  return !range || !Number.isFinite(time)?'music':time<range.start?'before':time>=range.end?'after':'music';
}
export function fullRecordingPractice(state) {
  return Boolean(state.media?.preview && !state.media.returning && !state.media.editing &&
    state.mode==='realtime' && !state.practiceLoop?.enabled);
}
export function outsideRecordingScore(state) {
  return fullRecordingPractice(state) && recordingRegion(state.media.points,state.playbackTimeline,state.media.clock?.timeMs)!=='music';
}
