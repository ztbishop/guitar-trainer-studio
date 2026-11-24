import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLesson,verifyLessonScoreHash} from '../js/lesson-import-data.js';
import {validateDraft,inspectDraft,checkDraftBinding,reviewedDraftChoice} from '../js/draft-timing.js';
import {validateTimingPlanDuration,validateTimingPlan,planPositionAtTime,planTimeAtTick,planIncludesEvent} from '../js/explanation-timing.js';
import {draftLesson} from './draft-fixture.js';
import {validateProfile} from '../js/media-sync.js';
const options=d=>({scoreSha256:d.scoreSha256,recordingId:d.recordingId,durationMs:10000,timeline:{ticksPerQuarter:960,endTick:1920,tempoMap:[{tick:0,bpm:120,timeMs:0}],measures:[1,2].map((measureNumber,i)=>({measureNumber,occurrence:1,playbackMeasureIndex:i,startTick:i*960,endTick:(i+1)*960})),events:[]}});
const work=d=>({candidatePlan:structuredClone(d.candidatePlan),unresolved:structuredClone(d.unresolved)});
test('local acceptance can grade a complete prefix and play an empty or conflicting draft without grading',()=>{
 const d=draftLesson().draftTiming,w=work(d),p=w.candidatePlan,o=options(d);
 Object.assign(o.timeline,{ambiguousHoldEvidenceComplete:true,ambiguousHoldRanges:[]});
 delete p.explanations;Object.assign(p,{format:'musical-visits-and-intervals',intervals:[],scoreOmissions:[]});
 const snapshot=structuredClone(w);
 const prefix=reviewedDraftChoice(d,w,o);
 assert.deepEqual(prefix.compiled.visits.map(v=>v.originalVisit),[1]);assert.deepEqual(w,snapshot);
 o.timeline.ambiguousHoldRanges=[{startTick:0,endTick:1100,openEnded:false}];
 assert.deepEqual(reviewedDraftChoice(d,w,o).compiled.visits.map(v=>v.originalVisit),[1]);
 p.musicalVisits=[];assert.equal(reviewedDraftChoice(d,w,o).compiled,null);
 assert.throws(()=>reviewedDraftChoice(d,w,{...o,durationMs:0}));
 p.recordingId='different-recording';assert.throws(()=>reviewedDraftChoice(d,w,o));
});
test('review activates only the placed visits and leaves an internal recording gap ungraded',()=>{
 const d=draftLesson().draftTiming,w=work(d),p=w.candidatePlan,o=options(d);
 d.originalPlaybackOrder=[1,2,3];p.originalPlaybackOrder=[1,2,3];
 o.timeline.measures.push({...o.timeline.measures[1],measureNumber:3,playbackMeasureIndex:2,startTick:1920,endTick:2880});
 Object.assign(o.timeline,{endTick:2880,ambiguousHoldEvidenceComplete:true,ambiguousHoldRanges:[]});
 delete p.explanations;
 Object.assign(p,{format:'musical-visits-and-intervals',intervals:[],scoreOmissions:[]});
 Object.assign(p.musicalVisits[1],{originalVisit:3,scoreMeasure:3,endSeconds:7});
 p.musicalVisits[1].anchors.push({offset480:480,seconds:7});
 const inspect=()=>inspectDraft(d,w,o);
 assert.equal(inspect().compiled,null);
 w.unresolved=[];
 assert.throws(()=>validateTimingPlan(p));
 const {compiled,partial}=inspect();assert(partial && compiled);
 assert.throws(()=>validateTimingPlan(compiled.plan));
 assert.equal(compiled.plan.format,'reviewed-musical-passages');
 const profile=validateProfile({id:'passages',name:'Reviewed draft',scoreHash:d.scoreSha256,scoreName:'Original',
  source:{kind:'local',fileName:'fixture.mp4',label:'Fixture',size:100,lastModified:50},durationMs:o.durationMs,timingPlan:compiled.plan,layout:'left'});
 assert.deepEqual(profile.timingPlan,compiled.plan);
 assert.deepEqual([0,1999,2000,4999,5000,7000].map(ms=>planPositionAtTime(compiled,ms).kind),['music','music','unmapped','unmapped','music','after']);
 assert.equal(planPositionAtTime(compiled,2100).visit,null);assert.equal(planTimeAtTick(compiled,1200),null);
 assert.deepEqual([0,960,1920].map(startTick=>planIncludesEvent(compiled,{startTick})),[true,false,true]);
 o.timeline.ambiguousHoldRanges=[{startTick:500,endTick:960,openEnded:false}];assert(inspect().compiled);
 o.timeline.ambiguousHoldRanges=[];o.durationMs=6000;assert.equal(inspect().compiled,null);
 o.durationMs=10000;p.musicalVisits[1].startSeconds=1;p.musicalVisits[1].anchors[0].seconds=1;
 assert.match(inspect().issues.join(' '),/overlap/);
 p.musicalVisits=[];assert.equal(inspect().compiled,null);
});
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
