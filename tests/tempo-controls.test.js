import test from 'node:test';
import assert from 'node:assert/strict';
import { AppState } from '../js/app-state.js';
import { initTempoControls, stepToFive, tempoAtTick } from '../js/tempo-controls.js';

function harness() {
  const previous = globalThis.document;
  const saved = Object.fromEntries(['playbackTimeline','playerReady','playbackSpeed','mode','tickPosition','score','isPlaying','metronome','waitTrainer'].map(key => [key, AppState[key]]));
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, { value: '', disabled: false, checked: false, handlers: {},
        addEventListener(type, fn) { const prior = this.handlers[type]; this.handlers[type] = event => { prior?.(event); fn(event); }; },
        classList: { add: name => classes.add(name), remove: name => classes.delete(name),
          contains: name => classes.has(name), toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) } });
    }
    return elements.get(id);
  };
  globalThis.document = { getElementById: get, activeElement: null };
  Object.assign(AppState, { playerReady: true, playbackSpeed: 1, mode: 'realtime', tickPosition: 0, score: null, isPlaying: false,
    metronome: { enabled: false, volumePercent: 25, visualPulse: true },
    playbackTimeline: { measures: [{}], tempoMap: [{ tick: 0, bpm: 120 }, { tick: 3840, bpm: 60 }] } });
  const speeds = [], volumes = [];
  const controls = initTempoControls({ onSpeedChange: speed => { speeds.push(speed); AppState.playbackSpeed = speed; }, onMetronomeChange: volume => volumes.push(volume) });
  controls.sync();
  return { get, controls, speeds, volumes, change(id, value, type = 'change') { get(id).value = value; get(id).handlers[type](); },
    cleanup() { controls.clearPulse(); globalThis.document = previous; Object.assign(AppState, saved); } };
}

test('five-step arrows snap in either direction and respect bounds without rounding typed values', () => {
  assert.equal(stepToFive(103, 1, 25, 200), 105);
  assert.equal(stepToFive(105, 1, 25, 200), 110);
  assert.equal(stepToFive(103, -1, 25, 200), 100);
  assert.equal(stepToFive(100, -1, 25, 200), 95);
  assert.equal(stepToFive(200, 1, 25, 200), 200);
  assert.equal(stepToFive(0, -1, 0, 100), 0);
});

test('BPM and speed share the native multiplier across tempo changes, seeks and reset', () => {
  const h = harness();
  try {
    h.change('playback-speed-percent', '103');
    assert.equal(AppState.playbackSpeed, 1.03);
    assert.equal(h.get('playback-bpm').value, '123.6');
    h.get('speed-up').handlers.click();
    assert.equal(h.get('playback-speed-percent').value, '105');
    h.change('playback-bpm', '90');
    assert.equal(AppState.playbackSpeed, 0.75);
    assert.equal(h.get('playback-speed-slider').value, '75');
    AppState.tickPosition = 3840; h.controls.sync();
    assert.equal(h.get('playback-bpm').value, '45');
    h.change('playback-bpm', '60');
    assert.equal(AppState.playbackSpeed, 1);
    AppState.tickPosition = 0; h.controls.sync();
    assert.equal(h.get('playback-bpm').value, '120');
    h.change('playback-speed-slider', '50', 'input');
    assert.equal(h.get('playback-bpm').value, '60');
    h.get('reset-playback-speed').handlers.click();
    assert.equal(h.get('playback-bpm').value, '120');
    assert.equal(tempoAtTick(null), 120);
  } finally { h.cleanup(); }
});

test('invalid entries restore controls and unloaded scores cannot change tempo or metronome', () => {
  const h = harness();
  try {
    for (const value of ['', '0', '201', 'bad']) h.change('playback-speed-percent', value);
    h.change('playback-bpm', '0'); h.change('playback-bpm', '');
    assert.equal(h.speeds.length, 0);
    assert.equal(h.get('playback-bpm').value, '120');
    AppState.mode = 'wait'; h.controls.sync();
    assert.equal(h.get('metronome-enabled').disabled, false);
    h.change('playback-speed-percent', '50');
    assert.equal(h.speeds.length, 1);
    AppState.mode = 'realtime'; AppState.playbackTimeline = null; h.controls.sync();
    assert.equal(h.get('playback-bpm').disabled, true);
    assert.equal(h.get('speed-up').disabled, true);
  } finally { h.cleanup(); }
});

