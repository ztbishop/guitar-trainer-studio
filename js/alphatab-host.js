// alphatab-host.js
// Owns: all alphaTab integration (loading, rendering, playback, events)
// Do NOT: put trainer logic here

import { AppState } from './app-state.js';
import { buildPlaybackTimeline, tickToTimeMs } from './score-playback.js';
import { audibleDelayMs, createMetronomeClock } from './metronome-clock.js';
import { wrongFretGeometry } from './tab-feedback.js';
import { notationFeedbackGeometry, accidentalPath } from './notation-feedback.js';
import {outsideLoopBounds,wholeMeasureSelection} from './loop-visuals.js';
import {countInTiming,scheduleCountIn} from './count-in.js';
import {playbackGroups} from './audio-controls.js';
import {validatePoints,tickAtMediaTime,mediaTimeAtTick} from './media-sync.js';
import {effectiveChordDiagramPlacement} from './display-preferences.js';

let mediaSnapshot=null,mediaHandler=null,mediaPoints=[],mediaRestoreTick=null;
let mediaRevealTick=null,mediaRevealGeneration=0;
let editingCountIn=null;
export function revealMediaScoreTarget(point) {
  if(!AppState.media.editing || !notationContainer)return false;
  const bounds=alphaTabApi?.boundsLookup?.findMasterBarByIndex(point.barIndex)?.visualBounds;
  const wrapper=document.getElementById('alphatab-wrapper');
  if(!bounds || !wrapper)return false;
  const area=wrapper.getBoundingClientRect(),origin=notationContainer.getBoundingClientRect();
  const x=origin.left+bounds.x+bounds.w*Math.min(1,Math.max(0,point.barPosition || 0));
  const y=origin.top+bounds.y;
  const top=y<area.top?y-area.top-12:y+bounds.h>area.bottom?Math.min(y-area.top-12,y+bounds.h-area.bottom+12):0;
  const left=x<area.left?x-area.left-12:x>area.right?x-area.right+12:0;
  if(top || left)wrapper.scrollBy({top,left,behavior:'instant'});
  return true;
}
export function setMediaEditing(enabled) {
  enabled=Boolean(enabled);
  if(AppState.media.editing===enabled)return;
  cancelCountIn();alphaTabApi?.pause();mediaHandler?.pause();
  AppState.isPlaying=false;AppState.media.editing=enabled;
  if(alphaTabApi) {
    if(enabled){releaseWaitTransport();editingCountIn=alphaTabApi.countInVolume;alphaTabApi.countInVolume=0;alphaTabApi.isLooping=false;alphaTabApi.playbackRange=null;}
    else {if(editingCountIn!==null)alphaTabApi.countInVolume=editingCountIn;editingCountIn=null;applyPracticeLoop(AppState.practiceLoop.range);}
    applyMasterVolume();drawLoopShading();updatePlayPauseLabel();
  }
  hostCallbacks.onMediaChanged?.();
}

function revealMediaCursor() {
  const token=++mediaRevealGeneration;
  // Native cursor bounds update after the seek notification reaches the UI.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(token!==mediaRevealGeneration || !AppState.media.preview || AppState.media.returning)return;
    if(AppState.ui.autoScroll){alphaTabApi.scrollToCursor();return;}
    // ScrollMode.Off has no native scroll handler. Reveal only inside the score
    // viewport, without toggling the preference or scrolling the whole page.
    const wrapper=document.getElementById('alphatab-wrapper'),cursor=wrapper?.querySelector('.at-cursor-beat');
    if(!cursor)return;
    const area=wrapper.getBoundingClientRect(),position=cursor.getBoundingClientRect();
    if(!position.height)return;
    const top=position.top<area.top?position.top-area.top-12:position.bottom>area.bottom?position.bottom-area.bottom+12:0;
    const left=position.left<area.left?position.left-area.left-12:position.right>area.right?position.right-area.right+12:0;
    if(top || left)wrapper.scrollBy({top,left,behavior:'instant'});
  }));
}

// Upstream 1.8.4's worker getter returns itself rather than its cached field.
// Guard the exact defect; later fixed bundles retain their own implementation.
export function installAlphaTabCompatibility(at) {
  const prototype=at?.synth?.AlphaSynthWebWorkerApi?.prototype;
  const property=prototype && Object.getOwnPropertyDescriptor(prototype,'loadedMidiInfo');
  if(property?.get && /return this\.loadedMidiInfo\s*;/.test(String(property.get))) {
    Object.defineProperty(prototype,'loadedMidiInfo',{...property,get(){return this._loadedMidiInfo;}});
    return true;
  }
  return false;
}

