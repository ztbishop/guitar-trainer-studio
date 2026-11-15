import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0, end) + 'exports.probe={JsonConverter};' + code.slice(end), context);
const a = context.alphaTab, m = a.model, settings = new a.Settings();

function fixture(swung, marked) {
 const score = new m.Score(), track = new m.Track(), staff = new m.Staff();
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program = 27;
 track.playbackInfo.secondaryChannel = 1;
 staff.stringTuning = new m.Tuning('Standard', [64, 59, 55, 50, 45, 40], false);
 const voices = [];
 for (let i = 0; i < 3; i++) {
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
  master.isRepeatStart = i === 0;
  master.repeatCount = i === 2 ? 2 : 0;
  master.tripletFeel = swung ? m.TripletFeel.Triplet8th : m.TripletFeel.NoTripletFeel;
 }
 const { Quarter, Half, Whole } = m.Duration;
 const beat = (bar, duration) => {
  const b = new m.Beat();
  b.duration = duration;
  voices[bar].addBeat(b);
  return b;
 };
 const note = (b, string, fret, { bend, hold = false, rise = false, vibrato = false } = {}) => {
  const n = new m.Note();
  n.string = string; n.fret = fret; n.isTieDestination = hold;
  if (bend) {
   n.addBendPoint(new m.BendPoint(0, bend[0]));
   n.addBendPoint(new m.BendPoint(60, bend[1]));
  }
  n.vibrato = vibrato ? m.VibratoType.Slight : m.VibratoType.None;
  n.gtsWrittenVibrato = vibrato && marked;
  n.gtsTiedBend = rise && marked;
  b.addNote(n);
 };
 if (swung) {
  for (let i = 0; i < 4; i++) {
   const dyad = beat(0, Quarter);
   note(dyad, 5, i + 1, { bend: [0, 2], rise: true });
   note(dyad, 6, i + 1);
  }
 } else {
  beat(0, Whole);
  beat(1, Quarter);
 }
 const origin = beat(1, swung ? Whole : Half), tail = beat(2, swung ? Half : Whole);
 if (!swung) {
  origin.dots = 1;
  origin.ottava = tail.ottava = m.Ottavia._8va;
 }
 note(origin, 5, 9, { bend: [0, 2], rise: true, vibrato: true });
 if (swung) note(origin, 6, 10);
 note(tail, 5, 9, { bend: [2, 2], hold: true, vibrato: true });
 if (swung) beat(2, Half);
 score.finish(settings);
 return new a.exporter.Gp7Exporter().export(score, settings);
}

function trace(library, score, smf = false) {
 const attacks = [], wheels = [];
 const handler = new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(), smf);
 handler.addNote = (_track, tick, length, key, _velocity, _channel, offset = 0) =>
  attacks.push([tick, length, key, offset]);
 handler.addNoteBend = (_track, tick, _channel, key, wheel) => wheels.push([tick, key, wheel]);
 new library.midi.MidiFileGenerator(score, new library.Settings(), handler).generate();
 return { attacks, wheels };
}

for (const swung of [true, false]) test(`qualified ${swung ? 'swung' : 'dotted 8va'} vibrato rise survives GP and worker readback`, () => {
 for (const library of [a, core]) {
  const load = marked => library.importer.ScoreLoader.loadScoreFromBytes(fixture(swung, marked), new library.Settings());
  let score = load(true);
  if (library === a) {
   const { JsonConverter } = a.probe;
   score = JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)), settings);
  }
  const bars = score.tracks[0].staves[0].bars;
  const origin = bars[1].voices[0].beats.at(-1).notes[0], tail = bars[2].voices[0].beats[0].notes[0];
  assert.equal(origin.tieDestination, tail);
  for (const n of [origin, tail]) {
   assert.equal(n.gtsWrittenVibrato, true);
   assert.equal(n.vibrato, m.VibratoType.Slight);
   assert.equal(n.beat.ottava, swung ? m.Ottavia.Regular : m.Ottavia._8va);
  }
  const { attacks, wheels } = trace(library, score);
  const start = swung ? 3840 : 4800, length = swung ? 5760 : 6720;
  const expected = [], assertCurve = (from, ticks, key) => {
   const curve = Array.from({ length: ticks / 5 + 1 }, (_, i) => [
    from + i * 5, key, Math.round(8192 + 6144 * Math.log2(1 + (2 ** (1 / 12) - 1) * i * 5 / ticks)),
   ]);
   assert.deepEqual(wheels.filter(([t, k]) => k === key && t >= from && t <= from + ticks), curve);
  };
  for (const shift of [0, 11520]) {
   expected.push([start + shift, length, 68, 0]);
   assertCurve(start + shift, length, 68);
   if (swung) {
    expected.push([start + shift, 3840, 74, 0]);
    for (let i = 0; i < 4; i++) {
     expected.push([shift + i * 960, 960, 60 + i, 0], [shift + i * 960, 960, 65 + i, 0]);
     assertCurve(shift + i * 960, 960, 60 + i);
    }
   }
  }
  assert.deepEqual(attacks.map(e => e.join()).sort(), expected.map(e => e.join()).sort());
  assert.deepEqual(trace(library, score, true), trace(library, load(false), true));
 }
});
