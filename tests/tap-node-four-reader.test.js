import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const bundle=new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url);
const code=fs.readFileSync(bundle,'utf8'),end=code.lastIndexOf('});'),ctx=vm.createContext({process,console,Map,TextEncoder,TextDecoder});
vm.runInContext(code.slice(0,end)+'exports.node4Probe={JsonConverter,NoteCloner,GpifParser,GpifWriter};'+code.slice(end),ctx);
const a=ctx.alphaTab,m=a.model,{JsonConverter,NoteCloner,GpifParser,GpifWriter}=a.node4Probe;
const coreFile=new URL('../assets/vendor/alphatab/alphaTab.core.mjs',import.meta.url);
const core=coreFile?await import(coreFile):null;
function fixture(marker=-2,type=m.HarmonicType.Tap,node=4){
 const score=new m.Score(),track=new m.Track(),staff=new m.Staff();score.addTrack(track);track.addStaff(staff);track.playbackInfo.secondaryChannel=1;staff.stringTuning=new m.Tuning('Standard',[64,59,55,50,45,40],false);
 for(let bi=0;bi<2;bi++){
  const mb=new m.MasterBar(),bar=new m.Bar(),voice=new m.Voice();mb.isRepeatStart=bi===0;mb.repeatCount=bi===1?2:0;score.addMasterBar(mb);staff.addBar(bar);bar.addVoice(voice);
  for(let ei=0;ei<2;ei++){
   const beat=new m.Beat();beat.duration=m.Duration.Half;voice.addBeat(beat);if(bi===1&&ei===1)continue;
   const n=new m.Note();n.string=4;n.fret=3;n.harmonicType=type;n.harmonicValue=node;n.gtsTappedHarmonicTicks=marker;n.isTieDestination=bi>0||ei>0;beat.addNote(n);
   if(!bi&&!ei){beat.addWhammyBarPoint(new m.BendPoint(0,0));beat.addWhammyBarPoint(new m.BendPoint(60,-4));const partner=new m.Note();partner.string=1;partner.fret=0;beat.addNote(partner);}
  }
 }
 score.finish(new a.Settings());return score;
}
const bytes=s=>new a.exporter.Gp7Exporter().export(s,new a.Settings());
const load=(lib,b)=>lib.importer.ScoreLoader.loadScoreFromBytes(b,new lib.Settings());
function trace(lib,s,smf){const notes=[],wheels=[],handler=new lib.midi.AlphaSynthMidiFileHandler(new lib.midi.MidiFile(),smf);handler.addNote=(_t,tick,length,key)=>notes.push([tick,length,key]);handler.addBend=(_t,tick,_c,value)=>wheels.push([tick,value]);handler.addNoteBend=(_t,tick,_c,_k,value)=>wheels.push([tick,value]);new lib.midi.MidiFileGenerator(s,new lib.Settings(),handler).generate();return {notes,wheels};}
function verify(lib,s,pitch){
 const staff=s.tracks[0].staves[0],first=staff.bars[0].voices[0].beats[0].notes[0],last=staff.bars[1].voices[0].beats[0].notes[0];
 assert.deepEqual(Array.from(staff.tuning),[64,59,55,50,45,40]);assert.equal(first.tieDestination.tieDestination,last);
 for(const n of [first,first.tieDestination,last])assert.deepEqual([n.string,n.fret,n.harmonicType,n.harmonicValue,n.realValue],[4,3,lib.model.HarmonicType.Tap,4,pitch]);
 for(const smf of [false,true]){const actual=trace(lib,s,smf);assert.deepEqual(actual.notes.sort(),[[0,5760,pitch],[0,1920,40],[7680,5760,pitch],[7680,1920,40]].sort());assert(actual.wheels.some(([,v])=>v<8192),'Native downward whammy remains');}
}
test('only native-duration node-4 marker changes pitch; repeats, chord partner, ties and normal/SMF whammy remain',()=>{
 for(const lib of [a,core].filter(Boolean)){
  const marked=load(lib,bytes(fixture())),ordinary=load(lib,bytes(fixture(0)));verify(lib,marked,62);verify(lib,ordinary,86);
  for(const smf of [false,true])assert.deepEqual(trace(lib,marked,smf).wheels,trace(lib,ordinary,smf).wheels);
  for(const marker of [-1,320,960,1600,5760])verify(lib,load(lib,bytes(fixture(marker))),86);
 }
});
test('node-4 marker survives GP re-export, cloning and both worker codecs with all tie endpoints',async()=>{
 const parsed=load(a,bytes(fixture())),n=parsed.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];assert.equal(NoteCloner.clone(n).gtsTappedHarmonicTicks,-2);
 const worker=JsonConverter.jsObjectToScore(structuredClone(JsonConverter.scoreToJsObject(parsed)),new a.Settings());verify(a,worker,62);verify(a,load(a,bytes(worker)),62);
 if(core){verify(core,load(core,bytes(worker)),62);const c=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(coreFile,'utf8')+'\nexport {JsonConverter as __node4Codec};').toString('base64')),codec=c.__node4Codec;verify(core,codec.jsObjectToScore(structuredClone(codec.scoreToJsObject(load(core,bytes(fixture())))),new core.Settings()),62);}
});
test('malformed GPIF values cannot opt ordinary node 4 into the practice pitch',()=>{
 const xml=new GpifWriter().writeXml(fixture());assert(xml.includes('GtsTappedHarmonicTicks'));
 for(const value of ['0','-3','-2.5','NaN','Infinity','garbage']){const parser=new GpifParser();parser.parseXml(xml.replace(/(<Property name="GtsTappedHarmonicTicks">\s*<Number>)-2(<\/Number>)/g,'$1'+value+'$2'),new a.Settings());verify(a,parser.score,86);}
});
test('malformed worker markers and other harmonic identities stay native',()=>{
 for(const value of [-3,-2.5,'-2',true,NaN,Infinity,null]){
  const object=structuredClone(JsonConverter.scoreToJsObject(fixture()));let found=0;const visit=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of o instanceof Map?o:Object.entries(o)){if(k.toLowerCase()==='gtstappedharmonicticks'){if(o instanceof Map)o.set(k,value);else o[k]=value;found++;}else visit(v);}};visit(object);assert.equal(found,3);verify(a,JsonConverter.jsObjectToScore(object,new a.Settings()),86);
 }
 for(const type of [m.HarmonicType.None,m.HarmonicType.Natural,m.HarmonicType.Pinch,m.HarmonicType.Semi]){
  const marked=fixture(-2,type),ordinary=fixture(0,type);assert.deepEqual(trace(a,load(a,bytes(marked)),false),trace(a,load(a,bytes(ordinary)),false));
 }
});
test('core worker decoder refuses nonnumeric or unsupported node-4 marker values',{skip:!coreFile},async()=>{
 const c=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(coreFile,'utf8')+'\nexport {JsonConverter as __node4Codec};').toString('base64')),codec=c.__node4Codec;
 for(const value of ['-2',-2.5,-3,true,null]){
  const object=structuredClone(codec.scoreToJsObject(load(core,bytes(fixture()))));
  const visit=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of o instanceof Map?o:Object.entries(o)){if(k.toLowerCase()==='gtstappedharmonicticks'){if(o instanceof Map)o.set(k,value);else o[k]=value;}else visit(v);}};visit(object);verify(core,codec.jsObjectToScore(object,new core.Settings()),86);
 }
});