// Select external playback while retaining the original score timeline and
// source data. Grading consumes a separate recording-time projection.
export function beginMediaPlayback(handler,points) {
  if(!alphaTabApi || !AppState.score || !AppState.playerReady || AppState.media.returning)return false;
  const validated=validatePoints(points,AppState.playbackTimeline,handler.backingTrackDuration);
  if(validated.length<2)throw new Error('Add a start and end sync point first.');
  handler.playbackRate=AppState.playbackSpeed;
  if(AppState.media.preview) {mediaHandler=handler;mediaPoints=validated;alphaTabApi.player.output.handler=handler;applyMediaSyncPoints(validated);return true;}
  const pausedWait=savedWaitTransport;
  cancelCountIn();releaseWaitTransport();alphaTabApi.pause();
  waitMetronome?.stop();waitMetronome=null;nativeClickBuffer=null;
  mediaSnapshot={tick:AppState.tickPosition,points:AppState.score.exportFlatSyncPoints(),wait:pausedWait};
  mediaHandler=handler;mediaPoints=validated;
  AppState.media.preview=true;
  AppState.media.points=validated;
  AppState.media.clock={timeMs:handler.currentTime || 0,at:performance.now(),playing:false};
  AppState.playerReady=false;
  AppState.score.applyFlatSyncPoints(validated);
  alphaTabApi.settings.player.playerMode=window.alphaTab.PlayerMode.EnabledExternalMedia;
  alphaTabApi.updateSettings();
  // The wrapper exposes the new output immediately; playerReady may fire later.
  alphaTabApi.player.output.handler=handler;
  alphaTabApi.playbackSpeed=AppState.playbackSpeed;
  applyMasterVolume();
  hostCallbacks.onMediaChanged?.();
  return true;
}
export function applyMediaSyncPoints(points,{preservePlayback=false}={}) {
  if(!AppState.media.preview)return;
  const resume=preservePlayback && AppState.isPlaying;
  if(!preservePlayback)alphaTabApi.pause();
  mediaPoints=validatePoints(points,AppState.playbackTimeline,mediaHandler.backingTrackDuration);
  AppState.media.points=mediaPoints;
  AppState.score.applyFlatSyncPoints(mediaPoints);alphaTabApi.updateSyncPoints();
  if(resume){applyMasterVolume();alphaTabApi.play();}
  hostCallbacks.onMediaChanged?.();
}
export function endMediaPlayback() {
  if(!AppState.media.preview || AppState.media.returning)return;
  mediaRevealTick=null;mediaRevealGeneration++;alphaTabApi.pause();mediaHandler?.pause();
  AppState.media.returning=true;AppState.playerReady=false;
  AppState.score.applyFlatSyncPoints(mediaSnapshot.points);
  alphaTabApi.settings.player.playerMode=window.alphaTab.PlayerMode.EnabledSynthesizer;
  alphaTabApi.updateSettings();
}
export function toggleMediaPlayback() {
  if(!AppState.media.preview || AppState.media.returning || !AppState.playerReady)return false;
  if(AppState.mode==='wait' && !AppState.media.editing)return false;
  applyMasterVolume();
  alphaTabApi.playPause();return true;
}
export function pauseMediaPlayback() {if(AppState.media.preview || AppState.media.editing)alphaTabApi?.pause();}
export function updateMediaPosition(timeMs,playing=mediaHandler?.playing ?? AppState.isPlaying) {
  if(AppState.media.preview && !AppState.media.returning && Number.isFinite(timeMs)) {
    AppState.media.clock={timeMs,at:performance.now(),playing:Boolean(playing)};
    // Paused exploration must never drive native completion or grading.
    if(playing && (AppState.mode!=='wait' || AppState.media.editing)) {
      // Editing may audition an outro beyond the mapped score end. Keep the
      // native cursor inside the score (with a margin for native tick rounding)
      // so it cannot stop the recording.
      const cursorTime=AppState.media.editing?Math.min(timeMs,mediaTimeAtTick(mediaPoints,AppState.playbackTimeline,Math.max(0,AppState.playbackTimeline.endTick-4))):timeMs;
      alphaTabApi.player.output.updatePosition(cursorTime);
    }
  }
}
export function seekMediaTime(timeMs) {
  if(!AppState.media.preview || AppState.media.returning || !Number.isFinite(timeMs))return false;
  const resume=Boolean(AppState.media.editing && AppState.isPlaying);
  if(!resume)alphaTabApi.pause();
  const time=Math.max(0,Math.min(mediaHandler.backingTrackDuration,timeMs));
  AppState.media.clock={timeMs:time,at:performance.now(),playing:resume};
  mediaRevealTick=tickAtMediaTime(mediaPoints,AppState.playbackTimeline,time);
  if(AppState.media.editing)mediaRevealTick=Math.min(mediaRevealTick,Math.max(0,AppState.playbackTimeline.endTick-4));
  alphaTabApi.tickPosition=mediaRevealTick;
  // The native tick setter also seeks the provider. The requested recording
  // time takes precedence, including intros/outros beyond mapped endpoints.
  mediaHandler.seekTo(time);
  // Also reveal on a repeated seek to the same beat, which may emit no event.
  revealMediaCursor();
  if(resume){applyMasterVolume();alphaTabApi.play();}
  return true;
}
export function seekMediaTick(tick) {if(AppState.media.preview && !AppState.media.returning)alphaTabApi.tickPosition=tick;}
export function embeddedMedia() {
  const bytes=AppState.score?.backingTrack?.rawAudioFile;
  return bytes?.length?{bytes,points:AppState.score.exportFlatSyncPoints()}:null;
}

let pendingScoreFile=null,scoreLoadGeneration=0;
let scoreChordDiagramDefaults=null;

function copyTrackChordDiagramSettings(value) {
  return value instanceof Map ? new Map(value) : value;
}

function sameTrackChordDiagramSettings(left,right) {
  if(left===right)return true;
  if(!(left instanceof Map) || !(right instanceof Map) || left.size!==right.size)return false;
  for(const [key,value] of left)if(!right.has(key) || right.get(key)!==value)return false;
  return true;
}

function rememberScoreChordDiagramDefaults(score) {
  const stylesheet=score?.stylesheet;
  scoreChordDiagramDefaults=stylesheet ? {
    onTop:stylesheet.globalDisplayChordDiagramsOnTop,
    inScore:stylesheet.globalDisplayChordDiagramsInScore,
    perTrack:copyTrackChordDiagramSettings(stylesheet.perTrackChordDiagramsOnTop),
  } : null;
}

function hasChordDiagramData(score) {
  // GP name-only chords may have showDiagram=true but no string/fret data.
  // Include all tracks and definitions, including diagrams in the top list.
  for(const track of score?.tracks || [])for(const staff of track.staves || []) {
    for(const chord of staff.chords?.values?.() || [])if(chord.strings?.length>0)return true;
    for(const bar of staff.bars || [])for(const voice of bar.voices || [])
      for(const beat of voice.beats || [])if(beat.chord?.strings?.length>0)return true;
  }
  return false;
}

