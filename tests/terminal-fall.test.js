import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const code = fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8');
const end = code.lastIndexOf('});');
const context = vm.createContext({ process, console, Map, TextEncoder, TextDecoder });
vm.runInContext(code.slice(0, end) + 'exports.probe={JsonConverter};' + code.slice(end), context);
const classic = context.alphaTab, m = classic.model, settings = new classic.Settings();

function fixture(marked, soundingTail = false) {
 const score = new m.Score(), track = new m.Track(), staff = new m.Staff(), voices = [];
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program = 27;
 track.playbackInfo.secondaryChannel = 1;
 staff.stringTuning = new m.Tuning('Standard', [64, 59, 55, 50, 45, 40], false);
 for (let i = 0; i < 5; i++) {
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
  master.isRepeatStart = i === 0;
  master.repeatCount = i === 3 ? 2 : 0;
  master.alternateEndings = i === 3 ? 1 : 0;
 }
 const { Whole, Half, Quarter, Eighth } = m.Duration;
 const beat = (bar, duration, triplet = false) => {
  const b = new m.Beat();
  b.duration = duration;
  if (triplet) { b.tupletNumerator = 3; b.tupletDenominator = 2; }
  voices[bar].addBeat(b);
  return b;
 };
 const note = (b, string, fret, { bend, hold = false, falling = false, hammer = false, kind = 0 } = {}) => {
  const n = new m.Note();
  n.string = string; n.fret = fret; n.isTieDestination = hold; n.isHammerPullOrigin = hammer;
  if (bend) bend.forEach(([offset, value]) => n.addBendPoint(new m.BendPoint(offset, value)));
  n.gtsFallingTie = falling && marked;
  n.gtsSourceArticulation = marked ? kind : 0;
  b.addNote(n);
 };
 beat(0, Half);
 note(beat(0, Eighth, true), 6, 4, { hammer: true });
 note(beat(0, Eighth, true), 6, 5, { hammer: true, kind: 24 });
 note(beat(0, Eighth, true), 6, 4, { kind: 24 });
 beat(0, Quarter);
 beat(1, Half); beat(1, Quarter); beat(1, Eighth);
 note(beat(1, Eighth), 5, 5, { bend: [[0,2],[60,2]], falling: true, kind: 23 });
 note(beat(2, Whole), 5, 5, { bend: [[0,2],[30,2],[60,0]], hold: true });
 note(beat(3, Quarter), 5, 5, { bend: [[0,0],[60,0]], hold: true });
 beat(3, Quarter); beat(3, Half);
 const final = beat(4, Whole);
 if (soundingTail) note(final, 4, 5);
 score.finish(settings);
 return new classic.exporter.Gp7Exporter().export(score, settings);
}

function trace(library, score, smf = false) {
 const attacks = [], wheels = [];
 const handler = new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(), smf);
 handler.addNote = (_track, tick, length, key, _velocity, _channel, offset = 0) =>
  attacks.push([tick, length, key, offset]);
 handler.addNoteBend = (_track, tick, _channel, key, wheel) => wheels.push([tick, key, wheel]);
 const player = new library.midi.MidiFileGenerator(score, new library.Settings(), handler);
 player.generate();
 return { attacks, wheels, order: Array.from(player.tickLookup.masterBars, b => b.masterBar.index) };
}

test('terminal fall and triplet hammer attacks survive both played successors and worker readback', () => {
 for (const library of [classic, core]) {
  const load = (marked, sounding) => library.importer.ScoreLoader.loadScoreFromBytes(
   fixture(marked, sounding), new library.Settings());
  let score = load(true);
  if (library === classic) {
   const { JsonConverter } = classic.probe;
   score = JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)), settings);
  }
  const origin = score.tracks[0].staves[0].bars[1].voices[0].beats.at(-1).notes[0];
  assert.equal(origin.gtsSourceArticulation, 23);
  assert.equal(origin.tieDestination?.tieDestination?.beat.voice.bar.index, 3);
  const { attacks, wheels, order } = trace(library, score), expected = [];
  assert.deepEqual(order, [0,1,2,3,0,1,2,4]);
  for (const shift of [0, 15360]) {
   for (const [tick, ...rest] of [[1920,320,68,0],[2240,320,69,200],[2560,320,68,200],
    [7200,480,65,0],[7680,4800,65,300]]) expected.push([tick + shift, ...rest]);
   const start = 7680 + shift;
   const curve = Array.from({ length: 961 }, (_, i) => [start + 5 * i, 65,
    Math.round(8192 + 6144 * Math.log2(1 + (2 ** (-1 / 12) - 1) * 5 * i / 4800))]);
   assert.deepEqual(wheels.filter(([t,k]) => k === 65 && t >= start && t <= start + 4800), curve);
  }
  assert.deepEqual(attacks, expected);
  assert(!trace(library, load(true, true)).attacks.some(([,,,offset]) => offset === 300));
  assert.deepEqual(trace(library, score, true), trace(library, load(false), true));
 }
});
