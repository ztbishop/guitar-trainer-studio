// app-bootstrap.js
// Owns: startup wiring and module initialization order
// Do NOT: let this grow into a giant logic file

import { initAlphaTab, loadScoreFile, play, stop, applyPlaybackTrackState, acquireWaitTransport, holdWaitAtTick, pauseWaitTransport, releaseWaitTransport, finishWaitTransport, setPlaybackSpeed, applyPracticeLoop } from './alphatab-host.js';
import { AppState } from './app-state.js';
import { WaitController } from './wait-controller.js';

import { formatStringHint, midiToNoteName } from './note-utils.js';
import { initFretboard, renderFretboard } from './fretboard-ui.js';
import { buildNotationMarks, buildFretboardModel } from './practice-visuals.js';
import { setNotationFeedback } from './alphatab-host.js';
import { initMidiRouter, setActiveMidiInput, clearActiveMidiNotes } from './midi-router.js';
import {
  advanceRealtimeClock,
  handlePlaybackPosition,
  handlePlaybackState,
  finishRealtimeSession,
  resetRealtimeSession,
  buildExpectedEventsFromPracticeTrack,
  handleMidiEvent,
  refreshTrainerMatchState,
  updateActiveTargetsFromPlayback,
} from './practice-engine.js';
import { initScoreLibrary } from './score-library.js';
import { initToolbar } from './toolbar-ui.js';
import { initTransportControls } from './transport-controls.js';

let transportControls=null;

const waitController = new WaitController({
  acquire:acquireWaitTransport,hold:holdWaitAtTick,
  pause:pauseWaitTransport,release:releaseWaitTransport,finish:finishWaitTransport,
}, state => {
  AppState.waitTrainer=state;
  if(AppState.mode==='wait')AppState.activeTargets=state.currentEvent?[state.currentEvent]:[];
  if(AppState.mode==='wait')renderTrainerUi();
});

const MIDI_DEBUG_STORAGE_KEY = 'gts.showMidiDebug';

function configureWaitSession() {
  waitController.configure(AppState.expectedEvents,AppState.practiceLoop.range?.endTick ?? AppState.playbackTimeline?.endTick ?? 0,AppState.inputMode==='hex-6ch',AppState.practiceLoop.enabled);
}

function wireTempoAndLoopControls() {
  transportControls=initTransportControls({
    onSpeedChange(speed) {
      waitController.stop();pauseWaitTransport();
      setPlaybackSpeed(speed);resetRealtimeSession('speed-change');configureWaitSession();renderTrainerUi();
    },
    onLoopChange(loop) {
      waitController.stop();pauseWaitTransport();
      AppState.practiceLoop=loop;applyPracticeLoop(loop.range);
      // Native position events may arrive asynchronously; reset from the chosen start.
      if(loop.range)AppState.tickPosition=loop.range.startTick;
      clearActiveMidiNotes();syncTrainerFoundation();
    },
  });
  transportControls.sync();
}

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

function syncTrainerFoundation() {
  buildExpectedEventsFromPracticeTrack({
    tracks: AppState.tracks,
    practiceTrackId: AppState.practiceTrackId,
  });
  configureWaitSession();
  updateActiveTargetsFromPlayback(AppState.tickPosition);
  renderTrainerUi();
}


