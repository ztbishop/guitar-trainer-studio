// Normalize alphaTab's generated playback lookup into score-independent data.
// No transport control or correctness decisions belong here.
import { midiToNoteName } from './note-utils.js';

export function tickToTimeMs(timeline, tick, speed = 1) {
  if (!timeline?.tempoMap?.length || !Number.isFinite(tick) || !(speed > 0)) return null;
  let segment = timeline.tempoMap[0];
  for (const next of timeline.tempoMap) {
    if (next.tick > tick) break;
    segment = next;
  }
  return (segment.timeMs + (Math.max(0, tick) - segment.tick) * 60000 / (segment.bpm * timeline.ticksPerQuarter)) / speed;
}

export function timeMsToTick(timeline, timeMs, speed = 1) {
  if (!timeline?.tempoMap?.length || !Number.isFinite(timeMs) || !(speed > 0)) return null;
  const baseTime = Math.max(0, timeMs) * speed;
  let segment = timeline.tempoMap[0];
  for (const next of timeline.tempoMap) {
    if (next.timeMs > baseTime) break;
    segment = next;
  }
  return segment.tick + (baseTime - segment.timeMs) * segment.bpm * timeline.ticksPerQuarter / 60000;
}

export function buildPlaybackTimeline(tickCache, { tempo = 120, ticksPerQuarter = 960 } = {}) {
  if (!tickCache?.masterBars?.length) return null;
  const timeline = { source: 'alphatab-playback', ticksPerQuarter, events: [], measures: [], tempoMap: [], endTick: 0 };
  const changes = new Map([[0, tempo > 0 ? tempo : 120]]);
  const occurrences = new Map();
  const beatOccurrences = new Map();
  for (const [playbackMeasureIndex, bar] of tickCache.masterBars.entries()) {
    const measureNumber = bar.masterBar.index + 1;
    const occurrence = (occurrences.get(measureNumber) || 0) + 1;
    occurrences.set(measureNumber, occurrence);
    timeline.measures.push({ measureNumber, occurrence, playbackMeasureIndex, startTick: bar.start, endTick: bar.end });
    timeline.endTick = Math.max(timeline.endTick, bar.end);
    for (const change of bar.tempoChanges) {
      if (Number.isFinite(change.tick) && change.tempo > 0) changes.set(change.tick, change.tempo);
    }
    for (let span = bar.firstBeat; span; span = span.nextBeat) {
      for (const item of span.highlightedBeats) {
        const beat = item.beat;
        const trackId = String(beat.voice.bar.staff.track.index);
        const startTick = bar.start + item.playbackStart;
        const sourceBeatId = String(beat.id);
        const key = `${trackId}:${sourceBeatId}:${startTick}`;
        // Highlight spans split at other voices' boundaries and may spill across bars.
        // One source beat at one playback tick is one occurrence, not many attacks.
        if (beatOccurrences.has(key)) {
          const existing = beatOccurrences.get(key);
          existing.endTick = Math.max(existing.endTick, bar.start + span.end);
          continue;
        }
        const event = {
          id: key, sourceBeatId, trackId, measureNumber: beat.voice.bar.index + 1,
          occurrence, playbackMeasureIndex, beatIndex: beat.index,
          voiceIndex: beat.voice.index, staffIndex: beat.voice.bar.staff.index,
          stringCount: beat.voice.bar.staff.tuning.length,
          writtenStartTick: beat.absolutePlaybackStart,
          startTick, endTick: bar.start + span.end, isRest: Boolean(beat.isRest), notes: [],
        };
        event.notes = (beat.notes || []).filter(note => Number.isFinite(note.realValue)).map((note, index) => ({
          id: `${key}:note:${note.id ?? index}`, sourceNoteId: String(note.id ?? `${sourceBeatId}:${index}`),
          sourceBeatId, midi: note.realValue, noteName: midiToNoteName(note.realValue),
          sourceString: Number.isFinite(note.string) && note.string > 0 ? note.string : null,
          string: note.string > 0 && beat.voice.bar.staff.tuning.length >= note.string
            ? beat.voice.bar.staff.tuning.length + 1 - note.string : null,
          fret: Number.isFinite(note.fret) ? note.fret : null,
          leftHandFinger: Number.isInteger(note.leftHandFinger) ? note.leftHandFinger : -2,
          isDead: Boolean(note.isDead),
          attack: !note.isTieDestination,
          tieOriginId: note.tieOrigin ? String(note.tieOrigin.id) : null,
          tieDestinationId: note.tieDestination ? String(note.tieDestination.id) : null,
        }));
        beatOccurrences.set(key, event);
      }
    }
  }
  let lastTick = 0, lastTime = 0, lastTempo = tempo > 0 ? tempo : 120;
  timeline.tempoMap = [...changes.entries()].sort((a,b) => a[0]-b[0]).map(([tick,bpm]) => {
    lastTime += (tick - lastTick) * 60000 / (lastTempo * ticksPerQuarter);
    lastTick = tick; lastTempo = bpm;
    return {tick, bpm, timeMs:lastTime};
  });
  timeline.events = [...beatOccurrences.values()].sort((a,b) => a.startTick-b.startTick);
  // Preserve individual notes, including unisons on different strings and tie destinations.
  const latestNotes = new Map();
  for (const event of timeline.events) {
    event.durationTicks = Math.max(0, event.endTick-event.startTick);
    event.startTimeMs = tickToTimeMs(timeline,event.startTick);
    event.endTimeMs = tickToTimeMs(timeline,event.endTick);
    for (const note of event.notes) {
      note.startTick = event.startTick; note.endTick = event.endTick;
      note.durationTicks = event.durationTicks;
      const origin = latestNotes.get(`${event.trackId}:${note.tieOriginId}`);
      // Only contiguous, actually-played ties extend an attack. Repeat jumps do not.
      if (!note.attack && origin && origin.endTick === note.startTick && origin.midi === note.midi) {
        const root = origin.root;
        root.endTick = note.endTick;
        root.durationTicks = root.endTick-root.startTick;
        note.attackNoteId = root.id;
        latestNotes.set(`${event.trackId}:${note.sourceNoteId}`, {...note, root});
      } else {
        note.attackNoteId = note.attack ? note.id : null;
        latestNotes.set(`${event.trackId}:${note.sourceNoteId}`, {...note, root:note});
      }
    }
  }
  for (const event of timeline.events) for (const note of event.notes) {
    note.startTimeMs = tickToTimeMs(timeline,note.startTick);
    note.endTimeMs = tickToTimeMs(timeline,note.endTick);
  }
  timeline.durationMs = tickToTimeMs(timeline,timeline.endTick);
  return timeline;
}

