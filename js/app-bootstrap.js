import {applyAppearance} from './appearance.js';
import {initBriefErrorControls} from './brief-error-controls.js';
import {syncPracticeMenuSummary} from './practice-menu.js';
import {initMidiCaptureControls,captureFeedbackView} from './midi-capture.js';
// app-bootstrap.js
// Owns: startup wiring and module initialization order
// Do NOT: let this grow into a giant logic file

import { initAlphaTab, loadScoreFile, play, stop, applyPlaybackTrackState, acquireWaitTransport, holdWaitAtTick, pauseWaitTransport, releaseWaitTransport, finishWaitTransport, setPlaybackSpeed, setMetronomeVolume, applyPracticeLoop, startCountIn } from './alphatab-host.js';
import { AppState } from './app-state.js';
import { WaitController } from './wait-controller.js';

import { formatStringHint, midiToNoteName } from './note-utils.js';
import { initFretboard, renderFretboard } from './fretboard-ui.js';
import {initFretboardControls} from './fretboard-controls.js';
import {FretboardHeldNotes} from './fretboard-held-notes.js';
import {fretboardBeats,fretboardStepTick,fretboardContext} from './fretboard-context.js';
import {seekPausedTick} from './alphatab-host.js';
import { buildNotationMarks, buildFretboardModel, buildWrongPitchMarks, fretboardDisplayEvent } from './practice-visuals.js';
import { buildWrongFretMarks, buildTabErrorTargets } from './tab-feedback.js';
import { buildPolyMistakeMarks, buildPolyWrongFretMarks } from './poly-feedback.js';
import { setNotationFeedback } from './alphatab-host.js';
import { initMidiRouter, setActiveMidiInput, clearActiveMidiNotes, saveActiveMidiSettings } from './midi-router.js';
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
import {initDemoScores} from './demo-scores.js';
import { initToolbar } from './toolbar-ui.js';
import { initTransportControls } from './transport-controls.js';
import { initChordControls } from './chord-controls.js';
import { initAttemptControls } from './attempt-controls.js';
import { initDisplayControls } from './display-controls.js';
import { applyScoreDisplay,printScore } from './alphatab-host.js';
import {initScorePrintControls} from './score-print-controls.js';
import {applyMasterVolume,applyTrackMixer,applyPlaybackPitchOffset} from './alphatab-host.js';
import {initAudioControls} from './audio-controls.js';
import {initPitchControls} from './pitch-controls.js';
import {readPracticePreferences,savePracticePreferences,FEEDBACK_PREFERENCE_KEYS} from './practice-preferences.js';
import {readDisplayPreferences,saveDisplayPreferences} from './display-preferences.js';
import {initMediaControls} from './media-controls.js';
import {initLessonImport} from './lesson-import.js';
import {initWorkspacePanels} from './workspace-panels.js';
import {readPitchRange,savePitchRange,validPitchRange} from './midi-pitch.js';
import {frameTask} from './frame-task.js';
import {beginMediaPlayback,endMediaPlayback,toggleMediaPlayback,pauseMediaPlayback,updateMediaPosition,seekMediaTime,seekMediaTick,embeddedMedia,applyMediaSyncPoints,setMediaEditing,revealMediaScoreTarget} from './alphatab-host.js';

let transportControls=null;
let chordControls=null;
let attemptControls=null;
let audioControls=null,scoreLibrary=null,mediaControls=null,pitchControls=null;
let briefErrorControls=null;
let waitUiRevision=0,suppressWaitPaint=false;
const scheduleMidiUi=frameTask(()=>renderMidiUi());

const waitController = new WaitController({
  acquire:acquireWaitTransport,hold:holdWaitAtTick,
  pause:pauseWaitTransport,release:releaseWaitTransport,finish:finishWaitTransport,
  countIn:startCountIn,
}, state => {
  waitUiRevision++;
  AppState.waitTrainer=state;
  if(AppState.mode==='wait')AppState.activeTargets=state.currentEvent?[state.currentEvent]:[];
  if(AppState.mode==='wait' && !suppressWaitPaint)renderTrainerUi();
});

