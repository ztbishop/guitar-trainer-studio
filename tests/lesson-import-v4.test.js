import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson,verifyLessonScoreHash} from '../js/lesson-import-data.js';
import {explanationLesson} from './lesson-import-v4-fixture.js';

test('version 4 binds an original score and selected recording to a detached explanation plan',async()=>{
  for(const local of [false,true]) {
    const input=explanationLesson({local}),lesson=validateLesson(input);
    assert.equal(lesson.recording.id,lesson.timingPlan.recordingId);
    assert.equal(lesson.syncPoints,null);assert.equal(lesson.keepRecording,false);
    assert.equal(lesson.timingWarning,undefined);assert.equal(lesson.rejectedSyncPoints,undefined);
    assert.notEqual(lesson.timingPlan,input.timingPlan);
    await verifyLessonScoreHash(lesson);
    input.timingPlan.explanations[0].label='changed sender value';
    assert.equal(lesson.timingPlan.explanations[0].label,'Discuss the phrase');
  }
});

test('version 4 never accepts legacy timing fields or incomplete/ambiguous resource choices',()=>{
  const mutations=[p=>p.syncPoints=null,p=>p.syncPoints=undefined,p=>p.syncPoints=[[0,0],[2,7]],
    p=>delete p.score,p=>delete p.recording,p=>delete p.timingPlan,p=>p.keepRecording=true,
    p=>p.recording.id='different-recording',p=>delete p.recording.id,p=>p.recording={kind:'local-choice'},
    p=>p.recording={kind:'local-choice',id:'synthetic-recording',path:'C:/private/lesson.mp4'},
    p=>p.recording.base64='recording bytes',p=>p.score.path='C:/private/original.gpx',
    p=>p.timingPlan.version=2,p=>p.timingPlan.explanations[0].endSeconds=6,
    p=>p.format='lesson-bridge-explanation-preparation',p=>p.sendable=false];
  for(const mutate of mutations){const input=explanationLesson();mutate(input);assert.throws(()=>validateLesson(input));}
});

test('older envelopes cannot smuggle a timingPlan, including null or undefined',()=>{
  for(const version of [1,2,3])for(const timingPlan of [null,undefined,explanationLesson().timingPlan]) {
    const input={...explanationLesson(),version,timingPlan};delete input.recording.id;input.syncPoints=null;
    assert.throws(()=>validateLesson(input),/version-4/);
  }
});

test('original-byte hash mismatch rejects before loading without legacy fallback',async()=>{
  const input=explanationLesson();input.score.base64=btoa('different original bytes');
  const lesson=validateLesson(input);await assert.rejects(verifyLessonScoreHash(lesson),/original score bytes/);
  await verifyLessonScoreHash({score:null});
});

test('review retains the explicit repeat correction rather than rewriting the score',()=>{
  const input=explanationLesson({repeatCorrection:true}),lesson=validateLesson(input);
  assert.deepEqual(lesson.timingPlan.repeatResolution,{kind:'source-visit-plan',omittedOriginalVisits:[3,4]});
  assert.deepEqual([...lesson.score.bytes],[...Uint8Array.from(atob(input.score.base64),c=>c.charCodeAt(0))]);
});