test('metronome preferences never dispatch speed changes and pulse clears on pause and disable', () => {
  const h = harness();
  try {
    assert.equal(h.get('metronome-volume-percent').value, '25');
    assert.equal(h.get('metronome-volume-percent').disabled, true);
    h.get('metronome-enabled').checked = true; h.get('metronome-enabled').handlers.change();
    assert.equal(h.volumes.at(-1), 0.25);
    h.change('metronome-volume-percent', '33'); h.get('volume-up').handlers.click();
    assert.equal(h.volumes.at(-1), 0.35);
    h.change('metronome-volume-percent', '101');
    assert.equal(h.get('metronome-volume-percent').value, '35');
    AppState.isPlaying = true; h.controls.pulse();
    assert.ok(h.get('btn-tempo').classList.contains('metronome-pulse'));
    AppState.isPlaying = false; h.controls.sync();
    assert.equal(h.get('btn-tempo').classList.contains('metronome-pulse'), false);
    AppState.isPlaying = true; h.controls.pulse();
    h.get('metronome-visual-pulse').checked = false; h.get('metronome-visual-pulse').handlers.change();
    assert.equal(h.get('btn-tempo').classList.contains('metronome-pulse'), false);
    AppState.mode = 'wait'; h.controls.sync();
    assert.equal(h.volumes.at(-1), 0.35);
    assert.equal(AppState.metronome.enabled, true);
    AppState.mode = 'realtime'; h.controls.sync();
    assert.equal(h.volumes.at(-1), 0.35);
    h.get('metronome-enabled').checked = false; h.get('metronome-enabled').handlers.change();
    assert.equal(h.get('metronome-visual-pulse').disabled, true);
    assert.equal(h.volumes.at(-1), 0);
    assert.equal(h.speeds.length, 0);
  } finally { h.cleanup(); }
});

test('Wait BPM stays fixed as cursor, tempo map and loop position change', () => {
  const h = harness();
  try {
    AppState.mode = 'wait'; AppState.waitTrainer = { active: true, phase: 'waiting' }; h.controls.sync();
    h.get('metronome-enabled').checked = true; h.get('metronome-enabled').handlers.change();
    h.change('playback-bpm', '90');
    AppState.tickPosition = 3840; h.controls.sync();
    assert.equal(h.get('playback-bpm').value, '90');
    AppState.tickPosition = 0; h.controls.sync();
    assert.equal(h.get('playback-bpm').value, '90');
    h.controls.pulse(); assert.ok(h.get('btn-tempo').classList.contains('metronome-pulse'));
    AppState.waitTrainer.phase = 'paused'; h.controls.sync();
    assert.equal(h.get('btn-tempo').classList.contains('metronome-pulse'), false);
    AppState.mode = 'realtime'; AppState.tickPosition = 3840; h.controls.sync();
    assert.equal(h.get('playback-bpm').value, '45');
  } finally { h.cleanup(); }
});

test('edited numeric values commit on blur or Enter, while focusing a rounded value keeps exact speed', () => {
  const h = harness();
  try {
    h.get('playback-bpm').value = '90'; h.get('playback-bpm').handlers.input(); h.get('playback-bpm').handlers.blur();
    assert.equal(h.get('playback-speed-percent').value, '75');
    h.get('playback-speed-percent').value = '103'; h.get('playback-speed-percent').handlers.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(AppState.playbackSpeed, 1.03);
    h.change('playback-bpm', '130');
    const precise = AppState.playbackSpeed;
    h.get('playback-speed-percent').handlers.blur();
    assert.equal(AppState.playbackSpeed, precise);
    h.get('playback-speed-percent').handlers.keydown({ key: 'ArrowDown', preventDefault() {} });
    assert.equal(h.get('playback-speed-percent').value, '105');
  } finally { h.cleanup(); }
});