function wireScoreStageUi() {
  const fullscreenButton = document.getElementById('btn-score-fullscreen');
  const scoreStage = document.querySelector('.score-stage.viewer-panel');
  const fretboardContainer = document.getElementById('fretboard-container');
  const fullscreenTarget = document.documentElement;
  for(const [id,key] of [['show-fretboard','showFretboard'],['left-handed-fretboard','leftHanded'],['show-notation-feedback','showNotationFeedback']]) {
    const control=document.getElementById(id);
    if(control)control.checked=Boolean(AppState.ui[key]);
    control?.addEventListener('change',()=>{
      AppState.ui[key]=control.checked;
      if(fretboardContainer) {
        fretboardContainer.classList.toggle('hidden',!AppState.ui.showFretboard);
        fretboardContainer.setAttribute('aria-hidden',String(!AppState.ui.showFretboard));
        document.body.classList.toggle('fretboard-visible',AppState.ui.showFretboard);
      }
      renderTrainerUi();
    });
  }

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
  document.getElementById('play-pause-button')?.addEventListener('click', () => {
    if(AppState.mode==='wait')waitController.toggle(AppState.tickPosition);
    else play();
  });
  document.getElementById('stop-button')?.addEventListener('click', () => {
    waitController.stop();
    stop();
    const start=AppState.practiceLoop.range?.startTick ?? 0;
    resetRealtimeSession('stop',start);
    updateActiveTargetsFromPlayback(start);
    renderTrainerUi();
  });
}

