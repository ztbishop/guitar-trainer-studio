// alphatab-host.js
// Owns: all alphaTab integration (loading, rendering, playback, events)
// Do NOT: put trainer logic here

import { AppState } from './app-state.js';
import { buildPlaybackTimeline } from './score-playback.js';

const VISUAL_MODES = {
  // Keep alphaTab's playback note-targeting logic available for later trainer feedback work,
  // but disable playback note tinting so the green cursor remains the only position indicator.
  playbackHighlight: false,
};

let alphaTabApi = null;
let ui = null;
let hostCallbacks = {
  onScoreLoaded: null,
  onPlaybackTimelineChanged: null,
  onPlayerFinished: null,
  onPlayerPositionChanged: null,
  onPlayerReady: null,
  onPlayerStateChanged: null,
};

function getAssetUrl(relativePath) {
  return new URL(relativePath, window.location.href).href;
}

function setStatus(message) {
  AppState.ui.playerStatus = message || '';
  if (ui?.playerStatusEl) {
    ui.playerStatusEl.textContent = AppState.ui.playerStatus;
  }
}

function setPlaybackPosition(currentTime) {
  if (ui?.playbackPositionEl) {
    const ms = Number.isFinite(currentTime) ? Math.round(currentTime) : 0;
    ui.playbackPositionEl.textContent = `${ms.toLocaleString()} ms`;
  }
}

function setLoadedFileName(name) {
  AppState.ui.loadedFileName = name || 'None';
  if (ui?.loadedFileNameEl) {
    ui.loadedFileNameEl.textContent = AppState.ui.loadedFileName;
  }
}

function setScoreTitle(title) {
  const nextTitle = title || 'Untitled score';
  if (ui?.scoreTitleEl) {
    ui.scoreTitleEl.textContent = nextTitle;
  }
}

function setToolbarScoreValue(value = '—') {
  if (!ui?.toolbarScoreValueEl) return;
  const nextValue = String(value || '—');
  ui.toolbarScoreValueEl.textContent = nextValue;
  ui.toolbarScoreValueEl.title = 'Scoring is not implemented yet';
}

function setScoreLoadedUiState(hasScore) {
  document.body.classList.toggle('has-score', Boolean(hasScore));
  if (ui?.scoreEmptyStateEl) {
    ui.scoreEmptyStateEl.classList.toggle('hidden', Boolean(hasScore));
  }
  if (ui?.toolbarScoreValueEl) {
    setToolbarScoreValue('—');
  }
}

function setTransportEnabled(enabled) {
  if (ui?.playPauseButtonEl) ui.playPauseButtonEl.disabled = !enabled;
  if (ui?.stopButtonEl) ui.stopButtonEl.disabled = !enabled;
}

function updatePracticeControlsEnabled(enabled) {
  if (ui?.practiceTrackSelectEl) ui.practiceTrackSelectEl.disabled = !enabled;
  if (ui?.playSelectedTrackToggleEl) ui.playSelectedTrackToggleEl.disabled = !enabled;
  if (ui?.playOtherTracksToggleEl) ui.playOtherTracksToggleEl.disabled = !enabled;
  if (ui?.viewModeSelectEl) ui.viewModeSelectEl.disabled = !enabled;
}

