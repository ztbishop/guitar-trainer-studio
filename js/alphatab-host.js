// alphatab-host.js
// Owns: all alphaTab integration (loading, rendering, playback, events)
// Do NOT: put trainer logic here

import { AppState } from './app-state.js';

const VISUAL_MODES = {
  // Keep alphaTab's playback note-targeting logic available for later trainer feedback work,
  // but disable playback note tinting so the green cursor remains the only position indicator.
  playbackHighlight: false,
};

let alphaTabApi = null;
let ui = null;
let hostCallbacks = {
  onScoreLoaded: null,
  onPlayerPositionChanged: null,
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
  if (ui?.scoreTitleEl) {
    ui.scoreTitleEl.textContent = title || 'Untitled score';
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
  ui.playPauseButtonEl.textContent = AppState.isPlaying ? 'Pause' : 'Play';
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
    onPlayerPositionChanged: callbacks.onPlayerPositionChanged || null,
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
  };

  setScoreTitle('No score loaded');
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

  alphaTabApi = new alphaTabGlobal.AlphaTabApi(containerEl, {
    core: {
      scriptFile: getAssetUrl('./assets/vendor/alphatab/alphaTab.js'),
    },
    player: {
      enablePlayer: true,
      enableCursor: true,
      enableAnimatedBeatCursor: false,
      enableElementHighlighting: VISUAL_MODES.playbackHighlight,
      soundFont: getAssetUrl('./assets/vendor/alphatab/soundfont/sonivox.sf2'),
      scrollElement: wrapperEl,
    },
  });

  alphaTabApi.scoreLoaded.on((score) => {
    const loadedScore = score || alphaTabApi.score || null;
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

    setScoreTitle(loadedScore?.title || loadedScore?.music || 'Untitled score');
    setStatus('Score loaded. Waiting for player.');
    setPlaybackPosition(0);
    updatePlayPauseLabel();
    hostCallbacks.onScoreLoaded?.(loadedScore);
  });

  alphaTabApi.playerReady.on(() => {
    AppState.playerReady = true;
    setTransportEnabled(true);
    updatePracticeControlsEnabled(AppState.tracks.length > 0);
    applyTrackState();
    setStatus('Player ready');
  });

  alphaTabApi.playerStateChanged.on((event) => {
    const state = event?.state ?? event;
    AppState.isPlaying = String(state).toLowerCase().includes('playing');
    updatePlayPauseLabel();
    setStatus(AppState.isPlaying ? 'Playing' : 'Paused');
    hostCallbacks.onPlayerStateChanged?.(state);
  });

  alphaTabApi.playerPositionChanged.on((event) => {
    const currentTime = event?.currentTime ?? 0;
    AppState.timePositionMs = currentTime;
    AppState.tickPosition = event?.currentTick ?? 0;
    setPlaybackPosition(currentTime);
    hostCallbacks.onPlayerPositionChanged?.({
      currentTime,
      currentTick: AppState.tickPosition,
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

  setLoadedFileName(file.name);
  setScoreTitle('Loading…');
  setStatus('Loading score…');
  setTransportEnabled(false);
  updatePracticeControlsEnabled(false);
  setPlaybackPosition(0);

  const buffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
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
  alphaTabApi.updateSettings(nextSettings);
  return true;
}

export function play() {
  if (!alphaTabApi) return false;
  alphaTabApi.playPause();
  return true;
}

export function pause() {
  if (!alphaTabApi || !AppState.isPlaying) return false;
  alphaTabApi.playPause();
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


export function syncCursorToTick() {
  // placeholder to satisfy import; real sync handled elsewhere
}
