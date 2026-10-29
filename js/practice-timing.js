// practice-timing.js
// Owns: hit windows, chord grouping tolerance, and timing helpers
// Do NOT: reach into UI or alphaTab directly

export const TimingDefaults = {
  earlyMs: 120,
  // Fallback only for events without usable written duration.
  lateMs: 160,
  // Gesture evidence for held-note tolerance, not a Realtime chord deadline.
  chordGroupingMs: 60,
};

// Written target spans are half-open: the next attack/rest owns the boundary.
// Keep a bounded fallback for incomplete/zero-duration event metadata.
export function realtimeHitWindow(event,nextEvent,speed=1,timing=TimingDefaults) {
  const start=event.startTimeMs;
  const ends=[event.targetEndTimeMs,event.endTimeMs]
    .filter(end=>Number.isFinite(end) && end>start);
  const writtenEnd=ends.length?Math.min(...ends):start+timing.lateMs*speed;
  const next=nextEvent?.startTimeMs;
  const capped=Number.isFinite(next) && next>start && next<=writtenEnd;
  return {start:start-timing.earlyMs*speed,
    end:capped?next:writtenEnd,exclusive:ends.length>0 || capped};
}

export function realtimeWindowExpired(window,time) {
  return window.exclusive?time>=window.end:time>window.end;
}

export function isWithinHitWindow(deltaMs, timing = TimingDefaults) {
  return deltaMs >= -timing.earlyMs && deltaMs <= timing.lateMs;
}

export function isWithinChordGrouping(deltaMs, timing = TimingDefaults) {
  return Math.abs(deltaMs) <= timing.chordGroupingMs;
}

export function normalizeWaitChordSettings(mode,windowMs) {
  const value=Number(windowMs);
  if(!['collect','together'].includes(mode) || !Number.isFinite(value) || value<50 || value>1000)return null;
  return {mode,windowMs:value};
}
