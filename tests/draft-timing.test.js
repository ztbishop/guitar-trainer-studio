import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLesson,verifyLessonScoreHash} from '../js/lesson-import-data.js';
import {validateDraft,inspectDraft,checkDraftBinding} from '../js/draft-timing.js';
import {validateTimingPlanDuration} from '../js/explanation-timing.js';
import {draftLesson} from './draft-fixture.js';
const options=d=>({scoreSha256:d.scoreSha256,recordingId:d.recordingId,durationMs:10000,timeline:{ticksPerQuarter:960,endTick:1920,tempoMap:[{tick:0,bpm:120,timeMs:0}],measures:[1,2].map((measureNumber,i)=>({measureNumber,occurrence:1,playbackMeasureIndex:i,startTick:i*960,endTick:(i+1)*960})),events:[]}});
const work=d=>({candidatePlan:structuredClone(d.candidatePlan),unresolved:structuredClone(d.unresolved)});
test('draft is explicitly v5; original bytes, precise supplied text and evidence survive without strict reinterpretation',async()=>{
 const input=draftLesson(),copy=structuredClone(input),lesson=validateLesson(input);await verifyLessonScoreHash(lesson);
 assert.deepEqual(input,copy);assert.deepEqual(lesson.draftTiming,input.draftTiming);assert(!lesson.timingPlan);assert(!lesson.syncPoints);
 for(const version of [1,2,3,4])assert.throws(()=>validateLesson({...input,version}));
 for(const field of ['syncPoints','timingPlan','keepRecording'])assert.throws(()=>validateLesson({...input,[field]:null}));
 const bad=structuredClone(input);bad.score.base64=btoa('other original');await assert.rejects(verifyLessonScoreHash(validateLesson(bad)));
});
test('missing endpoint and out-of-duration anchors remain editable evidence, never clamped or applied',()=>{
 const d=validateDraft(draftLesson().draftTiming),w=work(d);w.candidatePlan.musicalVisits[0].anchors.splice(1,0,{offset480:120,seconds:99.123456789});
 const report=inspectDraft(d,w,options(d));assert.equal(report.compiled,null);assert(report.issues.some(i=>i.includes('missing musical')));assert(report.issues.some(i=>i.includes('99.123456789')));
 assert.equal(w.candidatePlan.musicalVisits[0].anchors[1].seconds,99.123456789);assert.equal(d.candidatePlan.musicalVisits[0].anchors.length,2);
});
test('manual endpoint/anchors and explicit resolution permit strict compilation; evidence stays original',()=>{
 const d=validateDraft(draftLesson().draftTiming),w=work(d);w.candidatePlan.musicalVisits[1].endSeconds=7;w.candidatePlan.musicalVisits[1].anchors.push({offset480:480,seconds:7});
 assert.equal(inspectDraft(d,w,options(d)).compiled,null,'declared unresolved status still gates use');w.unresolved=[];
 assert(inspectDraft(d,w,options(d)).compiled);assert.equal(d.candidatePlan.musicalVisits[1].endSeconds,null);
 const changed=options(d);changed.recordingId='other';assert.throws(()=>inspectDraft(d,w,changed));changed.recordingId=d.recordingId;changed.timeline.measures[1].measureNumber=3;assert.throws(()=>checkDraftBinding(d,changed));
});
test('97311-like fuller arrangement cannot discard first sounding visits via draft editing',()=>{
 const d=validateDraft(draftLesson().draftTiming),w=work(d);w.unresolved=[];w.candidatePlan.musicalVisits.pop();w.candidatePlan.explanations=[];
 const report=inspectDraft(d,w,options(d));assert(!report.compiled);assert(report.issues.some(i=>i.includes('no musical correspondence')));
 w.candidatePlan.repeatResolution={kind:'source-visit-plan',omittedOriginalVisits:[2]};assert(!inspectDraft(d,w,options(d)).compiled);
});
test('97330 exact endpoint fits actual duration and never uses rounded displayed 64 seconds',()=>{
 const plan={musicalVisits:[{endSeconds:64.20852700000009}],explanations:[]};assert(validateTimingPlanDuration(plan,64.42666666666666*1000));assert.throws(()=>validateTimingPlanDuration(plan,64000));
});
test('draft bounded JSON rejects non-finite evidence, cycles, huge and unsafe shapes',()=>{
 for(const change of [d=>d.version=2,d=>d.originalTimingText='',d=>d.matchingEvidence={bad:NaN},d=>d.unresolved[0].originalVisit=20,d=>d.extra=true,d=>d.candidatePlan.foo=undefined]){const d=draftLesson().draftTiming;change(d);assert.throws(()=>validateDraft(d));}
 const d=draftLesson().draftTiming;d.matchingEvidence.self=d;assert.throws(()=>validateDraft(d));
});