function applyChordDiagramPlacement() {
  const stylesheet=AppState.score?.stylesheet;
  if(!stylesheet || !scoreChordDiagramDefaults)return false;
  const placement=effectiveChordDiagramPlacement(AppState);
  let onTop=scoreChordDiagramDefaults.onTop;
  let inScore=scoreChordDiagramDefaults.inScore;
  let perTrack=copyTrackChordDiagramSettings(scoreChordDiagramDefaults.perTrack);
  if(placement==='above-chord') {onTop=false;inScore=true;}
  else if(placement==='top-of-score') {onTop=true;inScore=false;perTrack=null;}
  else if(placement==='off') {onTop=false;inScore=false;}
  if(stylesheet.globalDisplayChordDiagramsOnTop===onTop
      && stylesheet.globalDisplayChordDiagramsInScore===inScore
      && sameTrackChordDiagramSettings(stylesheet.perTrackChordDiagramsOnTop,perTrack))return false;
  stylesheet.globalDisplayChordDiagramsOnTop=onTop;
  stylesheet.globalDisplayChordDiagramsInScore=inScore;
  stylesheet.perTrackChordDiagramsOnTop=copyTrackChordDiagramSettings(perTrack);
  return true;
}

let loopOverlay=null;
function drawLoopShading() {
  if(!notationContainer)return;
  const rectangles=AppState.media.editing?[]:outsideLoopBounds(AppState.playbackTimeline,AppState.practiceLoop,alphaTabApi?.boundsLookup);
  if(!rectangles.length){loopOverlay?.replaceChildren();return;}
  if(!loopOverlay){loopOverlay=svgElement('svg',{class:'loop-shading-overlay','aria-hidden':'true'});}
  if(loopOverlay.parentNode!==notationContainer)notationContainer.appendChild(loopOverlay);
  loopOverlay.replaceChildren(...rectangles.map(rect=>svgElement('rect',{x:rect.x,y:rect.y,width:rect.w,height:rect.h})));
}

let notationContainer=null,notationOverlay=null,notationMarks=[],feedbackVisibility={notation:true,tabCircles:true,tabFrets:true},notationSignature='';
let scoreNoteLookup=new Map();
function drawNotationFeedback() {
  if(!notationContainer)return;
  const settings=alphaTabApi?.settings;
  const engraving=settings?.display?.resources?.engravingSettings;
  const metrics={profile:settings?.display?.staveProfile??0,scale:settings?.display?.scale??1,
    oneStaffSpace:engraving?.oneStaffSpace,staffLineThickness:engraving?.staffLineThickness,
    tabLineSpacing:engraving?.tabLineSpacing,
    tabFontSize:settings?.display?.resources?.tablatureFont?.size,
    noteHeadWidth:engraving?.glyphWidths?.get(0xe0a4),noteHeadHeight:engraving?.glyphHeights?.get(0xe0a4)};
  const geometry=notationFeedbackGeometry(notationMarks,scoreNoteLookup,alphaTabApi?.boundsLookup,metrics);
  const activeCorrect=new Set(notationMarks.filter(mark=>mark.state==='correct' && mark.active).map(mark=>mark.sourceNoteId));
  const targets=geometry.targets.filter(target=>target.kind==='notehead'
    ?feedbackVisibility.notation && target.state!=='expected'
    :feedbackVisibility.tabCircles && (target.state==='correct' && target.active
      || ['wrong','missed','completed-with-errors'].includes(target.state) && !activeCorrect.has(target.sourceNoteId)));
  const wrongNotes=feedbackVisibility.notation?geometry.wrongNotes:[];
  const wrongFrets=feedbackVisibility.tabFrets?wrongFretGeometry(notationMarks,scoreNoteLookup,alphaTabApi?.boundsLookup,metrics):[];
  if(!targets.length && !wrongNotes.length && !wrongFrets.length) {notationOverlay?.replaceChildren();return;}
  if(!notationOverlay) {
    notationOverlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
    notationOverlay.setAttribute('class','notation-feedback-overlay');notationOverlay.setAttribute('aria-hidden','true');
  }
  if(notationOverlay.parentNode!==notationContainer)notationContainer.appendChild(notationOverlay);
  notationOverlay.replaceChildren();
  for(const target of targets) {
    const node=svgElement(target.kind==='notehead'?'ellipse':'rect',target.kind==='notehead'
      ?{cx:target.cx,cy:target.cy,rx:target.rx,ry:target.ry,class:'target-notehead','data-state':target.state}
      :{x:target.x,y:target.y,width:target.width,height:target.height,rx:3.5,
        class:target.state==='correct'?'tab-correct-highlight':'tab-error-highlight','data-state':target.state});
    if(target.inferred)node.setAttribute('data-inferred','true');
    node.appendChild(svgElement('title',{},target.label));notationOverlay.appendChild(node);
  }
  for(const fret of wrongFrets) {
    const group=svgElement('g',{class:'wrong-fret-feedback','data-string':fret.string,'data-retained':Boolean(fret.retained)});
    if(fret.inferred)group.setAttribute('data-inferred','true');
    group.appendChild(svgElement('title',{},fret.inferred?`Inferred fret ${fret.fret} on expected string ${fret.string}; pitch-only input`:`Played fret ${fret.fret} on string ${fret.string}`));
    group.appendChild(svgElement('rect',{x:fret.x,y:fret.y,width:fret.width,height:fret.height,rx:2,class:'wrong-fret-background'}));
    group.appendChild(svgElement('text',{x:fret.x+fret.width/2,y:fret.y+fret.height/2,'text-anchor':'middle','dominant-baseline':'central','font-size':fret.fontSize,class:'wrong-fret-number'},fret.displayFret??fret.fret));
    notationOverlay.appendChild(group);
  }
  for(const note of wrongNotes) {
    const group=svgElement('g',{class:'wrong-notehead-feedback','data-retained':note.retained,
      'data-midi':note.midi,'data-spelling':note.spelling});
    group.appendChild(svgElement('title',{},note.label));
    for(const y of note.ledgerYs)group.appendChild(svgElement('line',{x1:note.cx-note.rx-note.space*0.25,x2:note.cx+note.rx+note.space*0.25,y1:y,y2:y,class:'wrong-ledger'}));
    group.appendChild(svgElement('ellipse',{cx:note.cx,cy:note.cy,rx:note.rx,ry:note.ry,class:'wrong-notehead'}));
    group.appendChild(svgElement('path',{d:accidentalPath(note.offset),class:'wrong-accidental',
      transform:`translate(${note.accidentalX} ${note.cy}) scale(${note.space*0.8})`,'data-accidental':note.accidental}));
    notationOverlay.appendChild(group);
  }
}

