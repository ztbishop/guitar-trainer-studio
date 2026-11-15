import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import { tapProbe } from './right-hand-tap-fixtures.cjs';

const probe = tapProbe(), a = probe.at;

function fixture() {
  const m = a.model, score = new m.Score(), track = new m.Track(), staff = new m.Staff();
  score.addTrack(track);
  track.addStaff(staff);
  staff.stringTuning = new m.Tuning('Test', [64,59,55,50,45,40], true);
  for (let i = 0; i < 2; i++) {
    const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice(), beat = new m.Beat();
    master.timeSignatureNumerator = 4;
    master.timeSignatureDenominator = 4;
    master.isRepeatStart = i === 0;
    master.repeatCount = i === 1 ? 2 : 0;
    score.addMasterBar(master);
    staff.addBar(bar);
    bar.addVoice(voice);
    voice.addBeat(beat);
    beat.duration = m.Duration.Whole;
    const note = new m.Note(), partner = new m.Note();
    note.string = 1;
    note.fret = 7;
    note.gtsTiedBend = i === 0;
    note.isTieDestination = i === 1;
    note.addBendPoint(new m.BendPoint(0, i === 0 ? 0 : 4));
    note.addBendPoint(new m.BendPoint(60, 4));
    partner.string = 2;
    partner.fret = 4;
    beat.addNote(note);
    beat.addNote(partner);
  }
  score.finish(new a.Settings());
  return score;
}

const first = score => score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];

function playback(library, score, smf = false) {
  const handler = new library.midi.AlphaSynthMidiFileHandler(new library.midi.MidiFile(), smf);
  const attacks = [], bends = [];
  handler.addNote = (_track, tick, length, pitch) => attacks.push([tick, length, pitch]);
  handler.addNoteBend = (_track, tick, _channel, pitch, value) => bends.push([tick, pitch, value]);
  const generator = new library.midi.MidiFileGenerator(score, new library.Settings(), handler);
  generator.generate();
  return { attacks, bends, visits:Array.from(generator.tickLookup.masterBars, bar => bar.masterBar.index) };
}

test('marked tied bends retain the hold and reach pitch at release after both GP and worker readback', () => {
  const bytes = probe.gp(fixture()), score = probe.read(bytes);
  const codec = probe.p.JsonConverter;
  const transported = codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(score)), new a.Settings());
  const coreScore = core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new core.Settings());
  const reexport = core.importer.ScoreLoader.loadScoreFromBytes(new core.exporter.Gp7Exporter().export(coreScore, new core.Settings()), new core.Settings());
  const expected = playback(a, score);
  assert.deepEqual(expected.visits, [0,1,0,1]);
  const key = first(score).realValue;
  assert.deepEqual(expected.attacks.filter(event => event[2] === key), [[0,7680,key],[7680,7680,key]]);
  assert.deepEqual(expected.attacks.filter(event => event[2] !== key).map(event => event[0]), [0,3840,7680,11520]);
  const curve = expected.bends.filter(event => event[1] === key);
  assert.deepEqual(curve.filter(event => event[2] === 9216).map(event => event[0]), [7680,15360]);
  const midpoint = Math.round(8192 + 6144 * Math.log2((1 + 2 ** (2/12)) / 2));
  assert.equal(curve.find(event => event[0] === 3840)[2], midpoint);
  assert.equal(curve.find(event => event[0] === 11520)[2], midpoint);
  assert(expected.bends.filter(event => event[1] !== key).every(event => event[2] === 8192));
  for (const [library, model] of [[a, transported], [a, probe.read(probe.gp(score))], [core, reexport]]) {
    const note = first(model);
    assert.equal(note.gtsTiedBend, true);
    assert.deepEqual(Array.from(note.tieDestination.bendPoints, p => [p.offset,p.value]), [[0,4],[60,4]]);
    assert.deepEqual(playback(library, model), expected);
  }
});

test('a non-hold continuation, standard MIDI and unmarked GP use native bend events', () => {
  const score = probe.read(probe.gp(fixture())), origin = first(score);
  const stock = playback(a, score, true);
  origin.gtsTiedBend = false;
  assert.deepEqual(playback(a, score), stock);
  origin.tieDestination.bendPoints[1].value = 2;
  const changed = playback(a, score);
  origin.gtsTiedBend = true;
  assert.deepEqual(playback(a, score), changed);
});

test('a swung continuation extends the release and a peak uses the whole tie on every pass', () => {
  const score = fixture(), origin = first(score), tail = origin.tieDestination;
  origin.bendPoints[1].offset = 30;
  origin.addBendPoint(new a.model.BendPoint(60, 0));
  for(const point of tail.bendPoints) point.value = 0;
  tail.beat.duration = a.model.Duration.Eighth;
  tail.beat.voice.bar.masterBar.tripletFeel = a.model.TripletFeel.Triplet8th;
  for(const duration of [a.model.Duration.Eighth,a.model.Duration.Quarter,a.model.Duration.Half]){
    const rest = new a.model.Beat();
    rest.duration = duration;
    tail.beat.voice.addBeat(rest);
  }
  score.finish(new a.Settings());
  const bytes = probe.gp(score);
  for(const library of [a,core]){
    const imported = library.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new library.Settings());
    const trace = playback(library,imported);
    const pitch = first(imported).realValue;
    assert.deepEqual(trace.visits,[0,1,0,1]);
    assert.deepEqual(trace.attacks.filter(e=>e[2]===pitch),[[0,4480,pitch],[7680,4480,pitch]]);
    assert.deepEqual(trace.bends.filter(e=>e[1]===pitch&&e[2]===9216).map(e=>e[0]),[2240,9920]);
    assert(trace.bends.some(e=>e[0]===4480&&e[1]===pitch&&e[2]===8192));
  }
});
