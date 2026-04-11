// app-bootstrap.js
// Owns: startup wiring and module initialization order
// Do NOT: let this grow into a giant logic file

import { initAlphaTab, loadScoreFile, play, stop, applyPlaybackTrackState, syncCursorToTick } from './alphatab-host.js';
import { AppState } from './app-state.js';
import { formatStringHint, midiToNoteName } from './note-utils.js';
import { initFretboard } from './fretboard-ui.js';
import { initMidiRouter, setActiveMidiInput } from './midi-router.js';
import {
  buildExpectedEventsFromPracticeTrack,
  handleMidiEvent,
  refreshTrainerMatchState,
  updateActiveTargetsFromPlayback,
} from './practice-engine.js';
import { initScoreLibrary } from './score-library.js';
import { initToolbar } from './toolbar-ui.js';

const MIDI_DEBUG_STORAGE_KEY = 'gts.showMidiDebug';

function loadMidiDebugPreference() {
  try {
    const stored = window.localStorage.getItem(MIDI_DEBUG_STORAGE_KEY);
    AppState.ui.showMidiDebug = stored === '1';
  } catch (error) {
    AppState.ui.showMidiDebug = false;
  }
}

function persistMidiDebugPreference() {
  try {
    window.localStorage.setItem(MIDI_DEBUG_STORAGE_KEY, AppState.ui.showMidiDebug ? '1' : '0');
  } catch (error) {
    // Ignore storage failures.
  }
}

function getTrackId(track, index) {
  return String(track?.index ?? index);
}

function formatPitchList(pitches) {
  if (!Array.isArray(pitches) || !pitches.length) {
    return '—';
  }
  return pitches.map((midi) => `${midiToNoteName(midi)} (${midi})`).join(', ');
}

function syncTrainerCursorToActiveEvent() {
  const currentEvent = AppState.trainer.currentEvent;
  if (!currentEvent || !Number.isFinite(currentEvent.startTick)) return;
  syncCursorToTick(currentEvent.startTick);
}

function syncTrainerFoundation() {
  buildExpectedEventsFromPracticeTrack({
    tracks: AppState.tracks,
    practiceTrackId: AppState.practiceTrackId,
  });
  updateActiveTargetsFromPlayback(AppState.tickPosition);
  syncTrainerCursorToActiveEvent();
  renderTrainerUi();
}


function wireScoreStageUi() {
  const fullscreenButton = document.getElementById('btn-score-fullscreen');
  const scoreStage = document.querySelector('.score-stage.viewer-panel');
  const fretboardContainer = document.getElementById('fretboard-container');
  const fullscreenTarget = document.documentElement;

  function syncFullscreenButton() {
    if (!fullscreenButton) return;
    const isFullscreen = document.fullscreenElement === fullscreenTarget;
    fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
    fullscreenButton.title = isFullscreen ? 'Exit full screen' : 'Enter full screen';
    fullscreenButton.classList.toggle('is-active', isFullscreen);
  }

  if (fretboardContainer) {
    const showFretboard = Boolean(AppState.ui.showFretboard);
    fretboardContainer.classList.toggle('hidden', !showFretboard);
    fretboardContainer.setAttribute('aria-hidden', showFretboard ? 'false' : 'true');
    document.body.classList.toggle('fretboard-visible', showFretboard);
  } else {
    document.body.classList.remove('fretboard-visible');
  }

  fullscreenButton?.addEventListener('click', async () => {
    if (!fullscreenTarget) return;
    try {
      if (document.fullscreenElement === fullscreenTarget) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await fullscreenTarget.requestFullscreen();
      }
    } catch (error) {
      console.error('Could not toggle score fullscreen.', error);
    } finally {
      syncFullscreenButton();
    }
  });

  document.addEventListener('fullscreenchange', syncFullscreenButton);
  syncFullscreenButton();
}

function wireFilePicker() {
  const fileInput = document.getElementById('score-file-input');
  if (!fileInput) return;

  fileInput.addEventListener('change', async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      await loadScoreFile(file);
    } catch (error) {
      console.error('Could not load score file.', error);
      alert(error?.message || 'Could not load that score file. Check the browser console for details.');
    }
  });
}

