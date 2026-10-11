import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/app-state.js';
import { buildExpectedEventsFromPracticeTrack, updateActiveTargetsFromPlayback, refreshTrainerMatchState, handleMidiEvent, handlePlaybackPosition, handlePlaybackState } from '../js/practice-engine.js';
import { normalizeMidiMessage, initMidiRouter, clearActiveMidiNotes, setActiveMidiInput } from '../js/midi-router.js';
import { channelToStringHint, formatStringHint } from '../js/note-utils.js';
import { initToolbar } from '../js/toolbar-ui.js';
import { initAlphaTab, updateAlphaTabSettings, loadScoreFile, play, stop, acquireWaitTransport, holdWaitAtTick, playWaitSegment, releaseWaitTransport, setPlaybackSpeed, applyPracticeLoop, setNotationFeedback } from '../js/alphatab-host.js';

function targets() {
  AppState.inputMode = 'single-channel';
  AppState.midi.singleChannel = 'any';
  AppState.tickPosition = 0;
  clearActiveMidiNotes();
  const beats = [
    { absolutePlaybackStart: 0, playbackDuration: 960, index: 0, notes: [{ realValue: 60 }, { realValue: 64 }] },
    { absolutePlaybackStart: 960, playbackDuration: 960, index: 1, notes: [{ realValue: 62 }] },
  ];
  AppState.tracks = [{ index: 0, name: 'Guitar', staves: [{ bars: [{ index: 0, voices: [{ beats }] }] }] }];
  AppState.practiceTrackId = '0';
  AppState.playbackTimeline = {
    endTick:1920, ticksPerQuarter:960, tempoMap:[{tick:0,bpm:120,timeMs:0}],
    events:beats.map((beat,index)=>({
      id:`beat:${index}`, sourceBeatId:String(index), trackId:'0', measureNumber:1,
      beatIndex:index, startTick:beat.absolutePlaybackStart,
      endTick:beat.absolutePlaybackStart+beat.playbackDuration,
      notes:beat.notes.map((note,n)=>({...note,midi:note.realValue,attack:true,id:`${index}:${n}`})),
    })),
  };
  buildExpectedEventsFromPracticeTrack();
}
function held(pitches) {
  AppState.midi.activeNotes = new Map(pitches.map(midi => [`1:${midi}`, { midi, channel: 1 }]));
  return refreshTrainerMatchState();
}