const MIDI_DEBUG_STORAGE_KEY = 'gts.showMidiDebug';
let fretboardControls=null,fretboardBrowseTick=null;
const fretboardHeldNotes=new FretboardHeldNotes();

function fretboardBeatList() {
  return fretboardBeats(AppState.playbackTimeline,AppState.practiceTrackId,AppState.practiceLoop.enabled?AppState.practiceLoop.range:null);
}

function stepFretboard(direction) {
  if(!AppState.playerReady || AppState.media.editing)return;
  const trainer=AppState.mode==='wait'?AppState.waitTrainer:AppState.trainer;
  const browsing=fretboardBrowseTick!==null && Math.abs(fretboardBrowseTick-AppState.tickPosition)<=3 && !AppState.isPlaying;
  const origin=browsing?fretboardBrowseTick:trainer?.currentEvent?.startTick??AppState.tickPosition;
  const tick=fretboardStepTick(fretboardBeatList(),origin,direction);
  if(tick===null)return;
  // Reuse the existing new-attempt lifecycle; no grading rules change.
  waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
  configureWaitSession();resetRealtimeSession('fretboard-step');
  if(seekPausedTick(tick))fretboardBrowseTick=tick;
  renderTrainerUi();
}

function configureWaitSession() {
  waitController.configure(AppState.expectedEvents,AppState.practiceLoop.range?.endTick ?? AppState.playbackTimeline?.endTick ?? 0,AppState.inputMode==='hex-6ch',AppState.practiceLoop.enabled,{...AppState.waitChord,extraStringTolerance:AppState.extraStringTolerance,heldNoteTolerance:AppState.heldNoteTolerance,filterHexSpikes:AppState.filterHexSpikes,filterScoreRange:AppState.filterScoreRange,ignoreBriefErrors:AppState.midi.ignoreBriefErrors,minErrorMs:AppState.midi.minErrorMs,rangeStaves:AppState.tracks.find((track,index)=>String(track.index??index)===String(AppState.practiceTrackId))?.staves??[],pitchBendRange:AppState.midi.pitchBendRange},AppState.practiceLoop.countIn);
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
      if(setPlaybackSpeed(speed)){resetRealtimeSession('speed-change');configureWaitSession();}renderTrainerUi();
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
  fretboardBrowseTick=null;
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
  for(const [id,key] of [['show-fretboard','showFretboard'],['show-notation-feedback','showNotationFeedback'],['show-tab-circles','showTabCircles'],['show-tab-mistakes','showTabMistakes'],['infer-poly-mistakes','inferPolyMistakes']]) {
    const control=document.getElementById(id);
    if(control)control.checked=Boolean(AppState.ui[key]);
    control?.addEventListener('change',()=>{
      AppState.ui[key]=control.checked;
      if(FEEDBACK_PREFERENCE_KEYS.includes(key))savePracticePreferences(AppState);
      if(key==='showFretboard') {saveDisplayPreferences(AppState);displayControls.sync();}
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
  return displayControls;
}

function wireFilePicker() {
  const fileInput = document.getElementById('score-file-input');
  if (!fileInput) return;

  fileInput.addEventListener('change', async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    // Selecting the same file again must fire change and offer pairing again.
    event.target.value='';
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
    const starting=AppState.mode==='wait' && !AppState.media.editing ? !waitController.active || waitController.phase==='paused' : !AppState.isPlaying && !AppState.countInActive;
    if(starting && AppState.playerReady && AppState.ui.fullscreenOnPlay && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(error=>console.error('Could not enter fullscreen.',error));
    }
    if(AppState.mode==='wait' && !AppState.media.editing)waitController.toggle(AppState.tickPosition);
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
  briefErrorControls=initBriefErrorControls(settings=>{
    waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
    Object.assign(AppState.midi,settings);saveActiveMidiSettings();resetRealtimeSession('input-tolerance');configureWaitSession();renderTrainerUi();
  });
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
  const spikeFilter=document.getElementById('filter-hex-spikes');
  spikeFilter.addEventListener('change',()=>{
    const enabled=spikeFilter.checked;
    waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
    AppState.filterHexSpikes=enabled;savePracticePreferences(AppState);resetRealtimeSession('input-tolerance');configureWaitSession();renderTrainerUi();
  });
  const rangeFilter=document.getElementById('filter-score-range');
  rangeFilter?.addEventListener('change',()=>{
    const enabled=rangeFilter.checked;
    waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
    AppState.filterScoreRange=enabled;savePracticePreferences(AppState);resetRealtimeSession('input-tolerance');configureWaitSession();renderTrainerUi();
  });
  const heldNotes=document.getElementById('held-note-tolerance');
  heldNotes.addEventListener('change',()=>{
    const value=heldNotes.value;
    waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
    AppState.heldNoteTolerance=value;savePracticePreferences(AppState);
    resetRealtimeSession('held-note-setting');configureWaitSession();renderTrainerUi();
  });
  const mutedNoise=document.getElementById('extra-string-tolerance');
  mutedNoise.addEventListener('change',()=>{
    const tolerance=mutedNoise.value;
    waitController.stop();pauseWaitTransport();clearActiveMidiNotes();
    AppState.extraStringTolerance=tolerance;
    savePracticePreferences(AppState);resetRealtimeSession('muted-string-setting');configureWaitSession();renderTrainerUi();
  });
  for(const mode of document.querySelectorAll('input[name="practice-mode"]'))mode.checked=mode.value===AppState.mode;
  for(const mode of document.querySelectorAll('input[name="practice-mode"]'))mode.addEventListener('change', event => {
    if(AppState.media.editing){AppState.mode=event.target.value==='wait'?'wait':'realtime';savePracticePreferences(AppState);renderTrainerUi();return;}
    waitController.stop();pauseWaitTransport();
    AppState.mode=event.target.value==='wait'?'wait':'realtime';
    applyMasterVolume();
    savePracticePreferences(AppState);
    clearActiveMidiNotes();resetRealtimeSession('mode-change');
    configureWaitSession();
    renderTrainerUi();
  });
  document.getElementById('midi-latency-ms')?.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    AppState.trainer.latencyMs = Number.isFinite(value) ? Math.max(0,Math.min(1000,value)) : 0;
    event.target.value = String(AppState.trainer.latencyMs);
    saveActiveMidiSettings();
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
  const signature=`${includeAny}:${min}:${max}`;
  if(selectElement.dataset.channelOptions===signature)return;
  selectElement.dataset.channelOptions=signature;
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
  const deviceAvailable=AppState.midi.supported && Boolean(AppState.midi.activeInputId);
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
    // Routine confirmations repeat the selected device/mode. Keep exceptions visible.
    statusEl.hidden = deviceAvailable && /^(Listening: |Receiving from |Single-channel mode enabled$|Hex mode enabled \(channels map to strings\)$)/.test(AppState.ui.midiStatus || '');
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
    mode.disabled = !deviceAvailable;
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
    singleChannelSelect.disabled = !deviceAvailable || AppState.inputMode !== 'single-channel';
  }
  if (baseSelect) {
    const reverse=AppState.midi.hexChannelReverse;
    populateMidiChannelOptions(baseSelect,{min:reverse?6:1,max:reverse?16:11});
    baseSelect.value = String(AppState.midi.hexChannelBase ?? 1);
    baseSelect.disabled = !deviceAvailable || AppState.inputMode !== 'hex-6ch';
  }
  const reverseControl=document.getElementById('hex-channel-reverse');
  if(reverseControl){reverseControl.checked=AppState.midi.hexChannelReverse;reverseControl.disabled=!deviceAvailable || AppState.inputMode!=='hex-6ch';}
  const bendRange=document.getElementById('wait-hex-bend-range');
  if(bendRange){bendRange.value=String(AppState.midi.pitchBendRange);bendRange.disabled=!deviceAvailable || AppState.inputMode!=='hex-6ch';}
  const orderHelp=document.getElementById('hex-channel-order-help');
  if(orderHelp){const base=AppState.midi.hexChannelBase;orderHelp.textContent=`Channels, lowest → highest string: ${Array.from({length:6},(_,i)=>base+(AppState.midi.hexChannelReverse?-i:i)).join(', ')}`;}
  if (inputSelect) {
    const waiting=AppState.midi.waitingInputName;
    const signature=JSON.stringify([AppState.midi.supported,AppState.midi.availableInputs,waiting]);
    if(inputSelect.dataset.inputOptions!==signature) {
      inputSelect.dataset.inputOptions=signature;
      inputSelect.innerHTML = '';
      if(waiting && AppState.midi.supported) {
        const option=document.createElement('option');option.value='';option.disabled=true;
        option.textContent=`Waiting for ${waiting}`;inputSelect.appendChild(option);
      }
      if (!AppState.midi.availableInputs.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = AppState.midi.supported ? 'None (no MIDI inputs connected)' : 'Web MIDI unavailable';
        inputSelect.appendChild(option);
        inputSelect.disabled = !AppState.midi.supported;
      } else {
        const option=document.createElement('option');option.value='';option.textContent='None';inputSelect.appendChild(option);
        AppState.midi.availableInputs.forEach((input) => {
          const option = document.createElement('option');
          option.value = input.id;
          option.textContent = input.manufacturer ? `${input.name} — ${input.manufacturer}` : input.name;
          inputSelect.appendChild(option);
        });
        inputSelect.disabled = false;
      }
    }
    inputSelect.value=AppState.midi.activeInputId || '';
    // The waiting placeholder and None share an empty ID. Selecting the next
    // option still changes selectedIndex and lets None cancel a pending return.
    if(waiting && AppState.midi.supported)inputSelect.selectedIndex=0;
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

function renderPracticeFretboard(trainer) {
  if(!AppState.ui.showFretboard)return;
  const track=AppState.tracks.find((item,index)=>getTrackId(item,index)===String(AppState.practiceTrackId));
  const beats=fretboardBeatList();
  const browsing=fretboardBrowseTick!==null && Math.abs(fretboardBrowseTick-AppState.tickPosition)<=3 && !AppState.isPlaying;
  const browseBeats=browsing?beats.filter(event=>Math.abs(event.startTick-fretboardBrowseTick)<=1):[];
  const browseEvent=browseBeats.length?{...browseBeats[0],notes:browseBeats.flatMap(event=>event.notes)}:null;
  const fretboardEvent=AppState.media.editing?null:browseEvent??fretboardDisplayEvent({trainer,events:AppState.expectedEvents,tick:AppState.tickPosition,editing:AppState.media.editing});
  const origin=browsing?fretboardBrowseTick:fretboardEvent?.startTick??AppState.tickPosition;
  fretboardControls?.sync({previous:AppState.playerReady && !AppState.media.editing && fretboardStepTick(beats,origin,-1)!==null,next:AppState.playerReady && !AppState.media.editing && fretboardStepTick(beats,origin,1)!==null});
  renderFretboard(buildFretboardModel({track,noScore:!AppState.score,currentEvent:fretboardEvent,contextEvents:fretboardContext(beats,fretboardEvent,AppState.ui.fretboardView,{loop:AppState.practiceLoop.enabled}),labelMode:AppState.ui.fretboardLabels,showAlternatePositions:AppState.ui.showAlternatePositions,noteStates:!browsing && trainer.currentEvent?trainer.noteStates:{},
    activeNotes:fretboardHeldNotes.visible([...AppState.midi.activeNotes.values()],trainer).map(n=>{
      const projected=AppState.mode==='wait' && AppState.inputMode==='hex-6ch'?waitController.pitchState.interpret(n):n;
      return fretboardHeldNotes.isUngraded(n)?{...projected,fretboardUngraded:true}:projected;
    }),liveWrongNotes:trainer.liveWrongNotes,inputMode:AppState.inputMode,leftHanded:AppState.ui.leftHanded,lastFeedback:trainer.lastFeedback}));
}

function renderTrainerUi() {
  for(const id of ['practice-popup','tempo-popup','looper-popup']) {
    const panel=document.getElementById(id);if(panel)panel.inert=Boolean(AppState.media.returning);
  }
  mediaControls?.sync();
  briefErrorControls?.sync();
  attemptControls?.sync();
  transportControls?.sync();
  chordControls?.sync();
  const mutedNoise=document.getElementById('extra-string-tolerance');
  if(mutedNoise){mutedNoise.value=AppState.extraStringTolerance;mutedNoise.disabled=AppState.inputMode!=='hex-6ch' || AppState.media.editing;}
  const heldNotes=document.getElementById('held-note-tolerance');
  if(heldNotes){heldNotes.value=AppState.heldNoteTolerance;heldNotes.disabled=AppState.media.editing;}
  const spikeFilter=document.getElementById('filter-hex-spikes');
  const rangeFilter=document.getElementById('filter-score-range');
  if(rangeFilter){rangeFilter.checked=AppState.filterScoreRange;rangeFilter.disabled=AppState.media.editing;}
  if(spikeFilter){spikeFilter.checked=AppState.filterHexSpikes;spikeFilter.disabled=AppState.inputMode!=='hex-6ch' || AppState.media.editing;}
  syncPracticeMenuSummary(AppState);
  const latencyInput = document.getElementById('midi-latency-ms');
  if (latencyInput) {
    latencyInput.disabled = AppState.mode === 'wait';
    if(document.activeElement!==latencyInput)latencyInput.value=String(AppState.trainer.latencyMs);
  }
  const pillEl = document.getElementById('trainer-match-pill');
  const statusEl = document.getElementById('trainer-status');
  const summaryEl = document.getElementById('trainer-summary');
  const expectedNotesEl = document.getElementById('trainer-expected-notes');
  const expectedMetaEl = document.getElementById('trainer-expected-meta');
  const detectedNotesEl = document.getElementById('trainer-detected-notes');

  const practiceTrainer = AppState.mode==='wait' ? (AppState.waitTrainer||AppState.trainer) : AppState.trainer;
  const trainer=AppState.media.editing?{...practiceTrainer,currentEvent:null,noteStates:{},history:[],passHistory:[],liveWrongNotes:[],lastFeedback:null,sessionStarted:false,sessionCompleted:false,results:null,matchState:'idle',status:'Editing sync · Scoring paused',summary:'Close the sync editor to resume graded practice.'}:practiceTrainer;
  const tabStatus=document.getElementById('tab-feedback-status');
  if(tabStatus) {tabStatus.hidden=!AppState.ui.showTabMistakes;tabStatus.textContent=AppState.inputMode==='hex-6ch'?'Fret feedback interprets received MIDI pitches using the selected Hex layout; physical frets are not verified.':AppState.ui.inferPolyMistakes?'Fret numbers are inferred on expected strings, not detected positions.':'Enable non-hex fret inference to show unambiguous estimated frets.';}
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
  setNotationFeedback(AppState.media.editing?[]:marks,{notation:AppState.ui.showNotationFeedback,tabCircles:AppState.ui.showTabCircles,tabFrets:AppState.ui.showTabMistakes});
  renderPracticeFretboard(trainer);
  const playButton=document.getElementById('play-pause-button');
  if(playButton) {
    const running=AppState.countInActive || (AppState.mode==='wait' && !AppState.media.editing ? trainer.active && trainer.phase!=='paused' : AppState.isPlaying);
    playButton.textContent=AppState.media.editing?(running?'⏸ Pause preview':'▶ Preview'):(running?'⏸ Pause':'▶ Play');
    const action=AppState.media.editing?(running?'Pause sync preview':'Preview sync · Grading and loops paused; choose Finish editing to practice'):(running?'Pause practice':'Start or resume practice');
    playButton.setAttribute('aria-label',action);
    playButton.title=action;
  }
  const scoreValue = document.getElementById('toolbar-score-value');
  if (scoreValue) {
    scoreValue.textContent = !AppState.media.editing && trainer.sessionStarted && trainer.results?.accuracy != null ? `${trainer.results.accuracy}%` : '—';
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
    expectedNotesEl.textContent = currentEvent?.isPercussive ? 'Muted strum (X) — any fresh attack' : currentEvent ? formatPitchList(currentEvent.pitches) : '—';
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
  document.getElementById('wait-hex-bend-range')?.addEventListener('change',event=>{
    const value=Number(event.target.value);if(!validPitchRange(value))return;
    AppState.midi.pitchBendRange=value;savePitchRange(value);saveActiveMidiSettings();
    clearActiveMidiNotes();resetRealtimeSession('midi-settings');configureWaitSession();renderMidiUi();renderTrainerUi();
  });
  document.getElementById('midi-input-select')?.addEventListener('change', (event) => {
    setActiveMidiInput(event.target.value);
  });

  for(const mode of document.querySelectorAll('input[name="midi-input-mode"]'))mode.addEventListener('change', (event) => {
    AppState.inputMode = event.target.value;
    saveActiveMidiSettings();
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
    saveActiveMidiSettings();
    clearActiveMidiNotes();
    resetRealtimeSession('input-settings-change');
    configureWaitSession();
    refreshTrainerMatchState(AppState.tickPosition);
    renderMidiUi();
    renderTrainerUi();
  });

  document.getElementById('hex-channel-base-select')?.addEventListener('change', (event) => {
    AppState.midi.hexChannelBase = Number(event.target.value) || 1;
    saveActiveMidiSettings();
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
    saveActiveMidiSettings();
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
  AppState.midi.pitchBendRange=readPitchRange();
  const preferences=readPracticePreferences();
  AppState.mode=preferences.mode;
  Object.assign(AppState.ui,preferences.feedback);
  AppState.waitChord=preferences.waitChord;
  AppState.extraStringTolerance=preferences.extraStringTolerance;
  AppState.heldNoteTolerance=preferences.heldNoteTolerance;
  AppState.filterHexSpikes=preferences.filterHexSpikes;
  AppState.filterScoreRange=preferences.filterScoreRange;
  const displayPreferences=readDisplayPreferences();
  AppState.viewMode=displayPreferences.viewMode;
  Object.assign(AppState.ui,displayPreferences.ui);
  applyAppearance(AppState.ui.appearance);
  loadMidiDebugPreference();
  const toolbar=initToolbar();
  scoreLibrary=initScoreLibrary(loadScoreFile);
  initDemoScores(loadScoreFile);
  audioControls=initAudioControls((kind,value)=>{if(kind==='master')applyMasterVolume();else if(kind==='media')mediaControls?.setVolume(value);else applyTrackMixer();});
  pitchControls=initPitchControls(applyPlaybackPitchOffset);
  mediaControls=initMediaControls({beginMediaPlayback,endMediaPlayback,toggleMediaPlayback,pauseMediaPlayback,updateMediaPosition,seekMediaTime,seekMediaTick,embeddedMedia,applyMediaSyncPoints,setMediaEditing,revealMediaScoreTarget,setSpeed:setPlaybackSpeed},
    {closeMenu:toolbar.closeAllPopups,beforeEdit(){if(waitController.active && waitController.phase!=='paused')waitController.toggle(AppState.tickPosition);pauseWaitTransport();clearActiveMidiNotes();},afterEdit(){clearActiveMidiNotes();configureWaitSession();resetRealtimeSession('sync-editor-closed');renderTrainerUi();},beforeListen(){if(AppState.mode==='wait' && waitController.active && waitController.phase!=='paused')waitController.toggle(AppState.tickPosition);pauseWaitTransport();clearActiveMidiNotes();},afterPractice(){clearActiveMidiNotes();if(AppState.mode==='realtime' && !AppState.media.editing)handlePlaybackState();renderTrainerUi();}});
  initFretboard(document.getElementById('fretboard-content'),document.getElementById('fretboard-help-status'));
  const displayControls=wireScoreStageUi();
  const printControls=initScorePrintControls(printScore);
  fretboardControls=initFretboardControls(()=>renderTrainerUi(),stepFretboard);
  document.getElementById('play-pause-button').addEventListener('click',()=>{fretboardBrowseTick=null;renderTrainerUi();});
  initWorkspacePanels();
  document.getElementById('fretboard-close').addEventListener('click',()=>{const toggle=document.getElementById('show-fretboard');toggle.checked=false;toggle.dispatchEvent(new Event('change'));document.getElementById('btn-more').focus();});
  wireFilePicker();
  wireTransportButtons();
  wirePracticeControls();
  wireTempoAndLoopControls();
  wireMidiControls();
  initMidiCaptureControls(()=>renderTrainerUi());

  const lessonImport=initLessonImport({loadFile:loadScoreFile,mediaControls,state:AppState});
  try {
    await initAlphaTab(document.getElementById('alphatab-container'), {
      onScoreLoaded: () => {
        printControls.loading(false);
        displayControls.sync();
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
        if(AppState.media.returning || AppState.media.editing)return;
        if(position.isSeek && AppState.mode!=='wait')transportControls?.clearPulse();
        if(AppState.mode==='wait')waitController.positionChanged(position);
        else handlePlaybackPosition(position);
        renderTrainerUi();
      },
      onPlayerFinished: () => {
        transportControls?.clearPulse();
        if(!AppState.media.editing && AppState.isPlaying && AppState.mode==='realtime')finishRealtimeSession();
        renderTrainerUi();
      },
      onPlayerStateChanged: () => {
        if(!AppState.media.returning && !AppState.media.editing && AppState.mode==='realtime')handlePlaybackState();
        renderTrainerUi();
      },
      onScoreDisplayChanged: () => displayControls.sync(),
      onPlayerReady: () => {printControls.sync();audioControls?.sync();pitchControls?.sync({enabled:true,value:AppState.pitchOffsetSemitones});renderTrainerUi();},
      onScoreLoading: () => {printControls.loading(true);lessonImport.scoreLoading();mediaControls?.scoreLoading();scoreLibrary?.sync();audioControls?.sync();pitchControls?.sync({enabled:false,value:AppState.pitchOffsetSemitones});},
      onScoreLoadError: () => {printControls.loading(true);scoreLibrary?.sync();},
      onMetronomeTick: () => transportControls?.pulse(),
      onMetronomeError: () => renderTrainerUi(),
      onCountInChanged: () => renderTrainerUi(),
      onLoopSelection: selection => {if(!AppState.media.preview)transportControls?.selectLoopByDrag(selection);},
      onMediaChanged: () => {mediaControls?.mediaChanged();if(!AppState.media.editing)resetRealtimeSession('media-source-or-alignment');renderTrainerUi();},
      onMediaScoreTarget: target => mediaControls?.scoreTargetSelected(target),
    });
  } catch (error) {
    console.error('Failed to bootstrap Guitar Trainer Studio.', error);
  }

  let previousMidiInputId = AppState.midi.activeInputId;
  await initMidiRouter({
    onMidiEvent: (event) => {
      if(AppState.media.returning || AppState.media.editing){scheduleMidiUi();return null;}
      const revision=waitUiRevision;
      let outcome;
      if(AppState.mode==='wait')outcome=waitController.noteOn(event);
      else {
        outcome=handleMidiEvent(event);
      }
      const heldDisplayChanged=fretboardHeldNotes.remember(event,outcome,AppState.midi.activeNotes,{
        events:AppState.expectedEvents,noteStates:(AppState.mode==='wait'?AppState.waitTrainer:AppState.trainer)?.noteStates,
      });
      scheduleMidiUi();
      // Continuous bend/controller traffic does not need a full score/UI repaint.
      if((event.type==='note-on' || event.type==='note-off' || outcome) &&
          (AppState.mode!=='wait' || revision===waitUiRevision))renderTrainerUi();
      else if(heldDisplayChanged && AppState.mode==='wait')renderPracticeFretboard(AppState.waitTrainer);
      return outcome;
    },
    onStateChange: (_,reason) => {
      if(reason==='message'){scheduleMidiUi();return;}
      if (previousMidiInputId !== AppState.midi.activeInputId) {
        previousMidiInputId = AppState.midi.activeInputId;
        suppressWaitPaint=true;
        try{resetRealtimeSession('midi-device-change');configureWaitSession();}
        finally{suppressWaitPaint=false;}
      }
      else if(reason==='inventory'){renderMidiUi();return;}
      refreshTrainerMatchState(AppState.tickPosition);
      renderMidiUi();
      renderTrainerUi();
    },
  });

  setInterval(() => {
    if(AppState.media.returning || AppState.media.editing)return;
    if(AppState.mode==='wait') {waitController.advance();return;}
    if (!AppState.isPlaying || AppState.mode!=='realtime') return;
    advanceRealtimeClock();
    renderTrainerUi();
  }, 50);

  renderMidiUi();
  renderTrainerUi();
}

window.addEventListener('load', bootstrap);