function wireTransportButtons() {
  document.getElementById('play-pause-button')?.addEventListener('click', () => play());
  document.getElementById('stop-button')?.addEventListener('click', () => stop());
}

function wirePracticeControls() {
  const practiceTrackSelect = document.getElementById('practice-track-select');
  const playSelectedTrackToggle = document.getElementById('play-selected-track-toggle');
  const playOtherTracksToggle = document.getElementById('play-other-tracks-toggle');
  const viewModeSelect = document.getElementById('view-mode-select');

  function applyFromUi() {
    applyPlaybackTrackState({
      practiceTrackId: practiceTrackSelect?.value || AppState.practiceTrackId,
      playSelectedTrack: Boolean(playSelectedTrackToggle?.checked),
      playOtherTracks: Boolean(playOtherTracksToggle?.checked),
      viewMode: viewModeSelect?.value || AppState.viewMode,
    });
    syncTrainerFoundation();
  }

  practiceTrackSelect?.addEventListener('change', applyFromUi);
  playSelectedTrackToggle?.addEventListener('change', applyFromUi);
  playOtherTracksToggle?.addEventListener('change', applyFromUi);
  viewModeSelect?.addEventListener('change', applyFromUi);
}

function populateMidiChannelOptions(selectElement, { includeAny = false, max = 16 } = {}) {
  if (!selectElement) return;
  selectElement.innerHTML = '';

  if (includeAny) {
    const anyOption = document.createElement('option');
    anyOption.value = 'any';
    anyOption.textContent = 'Any';
    selectElement.appendChild(anyOption);
  }

  for (let channel = 1; channel <= max; channel += 1) {
    const option = document.createElement('option');
    option.value = String(channel);
    option.textContent = String(channel);
    selectElement.appendChild(option);
  }
}