function updatePlayPauseLabel() {
  if (!ui?.playPauseButtonEl) return;
  ui.playPauseButtonEl.textContent = AppState.isPlaying ? '⏸ Pause' : '▶ Play';
  ui.playPauseButtonEl.setAttribute('aria-label', AppState.isPlaying ? 'Pause playback' : 'Play score');
  ui.playPauseButtonEl.title = AppState.isPlaying ? 'Pause playback' : 'Play score';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTrackId(track, index) {
  return String(track?.index ?? index);
}

function getTrackById(trackId) {
  return AppState.tracks.find((track, index) => getTrackId(track, index) === String(trackId)) || null;
}

function normalizeLabel(value) {
  return String(value ?? '').trim();
}

function isGenericTrackName(name, index) {
  const normalized = normalizeLabel(name).toLowerCase();
  if (!normalized) return true;
  return normalized === `track ${index + 1}` || normalized === `track${index + 1}`;
}

function getTrackInstrumentName(track) {
  return normalizeLabel(
    track?.playbackInfo?.programName
    || track?.playbackInfo?.instrument
    || track?.playbackInfo?.name
  );
}

function getTrackDisplayName(track, index) {
  const trackName = normalizeLabel(track?.name);
  const instrumentName = getTrackInstrumentName(track);

  if (trackName && instrumentName && !isGenericTrackName(trackName, index) && trackName.toLowerCase() !== instrumentName.toLowerCase()) {
    return `${trackName} — ${instrumentName}`;
  }

  if (trackName && !isGenericTrackName(trackName, index)) {
    return trackName;
  }

  if (instrumentName) {
    return instrumentName;
  }

  return `Track ${index + 1}`;
}

function buildTrackMeta(track) {
  const details = [];
  const shortName = normalizeLabel(track?.shortName);
  const instrumentName = getTrackInstrumentName(track);
  const trackName = normalizeLabel(track?.name);

  if (shortName && shortName.toLowerCase() !== trackName.toLowerCase() && shortName.toLowerCase() !== instrumentName.toLowerCase()) details.push(shortName);
  if (instrumentName && instrumentName.toLowerCase() !== trackName.toLowerCase()) details.push(instrumentName);
  if (track?.staves?.length) details.push(`${track.staves.length} staff${track.staves.length === 1 ? '' : 's'}`);
  return details.join(' • ') || 'Track loaded';
}

function syncPracticeTrackSelect() {
  if (!ui?.practiceTrackSelectEl) return;
  ui.practiceTrackSelectEl.innerHTML = '';

  if (!AppState.tracks.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Load a score first';
    ui.practiceTrackSelectEl.appendChild(option);
    ui.practiceTrackSelectEl.disabled = true;
    return;
  }

  AppState.tracks.forEach((track, index) => {
    const option = document.createElement('option');
    option.value = getTrackId(track, index);
    option.textContent = `${index + 1}. ${getTrackDisplayName(track, index)}`;
    ui.practiceTrackSelectEl.appendChild(option);
  });

  ui.practiceTrackSelectEl.value = String(AppState.practiceTrackId ?? '');
  ui.practiceTrackSelectEl.disabled = false;
}

function syncViewModeSelect() {
  if (!ui?.viewModeSelectEl) return;
  ui.viewModeSelectEl.value = AppState.viewMode || 'practice-only';
}

function renderTrackList() {
  if (!ui?.trackListEl) return;
  ui.trackListEl.innerHTML = '';

  if (!AppState.tracks.length) {
    const item = document.createElement('li');
    item.className = 'track-placeholder';
    item.textContent = 'No tracks found in this file.';
    ui.trackListEl.appendChild(item);
    return;
  }

  AppState.tracks.forEach((track, index) => {
    const item = document.createElement('li');
    const trackId = getTrackId(track, index);
    const isPractice = String(AppState.practiceTrackId) === trackId;
    item.className = `track-item${isPractice ? ' is-practice' : ''}`;

    let playState = 'Muted';
    if (isPractice) {
      playState = AppState.playSelectedTrack ? 'Selected track playback enabled' : 'Selected track muted';
    } else if (AppState.playOtherTracks) {
      playState = 'Backing track playback enabled';
    }

    const visibility = AppState.viewMode === 'all-tracks'
      ? 'Visible in all-tracks view'
      : (isPractice ? 'Visible now' : 'Hidden in practice-only view');

    item.innerHTML = `
      <div class="track-name">${index + 1}. ${escapeHtml(getTrackDisplayName(track, index))}</div>
      <div class="track-meta">${escapeHtml(buildTrackMeta(track))}</div>
      <div class="track-meta">${escapeHtml(visibility)}</div>
      <div class="track-meta">${escapeHtml(playState)}</div>
    `;
    ui.trackListEl.appendChild(item);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function renderMissingLibraryMessage() {
  if (!ui?.trackListEl) return;
  ui.trackListEl.innerHTML = '';
  const item = document.createElement('li');
  item.className = 'track-placeholder';
  item.innerHTML = 'alphaTab is not loaded. Put the alphaTab browser files under <code>assets/vendor/alphatab/</code> and make sure the file is named <code>alphaTab.js</code>.';
  ui.trackListEl.appendChild(item);
}

function detectAlphaTabGlobal() {
  const alphaTabGlobal = window.alphaTab;
  if (!alphaTabGlobal || !alphaTabGlobal.AlphaTabApi) return null;
  return alphaTabGlobal;
}

function setDefaultTrackState() {
  if (!AppState.tracks.length) {
    AppState.practiceTrackId = null;
    AppState.playbackTrackIds = [];
    return;
  }

  AppState.practiceTrackId = getTrackId(AppState.tracks[0], 0);
  AppState.playbackTrackIds = AppState.tracks.slice(1).map((track, index) => getTrackId(track, index + 1));
  AppState.viewMode = 'practice-only';
}

function getRenderedTracks() {
  if (AppState.viewMode === 'all-tracks') {
    return AppState.tracks.slice();
  }
  const practiceTrack = getTrackById(AppState.practiceTrackId);
  return practiceTrack ? [practiceTrack] : [];
}

function applyTrackRenderState() {
  if (!alphaTabApi || !AppState.tracks.length) return false;
  const renderedTracks = getRenderedTracks();
  if (!renderedTracks.length) return false;
  alphaTabApi.renderTracks(renderedTracks);
  return true;
}

function applyTrackPlaybackStateInternal() {
  if (!alphaTabApi || !AppState.tracks.length) return false;

  // First unmute everything to clear prior state.
  AppState.tracks.forEach((track) => {
    alphaTabApi.changeTrackMute([track], false);
  });

  AppState.tracks.forEach((track, index) => {
    const trackId = getTrackId(track, index);
    const isPractice = String(AppState.practiceTrackId) === trackId;
    const shouldPlay = isPractice ? AppState.playSelectedTrack : AppState.playOtherTracks;
    alphaTabApi.changeTrackMute([track], !shouldPlay);
  });

  renderTrackList();
  return true;
}

function applyTrackState() {
  const renderApplied = applyTrackRenderState();
  const playbackApplied = applyTrackPlaybackStateInternal();
  syncPracticeTrackSelect();
  syncViewModeSelect();
  renderTrackList();
  return renderApplied || playbackApplied;
}

export async function initAlphaTab(containerEl, callbacks = {}) {
  if (!containerEl) throw new Error('alphaTab container was not found.');

  hostCallbacks = {
    onScoreLoaded: callbacks.onScoreLoaded || null,
    onPlaybackTimelineChanged: callbacks.onPlaybackTimelineChanged || null,
    onPlayerFinished: callbacks.onPlayerFinished || null,
    onPlayerPositionChanged: callbacks.onPlayerPositionChanged || null,
    onPlayerReady: callbacks.onPlayerReady || null,
    onPlayerStateChanged: callbacks.onPlayerStateChanged || null,
  };

  ui = {
    loadedFileNameEl: document.getElementById('loaded-file-name'),
    playerStatusEl: document.getElementById('player-status'),
    playbackPositionEl: document.getElementById('playback-position'),
    scoreTitleEl: document.getElementById('score-title'),
    trackListEl: document.getElementById('track-list'),
    playPauseButtonEl: document.getElementById('play-pause-button'),
    stopButtonEl: document.getElementById('stop-button'),
    practiceTrackSelectEl: document.getElementById('practice-track-select'),
    playSelectedTrackToggleEl: document.getElementById('play-selected-track-toggle'),
    playOtherTracksToggleEl: document.getElementById('play-other-tracks-toggle'),
    viewModeSelectEl: document.getElementById('view-mode-select'),
    scoreEmptyStateEl: document.getElementById('score-empty-state'),
    toolbarScoreValueEl: document.getElementById('toolbar-score-value'),
  };

  setScoreLoadedUiState(false);
  setScoreTitle('No score loaded');
  setToolbarScoreValue('—');
  setLoadedFileName('None');
  setStatus('Checking alphaTab assets…');
  setTransportEnabled(false);
  updatePracticeControlsEnabled(false);
  updatePlayPauseLabel();
  renderTrackList();
  syncPracticeTrackSelect();
  syncViewModeSelect();

  const alphaTabGlobal = detectAlphaTabGlobal();
  if (!alphaTabGlobal) {
    setStatus('alphaTab library not found. Check assets/vendor/alphatab/alphaTab.js');
    renderMissingLibraryMessage();
    return null;
  }

  const wrapperEl = document.getElementById('alphatab-wrapper');

  if (wrapperEl) {
    wrapperEl.tabIndex = 0;
    wrapperEl.style.touchAction = 'pan-x pan-y';
    if (!wrapperEl.dataset.scrollWheelBound) {
      wrapperEl.addEventListener('wheel', (event) => {
        const canScrollVertically = wrapperEl.scrollHeight > wrapperEl.clientHeight;
        const canScrollHorizontally = wrapperEl.scrollWidth > wrapperEl.clientWidth;
        if (!canScrollVertically && !canScrollHorizontally) return;

        const absDeltaX = Math.abs(event.deltaX);
        const absDeltaY = Math.abs(event.deltaY);
        const preferHorizontal = event.shiftKey || absDeltaX > absDeltaY;

        if (preferHorizontal && canScrollHorizontally) {
          wrapperEl.scrollLeft += event.deltaX || event.deltaY;
          event.preventDefault();
          return;
        }

        if (canScrollVertically) {
          wrapperEl.scrollTop += event.deltaY;
          event.preventDefault();
        }
      }, { passive: false });
      wrapperEl.dataset.scrollWheelBound = '1';
    }
  }

  alphaTabApi = new alphaTabGlobal.AlphaTabApi(containerEl, {
    core: {
      scriptFile: getAssetUrl('./assets/vendor/alphatab/alphaTab.js'),
    },
    display: {
      layoutMode: alphaTabGlobal.LayoutMode?.Page,
      systemsLayoutMode: alphaTabGlobal.SystemsLayoutMode?.Automatic,
    },
    player: {
      enablePlayer: true,
      enableCursor: true,
      enableAnimatedBeatCursor: false,
      enableElementHighlighting: VISUAL_MODES.playbackHighlight,
      soundFont: getAssetUrl('./assets/vendor/alphatab/soundfont/sonivox.sf2'),
      scrollElement: wrapperEl,
      scrollMode: alphaTabGlobal.ScrollMode?.Continuous,
    },
  });

  alphaTabApi.scoreLoaded.on((score) => {
    const loadedScore = score || alphaTabApi.score || null;
    AppState.playbackTimeline = null;
    AppState.score = loadedScore;
    AppState.tracks = loadedScore?.tracks ?? [];
    AppState.alphaTabReady = true;
    AppState.playerReady = false;
    AppState.isPlaying = false;
    AppState.tickPosition = 0;
    AppState.timePositionMs = 0;

    setDefaultTrackState();
    syncPracticeTrackSelect();
    syncViewModeSelect();
    renderTrackList();

    setScoreLoadedUiState(Boolean(loadedScore));
    setScoreTitle(loadedScore?.title || loadedScore?.music || 'Untitled score');
    setStatus('Score loaded. Waiting for player.');
    setPlaybackPosition(0);
    updatePlayPauseLabel();
    if (wrapperEl) {
      requestAnimationFrame(() => {
        wrapperEl.scrollTop = 0;
        wrapperEl.scrollLeft = 0;
      });
    }
    hostCallbacks.onScoreLoaded?.(loadedScore);
  });

  alphaTabApi.midiLoaded.on(() => {
    AppState.playbackTimeline = buildPlaybackTimeline(alphaTabApi.tickCache, {
      tempo: AppState.score?.tempo || 120,
      ticksPerQuarter: new alphaTabGlobal.midi.MidiFile().division,
    });
    hostCallbacks.onPlaybackTimelineChanged?.(AppState.playbackTimeline);
  });

  alphaTabApi.playerReady.on(() => {
    AppState.playerReady = true;
    alphaTabApi.playbackSpeed=AppState.playbackSpeed;
    setTransportEnabled(true);
    updatePracticeControlsEnabled(AppState.tracks.length > 0);
    applyTrackState();
    setStatus('Player ready');
    hostCallbacks.onPlayerReady?.();
  });

  alphaTabApi.playerFinished.on(() => hostCallbacks.onPlayerFinished?.());

  alphaTabApi.playerStateChanged.on((event) => {
    const state = event?.state ?? event;
    const normalizedState = typeof state === 'number' ? state : String(state).toLowerCase();
    AppState.isPlaying = normalizedState === 1 || normalizedState === 'playing';
    updatePlayPauseLabel();
    setStatus(AppState.isPlaying ? 'Playing' : 'Paused');
    hostCallbacks.onPlayerStateChanged?.(state);
  });

  alphaTabApi.playerPositionChanged.on((event) => {
    const currentTime = event?.currentTime ?? 0;
    AppState.timePositionMs = currentTime;
    AppState.tickPosition = event?.currentTick ?? 0;
    AppState.playbackSpeed = alphaTabApi.playbackSpeed || 1;
    setPlaybackPosition(currentTime);
    hostCallbacks.onPlayerPositionChanged?.({
      currentTime,
      currentTick: AppState.tickPosition,
      at: performance.now(),
      speed: AppState.playbackSpeed,
      isSeek: Boolean(event?.isSeek),
    });
  });

  alphaTabApi.error.on((error) => {
    console.error('alphaTab error:', error);
    setStatus(error?.message || 'alphaTab error');
  });

  setStatus('Choose a local score file to begin');
  return alphaTabApi;
}

export async function loadScoreFile(file) {
  if (!alphaTabApi) throw new Error('alphaTab is not ready yet. Fix the alphaTab asset path first.');
  if (!file) return false;
  releaseWaitTransport();
  alphaTabApi.pause();
  AppState.practiceLoop={enabled:false,startIndex:0,endIndex:0,range:null};
  alphaTabApi.isLooping=false;
  alphaTabApi.playbackRange=null;

  // Invalidate the previous score's targets before asynchronous loading starts.
  AppState.playbackTimeline = null;
  AppState.playerReady = false;
  hostCallbacks.onPlaybackTimelineChanged?.(null);
  setLoadedFileName(file.name);
  setScoreLoadedUiState(false);
  setScoreTitle('Loading…');
  setStatus('Loading score…');
  setTransportEnabled(false);
  updatePracticeControlsEnabled(false);
  setPlaybackPosition(0);

  const buffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  const wrapperEl = document.getElementById('alphatab-wrapper');
  if (wrapperEl) wrapperEl.scrollTop = 0;
  return alphaTabApi.load(bytes);
}

export function setRenderedTracks(trackIds) {
  if (!alphaTabApi || !Array.isArray(trackIds) || !trackIds.length) return false;
  const tracks = trackIds.map((trackId) => getTrackById(trackId)).filter(Boolean);
  if (!tracks.length) return false;
  alphaTabApi.renderTracks(tracks);
  return true;
}

export function applyPlaybackTrackState({ practiceTrackId, playSelectedTrack = AppState.playSelectedTrack, playOtherTracks = AppState.playOtherTracks, viewMode = AppState.viewMode } = {}) {
  if (practiceTrackId != null) {
    AppState.practiceTrackId = String(practiceTrackId);
  }
  AppState.playSelectedTrack = Boolean(playSelectedTrack);
  AppState.playOtherTracks = Boolean(playOtherTracks);
  AppState.viewMode = viewMode === 'all-tracks' ? 'all-tracks' : 'practice-only';
  AppState.playbackTrackIds = AppState.tracks
    .map((track, index) => getTrackId(track, index))
    .filter((trackId) => trackId !== String(AppState.practiceTrackId));

  return applyTrackState();
}

export function updateAlphaTabSettings(nextSettings) {
  if (!alphaTabApi || !nextSettings) return false;
  alphaTabApi.settings.fillFromJson(nextSettings);
  alphaTabApi.updateSettings();
  alphaTabApi.render();
  return true;
}

export function play() {
  if (!alphaTabApi || !AppState.playerReady) return false;
  const range=AppState.practiceLoop.range;
  const tick=alphaTabApi.tickPosition ?? AppState.tickPosition;
  if (!AppState.isPlaying && range && (tick < range.startTick || tick >= range.endTick)) alphaTabApi.tickPosition=range.startTick;
  alphaTabApi.playPause();
  return true;
}

export function setPlaybackSpeed(speed) {
  if (!alphaTabApi || !Number.isFinite(speed) || speed < 0.25 || speed > 2) return false;
  AppState.playbackSpeed=speed;
  alphaTabApi.playbackSpeed=speed;
  return true;
}

export function applyPracticeLoop(range) {
  if (!alphaTabApi) return false;
  if (range && (!Number.isFinite(range.startTick) || !(range.endTick > range.startTick) ||
      range.startTick < 0 || range.endTick > (AppState.playbackTimeline?.endTick ?? 0))) return false;
  alphaTabApi.pause();
  alphaTabApi.isLooping=Boolean(range);
  alphaTabApi.playbackRange=range;
  if(range)alphaTabApi.tickPosition=range.startTick;
  return true;
}

export function pause() {
  if (!alphaTabApi || !AppState.playerReady || !AppState.isPlaying) return false;
  alphaTabApi.playPause();
  AppState.isPlaying = false;
  updatePlayPauseLabel();
  setStatus('Paused');
  return true;
}

export function stop() {
  if (!alphaTabApi) return false;
  alphaTabApi.stop();
  AppState.isPlaying = false;
  updatePlayPauseLabel();
  return true;
}

export function getAlphaTabApi() {
  return alphaTabApi;
}


// Wait Mode keeps native playback paused and seeks directly between targets.
let savedWaitTransport = null;
let waitTransportGeneration = 0;
export function acquireWaitTransport() {
  if (!alphaTabApi) return;
  waitTransportGeneration++;
  if (savedWaitTransport) return;
  savedWaitTransport = {range:alphaTabApi.playbackRange,looping:alphaTabApi.isLooping,countIn:alphaTabApi.countInVolume};
  // This runs from the Play button's user gesture, before MIDI-driven resumes.
  alphaTabApi.player?.output?.activate();
  alphaTabApi.isLooping=false;
  alphaTabApi.countInVolume=0;
}
export function holdWaitAtTick(tick) {
  if(!alphaTabApi)return;
  alphaTabApi.pause();
  alphaTabApi.playbackRange=null;
  alphaTabApi.tickPosition=tick;
}
export function playWaitSegment(startTick,endTick) {
  if(!alphaTabApi || !(endTick>startTick))return;
  alphaTabApi.pause();
  alphaTabApi.playbackRange={startTick,endTick};
  alphaTabApi.tickPosition=startTick;
  alphaTabApi.play();
}
export function pauseWaitTransport() {alphaTabApi?.pause();}
export function resumeWaitTransport() {alphaTabApi?.play();}
export function releaseWaitTransport() {
  if(!alphaTabApi || !savedWaitTransport)return;
  waitTransportGeneration++;
  alphaTabApi.pause();
  alphaTabApi.playbackRange=savedWaitTransport.range;
  alphaTabApi.isLooping=savedWaitTransport.looping;
  alphaTabApi.countInVolume=savedWaitTransport.countIn;
  savedWaitTransport=null;
}
export function finishWaitTransport(tick) {
  // Defer the final seek and cancel it if the session changes in this stack.
  const generation=waitTransportGeneration;
  queueMicrotask(() => {
    if(alphaTabApi && savedWaitTransport && generation===waitTransportGeneration)holdWaitAtTick(tick);
  });
  // Restore pre-Wait looping/count-in/range only on Stop or mode exit.
}
