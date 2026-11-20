import test from 'node:test';import assert from 'node:assert/strict';import {validateLesson} from '../js/lesson-import-data.js';
const offer=()=>({format:'gts-lesson',version:6,title:'Reference',lessonUrl:'https://example.com/lesson',score:{fileName:'practice.gp',base64:btoa('score')},recording:{url:'https://example.com/video.mp4'},recordingMode:'reference-only'});
test('reference schema preserves strict resources and refuses every timing or retention contract',()=>{
 const x=validateLesson(offer());assert.equal(x.recordingMode,'reference-only');assert.equal(x.syncPoints,null);assert.equal(x.keepRecording,false);
 assert.equal(validateLesson({...offer(),recording:{kind:'local-choice'}}).recording.kind,'local-choice');
 for(const field of ['syncPoints','timingPlan','draftTiming','keepRecording','extra'])assert.throws(()=>validateLesson({...offer(),[field]:null}));
 for(const patch of [{score:null},{recording:null},{recordingMode:'estimated'},{recording:{url:'javascript:alert(1)'}},{score:{...offer().score,path:'private'}},{recording:{kind:'local-choice',path:'private'}}])assert.throws(()=>validateLesson({...offer(),...patch}));
 for(const version of [1,2,3,4,5])assert.throws(()=>validateLesson({...offer(),version}));
});