export function getPracticeEvents(timeline, trackId) {
  if (!timeline) return [];
  const groups = new Map();
  for (const event of timeline.events) {
    if (event.trackId !== String(trackId)) continue;
    const attacks = event.notes.filter(note=>note.attack);
    if (!attacks.length) continue;
    let group = groups.get(event.startTick);
    if (!group) {
      group = { ...event, id:`${trackId}:attack:${event.startTick}`, notes:[], beatIds:[], endTick:event.endTick };
      groups.set(event.startTick,group);
    }
    group.notes.push(...attacks); group.beatIds.push(event.sourceBeatId);
    group.endTick = Math.max(group.endTick,event.endTick);
  }
  const events = [...groups.values()].sort((a,b)=>a.startTick-b.startTick);
  events.forEach((event,index)=>{
    // X notes carry a stored fret/pitch in GP files, but do not demand that pitch.
    // Keep an all-X beat as one unpitched attack; mixed chords require only tones.
    event.isPercussive = event.notes.every(note=>note.isDead);
    event.mutedStrings = event.notes.filter(note=>note.isDead).map(note=>note.string);
    if(!event.isPercussive)event.notes=event.notes.filter(note=>!note.isDead);
    event.pitches = event.isPercussive ? [] : [...new Set(event.notes.map(note=>note.midi))].sort((a,b)=>a-b);
    event.pitchNames = event.pitches.map(midiToNoteName);
    // An earlier long voice must not hide a later attack in another voice.
    event.targetEndTick = Math.min(event.endTick,events[index+1]?.startTick ?? timeline.endTick);
    event.targetEndTimeMs = tickToTimeMs(timeline,event.targetEndTick);
    event.durationTicks = event.endTick-event.startTick;
    event.endTimeMs = tickToTimeMs(timeline,event.endTick);
  });
  return events;
}
