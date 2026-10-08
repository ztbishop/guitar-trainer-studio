// practice-engine.js
// Owns: correctness logic, mode behavior (realtime / wait), scoring
// WARNING: Do not couple directly to UI or alphaTab internals

import { AppState } from './app-state.js';
import { midiToNoteName } from './note-utils.js';
import { getPracticeEvents, tickToTimeMs } from './score-playback.js';
import { RealtimeSession } from './realtime-session.js';
import { eventsInRange } from './practice-range.js';
import { noteStatesFromRecords } from './practice-visuals.js';

let realtime = null;

export function resetRealtimeSession(reason = 'reset', tick = AppState.tickPosition) {
  realtime = new RealtimeSession(AppState.expectedEvents, {
    hex: AppState.inputMode === 'hex-6ch', latencyMs: AppState.trainer.latencyMs || 0,
  });
  realtime.reset(tickToTimeMs(AppState.playbackTimeline, tick) ?? 0, AppState.playbackSpeed || 1);
  AppState.trainer.sessionReason = reason;
  publishRealtimeStats();
}

function publishRealtimeStats() {
  AppState.trainer.results = realtime?.stats() ?? null;
  AppState.trainer.lastFeedback = realtime?.lastFeedback ?? null;
  AppState.trainer.sessionStarted = Boolean(realtime?.started);
  AppState.trainer.sessionCompleted = Boolean(realtime?.completed);
  AppState.trainer.noteStates = noteStatesFromRecords(realtime?.records);
}

export function handlePlaybackPosition({currentTick, at = performance.now(), speed = 1, isSeek = false}) {
  const scoreMs = tickToTimeMs(AppState.playbackTimeline,currentTick);
  if (scoreMs === null) return;
  if (!realtime) resetRealtimeSession('playback-ready', currentTick);
  if (isSeek || (realtime.anchor && (scoreMs < realtime.anchor.scoreMs - 2 || speed !== realtime.anchor.speed))) {
    resetRealtimeSession('seek-or-speed-change',currentTick);
    realtime.started = AppState.isPlaying;
  }
  realtime.anchorPosition(scoreMs,at,speed);
  if (AppState.isPlaying) {
    realtime.started = true;
    realtime.advance(scoreMs-(AppState.trainer.latencyMs||0)*speed,speed);
  }
  publishRealtimeStats();
  updateActiveTargetsFromPlayback(currentTick);
}

export function handlePlaybackState() {
  if (!realtime) resetRealtimeSession('transport');
  if (AppState.isPlaying) {
    if (realtime.completed) resetRealtimeSession('restart');
    realtime.started = true;
  }
  realtime.anchorPosition(tickToTimeMs(AppState.playbackTimeline,AppState.tickPosition)??0,performance.now(),AppState.playbackSpeed||1);
  publishRealtimeStats();
  refreshTrainerMatchState();
}

export function advanceRealtimeClock(at = performance.now()) {
  if (!realtime?.started || !AppState.isPlaying || realtime.completed) return;
  const scoreMs = realtime.scoreTime(at);
  if (scoreMs === null) return;
  realtime.advance(scoreMs-realtime.latencyMs*realtime.anchor.speed,realtime.anchor.speed);
  publishRealtimeStats();
  refreshTrainerMatchState();
}

export function finishRealtimeSession() {
  realtime?.finish();
  publishRealtimeStats();
  refreshTrainerMatchState();
}


function getTrackId(track, index) {
  return String(track?.index ?? index);
}

function getSelectedChannelNumbers() {
  if (AppState.inputMode === 'single-channel') {
    if (AppState.midi.singleChannel === 'any') {
      return null;
    }
    const channel = Number(AppState.midi.singleChannel);
    return Number.isFinite(channel) ? [channel] : null;
  }

  const base = Number(AppState.midi.hexChannelBase || 1);
  return Array.from({ length: 6 }, (_, offset) => base + offset);
}

function getFilteredActivePitches() {
  const selectedChannels = getSelectedChannelNumbers();
  const pitches = new Set();

  if (!selectedChannels) {
    AppState.midi.activeNotes.forEach((noteState) => {
      if (Number.isFinite(noteState?.midi)) {
        pitches.add(noteState.midi);
      }
    });
    return Array.from(pitches).sort((a, b) => a - b);
  }

  selectedChannels.forEach((channel) => {
    const channelSet = AppState.midi.activeNotesByChannel.get(channel);
    if (!channelSet) return;
    channelSet.forEach((midi) => {
      if (Number.isFinite(midi)) {
        pitches.add(midi);
      }
    });
  });

  return Array.from(pitches).sort((a, b) => a - b);
}

