// Recording time projections for grading; no native/UI calls or grade rules.
import {mediaTimeAtTick} from './media-sync.js';
import {tickToTimeMs} from './score-playback.js';

export function mediaPracticeActive(state) {
  return Boolean(state.media?.preview && !state.media.returning && state.media.points?.length>=2);
}
export function practiceTimeAtTick(state,tick,fallback) {
  return mediaPracticeActive(state)?mediaTimeAtTick(state.media.points,state.playbackTimeline,tick):fallback;
}
export function practiceEvents(state) {
  const media=mediaPracticeActive(state),rangeEnd=state.practiceLoop?.range?.endTick;
  if(!media && !Number.isFinite(rangeEnd))return state.expectedEvents;
  const time=tick=>practiceTimeAtTick(state,tick,tickToTimeMs(state.playbackTimeline,tick));
  return state.expectedEvents.map(event=>{
    const endTick=Math.min(event.targetEndTick??event.endTick,rangeEnd??Infinity);
    return {...event,startTimeMs:media?time(event.startTick):event.startTimeMs,
      endTimeMs:media?time(event.endTick):event.endTimeMs,
      targetEndTimeMs:Number.isFinite(endTick)?time(endTick):event.targetEndTimeMs};
  });
}
export function mediaPracticeTime(state,at,fallback) {
  const clock=state.media?.clock;
  if(!mediaPracticeActive(state) || !clock)return fallback;
  // Provider time is authoritative. Limit interpolation between 50 ms samples,
  // and never run ahead while paused or buffering.
  return clock.timeMs+(state.isPlaying && clock.playing?Math.max(-100,Math.min(100,at-clock.at))*(state.playbackSpeed || 1):0);
}
