import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson,verifyLessonScoreHash} from '../js/lesson-import-data.js';
import {validateProfile,parseProfileExport,MEDIA_PROFILE_FORMAT} from '../js/media-sync.js';
import {validateBackup,LIBRARY_FORMAT} from '../js/library-store.js';
import {intervalLesson} from './lesson-import-interval-fixture.js';

test('interval lesson preserves distinct source blanks, explanations, ordinary rests and exact original-byte identity',async()=>{
  for(const local of [false,true]) {
    const input=intervalLesson({local}),lesson=validateLesson(input);await verifyLessonScoreHash(lesson);
    assert.equal(lesson.timingPlan.format,'musical-visits-and-intervals');assert.deepEqual(lesson.timingPlan,input.timingPlan);
    assert.equal(lesson.timingPlan.intervals.filter(interval=>interval.kind==='explanation').length,2);
    assert.equal(lesson.timingPlan.intervals.filter(interval=>interval.kind==='unmatched-source-rest').length,4);
    assert.equal(Object.hasOwn(lesson.timingPlan,'explanations'),false);
    assert.deepEqual(lesson.timingPlan.scoreOmissions.map(omission=>omission.originalVisit),[1,3,7]);
    assert(lesson.timingPlan.musicalVisits.some(visit=>visit.originalVisit===5),'a matched ordinary rest remains a musical visit');
    assert.notEqual(lesson.timingPlan,input.timingPlan);assert(Object.isFrozen(lesson.timingPlan.intervals[0]));
    input.timingPlan.intervals[0].label='changed sender label';assert.equal(lesson.timingPlan.intervals[0].label,'Opening blank');
    assert.equal(lesson.recording.id,lesson.timingPlan.recordingId);assert.equal(lesson.syncPoints,null);
  }
});

test('interval envelopes reject ambiguous timing formats, malformed omission accounts and unsupported metadata',()=>{
  const mutations=[p=>p.syncPoints=null,p=>p.syncPoints=undefined,p=>p.timingPlan.explanations=[],p=>delete p.timingPlan.intervals,
    p=>delete p.timingPlan.scoreOmissions,p=>p.timingPlan.intervals[0].kind='silence',p=>p.timingPlan.intervals[0].sourceSlot=1,
    p=>p.timingPlan.scoreOmissions[0].reason='unmatched-music',p=>p.timingPlan.scoreOmissions[0].occurrence=2,
    p=>p.timingPlan.scoreOmissions.pop(),p=>p.timingPlan.scoreOmissions.push({...p.timingPlan.scoreOmissions[0]}),
    p=>p.timingPlan.repeatResolution={kind:'source-visit-plan',omittedOriginalVisits:[1]},p=>p.recording.id='other-recording',
    p=>p.timingPlan.intervals[1].endSeconds=4.5,p=>p.timingPlan.version=2];
  for(const mutate of mutations){const input=intervalLesson();mutate(input);assert.throws(()=>validateLesson(input));}
  for(const version of [1,2,3])assert.throws(()=>validateLesson({...intervalLesson(),version}),/version-4/);
});

test('interval plans keep original-byte verification before loading',async()=>{
  const input=intervalLesson();input.score.base64=Buffer.from('other bytes').toString('base64');
  await assert.rejects(verifyLessonScoreHash(validateLesson(input)),/original score bytes/);
});

test('interval profiles and versioned backups preserve the complete plan without legacy anchors',async()=>{
  const lesson=intervalLesson(),profile={id:'interval-profile',name:'Matched intervals',scoreHash:lesson.timingPlan.scoreSha256,
    scoreName:lesson.score.fileName,source:{kind:'url',url:lesson.recording.url,label:lesson.recording.label},durationMs:15000,layout:'left',timingPlan:lesson.timingPlan};
  const checked=validateProfile(profile);assert.deepEqual(checked.timingPlan,lesson.timingPlan);assert.equal(Object.hasOwn(checked,'points'),false);
  assert.throws(()=>validateProfile({...profile,scoreHash:'c'.repeat(64)}),/different score/);
  assert.throws(()=>validateProfile({...profile,durationMs:2000}),/recording duration/);
  assert.throws(()=>validateProfile({...profile,points:[]}),/ordinary sync points/);
  assert.throws(()=>validateProfile({...profile,timingPlan:{...profile.timingPlan,version:2}}));
  assert.deepEqual(parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:2,profiles:[profile]})[0].timingPlan,lesson.timingPlan);
  const backup=await validateBackup({format:LIBRARY_FORMAT,version:3,folders:[],scores:[],mediaProfiles:[profile]});
  assert.deepEqual(backup.mediaProfiles[0].timingPlan,lesson.timingPlan);
  assert.throws(()=>parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:1,profiles:[profile]}));
  await assert.rejects(validateBackup({format:LIBRARY_FORMAT,version:2,folders:[],scores:[],mediaProfiles:[profile]}));
});