function formatPitchList(pitches) {
  if (!Array.isArray(pitches) || !pitches.length) {
    return '—';
  }
  return pitches.map((midi) => `${midiToNoteName(midi)} (${midi})`).join(', ');
}

function setTrainerState(partialState) {
  AppState.trainer = {
    ...AppState.trainer,
    ...partialState,
  };
}

function setCurrentTrainerEventByIndex(eventIndex) {
  if (!AppState.expectedEvents.length || eventIndex < 0 || eventIndex >= AppState.expectedEvents.length) {
    AppState.activeTargets = [];
    setTrainerState({
      currentEventIndex: -1,
      currentEvent: null,
      awaitingReleaseForEventId: null,
    });
    return null;
  }

  const safeIndex = Math.max(0, Math.min(eventIndex, AppState.expectedEvents.length - 1));
  const currentEvent = AppState.expectedEvents[safeIndex] || null;
  AppState.activeTargets = currentEvent ? [currentEvent] : [];
  setTrainerState({
    currentEventIndex: safeIndex,
    currentEvent,
  });
  return currentEvent;
}

function findEventIndexAtTick(tickPosition) {
  if (!AppState.expectedEvents.length) return -1;

  const resolvedTick = Number.isFinite(tickPosition) ? tickPosition : 0;
  // Latest onset wins; half-open intervals leave rests and tie-only gaps idle.
  let low = 0, high = AppState.expectedEvents.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (AppState.expectedEvents[mid].startTick <= resolvedTick) low = mid + 1;
    else high = mid;
  }
  const index = low - 1;
  const event = AppState.expectedEvents[index];
  if (event && (resolvedTick < event.targetEndTick || (event.targetEndTick === event.startTick && resolvedTick === event.startTick))) return index;

  return -1;
}

export function buildExpectedEventsFromPracticeTrack({ tracks = AppState.tracks, practiceTrackId = AppState.practiceTrackId, timeline = AppState.playbackTimeline } = {}) {
  const trackIndex = tracks.findIndex((track,index)=>getTrackId(track,index) === String(practiceTrackId));
  const track = tracks[trackIndex];

  if (!track) {
    AppState.expectedEvents = [];
    resetRealtimeSession('track-change');
    AppState.activeTargets = [];
    setTrainerState({
      currentEventIndex: -1,
      currentEvent: null,
      matchState: 'idle',
      status: 'Choose a practice track to build trainer events',
      summary: 'No practice track selected',
      awaitingReleaseForEventId: null,
    });
    return [];
  }

  const expectedEvents = eventsInRange(getPracticeEvents(timeline, practiceTrackId), AppState.practiceLoop.range);
  const trackName = track.name?.trim() || `Track ${trackIndex + 1}`;
  AppState.expectedEvents = expectedEvents;
  resetRealtimeSession('score-or-track-change');
  AppState.activeTargets = expectedEvents.length ? [expectedEvents[0]] : [];

  if (!expectedEvents.length) {
    setTrainerState({
      currentEventIndex: -1,
      currentEvent: null,
      matchState: 'idle',
      status: timeline ? 'No playable note attacks found on the selected track' : 'Preparing score playback timeline…',
      summary: timeline ? `${trackName} • no playable attacks` : 'Waiting for alphaTab playback data',
      awaitingReleaseForEventId: null,
    });
    return expectedEvents;
  }

  setCurrentTrainerEventByIndex(0);
  setTrainerState({
    matchState: 'waiting',
    status: `Trainer events extracted from ${trackName}`,
    summary: `${trackName} • ${expectedEvents.length} expected event${expectedEvents.length === 1 ? '' : 's'} ready`,
    awaitingReleaseForEventId: null,
  });

  refreshTrainerMatchState(AppState.tickPosition);
  return expectedEvents;
}

export function updateActiveTargetsFromPlayback(position) {
  const tickPosition = Number.isFinite(position) ? position : 0;
  if (!AppState.expectedEvents.length) {
    AppState.activeTargets = [];
    setTrainerState({
      currentEventIndex: -1,
      currentEvent: null,
      matchState: 'idle',
      status: AppState.score && !AppState.playbackTimeline ? 'Preparing score playback timeline…' : 'Load a score and select a practice track to begin',
      summary: 'No expected events loaded',
      awaitingReleaseForEventId: null,
    });
    return null;
  }

  const nextIndex = findEventIndexAtTick(tickPosition);
  const currentEvent = setCurrentTrainerEventByIndex(nextIndex);
  refreshTrainerMatchState(tickPosition);
  return currentEvent;
}