function wirePracticeControls() {
  document.getElementById('practice-mode-select')?.addEventListener('change', event => {
    waitController.stop();pauseWaitTransport();
    AppState.mode=event.target.value==='wait'?'wait':'realtime';
    clearActiveMidiNotes();resetRealtimeSession('mode-change');
    configureWaitSession();
    renderTrainerUi();
  });
  document.getElementById('midi-latency-ms')?.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    AppState.trainer.latencyMs = Number.isFinite(value) ? Math.max(0,Math.min(1000,value)) : 0;
    event.target.value = String(AppState.trainer.latencyMs);
    resetRealtimeSession('latency-change');
    renderTrainerUi();
  });
  const practiceTrackSelect = document.getElementById('practice-track-select');
  const playSelectedTrackToggle = document.getElementById('play-selected-track-toggle');
  const playOtherTracksToggle = document.getElementById('play-other-tracks-toggle');
  const viewModeSelect = document.getElementById('view-mode-select');

  function applyFromUi() {
    const previousTrack = AppState.practiceTrackId;
    applyPlaybackTrackState({
      practiceTrackId: practiceTrackSelect?.value || AppState.practiceTrackId,
      playSelectedTrack: Boolean(playSelectedTrackToggle?.checked),
      playOtherTracks: Boolean(playOtherTracksToggle?.checked),
      viewMode: viewModeSelect?.value || AppState.viewMode,
    });
    if (previousTrack !== AppState.practiceTrackId) syncTrainerFoundation();
    else renderTrainerUi();
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
  transportControls?.sync();
  const latencyInput = document.getElementById('midi-latency-ms');
  if (latencyInput) latencyInput.disabled = AppState.mode === 'wait';
  const pillEl = document.getElementById('trainer-match-pill');
  const statusEl = document.getElementById('trainer-status');
  const summaryEl = document.getElementById('trainer-summary');
  const expectedNotesEl = document.getElementById('trainer-expected-notes');
  const expectedMetaEl = document.getElementById('trainer-expected-meta');
  const detectedNotesEl = document.getElementById('trainer-detected-notes');

  const trainer = AppState.mode==='wait' ? (AppState.waitTrainer||AppState.trainer) : AppState.trainer;
  setNotationFeedback(buildNotationMarks(AppState.expectedEvents,trainer.currentEvent,trainer.noteStates),AppState.ui.showNotationFeedback);
  if(AppState.ui.showFretboard) {
    const track=AppState.tracks.find((item,index)=>getTrackId(item,index)===String(AppState.practiceTrackId));
    renderFretboard(buildFretboardModel({track,currentEvent:trainer.currentEvent,noteStates:trainer.noteStates,
      activeNotes:[...AppState.midi.activeNotes.values()],inputMode:AppState.inputMode,leftHanded:AppState.ui.leftHanded,lastFeedback:trainer.lastFeedback}));
  }
  const playButton=document.getElementById('play-pause-button');
  if(playButton) {
    const running=AppState.mode==='wait' ? trainer.active && trainer.phase!=='paused' : AppState.isPlaying;
    playButton.textContent=running?'⏸ Pause':'▶ Play';
    playButton.setAttribute('aria-label',running?'Pause practice':'Start or resume practice');
    playButton.title=running?'Pause practice':'Start or resume practice';
  }
  const scoreValue = document.getElementById('toolbar-score-value');
  if (scoreValue) {
    scoreValue.textContent = trainer.sessionStarted && trainer.results?.accuracy != null ? `${trainer.results.accuracy}%` : '—';
    scoreValue.title = trainer.sessionStarted ? 'Correct / (correct + missed + wrong attacks)' : 'Press Play to start practice';
  }
  const currentEvent = trainer.currentEvent;

  if (pillEl) {
    const pillLabel = {
      missed: 'Missed',
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
    detectedNotesEl.textContent = formatPitchList(AppState.trainer.detectedPitches);
  }
}

function wireMidiControls() {
  document.getElementById('midi-input-select')?.addEventListener('change', (event) => {
    setActiveMidiInput(event.target.value);
    resetRealtimeSession('input-device-change');
    configureWaitSession();
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('midi-input-mode-select')?.addEventListener('change', (event) => {
    AppState.inputMode = event.target.value;
    clearActiveMidiNotes();
    resetRealtimeSession('input-settings-change');
    configureWaitSession();
    AppState.ui.midiStatus = AppState.inputMode === 'hex-6ch'
      ? 'Hex mode enabled (channels map to strings)'
      : 'Single-channel mode enabled';
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('midi-single-channel-select')?.addEventListener('change', (event) => {
    AppState.midi.singleChannel = event.target.value || 'any';
    clearActiveMidiNotes();
    resetRealtimeSession('input-settings-change');
    configureWaitSession();
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('hex-channel-base-select')?.addEventListener('change', (event) => {
    AppState.midi.hexChannelBase = Number(event.target.value) || 1;
    clearActiveMidiNotes();
    resetRealtimeSession('input-settings-change');
    configureWaitSession();
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
  wireTempoAndLoopControls();
  wireMidiControls();

  try {
    await initAlphaTab(document.getElementById('alphatab-container'), {
      onScoreLoaded: () => {
        syncTrainerFoundation();
      },
      onPlaybackTimelineChanged: () => {
        syncTrainerFoundation();
      },
      onPlayerPositionChanged: (position) => {
        if(AppState.mode==='wait')waitController.positionChanged(position);
        else handlePlaybackPosition(position);
        renderTrainerUi();
      },
      onPlayerFinished: () => {
        if(AppState.mode==='realtime')finishRealtimeSession();
        renderTrainerUi();
      },
      onPlayerStateChanged: () => {
        if(AppState.mode==='realtime')handlePlaybackState();
        renderTrainerUi();
      },
      onPlayerReady: () => renderTrainerUi(),
    });
  } catch (error) {
    console.error('Failed to bootstrap Guitar Trainer Studio.', error);
  }

  let previousMidiInputId = AppState.midi.activeInputId;
  await initMidiRouter({
    onMidiEvent: (event) => {
      if(AppState.mode==='wait')waitController.noteOn(event);
      else handleMidiEvent(event);
      renderMidiUi();
      renderTrainerUi();
    },
    onStateChange: () => {
      if (previousMidiInputId !== AppState.midi.activeInputId) {
        previousMidiInputId = AppState.midi.activeInputId;
        resetRealtimeSession('midi-device-change');
        configureWaitSession();
      }
      refreshTrainerMatchState(AppState.tickPosition);
      renderMidiUi();
      renderTrainerUi();
    },
  });

  setInterval(() => {
    if (!AppState.isPlaying || AppState.mode!=='realtime') return;
    advanceRealtimeClock();
    renderTrainerUi();
  }, 50);

  renderMidiUi();
  renderTrainerUi();
}

window.addEventListener('load', bootstrap);