function svgElement(name,attributes={},text) {
  const node=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;
  return node;
}
export function setNotationFeedback(marks,enabled=true) {
  notationMarks=marks;
  feedbackVisibility=typeof enabled==='boolean'
    ?{notation:enabled,tabCircles:enabled,tabFrets:enabled}
    :{notation:enabled.notation??true,tabCircles:enabled.tabCircles??true,tabFrets:enabled.tabFrets??true};
  const signature=JSON.stringify([marks,feedbackVisibility]);if(signature===notationSignature)return;
  notationSignature=signature;drawNotationFeedback();
}

const VISUAL_MODES = {
  // Keep alphaTab's playback note-targeting logic available for later trainer feedback work,
  // but disable playback note tinting so the green cursor remains the only position indicator.
  playbackHighlight: false,
};

let alphaTabApi = null;
let pauseSeekPending = false;

function expectPauseSnap() {
  // Cursor rendering and worker position events are asynchronous. The API's
  // current beat can differ from a beat inferred from our last received tick.
  pauseSeekPending = true;
}

function beginManualPause() {
  expectPauseSnap();
  AppState.isPlaying = false;
  updatePlayPauseLabel();
  setStatus('Paused');
  hostCallbacks.onPlayerStateChanged?.(0);
}
let ui = null;
let hostCallbacks = {
  onScoreLoaded: null,
  onPlaybackTimelineChanged: null,
  onPlayerFinished: null,
  onPlayerPositionChanged: null,
  onPlayerReady: null,
  onPlayerStateChanged: null,
  onMetronomeTick: null,
  onMetronomeError: null,
  onLoopSelection: null,
  onCountInChanged: null,
};