function renderMidiUi() {
  const supportEl = document.getElementById('midi-support-status');
  const statusEl = document.getElementById('midi-status');
  const statusPillEl = document.getElementById('midi-status-pill');
  const inputSelect = document.getElementById('midi-input-select');
  const modeSelect = document.getElementById('midi-input-mode-select');
  const singleSection = document.getElementById('midi-single-channel-section');
  const singleChannelSelect = document.getElementById('midi-single-channel-select');
  const hexSection = document.getElementById('midi-hex-channel-section');
  const baseSelect = document.getElementById('hex-channel-base-select');
  const lastEventEl = document.getElementById('midi-last-event');
  const debugToggleEl = document.getElementById('midi-debug-toggle');
  const debugDetailsEl = document.getElementById('midi-debug-details');
  const recentListEl = document.getElementById('midi-recent-events');
  const eventTypeEl = document.getElementById('midi-event-type');
  const eventChannelEl = document.getElementById('midi-event-channel');
  const eventNoteEl = document.getElementById('midi-event-note');
  const eventVelocityEl = document.getElementById('midi-event-velocity');
  const eventStringEl = document.getElementById('midi-event-string');
  const eventRawEl = document.getElementById('midi-event-raw');

  if (supportEl) {
    supportEl.textContent = AppState.midi.supported ? 'Web MIDI available' : 'Web MIDI unavailable';
  }
  if (statusEl) {
    statusEl.textContent = AppState.ui.midiStatus;
  }
  if (statusPillEl) {
    statusPillEl.textContent = AppState.ui.midiStatus || 'Waiting for MIDI…';
  }
  if (debugToggleEl) {
    debugToggleEl.checked = Boolean(AppState.ui.showMidiDebug);
    debugToggleEl.disabled = !AppState.midi.supported;
  }
  if (debugDetailsEl) {
    debugDetailsEl.classList.toggle('is-hidden', !AppState.ui.showMidiDebug);
  }
  if (modeSelect) {
    modeSelect.value = AppState.inputMode;
    modeSelect.disabled = !AppState.midi.supported;
  }
  if (singleSection) {
    singleSection.classList.toggle('is-hidden', AppState.inputMode !== 'single-channel');
  }
  if (hexSection) {
    hexSection.classList.toggle('is-hidden', AppState.inputMode !== 'hex-6ch');
  }
  if (singleChannelSelect) {
    populateMidiChannelOptions(singleChannelSelect, { includeAny: true, max: 16 });
    singleChannelSelect.value = String(AppState.midi.singleChannel ?? 'any');
    singleChannelSelect.disabled = !AppState.midi.supported || AppState.inputMode !== 'single-channel';
  }
  if (baseSelect) {
    baseSelect.value = String(AppState.midi.hexChannelBase ?? 1);
    baseSelect.disabled = !AppState.midi.supported || AppState.inputMode !== 'hex-6ch';
  }
  if (inputSelect) {
    inputSelect.innerHTML = '';
    if (!AppState.midi.availableInputs.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = AppState.midi.supported ? 'No MIDI inputs found' : 'Web MIDI unavailable';
      inputSelect.appendChild(option);
      inputSelect.disabled = true;
    } else {
      AppState.midi.availableInputs.forEach((input) => {
        const option = document.createElement('option');
        option.value = input.id;
        option.textContent = input.manufacturer ? `${input.name} — ${input.manufacturer}` : input.name;
        inputSelect.appendChild(option);
      });
      inputSelect.value = AppState.midi.activeInputId || AppState.midi.availableInputs[0].id;
      inputSelect.disabled = false;
    }
  }

  const evt = AppState.midi.lastEvent;
  if (lastEventEl) {
    if (!evt) {
      lastEventEl.textContent = 'No MIDI notes received yet';
    } else {
      const parts = [evt.typeLabel || evt.type || 'Unknown'];
      if (evt.noteName && Number.isFinite(evt.midi)) {
        parts.push(`${evt.noteName} (MIDI ${evt.midi})`);
      }
      if (Number.isFinite(evt.channel)) {
        parts.push(`Ch ${evt.channel}`);
      }
      if (AppState.inputMode === 'hex-6ch') {
        parts.push(formatStringHint(evt.stringHint));
      }
      lastEventEl.textContent = parts.join(' • ');
    }
  }

  if (eventTypeEl) eventTypeEl.textContent = evt?.typeLabel || evt?.type || '—';
  if (eventChannelEl) eventChannelEl.textContent = Number.isFinite(evt?.channel) ? String(evt.channel) : '—';
  if (eventNoteEl) {
    eventNoteEl.textContent = evt?.noteName && Number.isFinite(evt?.midi)
      ? `${evt.noteName} (${evt.midi})`
      : '—';
  }
  if (eventVelocityEl) eventVelocityEl.textContent = Number.isFinite(evt?.velocity) ? String(evt.velocity) : '—';
  if (eventStringEl) {
    eventStringEl.textContent = AppState.inputMode === 'hex-6ch'
      ? formatStringHint(evt?.stringHint)
      : 'Not used in single mode';
  }
  if (eventRawEl) {
    eventRawEl.textContent = Array.isArray(evt?.raw) ? evt.raw.join(', ') : '—';
  }

  if (recentListEl) {
    recentListEl.innerHTML = '';
    if (!AppState.midi.recentEvents.length) {
      const item = document.createElement('li');
      item.className = 'midi-placeholder';
      item.textContent = 'Play a note to see recent MIDI events.';
      recentListEl.appendChild(item);
    } else {
      AppState.midi.recentEvents.forEach((recentEvent) => {
        const item = document.createElement('li');
        item.className = 'midi-event-item';
        const parts = [recentEvent.typeLabel || recentEvent.type || 'Event'];
        if (recentEvent.noteName && Number.isFinite(recentEvent.midi)) {
          parts.push(recentEvent.noteName);
        }
        if (Number.isFinite(recentEvent.channel)) {
          parts.push(`Ch ${recentEvent.channel}`);
        }
        if (AppState.inputMode === 'hex-6ch') {
          parts.push(formatStringHint(recentEvent.stringHint));
        }
        item.textContent = parts.join(' • ');
        recentListEl.appendChild(item);
      });
    }
  }
}

