import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0, end) + 'exports.probe={TinySoundFont,Hydra,ByteBuffer,JsonConverter};' + code.slice(end), context);
const a = context.alphaTab, m = a.model;
const { TinySoundFont, Hydra, ByteBuffer, JsonConverter } = a.probe;

function fixture(marked = true) {
  const score = new m.Score(), track = new m.Track(), staff = new m.Staff(), voices = [];
  score.addTrack(track); track.addStaff(staff);
  track.playbackInfo.program = 27;
  track.playbackInfo.secondaryChannel = 1;
  staff.stringTuning = new m.Tuning('Standard', [64,59,55,50,45,40], false);
  for (let i = 0; i < 2; i++) {
    const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
    master.isRepeatStart = i === 0;
    master.repeatCount = i === 1 ? 2 : 0;
    score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
    for (let j = 0; j < 4; j++) {
      const beat = new m.Beat();
      beat.duration = m.Duration.Quarter;
      voice.addBeat(beat);
    }
  }
  const origin = voices[0].beats[3], release = voices[1].beats[0], hold = voices[1].beats[1];
  const note = (beat, string, fret, points = [], stop = false) => {
    const n = new m.Note();
    n.string = string; n.fret = fret; n.isTieDestination = stop;
    for (const [offset,value] of points) n.addBendPoint(new m.BendPoint(offset,value));
    beat.addNote(n);
    return n;
  };
  note(origin, 6, 8, [[0,0],[60,4]]).gtsFallingTie = marked;
  note(origin, 4, 9, [[0,2],[60,2]]).gtsFallingTie = marked;
  note(origin, 5, 9);
  note(release, 6, 8, [[0,4],[30,4],[60,0]], true);
  note(release, 4, 9, [[0,2],[30,2],[60,0]], true);
  note(hold, 6, 8, [[0,0],[60,0]], true);
  score.finish(new a.Settings());
  return score;
}

function playback(library, score, smf = false) {
  const midi = new library.midi.MidiFile(), settings = new library.Settings();
  const g = new library.midi.MidiFileGenerator(score, settings, new library.midi.AlphaSynthMidiFileHandler(midi,smf));
  g.generate();
  return { midi, bars: Array.from(g.tickLookup.masterBars,b=>b.masterBar.index) };
}

test('GP and worker readback keep the written ties and both attacks on both visits', () => {
  const settings = new a.Settings(), bytes = new a.exporter.Gp7Exporter().export(fixture(), settings);
  for (const library of [a,core]) {
    const score = library.importer.ScoreLoader.loadScoreFromBytes(bytes, new library.Settings());
    const model = library === a
      ? JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)),settings)
      : score;
    const origin = model.tracks[0].staves[0].bars[0].voices[0].beats[3];
    const rising = origin.notes.find(n=>n.string===6), preBent = origin.notes.find(n=>n.string===4);
    assert(rising.gtsFallingTie && preBent.gtsFallingTie);
    assert(rising.tieDestination.tieDestination);
    assert(preBent.tieDestination && !preBent.tieDestination.tieDestination);
    const {midi,bars} = playback(library,model);
    assert.deepEqual(bars,[0,1,0,1]);
    const events = library === a
      ? JsonConverter.jsObjectToMidiFile(structuredClone(JsonConverter.midiFileToJsObject(midi))).tracks[0].events
      : midi.tracks[0].events;
    const attacks = Array.from(events).filter(e=>e instanceof library.midi.NoteOnEvent)
      .map(e=>[e.tick,e.noteKey,e.sampleOffsetMs]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]);
    const first = [[2880,65,0],[2880,68,0],[2880,72,0],[3840,65,300],[3840,74,300]];
    assert.deepEqual(attacks,[...first,...first.map(([tick,key,offset])=>[tick+7680,key,offset])]);
    for (const tick of [3840,11520]) {
      const boundary = Array.from(events).filter(e=>e.tick===tick);
      const off = boundary.findIndex(e=>e instanceof library.midi.NoteOffEvent&&e.noteKey===65);
      const on = boundary.findIndex(e=>e instanceof library.midi.NoteOnEvent&&e.noteKey===65);
      assert(off>=0 && on>off);
      assert(boundary.some(e=>e instanceof library.midi.NoteOffEvent&&e.noteKey===68));
      assert(events.some(e=>e instanceof library.midi.NoteOffEvent&&e.tick===tick+1920&&e.noteKey===74));
    }
    assert(playback(library,model,true).midi.tracks.every(t=>t.events.every(e=>!e.sampleOffsetMs)));
    assert(playback(library,fixture(false)).midi.tracks.every(t=>t.events.every(e=>!e.sampleOffsetMs)));
  }
});

test('the same-key falling restart releases the original voice and starts inside the sample loop', () => {
  const {midi} = playback(a,fixture());
  const events = JsonConverter.jsObjectToMidiFile(structuredClone(JsonConverter.midiFileToJsObject(midi))).tracks[0].events;
  const hydra = new Hydra(), synth = new TinySoundFont(44100);
  const sf = fs.readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2', import.meta.url));
  hydra.load(ByteBuffer.fromBuffer(Uint8Array.from(sf)));
  synth.loadPresets(hydra,new Set([27]),new Set(),false);
  const voices = () => synth._voices.filter(v=>v.playingKey===65&&v.playingPreset!==-1);
  let basePitch;
  for (const e of events) {
    if (e.tick>4320) break;
    synth.processMidiMessage(e);
    if (e instanceof a.midi.NoteOnEvent && e.noteKey===65 && e.sampleOffsetMs===300) {
      basePitch = voices()[1].pitchInputTimecents;
      assert.deepEqual(Array.from(voices(),v=>[v.ampEnv.segment>=6,v.sourceSamplePosition]),[[true,0],[false,758]]);
    }
  }
  const [,fresh] = voices();
  const expected = 1200*Math.log2((1+2**(-1/12))/2);
  assert(Math.abs(fresh.pitchInputTimecents-basePitch-expected)<0.3);
});
