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

function fixture(marked) {
 const score = new m.Score(), track = new m.Track(), staff = new m.Staff(), voices = [];
 score.addTrack(track);
 track.addStaff(staff);
 track.playbackInfo.program = 27;
 track.playbackInfo.secondaryChannel = 1;
 staff.stringTuning = new m.Tuning('Standard', [64, 59, 55, 50, 45, 40], false);
 for (let i = 0; i < 3; i++) {
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice); voices.push(voice);
  master.isRepeatStart = i === 0;
  master.repeatCount = i === 2 ? 2 : 0;
 }
 const { Quarter, Eighth, Sixteenth } = m.Duration;
 const beat = (bar, duration = Eighth, dots = 0) => {
  const b = new m.Beat();
  b.duration = duration; b.dots = dots;
  voices[bar].addBeat(b);
  return b;
 };
 const note = (b, string, fret, { bend, hold = false, tied = false, vibrato = false, slide = false, kind = 0 } = {}) => {
  const n = new m.Note();
  n.string = string; n.fret = fret; n.isTieDestination = hold;
  if (bend) {
   n.addBendPoint(new m.BendPoint(0, bend[0]));
   n.addBendPoint(new m.BendPoint(60, bend[1]));
  }
  if (slide) n.slideOutType = m.SlideOutType.Legato;
  if (vibrato) n.vibrato = m.VibratoType.Slight;
  n.gtsTiedBend = tied && marked;
  n.gtsSourceArticulation = marked ? kind : 0;
  b.addNote(n);
 };
 beat(0, Quarter); beat(0);
 note(beat(0), 5, 8, { slide: true, kind: 20 });
 note(beat(0), 5, 6);
 beat(0, Quarter);
 note(beat(0), 5, 7, { bend: [2, 0], tied: true });
 note(beat(1), 5, 7, { bend: [0, 0], hold: true });
 beat(1);
 note(beat(1, Quarter), 4, 8, { slide: true, kind: 20 });
 note(beat(1, Quarter), 4, 10);
 beat(1, Quarter);
 const paired = beat(2);
 note(paired, 5, 1, { bend: [0, 2], tied: true });
 note(paired, 6, 4, { bend: [0, 2], tied: true });
 beat(2);
 const approach = beat(2, Sixteenth), target = beat(2, Eighth, 1), hold = beat(2, Quarter);
 for (const [string, fret] of [[5, 4], [6, 7]]) {
  note(approach, string, fret, { slide: true, kind: 21 });
  note(target, string, fret + 1, { kind: 22, vibrato: string === 6 });
  note(hold, string, fret + 1, { hold: true, vibrato: true });
 }
 beat(2, Quarter);
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

test('straight paired bends, sampled slides and vibrato ties survive GP and worker readback', () => {
 for (const library of [a, core]) {
  const load = marked => library.importer.ScoreLoader.loadScoreFromBytes(fixture(marked), new library.Settings());
  let score = load(true);
  if (library === a) {
   const { JsonConverter } = a.probe;
   score = JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(score)), settings);
  }
  const { attacks, wheels } = trace(library, score), expected = [];
  const bars = score.tracks[0].staves[0].bars, dyad = bars[2].voices[0].beats[3].notes;
  assert(dyad.every(n => n.gtsSourceArticulation === 22 && n.tieDestination?.vibrato === m.VibratoType.Slight));
  assert.equal(dyad.filter(n => n.vibrato === m.VibratoType.Slight).length, 1);
  for (const shift of [0, 11520]) {
   for (const [tick, ...rest] of [
    [1440,408,67,0],[1848,72,66,200],[1920,480,65,0],[3360,960,67,0],
    [4800,816,63,0],[5616,144,64,200],[5760,960,65,0],[7680,480,60,0],[7680,480,68,0],
    [8640,240,63,0],[8640,240,71,0],[8880,1680,64,0],[8880,1680,72,0],
   ]) expected.push([tick + shift, ...rest]);
   for (const [tick, key, length, rise] of [[3360,67,960,-1],[7680,60,480,1],[7680,68,480,1]]) {
    const from = tick + shift;
    const curve = Array.from({ length: length / 5 + 1 }, (_, i) => [
     from + i * 5, key, Math.round(8192 + 6144 * Math.log2(1 + (2 ** (rise / 12) - 1) * i * 5 / length)),
    ]);
    assert.deepEqual(wheels.filter(([t, k]) => k === key && t >= from && t <= from + length), curve);
   }
  }
  assert.deepEqual(attacks.map(e => e.join()).sort(), expected.map(e => e.join()).sort());
  assert.deepEqual(trace(library, score, true), trace(library, load(false), true));
 }
});
