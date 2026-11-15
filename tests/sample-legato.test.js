import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';

const file = new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const end = source.lastIndexOf('});');
const context = vm.createContext({ process, console, TextEncoder, TextDecoder, Map });
vm.runInContext(source.slice(0, end) + 'exports.probe={TinySoundFont,Hydra,ByteBuffer,JsonConverter};' + source.slice(end), context);
const a = context.alphaTab, m = a.model;
const { TinySoundFont, Hydra, ByteBuffer, JsonConverter } = a.probe;

function scoreFixture() {
  const score = new m.Score(), track = new m.Track(), staff = new m.Staff();
  score.addTrack(track); track.addStaff(staff);
  track.playbackInfo.program = 27;
  staff.stringTuning = new m.Tuning('Standard', [64, 59, 55, 50, 45, 40], false);
  const master = new m.MasterBar(), bar = new m.Bar(), voice = new m.Voice();
  master.isRepeatStart = true; master.repeatCount = 2;
  master.tempoAutomations.push(m.Automation.buildTempoAutomation(false, 0, 130, 2, true));
  score.addMasterBar(master); staff.addBar(bar); bar.addVoice(voice);
  const quarter = () => {
    const beat = new m.Beat();
    beat.duration = m.Duration.Quarter; voice.addBeat(beat);
    return beat;
  };
  const note = (beat, string, fret) => {
    const n = new m.Note();
    n.string = string; n.fret = fret; beat.addNote(n);
    return n;
  };
  quarter();
  const approach = quarter();
  for (const [string, fret] of [[5, 10], [6, 8]]) {
    const n = note(approach, string, fret);
    n.slideOutType = m.SlideOutType.Legato; n.gtsSlidePlayback = 3;
  }
  const target = quarter(), peak = note(target, 5, 13);
  note(target, 6, 11);
  peak.gtsTiedBend = true;
  for (const [tick, pitch] of [[0, 0], [30, 4], [60, 0]]) peak.addBendPoint(new m.BendPoint(tick, pitch));
  const hold = note(quarter(), 5, 13);
  hold.isTieDestination = true;
  for (const tick of [0, 60]) hold.addBendPoint(new m.BendPoint(tick, 0));
  score.finish(new a.Settings());
  return score;
}

test('sampled legato keeps both written marks and retriggers the target on every visit', () => {
  const bytes = new a.exporter.Gp7Exporter().export(scoreFixture(), new a.Settings());
  for (const library of [a, core]) {
    const settings = new library.Settings();
    const score = library.importer.ScoreLoader.loadScoreFromBytes(bytes, settings);
    const approach = score.tracks[0].staves[0].bars[0].voices[0].beats[1];
    assert(approach.notes.every(n => n.gtsSlidePlayback === 3 && n.slideOutType === m.SlideOutType.Legato && n.slideTarget.fret === n.fret + 3));
    const midi = new library.midi.MidiFile();
    new library.midi.MidiFileGenerator(score, settings, new library.midi.AlphaSynthMidiFileHandler(midi)).generate();
    const notes = library === a
      ? JsonConverter.jsObjectToMidiFile(structuredClone(JsonConverter.midiFileToJsObject(midi))).tracks[0].events
      : midi.tracks[0].events;
    const attacks = Array.from(notes).filter(e => e instanceof library.midi.NoteOnEvent).map(e => [e.tick, e.noteKey, e.sampleOffsetMs]);
    const expected = [[960,69,0],[960,72,0],[1776,70,200],[1776,73,200],[1848,71,200],[1848,74,200],[1920,72,0],[1920,75,0]];
    assert.deepEqual(attacks, [...expected,...expected.map(([tick,key,offset]) => [tick+3840,key,offset])]);
    for (const end of [3840,7680]) {
      assert(notes.some(e => e instanceof library.midi.NoteOffEvent && e.tick === end && e.noteKey === 72));
    }
    const smf = new library.midi.MidiFile();
    new library.midi.MidiFileGenerator(score, settings, new library.midi.AlphaSynthMidiFileHandler(smf,true)).generate();
    assert(smf.tracks.every(t => t.events.every(e => !e.sampleOffsetMs)));
  }
});

test('the synth starts an offset note at the correct loop phase and an ordinary note at the sample start', () => {
  const hydra = new Hydra();
  const soundFont = fs.readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2', import.meta.url));
  hydra.load(ByteBuffer.fromBuffer(Uint8Array.from(soundFont)));
  for (const [key, milliseconds, expected] of [[70,200,792],[71,200,720],[65,300,758],[75,0,0]]) {
    const synth = new TinySoundFont(44100);
    synth.loadPresets(hydra, new Set([27]), new Set(), false);
    synth.channelSetPresetNumber(0, 27);
    const note = new a.midi.NoteOnEvent(0, 0, 0, key, 75, milliseconds);
    synth.processMidiMessage(JsonConverter.jsObjectToMidiEvent(structuredClone(JsonConverter.midiEventToJsObject(note))));
    assert.equal(synth._voices.find(v => v.playingKey === key).sourceSamplePosition, expected);
  }
});
