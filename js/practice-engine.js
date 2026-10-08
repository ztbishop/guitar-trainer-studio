// practice-engine.js
// Owns: correctness logic, mode behavior (realtime / wait), scoring
// WARNING: Do not couple directly to UI or alphaTab internals

import { AppState } from './app-state.js';
import { midiToNoteName } from './note-utils.js';
import { getPracticeEvents } from './score-playback.js';

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

  const expectedEvents = getPracticeEvents(timeline, practiceTrackId);
  const trackName = track.name?.trim() || `Track ${trackIndex + 1}`;
  AppState.expectedEvents = expectedEvents;
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
  return refreshTrainerMatchState(AppState.tickPosition);
}
