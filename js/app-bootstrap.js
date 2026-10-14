import {initMidiCaptureControls,captureFeedbackView} from './midi-capture.js';
// app-bootstrap.js
// Owns: startup wiring and module initialization order
// Do NOT: let this grow into a giant logic file

import { initAlphaTab, loadScoreFile, play, stop, applyPlaybackTrackState, acquireWaitTransport, holdWaitAtTick, pauseWaitTransport, releaseWaitTransport, finishWaitTransport, setPlaybackSpeed, setMetronomeVolume, applyPracticeLoop, startCountIn } from './alphatab-host.js';
import { AppState } from './app-state.js';
import { WaitController } from './wait-controller.js';

import { formatStringHint, midiToNoteName } from './note-utils.js';
import { initFretboard, renderFretboard } from './fretboard-ui.js';
import { buildNotationMarks, buildFretboardModel, buildWrongPitchMarks } from './practice-visuals.js';
import { buildWrongFretMarks, buildTabErrorTargets } from './tab-feedback.js';
import { buildPolyMistakeMarks, buildPolyWrongFretMarks } from './poly-feedback.js';
import { setNotationFeedback } from './alphatab-host.js';
import { initMidiRouter, setActiveMidiInput, clearActiveMidiNotes } from './midi-router.js';
import {
  advanceRealtimeClock,
  handlePlaybackPosition,
  handlePlaybackState,
  finishRealtimeSession,
  resetRealtimeSession,
  newRealtimeAttemptHere,
  buildExpectedEventsFromPracticeTrack,
  handleMidiEvent,
  refreshTrainerMatchState,
  updateActiveTargetsFromPlayback,
} from './practice-engine.js';
import { initScoreLibrary } from './score-library.js';
import { initToolbar } from './toolbar-ui.js';
import { initTransportControls } from './transport-controls.js';
import { initChordControls } from './chord-controls.js';
import { initAttemptControls } from './attempt-controls.js';
import { initDisplayControls } from './display-controls.js';
import { applyScoreDisplay } from './alphatab-host.js';
import {applyMasterVolume,applyTrackMixer,applyPlaybackPitchOffset} from './alphatab-host.js';
import {initAudioControls} from './audio-controls.js';
import {initPitchControls} from './pitch-controls.js';
import {readPracticePreferences,savePracticePreferences,FEEDBACK_PREFERENCE_KEYS} from './practice-preferences.js';
import {readDisplayPreferences,saveDisplayPreferences} from './display-preferences.js';
import {initMediaControls} from './media-controls.js';
import {beginMediaPlayback,endMediaPlayback,toggleMediaPlayback,pauseMediaPlayback,updateMediaPosition,seekMediaTick,embeddedMedia,applyMediaSyncPoints} from './alphatab-host.js';

let transportControls=null;
let chordControls=null;
let attemptControls=null;
let audioControls=null,scoreLibrary=null,mediaControls=null,pitchControls=null;

const waitController = new WaitController({
  acquire:acquireWaitTransport,hold:holdWaitAtTick,
  pause:pauseWaitTransport,release:releaseWaitTransport,finish:finishWaitTransport,
  countIn:startCountIn,
}, state => {
  AppState.waitTrainer=state;
  if(AppState.mode==='wait')AppState.activeTargets=state.currentEvent?[state.currentEvent]:[];
  if(AppState.mode==='wait')renderTrainerUi();
});

const MIDI_DEBUG_STORAGE_KEY = 'gts.showMidiDebug';

function configureWaitSession() {
  waitController.configure(AppState.expectedEvents,AppState.practiceLoop.range?.endTick ?? AppState.playbackTimeline?.endTick ?? 0,AppState.inputMode==='hex-6ch',AppState.practiceLoop.enabled,AppState.waitChord,AppState.practiceLoop.countIn);
}

function changePracticeLoop(loop) {
  waitController.stop();pauseWaitTransport();
  AppState.practiceLoop=loop;applyPracticeLoop(loop.range);
  if(loop.range)AppState.tickPosition=loop.range.startTick;
  clearActiveMidiNotes();syncTrainerFoundation();
}