function getAssetUrl(relativePath) {
  return new URL(relativePath,new URL('../',import.meta.url)).href;
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
  for(const mode of ui?.viewModeRadios || [])mode.disabled = !enabled;
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
  for(const mode of ui?.viewModeRadios || [])mode.checked=mode.value===(AppState.viewMode || 'practice-only');
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

  // Each channel group receives its final state directly; do not briefly
  // unmute other groups during live volume edits.
  for(const group of playbackGroups(AppState.tracks)) {
    const settings=AppState.audio.tracks[group.id] ?? {volumePercent:100,muted:false};
    const shouldPlay=group.tracks.some(track=>String(track.index)===String(AppState.practiceTrackId) ? AppState.playSelectedTrack : AppState.playOtherTracks);
    alphaTabApi.changeTrackMute(group.tracks, settings.muted || !shouldPlay);
    alphaTabApi.changeTrackVolume?.(group.tracks,settings.volumePercent/100);
  }

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
    onScoreLoading: callbacks.onScoreLoading || null,
    onScoreLoadError: callbacks.onScoreLoadError || null,
    onScoreLoaded: callbacks.onScoreLoaded || null,
    onPlaybackTimelineChanged: callbacks.onPlaybackTimelineChanged || null,
    onPlayerFinished: callbacks.onPlayerFinished || null,
    onPlayerPositionChanged: callbacks.onPlayerPositionChanged || null,
    onPlayerReady: callbacks.onPlayerReady || null,
    onPlayerStateChanged: callbacks.onPlayerStateChanged || null,
    onMetronomeTick: callbacks.onMetronomeTick || null,
    onMetronomeError: callbacks.onMetronomeError || null,
    onLoopSelection: callbacks.onLoopSelection || null,
    onCountInChanged: callbacks.onCountInChanged || null,
    onMediaChanged: callbacks.onMediaChanged || null,
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
    viewModeRadios: ['view-practice-only','view-all-tracks'].map(id=>document.getElementById(id)).filter(Boolean),
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
  installAlphaTabCompatibility(alphaTabGlobal);

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
      includeNoteBounds: true,
      scriptFile: getAssetUrl('./assets/vendor/alphatab/alphaTab.js'),
    },
    display: {
      scale: AppState.ui.zoomPercent / 100,
      layoutMode: alphaTabGlobal.LayoutMode?.Page,
      systemsLayoutMode: alphaTabGlobal.SystemsLayoutMode?.Automatic,
    },
    player: {
      enablePlayer: true,
      playerMode: alphaTabGlobal.PlayerMode?.EnabledSynthesizer,
      enableCursor: true,
      enableAnimatedBeatCursor: false,
      enableElementHighlighting: VISUAL_MODES.playbackHighlight,
      soundFont: getAssetUrl('./assets/vendor/alphatab/soundfont/sonivox.sf2'),
      scrollElement: wrapperEl,
      scrollMode: AppState.ui.autoScroll ? alphaTabGlobal.ScrollMode?.Continuous : alphaTabGlobal.ScrollMode?.Off,
    },
  });

  notationContainer=containerEl;
  const metronomeType = alphaTabGlobal.midi.MidiEventType.AlphaTabMetronome;
  alphaTabApi.midiEventsPlayedFilter = [...new Set([...(alphaTabApi.midiEventsPlayedFilter || []), metronomeType])];
  alphaTabApi.midiEventsPlayed?.on(event => {
    if (AppState.media.preview || !AppState.isPlaying || AppState.mode === 'wait' || !AppState.playerReady || !AppState.metronome.enabled) return;
    for (const midi of event.events || []) {
      if (midi.type !== metronomeType) continue;
      const output = alphaTabApi.player?.output;
      const context = output?.context;
      const eventMs = tickToTimeMs(AppState.playbackTimeline, midi.tick);
      const positionMs = tickToTimeMs(AppState.playbackTimeline, AppState.tickPosition);
      // Native events describe the end of a processed audio block. Locate the
      // click within that block, then map it to the speaker's output clock.
      const age = eventMs === null || positionMs === null ? 0 : Math.max(0, (positionMs - eventMs) / AppState.playbackSpeed / 1000);
      const blockSeconds = context ? (output instanceof alphaTabGlobal.synth.AlphaSynthScriptProcessorOutput ? 4096 : 128) / context.sampleRate : 0;
      const delay = audibleDelayMs(context, context ? context.currentTime + blockSeconds - age : undefined);
      const timer = setTimeout(() => {
        realtimePulseTimers.delete(timer);
        if (AppState.isPlaying && AppState.mode !== 'wait' && AppState.metronome.enabled) hostCallbacks.onMetronomeTick?.();
      }, delay);
      realtimePulseTimers.add(timer);
    }
  });
  alphaTabApi.renderStarted?.on(()=>{notationOverlay?.replaceChildren();loopOverlay?.replaceChildren();});
  alphaTabApi.postRenderFinished?.on(()=>{drawNotationFeedback();drawLoopShading();});
  alphaTabApi.scoreLoaded.on((score) => {
    cancelRealtimePulses();
    const loadedScore = score || alphaTabApi.score || null;
    rememberScoreChordDiagramDefaults(loadedScore);
    AppState.playbackTimeline = null;
    AppState.score = loadedScore;
    AppState.scoreHasChordDiagrams=loadedScore ? hasChordDiagramData(loadedScore) : null;
    // alphaTab raises scoreLoaded before MIDI generation and initial rendering,
    // so apply a saved placement override before the native render begins.
    applyChordDiagramPlacement();
    AppState.currentScoreFile=pendingScoreFile;
    pendingScoreFile=null;
    AppState.audio.tracks={};
    AppState.tracks = loadedScore?.tracks ?? [];
    scoreNoteLookup=new Map();notationMarks=[];notationSignature='';notationOverlay?.replaceChildren();
    for(const track of AppState.tracks)for(const staff of track.staves||[])for(const bar of staff.bars||[])
      for(const voice of bar.voices||[])for(const beat of voice.beats||[])for(const note of beat.notes||[])scoreNoteLookup.set(String(note.id),note);
    AppState.alphaTabReady = true;
    AppState.playerReady = false;
    AppState.isPlaying = false;
    AppState.tickPosition = 0;
    AppState.timePositionMs = 0;
    AppState.pitchOffsetSemitones = 0;

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
    if(AppState.media.preview)return;
    AppState.playbackTimeline = buildPlaybackTimeline(alphaTabApi.tickCache, {
      tempo: AppState.score?.tempo || 120,
      ticksPerQuarter: new alphaTabGlobal.midi.MidiFile().division,
    });
    hostCallbacks.onPlaybackTimelineChanged?.(AppState.playbackTimeline);
  });

  alphaTabApi.playerReady.on(() => {
    AppState.playerReady = true;
    applyMasterVolume();
    applyPlaybackPitchOffset(AppState.pitchOffsetSemitones);
    alphaTabApi.playbackSpeed=AppState.playbackSpeed;
    setTransportEnabled(true);
    updatePracticeControlsEnabled(AppState.tracks.length > 0);
    applyTrackState();
    if(AppState.media.editing){if(editingCountIn===null)editingCountIn=alphaTabApi.countInVolume;alphaTabApi.countInVolume=0;alphaTabApi.isLooping=false;alphaTabApi.playbackRange=null;}
    setStatus('Player ready');
    if(AppState.media.preview) {
      if(AppState.media.returning) {
        // Restoring the range can seek to its start; restore the saved cursor last.
        applyPracticeLoop(AppState.practiceLoop.range);
        applyTrackPlaybackStateInternal();
        savedWaitTransport=mediaSnapshot.wait;
        if(savedWaitTransport){alphaTabApi.isLooping=false;alphaTabApi.countInVolume=0;alphaTabApi.playbackRange=null;}
        mediaRestoreTick=mediaSnapshot.tick;
        alphaTabApi.tickPosition=mediaRestoreTick;
      } else {alphaTabApi.player.output.handler=mediaHandler;alphaTabApi.updateSyncPoints();}
      hostCallbacks.onMediaChanged?.();
    }
    hostCallbacks.onPlayerReady?.();
  });

  alphaTabApi.playerFinished.on(() => {
    hostCallbacks.onPlayerFinished?.();
    // Native continuous loops do not insert count-ins. With this option on,
    // let native playback finish, then pre-roll before starting the next pass.
    if(!AppState.media.editing && AppState.mode==='realtime' && AppState.practiceLoop.enabled && AppState.practiceLoop.countIn) {
      startCountIn(AppState.practiceLoop.range.startTick,ok=>{if(ok)alphaTabApi.play();});
    }
  });

  alphaTabApi.playerStateChanged.on((event) => {
    const state = event?.state ?? event;
    const normalizedState = typeof state === 'number' ? state : String(state).toLowerCase();
    if (normalizedState === 1 || normalizedState === 'playing' || event?.stopped) pauseSeekPending = false;
    else if (AppState.isPlaying) expectPauseSnap();
    AppState.isPlaying = !AppState.countInActive && (normalizedState === 1 || normalizedState === 'playing');
    if (!AppState.isPlaying) cancelRealtimePulses();
    updatePlayPauseLabel();
    if(!AppState.countInActive)setStatus(AppState.isPlaying ? 'Playing' : 'Paused');
    hostCallbacks.onPlayerStateChanged?.(state);
  });

  alphaTabApi.playerPositionChanged.on((event) => {
    // A recreated synthesizer sends initial zero-position messages before its
    // saved seek acknowledgement. Keep those out of both practice controllers.
    if(AppState.media.returning) {
      if(mediaRestoreTick!==null && Math.abs(event.currentTick-mediaRestoreTick)<=3) {
        AppState.tickPosition=event.currentTick;AppState.timePositionMs=event.currentTime;
        AppState.media.preview=false;AppState.media.returning=false;
        AppState.media.points=null;AppState.media.clock=null;
        mediaSnapshot=null;mediaHandler=null;mediaRestoreTick=null;
        hostCallbacks.onMediaChanged?.();
      }
      return;
    }
    const range=AppState.media.editing?null:AppState.practiceLoop.range;
    if(event?.isSeek && range && !scoreDragging && (event.currentTick<range.startTick || event.currentTick>=range.endTick)) {
      alphaTabApi.tickPosition=range.startTick;return;
    }
    if (event?.isSeek) cancelRealtimePulses();
    // The full alphaTab API seeks to the current beat's start on Pause.
    // This acknowledgement is transport positioning, not a new practice attempt.
    const isPauseSnap = Boolean(event?.isSeek && pauseSeekPending);
    if (event?.isSeek) pauseSeekPending = false;
    if (isPauseSnap) AppState.isPlaying = false;
    const currentTime = event?.currentTime ?? 0;
    AppState.timePositionMs = currentTime;
    AppState.tickPosition = event?.currentTick ?? 0;
    if(mediaRevealTick!==null && Math.abs(AppState.tickPosition-mediaRevealTick)<=3){mediaRevealTick=null;revealMediaCursor();}
    AppState.playbackSpeed = alphaTabApi.playbackSpeed || 1;
    setPlaybackPosition(currentTime);
    hostCallbacks.onPlayerPositionChanged?.({
      currentTime,
      currentTick: AppState.tickPosition,
      at: performance.now(),
      speed: AppState.playbackSpeed,
      isSeek: Boolean(event?.isSeek),
      isPauseSnap,
    });
  });

  // A score click/drag is an intentional seek, even when paused and no native
  // Pause snap was emitted. Do not let an unused pause acknowledgement mask it.
  let scoreDragging=false,scoreMouseDown=null;
  alphaTabApi.beatMouseDown?.on(beat => {pauseSeekPending=false;if(AppState.mode!=='wait')cancelCountIn();scoreMouseDown=beat.id;});
  alphaTabApi.beatMouseMove?.on(beat => {if(scoreMouseDown!==null && scoreMouseDown!==beat.id)scoreDragging=true;});
  alphaTabApi.beatMouseUp?.on(() => {
    const selected=scoreDragging ? wholeMeasureSelection(AppState.playbackTimeline,alphaTabApi.playbackRange) : null;
    scoreMouseDown=null;scoreDragging=false;
    if(AppState.media.editing){alphaTabApi.playbackRange=null;return;}
    if(selected)hostCallbacks.onLoopSelection?.(selected);
    else {
      // A native single click clears its range. Retain our enabled loop instead.
      alphaTabApi.playbackRange=savedWaitTransport ? null : AppState.practiceLoop.range;
      const range=AppState.practiceLoop.range,tick=alphaTabApi.tickPosition;
      if(range && (tick<range.startTick || tick>=range.endTick))alphaTabApi.tickPosition=range.startTick;
    }
  });

  alphaTabApi.error.on((error) => {
    pendingScoreFile=null;
    hostCallbacks.onScoreLoadError?.(error);
    console.error('alphaTab error:', error);
    setStatus(error?.message || 'alphaTab error');
  });

  setStatus('Choose a local score file to begin');
  return alphaTabApi;
}

