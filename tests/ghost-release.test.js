import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe,performance,connections} from './right-hand-tap-fixtures.cjs';

const probe=tapProbe(),a=probe.at;
function fixture(){
 const m=a.model,score=new m.Score(),master=new m.MasterBar(),track=new m.Track(),staff=new m.Staff(),bar=new m.Bar(),voice=new m.Voice();
 score.addMasterBar(master);score.addTrack(track);track.addStaff(staff);
 staff.stringTuning=new m.Tuning('Test',[64,59,55,50,45,40],false);
 staff.addBar(bar);bar.addVoice(voice);
 for(const [i,string,fret] of [[0,1,5],[1,1,0],[2,2,0],[3,1,0]]){
  const beat=new m.Beat(),note=new m.Note();voice.addBeat(beat);beat.duration=m.Duration.Sixteenth;beat.isEmpty=false;
  note.string=string;note.fret=fret;note.isHammerPullOrigin=i===0;note.isGhost=i===1;note.isLetRing=i===1;
  note.ghostReleaseAtBeatEnd=i===1;beat.addNote(note);
 }
 score.finish(new a.Settings());return score;
}
const destination=s=>s.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0];
function releases(at,score){
 const midi=new at.midi.MidiFile(),handler=new at.midi.AlphaSynthMidiFileHandler(midi),add=handler.addNote.bind(handler),notes=[];
 handler.addNote=(track,tick,length,key,velocity,channel)=>{notes.push([track,tick,length,key,velocity,channel]);add(track,tick,length,key,velocity,channel);};
 new at.midi.MidiFileGenerator(score,new at.Settings(),handler).generate();return notes;
}
test('GPIF, clones, worker codec and both playback bundles preserve only the selected ghost release',()=>{
 const bytes=probe.gp(fixture()),model=probe.read(bytes),reference=connections(model),expected=releases(a,model),codec=probe.p.JsonConverter;
 assert.equal([...probe.xml(bytes).matchAll(/name="GtsGhostReleaseAtBeatEnd"/g)].length,1);
 assert(probe.p.NoteCloner.clone(destination(model)).ghostReleaseAtBeatEnd);
 const worker=codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(model)),new a.Settings());
 for(const score of [model,worker,probe.read(probe.gp(model))]){
  const note=destination(score);assert(note.ghostReleaseAtBeatEnd&&note.isGhost&&note.isLetRing&&note.isHammerPullDestination);
  assert.deepEqual(connections(score),reference);assert.deepEqual(releases(a,score),expected);
 }
 const moduleSettings=new core.Settings(),parsed=core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),moduleSettings);
 const reopened=core.importer.ScoreLoader.loadScoreFromBytes(new core.exporter.Gp7Exporter().export(parsed,moduleSettings),moduleSettings);
 for(const score of [parsed,reopened]){assert(destination(score).ghostReleaseAtBeatEnd);assert.deepEqual(releases(core,score),expected);}
 const plain=probe.read(bytes);destination(plain).ghostReleaseAtBeatEnd=false;
 const longer=releases(a,plain);assert.equal(expected.length,4);assert.equal(expected[1][2],240);
 assert.deepEqual(longer,expected.map((e,i)=>i===1?[e[0],e[1],480,...e.slice(3)]:e));
 assert.deepEqual(performance(a,plain).order,performance(a,model).order);
});
test('unmarked or inapplicable properties do not change ordinary let-ring playback',()=>{
 const marked=probe.read(probe.gp(fixture())),note=destination(marked);note.isGhost=false;
 const expected=releases(a,marked);note.ghostReleaseAtBeatEnd=false;
 assert.deepEqual(releases(a,marked),expected);
 const ordinary=probe.read(probe.gp(marked));assert.equal(destination(ordinary).ghostReleaseAtBeatEnd,false);
 assert.doesNotMatch(probe.xml(probe.gp(ordinary)),/GtsGhostReleaseAtBeatEnd/);
});
