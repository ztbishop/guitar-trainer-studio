import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProfile,parseProfileExport,MEDIA_PROFILE_FORMAT} from '../js/media-sync.js';
import {validateBackup,LIBRARY_FORMAT} from '../js/library-store.js';
import {explanationLesson} from './lesson-import-v4-fixture.js';

const profile=()=>{
  const timingPlan=explanationLesson().timingPlan;
  return {id:'explanation-profile',name:'Lesson with commentary',scoreHash:timingPlan.scoreSha256,scoreName:'Original',
    source:{kind:'local',fileName:'lesson.mp4',label:'Lesson recording',size:100,lastModified:50},
    durationMs:11000,timingPlan,layout:'left'};
};
test('explanation profiles retain exact intervals, identity, and original traversal without flattening',()=>{
  const input=profile(),saved=validateProfile({...input,recordingBytes:'never stored'});
  assert.deepEqual(saved,input);assert(!Object.hasOwn(saved,'points'));assert.notEqual(saved.timingPlan,input.timingPlan);
  input.timingPlan.explanations[0].label='mutated';assert.notEqual(saved.timingPlan.explanations[0].label,'mutated');
  const repeat=profile();repeat.timingPlan=explanationLesson({repeatCorrection:true}).timingPlan;
  assert.deepEqual(validateProfile(repeat).timingPlan.repeatResolution.omittedOriginalVisits,[3,4]);
});
test('profile validation rejects incompatible score, duration, versions, and mixed timing',()=>{
  const input=profile();
  assert.throws(()=>validateProfile({...input,points:[]}));
  assert.throws(()=>validateProfile({...input,scoreHash:'c'.repeat(64)}));
  assert.throws(()=>validateProfile({...input,durationMs:6000}));
  assert.throws(()=>validateProfile({...input,timingPlan:{...input.timingPlan,version:2}}));
  assert.throws(()=>parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:1,profiles:[input]}));
  assert.deepEqual(parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:2,profiles:[input]}),[input]);
});
test('library backup version3 preserves explanation profiles and guards older version claims',async()=>{
  const data={format:LIBRARY_FORMAT,version:3,folders:[],scores:[],mediaProfiles:[profile()]};
  assert.deepEqual((await validateBackup(data)).mediaProfiles,data.mediaProfiles);
  await assert.rejects(validateBackup({...data,version:2}));
  await assert.rejects(validateBackup({...data,version:4}));
});