export async function loadScoreFile(file) {
  if (!alphaTabApi) throw new Error('alphaTab is not ready yet. Fix the alphaTab asset path first.');
  if (!file) return false;
  if(AppState.media.preview) {
    endMediaPlayback();
    // A new score supersedes restoration of the previous practice position.
    AppState.media.preview=false;AppState.media.returning=false;AppState.media.points=null;AppState.media.clock=null;mediaSnapshot=null;mediaHandler=null;mediaRestoreTick=null;
  }
  const generation=++scoreLoadGeneration;
  AppState.currentScoreFile=null;
  pendingScoreFile=null;
  pauseSeekPending = false;
  cancelCountIn();
  releaseWaitTransport();
  alphaTabApi.pause();
  AppState.practiceLoop={enabled:false,countIn:false,startIndex:0,endIndex:0,range:null};
  loopOverlay?.replaceChildren();
  alphaTabApi.isLooping=false;
  alphaTabApi.playbackRange=null;

  // Invalidate the previous score's targets before asynchronous loading starts.
  AppState.playbackTimeline = null;
  AppState.playerReady = false;
  hostCallbacks.onScoreLoading?.();
  hostCallbacks.onPlaybackTimelineChanged?.(null);
  setLoadedFileName(file.name);
  setScoreLoadedUiState(false);
  setScoreTitle('Loading…');
  setStatus('Loading score…');
  setTransportEnabled(false);
  updatePracticeControlsEnabled(false);
  setPlaybackPosition(0);

  const buffer = await readFileAsArrayBuffer(file);
  if(generation!==scoreLoadGeneration)return false;
  const bytes = new Uint8Array(buffer);
  pendingScoreFile={fileName:file.name,bytes};
  const wrapperEl = document.getElementById('alphatab-wrapper');
  if (wrapperEl) wrapperEl.scrollTop = 0;
  const accepted=alphaTabApi.load(bytes);
  if(!accepted)pendingScoreFile=null;
  return accepted;
}