function wireTempoAndLoopControls() {
  transportControls=initTransportControls({
    onMetronomeChange:setMetronomeVolume,
    onSpeedChange(speed) {
      if(AppState.mode==='wait') {setPlaybackSpeed(speed);renderTrainerUi();return;}
      waitController.stop();pauseWaitTransport();
      setPlaybackSpeed(speed);resetRealtimeSession('speed-change');configureWaitSession();renderTrainerUi();
    },
    onLoopChange:changePracticeLoop,
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
  const displayControls=initDisplayControls(applyScoreDisplay);
  const fullscreenButton = document.getElementById('btn-score-fullscreen');
  const scoreStage = document.querySelector('.score-stage.viewer-panel');
  const fretboardContainer = document.getElementById('fretboard-container');
  const fullscreenTarget = document.documentElement;
  for(const [id,key] of [['show-fretboard','showFretboard'],['left-handed-fretboard','leftHanded'],['show-notation-feedback','showNotationFeedback'],['show-tab-circles','showTabCircles'],['show-tab-mistakes','showTabMistakes'],['infer-poly-mistakes','inferPolyMistakes']]) {
    const control=document.getElementById(id);
    if(control)control.checked=Boolean(AppState.ui[key]);
    control?.addEventListener('change',()=>{
      AppState.ui[key]=control.checked;
      if(FEEDBACK_PREFERENCE_KEYS.includes(key))savePracticePreferences(AppState);
      if(key==='showFretboard' || key==='leftHanded') {saveDisplayPreferences(AppState);displayControls.sync();}
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
    if(AppState.media.preview){toggleMediaPlayback();return;}
    const starting=AppState.mode==='wait' ? !waitController.active || waitController.phase==='paused' : !AppState.isPlaying && !AppState.countInActive;
    if(starting && AppState.playerReady && AppState.ui.fullscreenOnPlay && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(error=>console.error('Could not enter fullscreen.',error));
    }
    if(AppState.mode==='wait')waitController.toggle(AppState.tickPosition);
    else play();
  });
  document.getElementById('stop-button')?.addEventListener('click', () => {
    if(AppState.media.preview){pauseMediaPlayback();seekMediaTick(AppState.practiceLoop.range?.startTick ?? 0);return;}
    waitController.stop();
    stop();
    const start=AppState.practiceLoop.range?.startTick ?? 0;
    resetRealtimeSession('stop',start);
    updateActiveTargetsFromPlayback(start);
    renderTrainerUi();
  });
}

function wirePracticeControls() {
  attemptControls=initAttemptControls(()=>{
    clearActiveMidiNotes();
    if(AppState.mode==='wait')waitController.newAttemptHere(AppState.tickPosition);
    else newRealtimeAttemptHere();
    renderMidiUi();renderTrainerUi();
  });
  chordControls=initChordControls(settings=>{
    waitController.stop();pauseWaitTransport();AppState.waitChord=settings;
    savePracticePreferences(AppState);
    clearActiveMidiNotes();configureWaitSession();renderTrainerUi();
  });
  chordControls.sync();
  for(const mode of document.querySelectorAll('input[name="practice-mode"]'))mode.checked=mode.value===AppState.mode;
  for(const mode of document.querySelectorAll('input[name="practice-mode"]'))mode.addEventListener('change', event => {
    waitController.stop();pauseWaitTransport();
    AppState.mode=event.target.value==='wait'?'wait':'realtime';
    savePracticePreferences(AppState);
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
  const viewModes = [...document.querySelectorAll('input[name="view-mode"]')];

  function applyFromUi() {
    const previousTrack = AppState.practiceTrackId;
    const previousView = AppState.viewMode;
    applyPlaybackTrackState({
      practiceTrackId: practiceTrackSelect?.value || AppState.practiceTrackId,
      playSelectedTrack: Boolean(playSelectedTrackToggle?.checked),
      playOtherTracks: Boolean(playOtherTracksToggle?.checked),
      viewMode: viewModes.find(mode=>mode.checked)?.value || AppState.viewMode,
    });
    if(previousView!==AppState.viewMode)saveDisplayPreferences(AppState);
    if (previousTrack !== AppState.practiceTrackId) syncTrainerFoundation();
    else renderTrainerUi();
  }

  practiceTrackSelect?.addEventListener('change', applyFromUi);
  playSelectedTrackToggle?.addEventListener('change', applyFromUi);
  playOtherTracksToggle?.addEventListener('change', applyFromUi);
  for(const mode of viewModes)mode.addEventListener('change', applyFromUi);
}

function populateMidiChannelOptions(selectElement, { includeAny = false, min = 1, max = 16 } = {}) {
  if (!selectElement) return;
  selectElement.innerHTML = '';

  if (includeAny) {
    const anyOption = document.createElement('option');
    anyOption.value = 'any';
    anyOption.textContent = 'Any';
    selectElement.appendChild(anyOption);
  }

  for (let channel = min; channel <= max; channel += 1) {
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
  const inputModes = document.querySelectorAll('input[name="midi-input-mode"]');
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
  for(const mode of inputModes) {
    mode.checked = mode.value === AppState.inputMode;
    mode.disabled = !AppState.midi.supported;
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
    const reverse=AppState.midi.hexChannelReverse;
    populateMidiChannelOptions(baseSelect,{min:reverse?6:1,max:reverse?16:11});
    baseSelect.value = String(AppState.midi.hexChannelBase ?? 1);
    baseSelect.disabled = !AppState.midi.supported || AppState.inputMode !== 'hex-6ch';
  }
  const reverseControl=document.getElementById('hex-channel-reverse');
  if(reverseControl){reverseControl.checked=AppState.midi.hexChannelReverse;reverseControl.disabled=!AppState.midi.supported || AppState.inputMode!=='hex-6ch';}
  const orderHelp=document.getElementById('hex-channel-order-help');
  if(orderHelp){const base=AppState.midi.hexChannelBase;orderHelp.textContent=`Six-string mapping, lowest to highest: ${Array.from({length:6},(_,i)=>base+(AppState.midi.hexChannelReverse?-i:i)).join(', ')}. Base choices keep all six channels within 1–16.`;}
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
  for(const id of ['practice-popup','tempo-popup','looper-popup']) {
    const panel=document.getElementById(id);if(panel)panel.inert=AppState.media.preview;
  }
  if(AppState.media.preview) {
    mediaControls?.sync();
    const value=document.getElementById('toolbar-score-value');if(value){value.textContent='Listen';value.title='Recording playback: MIDI grading paused';}
    const button=document.getElementById('play-pause-button');if(button){button.textContent=AppState.isPlaying?'⏸ Pause':'▶ Listen';button.title='Listen and align recording';}
    setNotationFeedback([]);return;
  }
  attemptControls?.sync();
  transportControls?.sync();
  chordControls?.sync();
  const latencyInput = document.getElementById('midi-latency-ms');
  if (latencyInput) latencyInput.disabled = AppState.mode === 'wait';
  const pillEl = document.getElementById('trainer-match-pill');
  const statusEl = document.getElementById('trainer-status');
  const summaryEl = document.getElementById('trainer-summary');
  const expectedNotesEl = document.getElementById('trainer-expected-notes');
  const expectedMetaEl = document.getElementById('trainer-expected-meta');
  const detectedNotesEl = document.getElementById('trainer-detected-notes');

  const trainer = AppState.mode==='wait' ? (AppState.waitTrainer||AppState.trainer) : AppState.trainer;
  const tabStatus=document.getElementById('tab-feedback-status');
  if(tabStatus) {tabStatus.hidden=!AppState.ui.showTabMistakes;tabStatus.textContent=AppState.inputMode==='hex-6ch'?'Fret feedback uses the selected Hex channel layout.':AppState.ui.inferPolyMistakes?'Fret numbers are inferred on expected strings, not detected positions.':'Enable non-hex fret inference to show unambiguous estimated frets.';}
  const marks=buildNotationMarks(AppState.expectedEvents,trainer.currentEvent,trainer.noteStates);
  marks.push(...buildWrongPitchMarks(AppState.expectedEvents,trainer.currentEvent,trainer.history,trainer.liveWrongNotes));
  marks.push(...buildTabErrorTargets(AppState.expectedEvents,trainer.currentEvent,trainer.history,
    {liveWrongNotes:trainer.liveWrongNotes,inputMode:AppState.inputMode,noteStates:trainer.noteStates,mode:AppState.mode}));
  if(AppState.inputMode==='single-channel')marks.push(...buildPolyMistakeMarks({events:AppState.expectedEvents,currentEvent:trainer.currentEvent,
    history:trainer.history,liveWrongNotes:trainer.liveWrongNotes,noteStates:trainer.noteStates,mode:AppState.mode,enabled:AppState.ui.inferPolyMistakes}));
  if(AppState.ui.showTabMistakes) {
    const track=AppState.tracks.find((item,index)=>getTrackId(item,index)===String(AppState.practiceTrackId));
    marks.push(...buildWrongFretMarks({track,events:AppState.expectedEvents,currentEvent:trainer.currentEvent,history:trainer.history,
      liveWrongNotes:trainer.liveWrongNotes,inputMode:AppState.inputMode,mode:AppState.mode}));
    if(AppState.inputMode==='single-channel')marks.push(...buildPolyWrongFretMarks({track,events:AppState.expectedEvents,
      currentEvent:trainer.currentEvent,history:trainer.history,liveWrongNotes:trainer.liveWrongNotes,mode:AppState.mode,enabled:AppState.ui.inferPolyMistakes}));
  }
  captureFeedbackView(marks,trainer);
  setNotationFeedback(marks,{notation:AppState.ui.showNotationFeedback,tabCircles:AppState.ui.showTabCircles,tabFrets:AppState.ui.showTabMistakes});
  if(AppState.ui.showFretboard) {
    const track=AppState.tracks.find((item,index)=>getTrackId(item,index)===String(AppState.practiceTrackId));
    renderFretboard(buildFretboardModel({track,currentEvent:trainer.currentEvent,noteStates:trainer.noteStates,
      activeNotes:[...AppState.midi.activeNotes.values()],liveWrongNotes:trainer.liveWrongNotes,inputMode:AppState.inputMode,leftHanded:AppState.ui.leftHanded,lastFeedback:trainer.lastFeedback}));
  }
  const playButton=document.getElementById('play-pause-button');
  if(playButton) {
    const running=AppState.countInActive || (AppState.mode==='wait' ? trainer.active && trainer.phase!=='paused' : AppState.isPlaying);
    playButton.textContent=running?'⏸ Pause':'▶ Play';
    playButton.setAttribute('aria-label',running?'Pause practice':'Start or resume practice');
    playButton.title=running?'Pause practice':'Start or resume practice';
  }
  const scoreValue = document.getElementById('toolbar-score-value');
  if (scoreValue) {
    scoreValue.textContent = trainer.sessionStarted && trainer.results?.accuracy != null ? `${trainer.results.accuracy}%` : '—';
    scoreValue.title = trainer.sessionStarted ? (AppState.mode==='wait'?'Correct / (correct + wrong attacks); chord retries are separate':'Correct / (correct + missed + wrong attacks)') : 'Press Play to start practice';
  }
  const historyEl=document.getElementById('trainer-error-history');
  if(historyEl) {
    historyEl.replaceChildren();historyEl.hidden=false;
    if(!historyEl.hidden)for(const record of [...(trainer.passHistory||[]),...(trainer.history||[])]) {
      if(!record.completed || !record.wrongNotes.length)continue;
      const event=AppState.expectedEvents.find(event=>event.id===record.eventId);
      const item=document.createElement('li');
      item.textContent=`Pass ${record.pass} • measure ${event?.measureNumber??'—'} • occurrence ${event?.occurrence??1} • target ${(AppState.expectedEvents.indexOf(event)+1)}: ${record.wrongNotes.map(note=>`${midiToNoteName(note.midi)} (${note.midi})`).join(', ')}`;
      historyEl.appendChild(item);
    }
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
    statusEl.textContent = AppState.countInActive ? 'Count-in • get ready' : trainer.status || 'Load a score to begin';
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

  for(const mode of document.querySelectorAll('input[name="midi-input-mode"]'))mode.addEventListener('change', (event) => {
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

  document.getElementById('hex-channel-reverse')?.addEventListener('change', event=>{
    AppState.midi.hexChannelReverse=Boolean(event.target.checked);
    const reverse=AppState.midi.hexChannelReverse;
    AppState.midi.hexChannelBase=Math.max(reverse?6:1,Math.min(reverse?16:11,AppState.midi.hexChannelBase));
    clearActiveMidiNotes();resetRealtimeSession('input-settings-change');configureWaitSession();
    refreshTrainerMatchState(AppState.tickPosition);renderMidiUi();renderTrainerUi();
  });

  document.getElementById('midi-debug-toggle')?.addEventListener('change', (event) => {
    AppState.ui.showMidiDebug = Boolean(event.target.checked);
    persistMidiDebugPreference();
    renderMidiUi();
  });
}

async function bootstrap() {
  const preferences=readPracticePreferences();
  AppState.mode=preferences.mode;
  Object.assign(AppState.ui,preferences.feedback);
  AppState.waitChord=preferences.waitChord;
  const displayPreferences=readDisplayPreferences();
  AppState.viewMode=displayPreferences.viewMode;
  Object.assign(AppState.ui,displayPreferences.ui);
  loadMidiDebugPreference();
  initToolbar();
  scoreLibrary=initScoreLibrary(loadScoreFile);
  audioControls=initAudioControls((kind,value)=>{if(kind==='master')applyMasterVolume();else if(kind==='media')mediaControls?.setVolume(value);else applyTrackMixer();});
  pitchControls=initPitchControls(applyPlaybackPitchOffset);
  mediaControls=initMediaControls({beginMediaPlayback,endMediaPlayback,toggleMediaPlayback,pauseMediaPlayback,updateMediaPosition,seekMediaTick,embeddedMedia,applyMediaSyncPoints,setSpeed:setPlaybackSpeed},
    {beforeListen(){if(AppState.mode==='wait' && waitController.active && waitController.phase!=='paused')waitController.toggle(AppState.tickPosition);pauseWaitTransport();clearActiveMidiNotes();},afterPractice(){clearActiveMidiNotes();if(AppState.mode==='realtime')handlePlaybackState();renderTrainerUi();}});
  initFretboard(document.getElementById('fretboard-container'),document.getElementById('fretboard-help-status'));
  wireScoreStageUi();
  wireFilePicker();
  wireTransportButtons();
  wirePracticeControls();
  wireTempoAndLoopControls();
  wireMidiControls();
  initMidiCaptureControls(()=>renderTrainerUi());

  try {
    await initAlphaTab(document.getElementById('alphatab-container'), {
      onScoreLoaded: () => {
        scoreLibrary?.scoreLoaded();audioControls?.sync();
        pitchControls?.sync({enabled:false,value:0});
        transportControls?.clearPulse();
        syncTrainerFoundation();
      },
      onPlaybackTimelineChanged: () => {
        transportControls?.clearPulse();
        syncTrainerFoundation();
        mediaControls?.timelineReady().catch(error=>console.error('Media profile lookup failed.',error));
      },
      onPlayerPositionChanged: (position) => {
        if(AppState.media.preview){mediaControls?.sync();return;}
        if(position.isSeek && AppState.mode!=='wait')transportControls?.clearPulse();
        if(AppState.mode==='wait')waitController.positionChanged(position);
        else handlePlaybackPosition(position);
        renderTrainerUi();
      },
      onPlayerFinished: () => {
        transportControls?.clearPulse();
        if(!AppState.media.preview && AppState.mode==='realtime')finishRealtimeSession();
        renderTrainerUi();
      },
      onPlayerStateChanged: () => {
        if(!AppState.media.preview && AppState.mode==='realtime')handlePlaybackState();
        renderTrainerUi();
      },
      onPlayerReady: () => {audioControls?.sync();pitchControls?.sync({enabled:true,value:AppState.pitchOffsetSemitones});renderTrainerUi();},
      onScoreLoading: () => {mediaControls?.scoreLoading();scoreLibrary?.sync();audioControls?.sync();pitchControls?.sync({enabled:false,value:AppState.pitchOffsetSemitones});},
      onScoreLoadError: () => scoreLibrary?.sync(),
      onMetronomeTick: () => transportControls?.pulse(),
      onMetronomeError: () => renderTrainerUi(),
      onCountInChanged: () => renderTrainerUi(),
      onLoopSelection: selection => {if(!AppState.media.preview)transportControls?.selectLoopByDrag(selection);},
      onMediaChanged: () => {mediaControls?.mediaChanged();renderTrainerUi();},
    });
  } catch (error) {
    console.error('Failed to bootstrap Guitar Trainer Studio.', error);
  }

  let previousMidiInputId = AppState.midi.activeInputId;
  await initMidiRouter({
    onMidiEvent: (event) => {
      if(AppState.media.preview){renderMidiUi();return null;}
      let outcome;
      if(AppState.mode==='wait')outcome=waitController.noteOn(event);
      else {
        const previous=AppState.trainer.lastFeedback;
        handleMidiEvent(event);
        outcome=AppState.trainer.lastFeedback!==previous?AppState.trainer.lastFeedback:null;
      }
      renderMidiUi();
      renderTrainerUi();
      return outcome;
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
    if(AppState.media.preview)return;
    if(AppState.mode==='wait') {waitController.advance();return;}
    if (!AppState.isPlaying || AppState.mode!=='realtime') return;
    advanceRealtimeClock();
    renderTrainerUi();
  }, 50);

  renderMidiUi();
  renderTrainerUi();
}

window.addEventListener('load', bootstrap);