export function refreshTrainerMatchState(position = AppState.tickPosition) {
  const detectedPitches = getFilteredActivePitches();
  const currentEvent = AppState.trainer.currentEvent;

  setTrainerState({
    detectedPitches,
  });

  if (realtime?.started) {
    const record = realtime.recordFor(currentEvent?.id);
    const feedback = realtime.lastFeedback;
    let matchState = 'idle';
    let status = realtime.completed ? 'Practice complete' : AppState.isPlaying ? 'Realtime practice • listening for new note attacks' : 'Paused • resume to continue grading';
    if (record && !record.skipped) {
      const hits = record.slots.filter(slot=>slot.hit).length;
      matchState = hits === record.slots.length ? 'match' : record.slots.some(slot=>slot.missed) ? 'missed' : hits ? 'partial' : 'waiting';
      status = `Measure ${currentEvent.measureNumber} • ${hits}/${record.slots.length} required attacks played`;
      if (record.slots.some(slot=>slot.missed)) status += ' • missing notes';
    }
    if (feedback?.type === 'wrong' && (!currentEvent || feedback.eventId === currentEvent.id)) {
      matchState = 'mismatch'; status = `Wrong or out-of-time attack: ${midiToNoteName(feedback.midi)}`;
    } else if (!record && feedback?.type === 'missed' && !realtime.completed) {
      matchState = 'missed'; status = `Missed: ${formatPitchList(feedback.pitches)}`;
    }
    const stats = realtime.stats();
    if (realtime.completed) status = 'Practice complete';
    setTrainerState({matchState,status,summary:`Correct ${stats.correct} • Wrong ${stats.wrong} • Missed ${stats.missed} • Pending ${stats.pending}`,awaitingReleaseForEventId:null});
    return matchState;
  }

  if (!currentEvent) {
    setTrainerState({
      matchState: 'idle',
      status: 'No active trainer event',
      summary: AppState.expectedEvents.length ? 'Playback position is outside expected events' : 'No expected events loaded',
      awaitingReleaseForEventId: null,
    });
    return null;
  }

  const expectedPitches = currentEvent.pitches || [];
  const detectedSet = new Set(detectedPitches);
  const hasAllExpected = expectedPitches.length > 0 && expectedPitches.every((pitch) => detectedSet.has(pitch));
  const hasAnyExpected = expectedPitches.some((pitch) => detectedSet.has(pitch));
  const expectedSet = new Set(expectedPitches);
  const hasUnexpected = detectedPitches.some((pitch) => !expectedSet.has(pitch));
  const tickPosition = Number.isFinite(position) ? position : 0;
  const measureLabel = currentEvent.measureNumber ? `Measure ${currentEvent.measureNumber}` : 'Current event';
  const pitchLabel = formatPitchList(expectedPitches);

  let matchState = 'waiting';
  let status = `${measureLabel} • expecting ${pitchLabel}`;
  // Foundation feedback compares held pitches only. Playback owns progression;
  // attack/timing grading and Wait Mode will be added in later stages.
  if (hasUnexpected) {
    matchState = 'mismatch';
    status = `${measureLabel} • heard ${formatPitchList(detectedPitches)}`;
  } else if (hasAllExpected && detectedPitches.length) {
    matchState = 'match';
    status = `${measureLabel} • matched ${pitchLabel}`;
  } else if (hasAnyExpected && detectedPitches.length) {
    matchState = 'partial';
    status = `${measureLabel} • partial match (${formatPitchList(detectedPitches)})`;
  }

  const eventNumber = (Number.isFinite(AppState.trainer.currentEventIndex) ? AppState.trainer.currentEventIndex : 0) + 1;
  const summary = `Event ${eventNumber} of ${AppState.expectedEvents.length} • tick ${currentEvent.startTick.toLocaleString()} • current tick ${tickPosition.toLocaleString()}`;

  setTrainerState({
    matchState,
    status,
    summary,
    awaitingReleaseForEventId: null,
  });
  return matchState;
}

export function handleMidiEvent(midiEvent) {
  AppState.midi.lastEvent = midiEvent;
  if (midiEvent?.type === 'note-on' && AppState.isPlaying && realtime?.started) {
    const at = Number.isFinite(midiEvent.at) ? midiEvent.at : performance.now();
    realtime.noteOn(midiEvent,realtime.scoreTime(at),realtime.anchor?.speed || 1);
    publishRealtimeStats();
  }
  return refreshTrainerMatchState(AppState.tickPosition);
}