export function setRenderedTracks(trackIds) {
  if (!alphaTabApi || !Array.isArray(trackIds) || !trackIds.length) return false;
  const tracks = trackIds.map((trackId) => getTrackById(trackId)).filter(Boolean);
  if (!tracks.length) return false;
  alphaTabApi.renderTracks(tracks);
  return true;
}

export function applyMasterVolume() {
  const volume=AppState.audio.masterPercent/100;
  if(alphaTabApi?.player)alphaTabApi.masterVolume=AppState.media.preview?(AppState.mode==='wait' && !AppState.media.editing?0:AppState.audio.mediaPercent/100):volume;
  syncWaitMetronome();
  stopCountInAudio?.setVolume?.(AppState.metronome.volumePercent/100*volume);
}

export function applyTrackMixer() {return AppState.playerReady && applyTrackPlaybackStateInternal();}

export function applyPlaybackPitchOffset(semitones) {
  if(!Number.isInteger(semitones) || semitones < -12 || semitones > 12)return false;
  AppState.pitchOffsetSemitones=semitones;
  if(!AppState.playerReady || !alphaTabApi || !AppState.tracks.length)return true;
  if(typeof alphaTabApi.changeTrackTranspositionPitch!=='function')return false;
  alphaTabApi.changeTrackTranspositionPitch(AppState.tracks,semitones);
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

export function applyScoreDisplay() {
  if(!alphaTabApi)return false;
  const scale=AppState.ui.zoomPercent/100;
  const zoomChanged=alphaTabApi.settings.display.scale!==scale;
  const chordDiagramsChanged=applyChordDiagramPlacement();
  alphaTabApi.settings.display.scale=scale;
  alphaTabApi.settings.player.scrollMode=AppState.ui.autoScroll ? window.alphaTab.ScrollMode.Continuous : window.alphaTab.ScrollMode.Off;
  alphaTabApi.updateSettings();
  if(zoomChanged || chordDiagramsChanged)alphaTabApi.render();
  return true;
}

export function play() {
  if(AppState.media.preview)return toggleMediaPlayback();
  if (!alphaTabApi || !AppState.playerReady) return false;
  if(AppState.media.editing){alphaTabApi.playPause();return true;}
  if(AppState.countInActive){cancelCountIn();return true;}
  const range=AppState.practiceLoop.range;
  const tick=alphaTabApi.tickPosition ?? AppState.tickPosition;
  if (!AppState.isPlaying && range && (tick < range.startTick || tick >= range.endTick)) alphaTabApi.tickPosition=range.startTick;
  if (AppState.isPlaying) {beginManualPause();alphaTabApi.playPause();}
  else startCountIn(range && (tick<range.startTick || tick>=range.endTick) ? range.startTick : tick,ok=>{if(ok)alphaTabApi.play();});
  return true;
}

export function setPlaybackSpeed(speed) {
  if (!alphaTabApi || !Number.isFinite(speed) || speed < 0.25 || speed > 2) return false;
  if(AppState.media.preview) {
    try{mediaHandler.playbackRate=speed;}catch(error){setStatus(error.message);return false;}
  }
  AppState.playbackSpeed=speed;
  alphaTabApi.playbackSpeed=speed;
  return true;
}

const realtimePulseTimers = new Set();
function cancelRealtimePulses() {
  for (const timer of realtimePulseTimers) clearTimeout(timer);
  realtimePulseTimers.clear();
}

// Render one native Sonivox click once; schedule copies on the audio clock.
// This avoids the live ScriptProcessor loop's buffer starvation on restarts.
let waitMetronome = null, waitMetronomeLoading = null, nativeClickBuffer=null;
let mediaClickContext=null;
function clickContext() {
  if(alphaTabApi?.player?.output?.context)return alphaTabApi.player.output.context;
  if(!mediaClickContext || mediaClickContext.state==='closed')mediaClickContext=new AudioContext();
  return mediaClickContext;
}
let waitMetronomeState = { enabled: false, running: false, bpm: 120, volume: 0 };

function syncWaitMetronome() {
  waitMetronome?.sync({...waitMetronomeState,volume:waitMetronomeState.volume*AppState.audio.masterPercent/100});
}

async function prepareWaitMetronome() {
  let synth;
  try {
    const at = window.alphaTab;
    const context = clickContext();
    class ClickOutput extends at.synth.AlphaSynthWebAudioOutputBase {
      chunks = [];
      get sampleRate() { return context.sampleRate; }
      open() { this.onReady(); }
      activate() {}
      play() {}
      pause() {}
      destroy() {}
      resetSamples() { this.chunks = []; }
      addSamples(samples) { this.chunks.push(samples); }
    }
    const output = new ClickOutput();
    synth = new at.synth.AlphaSynth(output, 100);
    const parser = new at.importer.AlphaTexImporter();
    parser.initFromString('\\tempo 120 . r.1', new at.Settings());
    const midi = new at.midi.MidiFile();
    new at.midi.MidiFileGenerator(parser.readScore(), new at.Settings(), new at.midi.AlphaSynthMidiFileHandler(midi)).generate();
    synth.loadMidiFile(midi);
    const response = await fetch(getAssetUrl('./assets/vendor/alphatab/soundfont/sonivox.sf2'));
    if (!response.ok) throw new Error('Could not load the Wait metronome soundfont.');
    synth.loadSoundFont(new Uint8Array(await response.arrayBuffer()), false);
    synth.metronomeVolume = 1;
    synth.play();
    const frames = Math.ceil(context.sampleRate * 0.45);
    let count = 0;
    while (count < frames * 2) {
      output.onSampleRequest();
      const chunk = output.chunks.at(-1);
      if (!chunk?.length) throw new Error('Could not render the native metronome click.');
      count += chunk.length;
    }
    const buffer = context.createBuffer(2, frames, context.sampleRate);
    const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
    let frame = 0;
    for (const chunk of output.chunks) for (let i = 0; i < chunk.length && frame < frames; i += 2, frame++) {
      channels[0][frame] = chunk[i]; channels[1][frame] = chunk[i + 1];
    }
    synth.destroy(); synth = null;
    // A media source switch can destroy this context while the soundfont loads.
    if(context!==clickContext())return;
    nativeClickBuffer=buffer;
    waitMetronome = createMetronomeClock(context, buffer, () => {
      if (waitMetronomeState.enabled && waitMetronomeState.running && AppState.mode === 'wait') hostCallbacks.onMetronomeTick?.();
    });
    syncWaitMetronome();
  } catch (error) {
    synth?.destroy();
    AppState.metronome.enabled = false;
    setStatus(error.message || 'Wait metronome unavailable');
    hostCallbacks.onMetronomeError?.();
  } finally { waitMetronomeLoading = null; }
}

let countInGeneration=0,stopCountInAudio=null;
export function cancelCountIn() {
  countInGeneration++;stopCountInAudio?.();stopCountInAudio=null;
  const active=AppState.countInActive;AppState.countInActive=false;
  if(active){setStatus('Paused');hostCallbacks.onCountInChanged?.();}
}

export function startCountIn(tick,onComplete) {
  cancelCountIn();
  const generation=countInGeneration;
  AppState.countInActive=true;AppState.isPlaying=false;
  cancelRealtimePulses();waitMetronome?.stop();
  alphaTabApi?.player?.output?.activate();
  setStatus('Count-in…');hostCallbacks.onCountInChanged?.();
  const timing=countInTiming(AppState.playbackTimeline,AppState.score,tick,AppState.playbackSpeed,
    AppState.mode==='wait' ? waitMetronomeState.bpm : null);
  (async()=>{
    if(!nativeClickBuffer) {
      if(!waitMetronomeLoading)waitMetronomeLoading=prepareWaitMetronome();
      await waitMetronomeLoading;
      if(!nativeClickBuffer && generation===countInGeneration && alphaTabApi?.player?.output?.context) {
        waitMetronomeLoading=prepareWaitMetronome();await waitMetronomeLoading;
      }
    }
    if(generation!==countInGeneration)return;
    const context=clickContext();
    if(!nativeClickBuffer || !context){cancelCountIn();onComplete(false);return;}
    if(context.state!=='running'){setStatus('Count-in • waiting for browser audio');await context.resume();}
    if(generation!==countInGeneration)return;
    stopCountInAudio=scheduleCountIn(context,nativeClickBuffer,timing,AppState.metronome.volumePercent/100*AppState.audio.masterPercent/100,
      (beat,beats)=>{setStatus(`Count-in ${beat} / ${beats}`);},()=>{
        stopCountInAudio=null;
        if(generation!==countInGeneration)return;
        AppState.countInActive=false;onComplete(true);hostCallbacks.onCountInChanged?.();
      });
  })().catch(error=>{
    if(generation!==countInGeneration)return;
    cancelCountIn();setStatus(error.message || 'Count-in unavailable');onComplete(false);
  });
}

export function setMetronomeVolume(volume, options = {}) {
  if (!alphaTabApi || !Number.isFinite(volume) || volume < 0 || volume > 1) return false;
  const nativeVolume = options.wait ? 0 : volume;
  if (alphaTabApi.metronomeVolume !== nativeVolume) alphaTabApi.metronomeVolume = nativeVolume;
  if (options.wait || !options.enabled || !options.running) cancelRealtimePulses();
  waitMetronomeState = { enabled: Boolean(options.wait && options.enabled), running: Boolean(options.running),
    bpm: Number.isFinite(options.bpm) && options.bpm > 0 ? options.bpm : 120, volume };
  if (waitMetronomeState.enabled && !waitMetronome && !waitMetronomeLoading) waitMetronomeLoading = prepareWaitMetronome();
  syncWaitMetronome();
  return true;
}

export function applyPracticeLoop(range) {
  if (!alphaTabApi) return false;
  if(AppState.media.editing){alphaTabApi.isLooping=false;alphaTabApi.playbackRange=null;drawLoopShading();return true;}
  if (range && (!Number.isFinite(range.startTick) || !(range.endTick > range.startTick) ||
      range.startTick < 0 || range.endTick > (AppState.playbackTimeline?.endTick ?? 0))) return false;
  cancelCountIn();alphaTabApi.pause();
  alphaTabApi.isLooping=Boolean(range && !AppState.practiceLoop.countIn);
  alphaTabApi.playbackRange=range;
  if(range)alphaTabApi.tickPosition=range.startTick;
  drawLoopShading();
  return true;
}

export function pause() {
  if(AppState.countInActive){cancelCountIn();return true;}
  if (!alphaTabApi || !AppState.playerReady || !AppState.isPlaying) return false;
  beginManualPause();
  alphaTabApi.playPause();
  AppState.isPlaying = false;
  updatePlayPauseLabel();
  setStatus('Paused');
  return true;
}

export function stop() {
  if (!alphaTabApi) return false;
  pauseSeekPending = false;
  cancelCountIn();
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
  if(AppState.media.preview){mediaHandler?.pause();mediaHandler.masterVolume=0;}
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
export function pauseWaitTransport() {cancelCountIn();alphaTabApi?.pause();}
export function resumeWaitTransport() {alphaTabApi?.play();}
export function releaseWaitTransport() {
  cancelCountIn();
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
