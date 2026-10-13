// Small public test material; no external download or user recordings.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const destination=new URL('./.media-fixtures/',import.meta.url);mkdirSync(destination,{recursive:true});
const measures=Array.from({length:4},(_,i)=>`<measure number="${i+1}">${i===0?'<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><sound tempo="120"/></direction>':''}${['C','D','E','G'].map(step=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')}</measure>`).join('');
writeFileSync(new URL('media-demo.musicxml',destination),`<?xml version="1.0"?><score-partwise version="3.1"><work><work-title>Media sync demo</work-title></work><part-list><score-part id="P1"><part-name>Guitar</part-name><score-instrument id="I1"><instrument-name>Guitar</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>25</midi-program></midi-instrument></score-part></part-list><part id="P1">${measures}</part></score-partwise>`);
const rate=16000,seconds=10,samples=rate*seconds,buffer=Buffer.alloc(44+samples*2);
buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++){const phase=(i/rate)%0.5,gain=phase<0.12?0.15*(1-phase/0.12):0;buffer.writeInt16LE(Math.round(Math.sin(i/rate*2*Math.PI*440)*gain*32767),44+i*2);}
writeFileSync(new URL('media-demo.wav',destination),buffer);
const native=createRequire(import.meta.url)('../assets/vendor/alphatab/alphaTab.js');
const settings=new native.Settings(),parser=new native.importer.AlphaTexImporter();parser.initFromString('\\title "Embedded media demo" \\tempo 120 . 0.6.4 1.6.4 2.6.4 3.6.4 | 0.5.4 1.5.4 2.5.4 3.5.4',settings);
const score=parser.readScore();score.backingTrack=new native.model.BackingTrack();score.backingTrack.rawAudioFile=new Uint8Array(buffer);
score.applyFlatSyncPoints([{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:0},{barIndex:1,barOccurence:0,barPosition:1,millisecondOffset:10000}]);
const exporter=new native.exporter.Gp7Exporter();exporter.init(settings);writeFileSync(new URL('media-embedded.gp',destination),exporter.export(score));
console.log('Generated tests/.media-fixtures score, WAV audio and embedded-backing GP fixtures.');