test('chord diagnostics reject extra pitches and keep partial feedback', () => {
  targets();
  assert.equal(held([60]), 'partial');
  assert.equal(held([60, 64]), 'match');
  assert.equal(held([60, 61, 64]), 'mismatch');
  assert.equal(held([60, 61]), 'mismatch');
});
test('release does not move targets while paused or playing', () => {
  for (const playing of [false, true]) {
    targets(); AppState.isPlaying = playing;
    held([60,64]); held([]);
    assert.equal(AppState.trainer.currentEventIndex, 0);
    assert.match(AppState.trainer.status, /expecting C4/);
  }
});
test('playback boundaries, end of score, and seek back select consistent targets', () => {
  targets();
  assert.equal(updateActiveTargetsFromPlayback(959).startTick, 0);
  assert.equal(updateActiveTargetsFromPlayback(960).startTick, 960);
  assert.equal(updateActiveTargetsFromPlayback(1920), null);
  assert.deepEqual(AppState.activeTargets, []);
  assert.equal(AppState.trainer.currentEventIndex, -1);
  assert.equal(updateActiveTargetsFromPlayback(0).startTick, 0);
});
test('MIDI note-off conventions, timestamps, controller data and bend decoding', () => {
  const note = normalizeMidiMessage({data: [0x90,60,90], timeStamp: 123.5});
  assert.equal(note.at, 123.5); assert.equal(note.type, 'note-on');
  assert.equal(normalizeMidiMessage({data:[0x90,60,0]}).type, 'note-off');
  assert.equal(normalizeMidiMessage({data:[0x80,60,10]}).type, 'note-off');
  const cc = normalizeMidiMessage({data:[0xb0,64,127]});
  assert.equal(cc.midi, null); assert.equal(cc.velocity, null); assert.equal(cc.controller,64); assert.equal(cc.value,127);
  assert.equal(normalizeMidiMessage({data:[0xe0,0,64]}).bendValue, 0);
  assert.equal(normalizeMidiMessage({data:[0xe0,127,127]}).bendValue, 8191);
  assert.equal(normalizeMidiMessage({data:[0xf8]}), null);
  assert.equal(normalizeMidiMessage({data:[0x90,60]}), null);
});
test('hex channel order agrees with displayed string labels', () => {
  assert.equal(formatStringHint(channelToStringHint(1)), '6 (low E)');
  assert.equal(formatStringHint(channelToStringHint(6)), '1 (high E)');
  assert.equal(channelToStringHint(7), null);
  assert.equal(normalizeMidiMessage({data:[0x93,60,100]}, {inputMode:'hex-6ch', hexChannelBase:4}).stringHint,6);
});
class Element {
  constructor(id) {
    this.id=id; this.dataset={}; this.listeners={}; this.attrs={}; this.classes=new Set(['hidden']);
    this.classList={add: x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};
    this.style={}; this.children=[];
  }
  addEventListener(type, cb) { this.listeners[type]=cb; }
  removeEventListener(type, cb) { if(this.listeners[type]===cb) delete this.listeners[type]; }
  setAttribute(k,v) { this.attrs[k]=v; }
  getBoundingClientRect() { return {width:1200}; }
  contains() { return false; }
  blur() {}
  appendChild(child) { this.children.push(child);child.parentNode=this; }
  replaceChildren() { this.children=[]; }
  click() { this.listeners.click?.({stopPropagation(){}}); }
  send(data) { this.listeners.midimessage?.({data, timeStamp:400}); }
}
test('router clears on filter/device changes, releases filtered notes, and preserves holds on unrelated port changes', async () => {
  targets();
  const first=new Element('first'); first.name='MIDI guitar';
  const second=new Element('second');
  const access={inputs:new Map([['first',first],['second',second]])};
  Object.defineProperty(globalThis,'navigator',{value:{requestMIDIAccess:async()=>access},configurable:true});
  await initMidiRouter({onMidiEvent:handleMidiEvent, onStateChange:()=>refreshTrainerMatchState()});
  first.send([0x90,60,100]); assert.equal(AppState.midi.activeNotes.size,1);
  access.onstatechange(); assert.equal(AppState.midi.activeNotes.size,1);
  AppState.midi.singleChannel='2'; first.send([0x80,60,0]); assert.equal(AppState.midi.activeNotes.size,0);
  AppState.midi.singleChannel='any'; first.send([0x90,60,100]);
  clearActiveMidiNotes(); assert.equal(AppState.trainer.matchState,'waiting');
  assert.equal(AppState.midi.activeNotesByChannel.size,0);
  first.send([0x90,60,100]); setActiveMidiInput('second');
  assert.equal(AppState.midi.activeNotes.size,0); assert.equal(first.listeners.midimessage,undefined);
  second.send([0x90,62,100]); access.inputs.clear(); access.onstatechange();
  assert.equal(AppState.midi.activeNotes.size,0); assert.equal(second.listeners.midimessage,undefined);
});
function dom() {
  const ids=['static-menu','toolbar-backdrop','btn-more','more-popup','audio-popup','display-popup','toolbar-score-value','play-pause-button','stop-button'];
  const elements=new Map(ids.map(id=>[id,new Element(id)]));
  const launches=['audio-popup','display-popup'].map(id=>{const el=new Element(`launch-${id}`); el.dataset.launchPanel=id; return el;});
  globalThis.HTMLElement=Element;
  globalThis.document={body:new Element('body'),getElementById:id=>elements.get(id)||null,querySelectorAll:()=>launches,addEventListener(type,cb){this[type]=cb;},createElement:()=>new Element(''),createElementNS:()=>new Element('')};
  globalThis.window={innerWidth:1200,location:{href:'https://example.test/index.html'},addEventListener(){}};
  return {elements,launches};
}
test('secondary More panels close on switching, backdrop and Escape', () => {
  const {elements,launches}=dom(); initToolbar();
  elements.get('btn-more').click(); launches[0].click();
  assert.equal(elements.get('more-popup').attrs['aria-hidden'],'true');
  assert.equal(elements.get('audio-popup').attrs['aria-hidden'],'false');
  launches[1].click(); assert.equal(elements.get('audio-popup').attrs['aria-hidden'],'true');
  document.keydown({key:'Escape'}); assert.equal(elements.get('display-popup').attrs['aria-hidden'],'true');
  launches[0].click(); elements.get('toolbar-backdrop').click(); assert.equal(elements.get('audio-popup').attrs['aria-hidden'],'true');
});
test('host settings use bundled alphaTab serializer; loading, transport and playback callbacks stay wired', async () => {
  const {elements}=dom();
  const context=vm.createContext({console, process});
  vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
  let api;
  class FakeApi {
    constructor(container,settings) {
      api=this; this.settings=new context.alphaTab.Settings(); this.calls=[];this.player={output:{activate:()=>this.calls.push('activate')}};
      this.constructorSettings=settings;
      for(const name of ['playerFinished','scoreLoaded','midiLoaded','playerReady','playerStateChanged','playerPositionChanged','beatMouseDown','error','renderStarted','postRenderFinished']) this[name]={on:fn=>this[name].emit=fn};
    }
    updateSettings(...args) { assert.equal(args.length,0); this.calls.push('update'); }
    render() { this.calls.push('render'); }
    load(bytes) { assert.deepEqual(Array.from(bytes),[1,2,3]); return true; }
    playPause() { this.calls.push('playPause'); }
    play() { this.calls.push('play'); }
    pause() { this.calls.push('pause'); }
    stop() { this.calls.push('stop'); }
    renderTracks() {} changeTrackMute() {}
  }
  window.alphaTab={...context.alphaTab,AlphaTabApi:FakeApi};
  let position;
  const timelineChanges=[];
  const container=new Element('container');
  let gradeTransport = false;
  await initAlphaTab(container, {onPlayerPositionChanged:e=>{position=e;if(gradeTransport)handlePlaybackPosition(e)},
    onPlayerStateChanged:()=>{if(gradeTransport)handlePlaybackState()}, onPlaybackTimelineChanged:t=>timelineChanges.push(t)});
  assert.equal(api.constructorSettings.core.includeNoteBounds,true);
  assert.equal(elements.get('toolbar-score-value').textContent,'—');
  const originalSoundFont=api.settings.player.soundFont;
  assert.equal(updateAlphaTabSettings({display:{scale:1.25}}),true);
  assert.equal(api.settings.display.scale,1.25);
  assert.equal(api.settings.player.soundFont,originalSoundFont);
  assert.deepEqual(api.calls,['update','render']);
  globalThis.FileReader=class {readAsArrayBuffer(){this.result=new Uint8Array([1,2,3]).buffer; this.onload();}};
  assert.equal(await loadScoreFile({name:'sample.gp'}),true);
  assert.equal(timelineChanges.at(-1),null);
  const alpha=context.alphaTab;
  const parser=new alpha.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . \ro 0.6.1 | \rc 2 2.6.1`,new alpha.Settings());
  const score=parser.readScore();
  api.scoreLoaded.emit(score);
  const renderedNote=score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
  api.boundsLookup={isFinished:true,findBeats:()=>[{notes:[{note:renderedNote,noteHeadBounds:{x:20,y:30,w:10,h:8}}]}]};
  const marks=[{sourceNoteId:String(renderedNote.id),state:'correct',label:'Correct E2'}];
  setNotationFeedback(marks);const overlay=container.children.at(-1);assert.equal(overlay.children.length,1);
  assert.equal(overlay.children[0].attrs['data-state'],'correct');
  setNotationFeedback(marks,false);assert.equal(overlay.children.length,0);
  setNotationFeedback(marks,true);api.renderStarted.emit();assert.equal(overlay.children.length,0);
  api.postRenderFinished.emit();assert.equal(overlay.children.length,1);
  // Stage 8: actual native bounds plus host SVG redraw/toggle wiring.
  const renderSettings=new alpha.Settings();renderSettings.core.engine='svg';renderSettings.core.includeNoteBounds=true;
  renderSettings.display.scale=api.settings.display.scale;
  const nativeRenderer=new alpha.rendering.ScoreRenderer(renderSettings);nativeRenderer.width=900;nativeRenderer.renderScore(score,[0]);
  api.boundsLookup=nativeRenderer.boundsLookup;
  const pitchMark={kind:'wrong-pitches',sourceNoteId:String(renderedNote.id),label:'Errors: F2 (41)',retained:true,pitches:[41]};
  setNotationFeedback([...marks,pitchMark]);assert.equal(overlay.children.length,3);
  assert.equal(overlay.children.at(-1).attrs.class,'wrong-notehead-feedback');
  assert.equal(overlay.children.at(-1).attrs['data-spelling'],'F3');
  assert.ok(overlay.children.some(node=>node.attrs.class==='target-notehead'));
  assert.ok(overlay.children.some(node=>node.attrs['data-state']==='correct' && node.attrs.width));
  assert.equal(overlay.children.at(-1).children.at(-1).attrs['data-accidental'],'♮');
  setNotationFeedback([...marks,pitchMark],false);assert.equal(overlay.children.length,0);
  setNotationFeedback([...marks,pitchMark],true);api.renderStarted.emit();api.postRenderFinished.emit();assert.equal(overlay.children.length,3);
  const fretMark={kind:'wrong-fret',sourceNoteId:String(renderedNote.id),string:6,fret:12,retained:true};
  const allMarks=[...marks,pitchMark,fretMark];
  setNotationFeedback(allMarks,{notation:true,tabCircles:false,tabFrets:false});
  assert.equal(overlay.children.length,2);
  assert.ok(overlay.children.every(node=>['target-notehead','wrong-notehead-feedback'].includes(node.attrs.class)));
  setNotationFeedback(allMarks,{notation:false,tabCircles:true,tabFrets:false});
  assert.equal(overlay.children.length,1);assert.ok(overlay.children[0].attrs.width);
  setNotationFeedback(allMarks,{notation:false,tabCircles:false,tabFrets:true});
  assert.equal(overlay.children.length,1);assert.equal(overlay.children[0].attrs.class,'wrong-fret-feedback');
  assert.ok(!overlay.children[0].children.some(node=>node.attrs.class==='wrong-fret-pointer'));
  setNotationFeedback(allMarks,{notation:false,tabCircles:false,tabFrets:false});
  assert.equal(overlay.children.length,0);
  const inferred={kind:'poly-error',sourceNoteId:String(renderedNote.id),state:'wrong',inferred:true,label:'Inferred Poly mistake'};
  setNotationFeedback([...marks,inferred],{notation:false,tabCircles:true,tabFrets:false});
  assert.equal(overlay.children.length,1);assert.equal(overlay.children[0].attrs['data-inferred'],'true');
  assert.equal(overlay.children[0].attrs['data-state'],'wrong');
  api.renderStarted.emit();api.postRenderFinished.emit();assert.equal(overlay.children.length,1);
  setNotationFeedback([{...fretMark,inferred:true}],{notation:false,tabCircles:false,tabFrets:true});
  assert.equal(overlay.children.length,1);assert.equal(overlay.children[0].attrs['data-inferred'],'true');
  assert.equal(String(overlay.children[0].children.at(-1).textContent),'12');
  const generator=new alpha.midi.MidiFileGenerator(score,new alpha.Settings(),new alpha.midi.AlphaSynthMidiFileHandler(new alpha.midi.MidiFile()));
  generator.generate(); api.tickCache=generator.tickLookup;
  api.midiLoaded.emit({});
  assert.equal(timelineChanges.at(-1).measures.length,4);
  assert.equal(AppState.playbackTimeline.events.length,4);
  api.playerReady.emit();
  assert.equal(play(),true); api.playerStateChanged.emit({state:1}); assert.equal(AppState.isPlaying,true);
  api.playerPositionChanged.emit({currentTick:960,currentTime:500});
  assert.equal(position.currentTick,960); assert.equal(position.currentTime,500);
  assert.equal(position.speed,1); assert.equal(position.isSeek,false);
  assert.ok(Number.isFinite(position.at));
  // Exercise the actual full API Pause handler, which the synth-only test omitted.
  api.tracks=score.tracks;AppState.practiceTrackId='0';AppState.practiceLoop={enabled:false,range:null};
  AppState.trainer.latencyMs=0;AppState.inputMode='single-channel';
  buildExpectedEventsFromPracticeTrack();gradeTransport=true;handlePlaybackState();
  api.playerPositionChanged.emit({currentTick:0,currentTime:0});
  handleMidiEvent({type:'note-on',midi:40,channel:1,at:position.at});
  handleMidiEvent({type:'note-on',midi:41,channel:1,at:position.at});
  api.playerPositionChanged.emit({currentTick:480,currentTime:250});
  const beforePause=structuredClone(AppState.trainer.results);
  assert.equal(beforePause.accuracy,50);
  const nativePauseApi={_isDestroyed:false,_currentBeat:api.tickCache.findBeat(new Set([0]),480),_tickCache:api.tickCache,
    _player:{set tickPosition(tick){api.playerPositionChanged.emit({currentTick:tick,currentTime:0,isSeek:true})}},
    scrollToCursor(){},uiFacade:{triggerEvent(){}}};
  api.playPause=()=>{
    context.alphaTab.AlphaTabApi.prototype._onPlayerStateChanged.call(nativePauseApi,{state:0,stopped:false});
    api.playerStateChanged.emit({state:0,stopped:false});
  };
  play();assert.equal(position.isPauseSnap,true);assert.equal(AppState.tickPosition,0);
  assert.deepEqual(AppState.trainer.results,beforePause);assert.equal(AppState.trainer.sessionStarted,true);
  api.playerStateChanged.emit({state:1});assert.deepEqual(AppState.trainer.results,beforePause);
  // Worker delivery puts the seek acknowledgement after the Paused callback.
  api.playerPositionChanged.emit({currentTick:480,currentTime:250});
  api.playPause=()=>api.playerStateChanged.emit({state:0,stopped:false});play();
  api.playerPositionChanged.emit({currentTick:0,currentTime:0,isSeek:true});
  assert.equal(position.isPauseSnap,true);assert.deepEqual(AppState.trainer.results,beforePause);
  api.playerPositionChanged.emit({currentTick:960,currentTime:500,isSeek:true});
  assert.equal(position.isPauseSnap,false);assert.equal(AppState.trainer.results.correct,0);
  // Cursor layout can lag the received tick, especially across repeats/tracks.
  // Exercise the native API handler with a different current beat than the host
  // would predict. Protection must be tied to the Pause action, not that guess.
  AppState.tickPosition=0;buildExpectedEventsFromPracticeTrack();
  api.playerStateChanged.emit({state:1});api.playerPositionChanged.emit({currentTick:0,currentTime:0});
  handleMidiEvent({type:'note-on',midi:40,channel:1,at:position.at});
  handleMidiEvent({type:'note-on',midi:41,channel:1,at:position.at});
  api.playerPositionChanged.emit({currentTick:4500,currentTime:2343.75});
  const laggedCursorResults=structuredClone(AppState.trainer.results);
  nativePauseApi._currentBeat=api.tickCache.findBeat(new Set([0]),0);
  api.playPause=()=>{
    context.alphaTab.AlphaTabApi.prototype._onPlayerStateChanged.call(nativePauseApi,{state:0,stopped:false});
    api.playerStateChanged.emit({state:0,stopped:false});
  };
  play();assert.equal(position.isPauseSnap,true);
  assert.deepEqual(AppState.trainer.results,laggedCursorResults);
  // Queued non-seek worker positions while paused must not clear results either.
  api.playerPositionChanged.emit({currentTick:4500,currentTime:2343.75});
  api.playerPositionChanged.emit({currentTick:0,currentTime:0});
  assert.deepEqual(AppState.trainer.results,laggedCursorResults);
  // No snap was emitted: a subsequent deliberate score click must reset.
  api.playerStateChanged.emit({state:1});
  api.playPause=()=>api.playerStateChanged.emit({state:0,stopped:false});play();
  api.beatMouseDown.emit(renderedNote.beat);
  api.playerPositionChanged.emit({currentTick:960,currentTime:500,isSeek:true});
  assert.equal(position.isPauseSnap,false);assert.equal(AppState.trainer.results.correct,0);
  gradeTransport=false;
  assert.equal(stop(),true); assert.equal(AppState.isPlaying,false);
  const originalRange={startTick:0,endTick:3840};api.playbackRange=originalRange;api.isLooping=true;api.countInVolume=0.5;
  acquireWaitTransport();assert.equal(api.calls.at(-1),'activate');assert.equal(api.isLooping,false);assert.equal(api.countInVolume,0);
  holdWaitAtTick(960);assert.equal(api.tickPosition,960);assert.equal(api.playbackRange,null);
  playWaitSegment(960,1920);assert.deepEqual(api.playbackRange,{startTick:960,endTick:1920});assert.equal(api.calls.at(-1),'play');
  releaseWaitTransport();assert.equal(api.playbackRange,originalRange);assert.equal(api.isLooping,true);assert.equal(api.countInVolume,0.5);
  assert.equal(setPlaybackSpeed(0.5),true);assert.equal(api.playbackSpeed,0.5);assert.equal(AppState.playbackSpeed,0.5);
  assert.equal(setPlaybackSpeed(0),false);assert.equal(api.playbackSpeed,0.5);
  const loopRange={startTick:3840,endTick:7680};
  assert.equal(applyPracticeLoop(loopRange),true);assert.equal(api.tickPosition,3840);assert.equal(api.isLooping,true);
  AppState.practiceLoop={enabled:true,startIndex:1,endIndex:1,range:loopRange};
  acquireWaitTransport();holdWaitAtTick(5000);assert.equal(api.isLooping,false);
  releaseWaitTransport();assert.equal(api.playbackRange,loopRange);assert.equal(api.isLooping,true);
  AppState.isPlaying=false;api.tickPosition=8000;assert.equal(play(),true);assert.equal(api.tickPosition,3840);
  assert.equal(applyPracticeLoop({startTick:0,endTick:999999}),false);assert.equal(api.playbackRange,loopRange);
  assert.equal(applyPracticeLoop(null),true);assert.equal(api.playbackRange,null);assert.equal(api.isLooping,false);
  await loadScoreFile({name:'new.gp'});assert.equal(AppState.practiceLoop.enabled,false);assert.equal(AppState.practiceLoop.range,null);
});
