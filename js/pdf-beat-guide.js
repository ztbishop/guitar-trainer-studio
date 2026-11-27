import {printedBoxForVisit} from './pdf-box-review.js';

export function beatSegment(event, visit) {
  const span = visit.endTick - visit.startTick;
  if (!(span > 0)) return null;
  const start = Math.max(0, (event.startTick - visit.startTick) / span);
  const end = Math.min(1, (event.endTick - visit.startTick) / span);
  return end > start ? {start, end} : null;
}

function beatsByOnset(events) {
  const beats = new Map();
  for (const {startTick, endTick, isRest} of events) {
    if (!(endTick > startTick)) continue;
    const beat = beats.get(startTick);
    if (!beat || (beat.isRest && !isRest)) {
      beats.set(startTick, {startTick, endTick, isRest});
    } else if (beat.isRest === isRest) {
      beat.endTick = Math.min(beat.endTick, endTick);
    }
  }
  const ordered = [...beats.values()];
  let nextNote = Infinity;
  for (let index = ordered.length - 1; index >= 0; index--) {
    const beat = ordered[index];
    // A later note takes over from a sustaining voice. Rests in other voices can coexist.
    beat.endTick = Math.min(beat.endTick, beat.isRest ? ordered[index + 1]?.startTick ?? Infinity : nextNote);
    if (!beat.isRest) nextNote = beat.startTick;
  }
  return beats;
}

export function playbackBeat(events, tick) {
  let current = null;
  for (const event of events ?? []) {
    if (event.startTick > tick) break;
    if (tick < event.endTick && (!current || current.isRest || !event.isRest)) current = event;
  }
  return current;
}

export function completedBeatColor(record) {
  if (!record?.completed || record.pendingErrorCount) return null;
  return record.wrongCount || !record.allHit ? 'wrong' : 'correct';
}

export function createPdfBeatGuide(state, reader, liveColor) {
  let timeline, track, byVisit, events, attackById, attackByTick;
  let activeVisit, previousTick, waitPass, enabled, suppressed = new Set();
  const visitsByBox = new Map();
  const results = new Map();

  function clear(numbers) {
    if (!numbers) {
      visitsByBox.clear();
      results.clear();
      return;
    }
    for (const number of numbers) {
      visitsByBox.delete(number);
      results.delete(number);
    }
  }

  function sync(trainer, visit, tick, mapping, loop, playing) {
    if (timeline !== state.playbackTimeline || track !== state.practiceTrackId) {
      timeline = state.playbackTimeline;
      track = state.practiceTrackId;
      byVisit = new Map();
      for (const event of timeline?.events ?? []) {
        if (event.trackId !== String(track)) continue;
        if (!byVisit.has(event.playbackMeasureIndex)) byVisit.set(event.playbackMeasureIndex, []);
        byVisit.get(event.playbackMeasureIndex).push(event);
      }
      for (const [index, beats] of byVisit) byVisit.set(index, beatsByOnset(beats));
      clear();
      suppressed.clear();
      activeVisit = previousTick = waitPass = undefined;
    }
    if (events !== state.expectedEvents) {
      events = state.expectedEvents;
      attackById = new Map(events.map(event => [event.id, event]));
      attackByTick = new Map(events.map(event => [event.startTick, event]));
    }
    const waiting = state.mode === 'wait';
    const beats = byVisit.get(visit?.playbackMeasureIndex);
    const gate = trainer?.currentEvent;
    const event = waiting ? beats?.get(gate?.startTick) ?? gate : playbackBeat(beats?.values(), tick);
    const number = visit && printedBoxForVisit(visit, mapping);
    const segment = event && visit && beatSegment(event, visit);
    const attack = event && (waiting ? gate : attackByTick.get(event.startTick));
    const feedback = state.ui.showNotationFeedback;
    if (!feedback) {
      clear();
      suppressed = new Set(trainer?.history?.filter(record => record.completed).map(record => record.eventId));
    }
    if (feedback && !enabled) activeVisit = undefined;
    if (feedback && suppressed.size) {
      // A fresh attempt can grade the same event IDs again.
      for (const record of trainer?.history ?? []) {
        if (!record.completed) suppressed.delete(record.eventId);
      }
    }
    enabled = feedback;

    const waitRestarted = waiting && trainer?.pass > 1 && waitPass !== undefined && trainer.pass !== waitPass;
    const realtimeRewound = !waiting && playing && previousTick !== undefined && tick < previousTick - 2;
    if (loop && (waitRestarted || realtimeRewound)) {
      clear(loop);
      suppressed.clear();
      activeVisit = undefined;
    }
    waitPass = waiting ? trainer?.pass : undefined;
    if (playing) {
      previousTick = tick;
      if (visit && activeVisit !== visit) {
        if (visitsByBox.get(number) !== visit) results.delete(number);
        if (number != null) visitsByBox.set(number, visit);
        activeVisit = visit;
      }
    }
    if (feedback && trainer?.sessionStarted) {
      for (const record of trainer.history ?? []) {
        const target = attackById.get(record.eventId);
        if (!target || suppressed.has(target.id) || (!trainer.sessionCompleted && target.id === attack?.id)) continue;
        const targetVisit = timeline.measures[target.playbackMeasureIndex];
        if (!targetVisit) continue;
        const box = printedBoxForVisit(targetVisit, mapping);
        if (box == null || visitsByBox.get(box) !== targetVisit) continue;
        const color = completedBeatColor(record);
        const beat = byVisit.get(target.playbackMeasureIndex)?.get(target.startTick) ?? target;
        const geometry = color && beatSegment(beat, targetVisit);
        if (!geometry) continue;
        if (!results.has(box)) results.set(box, new Map());
        const marks = results.get(box);
        if (marks.get(target.id)?.color !== color) marks.set(target.id, {...geometry, color});
      }
    }
    reader.updateBeatGuide(results, playing && segment && number != null ?
      {number, ...segment, color: feedback && attack ? liveColor(attack) || 'active' : 'active'} : null);
  }

  return {sync, clear(numbers) {
    clear(numbers);
    suppressed.clear();
    activeVisit = previousTick = waitPass = undefined;
    reader.updateBeatGuide(results, null);
  }};
}
