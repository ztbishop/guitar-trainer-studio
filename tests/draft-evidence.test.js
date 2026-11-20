import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as at from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {compileTimingPlan} from '../js/explanation-timing.js';
const root=process.env.GTS_DRAFT_EVIDENCE;
test('four supplied saved controls: ambiguous excerpts, two incomplete sounding endings, exact-duration positive', {skip:!root},()=>{
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
 for(const id of ['97311','97322','97326']){const p=read(id+'-passages.json');if(id==='97311')assert(p.mapping.some(m=>m.strict.length>1));else assert(p.sourceOrder.slice(p.timingEnd[0]).some(n=>p.source.find(m=>m.measure===n)?.notes.length));}
 const artifact=read('97330-match.json'),p=artifact.preparation,record=read('original-results.json').find(r=>r.id==='97330').originals[0];
 const bytes=fs.readFileSync(record.file),settings=new at.Settings(),score=at.importer.ScoreLoader.loadScoreFromBytes(bytes,settings),midi=new at.midi.MidiFile(),g=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));g.generate();
 const timeline=buildPlaybackTimeline(g.tickLookup,{score,ticksPerQuarter:midi.division,tempo:score.tempo}),keys=['visit','scoreMeasure','occurrence','originalVisit'],kept=new Set(p.musicalVisits.map(v=>v.originalVisit));
 const plan={format:'musical-visits-and-intervals',version:1,scoreSha256:p.score.sha256,sourceSha256:p.source.sha256,timingSha256:p.timing.sha256,recordingId:p.recording.id,originalPlaybackOrder:p.originalPlaybackOrder,
 musicalVisits:p.musicalVisits.map(v=>({...Object.fromEntries(keys.map(k=>[k,v[k]])),startSeconds:v.startSeconds,endSeconds:v.endSeconds,anchors:v.anchors.map(a=>({offset480:a.offset480,seconds:a.seconds}))})),
 intervals:p.explanations.map(e=>({id:e.id,kind:'explanation',label:e.label,startSeconds:e.startSeconds,endSeconds:e.endSeconds,boundary:e.boundary})),repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]},
 scoreOmissions:timeline.measures.flatMap((v,i)=>kept.has(i+1)?[]:[{originalVisit:i+1,scoreMeasure:v.measureNumber,occurrence:v.occurrence,reason:'unmatched-full-rest'}])};
 const compiled=compileTimingPlan(plan,{timeline,scoreSha256:createHash('sha256').update(bytes).digest('hex'),recordingId:p.recording.id,durationMs:64.42666666666666*1000});
 assert.equal(compiled.visits.at(-1).endSeconds,64.20852700000009);assert.equal(compiled.visits.length,18);assert.equal(compiled.intervals.length,1);
});