function renderTrainerUi() {
  const pillEl = document.getElementById('trainer-match-pill');
  const statusEl = document.getElementById('trainer-status');
  const summaryEl = document.getElementById('trainer-summary');
  const expectedNotesEl = document.getElementById('trainer-expected-notes');
  const expectedMetaEl = document.getElementById('trainer-expected-meta');
  const detectedNotesEl = document.getElementById('trainer-detected-notes');

  const trainer = AppState.trainer;
  const currentEvent = trainer.currentEvent;

  if (pillEl) {
    const pillLabel = {
      idle: 'Idle',
      waiting: 'Waiting',
      partial: 'Partial',
      mismatch: 'Mismatch',
      match: 'Match',
    }[trainer.matchState] || 'Idle';
    pillEl.textContent = pillLabel;
    pillEl.dataset.state = trainer.matchState || 'idle';
  }

  if (statusEl) {
    statusEl.textContent = trainer.status || 'Load a score to begin';
  }

  if (summaryEl) {
    summaryEl.textContent = trainer.summary || 'No trainer events yet';
  }

  if (expectedNotesEl) {
    expectedNotesEl.textContent = currentEvent ? formatPitchList(currentEvent.pitches) : '—';
  }

  if (expectedMetaEl) {
    if (!currentEvent) {
      expectedMetaEl.textContent = 'Load a score and choose a practice track.';
    } else {
      const noteDetails = (currentEvent.notes || []).map((note) => {
        const noteParts = [note.noteName];
        if (Number.isFinite(note.string)) noteParts.push(`string ${note.string}`);
        if (Number.isFinite(note.fret)) noteParts.push(`fret ${note.fret}`);
        return noteParts.join(' • ');
      });
      expectedMetaEl.textContent = `Measure ${currentEvent.measureNumber || '—'} • beat ${currentEvent.beatIndex + 1} • ${noteDetails.join(' | ')}`;
    }
  }

  if (detectedNotesEl) {
    detectedNotesEl.textContent = formatPitchList(trainer.detectedPitches);
  }
}

function wireMidiControls() {
  document.getElementById('midi-input-select')?.addEventListener('change', (event) => {
    setActiveMidiInput(event.target.value);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('midi-input-mode-select')?.addEventListener('change', (event) => {
    AppState.inputMode = event.target.value;
    AppState.ui.midiStatus = AppState.inputMode === 'hex-6ch'
      ? 'Hex mode enabled (channels map to strings)'
      : 'Single-channel mode enabled';
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('midi-single-channel-select')?.addEventListener('change', (event) => {
    AppState.midi.singleChannel = event.target.value || 'any';
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('hex-channel-base-select')?.addEventListener('change', (event) => {
    AppState.midi.hexChannelBase = Number(event.target.value) || 1;
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('midi-debug-toggle')?.addEventListener('change', (event) => {
    AppState.ui.showMidiDebug = Boolean(event.target.checked);
    persistMidiDebugPreference();
    renderMidiUi();
  });
}

async function bootstrap() {
  loadMidiDebugPreference();
  initToolbar();
  initScoreLibrary();
  initFretboard(document.getElementById('fretboard-container'));
  wireScoreStageUi();
  wireFilePicker();
  wireTransportButtons();
  wirePracticeControls();
  wireMidiControls();

  try {
    await initAlphaTab(document.getElementById('alphatab-container'), {
      onScoreLoaded: () => {
        syncTrainerFoundation();
      },
      onPlayerPositionChanged: ({ currentTick }) => {
        updateActiveTargetsFromPlayback(currentTick);
        syncTrainerCursorToActiveEvent();
        renderTrainerUi();
      },
      onPlayerStateChanged: () => {
        renderTrainerUi();
      },
    });
  } catch (error) {
    console.error('Failed to bootstrap Guitar Trainer Studio.', error);
  }

  await initMidiRouter({
    onMidiEvent: (event) => {
      handleMidiEvent(event);
      syncTrainerCursorToActiveEvent();
      renderMidiUi();
      renderTrainerUi();
    },
    onStateChange: () => {
      refreshTrainerMatchState(AppState.tickPosition);
      syncTrainerCursorToActiveEvent();
      renderMidiUi();
      renderTrainerUi();
    },
  });

  renderMidiUi();
  renderTrainerUi();
}

window.addEventListener('load', bootstrap);
