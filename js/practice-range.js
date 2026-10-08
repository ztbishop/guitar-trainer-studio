// Range selection uses playback occurrences, so repeats/alternate endings are explicit.
export function resolvePracticeRange(timeline, startIndex, endIndex) {
  const measures = timeline?.measures || [];
  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex) || startIndex < 0 ||
      endIndex < startIndex || endIndex >= measures.length) return null;
  const startTick = measures[startIndex].startTick;
  const endTick = measures[endIndex].endTick;
  return Number.isFinite(startTick) && endTick > startTick ? {startTick, endTick} : null;
}

export function eventsInRange(events, range) {
  if (!range) return events;
  // Attack ownership is determined by onset, not by a sustain crossing a boundary.
  return events.filter(event => event.startTick >= range.startTick && event.startTick < range.endTick);
}

export function normalizePlaybackSpeed(percent) {
  const value = Number(percent);
  return Number.isFinite(value) && value >= 25 && value <= 200 ? value / 100 : null;
}

export function measureOccurrenceLabel(measure) {
  return `Measure ${measure.measureNumber} • occurrence ${measure.occurrence} (step ${measure.playbackMeasureIndex + 1})`;
}
