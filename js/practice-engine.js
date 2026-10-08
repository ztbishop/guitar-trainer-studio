// practice-engine.js
// Owns: correctness logic, mode behavior (realtime / wait), scoring
// WARNING: Do not couple directly to UI or alphaTab internals

import { AppState } from './app-state.js';
import { midiToNoteName } from './note-utils.js';

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
  const matchingIndex = AppState.expectedEvents.findIndex((event) =>
    resolvedTick >= event.startTick && (resolvedTick < event.endTick || (event.endTick === event.startTick && resolvedTick === event.startTick))
  );

  if (matchingIndex !== -1) {
    return matchingIndex;
  }

  const upcomingIndex = AppState.expectedEvents.findIndex((event) => resolvedTick < event.startTick);
  if (upcomingIndex !== -1) {
    return upcomingIndex;
  }

  return -1;
}

function createNormalizedEvent({ startTick, durationTicks, measureNumber, beatIndex, trackId, notes }) {
  const uniquePitches = Array.from(new Set(notes
    .map((note) => note.midi)
    .filter((midi) => Number.isFinite(midi)))).sort((a, b) => a - b);

  const normalizedNotes = notes
    .filter((note) => Number.isFinite(note.midi))
    .sort((left, right) => left.midi - right.midi)
    .map((note) => ({
      midi: note.midi,
      noteName: midiToNoteName(note.midi),
      string: Number.isFinite(note.string) ? note.string : null,
      fret: Number.isFinite(note.fret) ? note.fret : null,
    }));

  return {
    id: `${trackId}:${startTick}:${measureNumber}:${beatIndex}`,
    trackId,
    startTick,
    durationTicks: Math.max(0, durationTicks || 0),
    endTick: Math.max(startTick, startTick + Math.max(0, durationTicks || 0)),
    measureNumber,
    beatIndex,
    pitches: uniquePitches,
    pitchNames: uniquePitches.map((midi) => midiToNoteName(midi)),
    notes: normalizedNotes,
  };
}

function getTrackDisplayName(track, index = 0) {
  return track?.name?.trim() || `Track ${index + 1}`;
}

function resolvePracticeTrack(tracks, practiceTrackId) {
  if (!Array.isArray(tracks) || !tracks.length || practiceTrackId == null) {
    return { track: null, trackIndex: -1, trackId: null };
  }

  const resolvedId = String(practiceTrackId);
  const trackIndex = tracks.findIndex((track, index) => getTrackId(track, index) === resolvedId);
  if (trackIndex === -1) {
    return { track: null, trackIndex: -1, trackId: resolvedId };
  }

  return {
    track: tracks[trackIndex],
    trackIndex,
    trackId: resolvedId,
  };
}

function collectTrackEvents(track) {
  const trackId = getTrackId(track, track?.index ?? 0);
  const eventBuckets = new Map();

  (track?.staves || []).forEach((staff) => {
    (staff?.bars || []).forEach((bar) => {
      const measureNumber = Number.isFinite(bar?.index) ? bar.index + 1 : null;
      (bar?.voices || []).forEach((voice) => {
        (voice?.beats || []).forEach((beat) => {
          if (!beat || beat.isRest) return;

          const notes = (beat.notes || [])
            .filter((note) => note && Number.isFinite(note.realValue) && !note.isTieDestination)
            .map((note) => ({
              midi: note.realValue,
              string: note.string,
              fret: note.fret,
            }));

          if (!notes.length) return;

          const startTick = Number.isFinite(beat.absolutePlaybackStart)
            ? beat.absolutePlaybackStart
            : (Number.isFinite(beat.playbackStart) ? beat.playbackStart : 0);
          const durationTicks = Number.isFinite(beat.playbackDuration)
            ? beat.playbackDuration
            : (Number.isFinite(beat.displayDuration) ? beat.displayDuration : 0);
          const beatIndex = Number.isFinite(beat.index) ? beat.index : 0;
          const bucketKey = `${startTick}`;

          if (!eventBuckets.has(bucketKey)) {
            eventBuckets.set(bucketKey, {
              startTick,
              durationTicks,
              measureNumber,
              beatIndex,
              trackId,
              notes: [],
            });
          }

          const bucket = eventBuckets.get(bucketKey);
          bucket.durationTicks = Math.max(bucket.durationTicks, durationTicks);
          bucket.notes.push(...notes);
        });
      });
    });
  });

  return Array.from(eventBuckets.values())
    .sort((left, right) => left.startTick - right.startTick)
    .map((event) => createNormalizedEvent(event))
    .filter((event) => event.pitches.length > 0);
}

export function buildExpectedEventsFromPracticeTrack({ tracks = AppState.tracks, practiceTrackId = AppState.practiceTrackId } = {}) {
  const { track, trackIndex } = resolvePracticeTrack(tracks, practiceTrackId);

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

  const expectedEvents = collectTrackEvents(track);
  const trackName = getTrackDisplayName(track, trackIndex);
  AppState.expectedEvents = expectedEvents;
  AppState.activeTargets = expectedEvents.length ? [expectedEvents[0]] : [];

  if (!expectedEvents.length) {
    setTrainerState({
      currentEventIndex: -1,
      currentEvent: null,
      matchState: 'idle',
      status: 'No playable note events found on the selected track',
      summary: `${trackName} • expected-note extraction found no playable beats`,
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
      status: 'Load a score and select a practice track to begin',
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
