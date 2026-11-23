// Recording time projections for grading; no native/UI calls or grade rules.
import {mediaTimeAtTick} from './media-sync.js';
import {tickToTimeMs} from './score-playback.js';
import {planPositionAtTime,planTimeAtTick} from './explanation-timing.js';

export function practiceTimingPlan(state) {
  return state.media?.preview && !state.media.returning ? state.media.timingPlan ?? null : null;
}

// A section ends at a spoken hold or an omitted native playback visit. Empty
// musical bars remain part of their section, even when they have no targets.
const sectionCache=new WeakMap();
function planSections(plan) {
  if(sectionCache.has(plan))return sectionCache.get(plan);
  const sections=[];
  for(const visit of plan.visits) {
    const previous=sections.at(-1);
    if(previous && previous.endTick===visit.startTick && previous.endMs===visit.startMs) {
      previous.endTick=visit.endTick;previous.endMs=visit.endMs;
    } else sections.push({startTick:visit.startTick,endTick:visit.endTick,startMs:visit.startMs,endMs:visit.endMs});
  }
  sections.forEach(Object.freeze);Object.freeze(sections);sectionCache.set(plan,sections);
  return sections;
}

export function practicePlanPosition(state,time=state.media?.clock?.timeMs) {
  const plan=practiceTimingPlan(state);
  if(!plan || !Number.isFinite(time))return null;
  const position=planPositionAtTime(plan,time);
  return {...position,section:position.kind==='music'
    ?planSections(plan).find(section=>position.visit.startTick>=section.startTick && position.visit.startTick<section.endTick)??null:null};
}

export function planPracticeRange(state,range) {
  const plan=practiceTimingPlan(state);
  if(!plan || !range)return range;
  const visits=plan.visits.filter(visit=>visit.endTick>range.startTick && visit.startTick<range.endTick);
  return visits.length?{startTick:Math.max(range.startTick,visits[0].startTick),endTick:Math.min(range.endTick,visits.at(-1).endTick)}:null;
}

export function mediaPracticeActive(state) {
  return Boolean(practiceTimingPlan(state) || state.media?.preview && !state.media.returning && state.media.points?.length>=2);
}
export function practiceTimeAtTick(state,tick,fallback,edge='start') {
  const plan=practiceTimingPlan(state);
  if(plan)return planTimeAtTick(plan,tick,edge);
  return mediaPracticeActive(state)?mediaTimeAtTick(state.media.points,state.playbackTimeline,tick):fallback;
}
export function practiceEvents(state) {
  const media=mediaPracticeActive(state),plan=practiceTimingPlan(state),rangeEnd=state.practiceLoop?.range?.endTick;
  if(!media && !Number.isFinite(rangeEnd))return state.expectedEvents;
  const time=(tick,edge='start')=>practiceTimeAtTick(state,tick,tickToTimeMs(state.playbackTimeline,tick),edge);
  const sections=plan?planSections(plan):null;
  let previousSection=null;
  return state.expectedEvents.flatMap(event=>{
    const section=sections?.find(section=>event.startTick>=section.startTick && event.startTick<section.endTick);
    if(plan && !section)return [];
    const sectionEnd=section?.endTick??Infinity;
    const endTick=Math.min(event.targetEndTick??event.endTick,rangeEnd??Infinity,sectionEnd);
    const projected={...event,startTimeMs:media?time(event.startTick):event.startTimeMs,
      endTimeMs:media?time(Math.min(event.endTick,sectionEnd),'end'):event.endTimeMs,
      targetEndTimeMs:Number.isFinite(endTick)?time(endTick,'end'):event.targetEndTimeMs};
    if(section) {
      projected.practiceSectionStartMs=section.startMs;
      projected.practiceSectionEndMs=section.endMs;
      projected.practiceBreakBefore=previousSection!==null && previousSection!==section;
      previousSection=section;
      projected.notes=event.notes.map(note=>({...note,
        startTimeMs:time(note.startTick??event.startTick),endTimeMs:time(Math.min(note.endTick??event.endTick,sectionEnd),'end')}));
    }
    return [projected];
  });
}
export function mediaPracticeTime(state,at,fallback) {
  const clock=state.media?.clock;
  if(!mediaPracticeActive(state) || !clock)return fallback;
  // Provider time is authoritative. Limit interpolation between 50 ms samples,
  // and never run ahead while paused or buffering.
  return clock.timeMs+(state.isPlaying && clock.playing?Math.max(-100,Math.min(100,at-clock.at))*(state.playbackSpeed || 1):0);
}
