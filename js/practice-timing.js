// practice-timing.js
// Owns: hit windows, chord grouping tolerance, and timing helpers
// Do NOT: reach into UI or alphaTab directly

export const TimingDefaults = {
  earlyMs: 120,
  lateMs: 160,
  chordGroupingMs: 60,
};

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
