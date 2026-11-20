import {createHash} from 'node:crypto';
import {explanationLesson} from './lesson-import-v4-fixture.js';
export function draftLesson() {
  const old=explanationLesson();const candidatePlan=structuredClone(old.timingPlan);
  candidatePlan.musicalVisits[1].endSeconds=null;candidatePlan.musicalVisits[1].anchors.pop();
  const {timingPlan,...rest}=old;
  return {...rest,version:5,draftTiming:{format:'draft-recording-timing',version:1,scoreSha256:timingPlan.scoreSha256,recordingId:old.recording.id,originalPlaybackOrder:[1,2],originalTimingText:'[[0,0],[1,5.000000000000001]]',matchingEvidence:{lesson:'97322/97326-like missing sounding endpoint',verifiedSections:[1],internalAnchors:[[0,0]],ambiguous:[]},candidatePlan,unresolved:[{originalVisit:2,reason:'Missing sounding endpoint'}]}};
}
