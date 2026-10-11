import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/app-state.js';
import { initAlphaTab, setMetronomeVolume } from '../js/alphatab-host.js';

class Emitter {
  handlers = [];
  on(fn) { this.handlers.push(fn); }
  trigger(event) { for (const fn of this.handlers) fn(event); }
}

test('native Wait metronome runs on its own clock and pauses without moving or grading the score', async () => {
  const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  class AudioContext {
    sampleRate = 44100; state = 'running'; destination = {};
    createBuffer() { return {}; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, disconnect() {} }; }
    createScriptProcessor() { return { connect() {}, disconnect() {}, onaudioprocess: null }; }
    resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
  }
  const context = vm.createContext({ console, process, AudioContext, navigator: { userAgent: 'Test' } });
  vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8'), context);
  const at = context.alphaTab;
  let output, api, ticks = 0;
  class Output extends at.synth.AlphaSynthScriptProcessorOutput {
    constructor() { super(); output = this; }
    get playing() { return Boolean(this._audioNode); }
  }
  class Api {
    constructor() {
      api = this; this.metronomeVolume = 0; this.midiEventsPlayedFilter = [];
      for (const name of ['midiEventsPlayed','renderStarted','postRenderFinished','scoreLoaded','midiLoaded','playerReady','playerFinished','playerStateChanged','playerPositionChanged','beatMouseDown','error']) this[name] = new Emitter();
    }
  }
  globalThis.document = { getElementById: () => null, body: { classList: { toggle() {} } } };
  globalThis.window = { location: { href: 'http://localhost/index.html' }, alphaTab: { ...at, AlphaTabApi: Api,
    synth: { ...at.synth, AlphaSynthScriptProcessorOutput: Output } } };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => {
    const bytes = readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2', import.meta.url));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } });
  try {
    await initAlphaTab({}, { onMetronomeTick: () => ticks++ });
    AppState.mode = 'wait'; AppState.metronome.enabled = true;
    AppState.tickPosition = 960; AppState.trainer.results = { correct: 2, wrong: 1 };
    const results = structuredClone(AppState.trainer.results);
    setMetronomeVolume(0.25, { wait: true, enabled: true, running: true, bpm: 90 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.metronomeVolume, 0);
    assert.equal(output.playing, true);
    let audible = false;
    const pump = count => { for (let i = 0; i < count; i++) {
      const channels = [new Float32Array(4096), new Float32Array(4096)];
      output._audioNode?.onaudioprocess({ outputBuffer: { getChannelData: index => channels[index] } });
      if (channels.some(channel => channel.some(sample => Math.abs(sample) > 1e-6))) audible = true;
    } };
    pump(50);
    assert.ok(ticks >= 2, 'actual bundled metronome events reach the visual pulse');
    assert.ok(audible, 'native Sonivox click produces audio samples');
    assert.equal(AppState.tickPosition, 960);
    assert.deepEqual(AppState.trainer.results, results);
    const before = ticks;
    // Solving a note / rewinding a loop changes only the score cursor.
    AppState.tickPosition = 0;
    setMetronomeVolume(0.25, { wait: true, enabled: true, running: true, bpm: 90 });
    pump(25); assert.ok(ticks > before);
    setMetronomeVolume(0.4, { wait: true, enabled: true, running: false, bpm: 90 });
    assert.equal(output.playing, false);
    const pausedTicks = ticks; pump(25); assert.equal(ticks, pausedTicks);
    setMetronomeVolume(0, { wait: true, enabled: true, running: true, bpm: 60 });
    pump(40); assert.ok(ticks > pausedTicks, 'zero volume still permits visual pulses');
    setMetronomeVolume(0.4, { wait: false, enabled: true, running: true, bpm: 60 });
    assert.equal(output.playing, false);
    assert.equal(api.metronomeVolume, 0.4);
    assert.deepEqual(AppState.trainer.results, results);
    assert.equal(setMetronomeVolume(2), false);
    assert.equal(setMetronomeVolume(NaN), false);
    AppState.mode = 'realtime'; AppState.isPlaying = true; AppState.playerReady = true;
    const realtimeBefore = ticks;
    api.midiEventsPlayed.trigger({ events: [new at.midi.AlphaTabMetronomeEvent(0, 0, 0, 960, 500)] });
    assert.equal(ticks, realtimeBefore + 1);
    AppState.isPlaying = false;
    api.midiEventsPlayed.trigger({ events: [new at.midi.AlphaTabMetronomeEvent(0, 960, 1, 960, 500)] });
    assert.equal(ticks, realtimeBefore + 1);
  } finally {
    setMetronomeVolume(0, { wait: false });
    Object.assign(globalThis, previous);
  }
});
