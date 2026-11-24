// Draft evidence is never an executable timing plan.
import {compileTimingPlan,CrossingSustainError,INTERVAL_TIMING_FORMAT,REVIEWED_PASSAGES_FORMAT} from './explanation-timing.js';
export const DRAFT_FORMAT='draft-recording-timing';
export const DRAFT_CAPABILITY='draft-timing-v1';
const fail=message=>{throw new Error('Draft timing: '+message);};
export function copyDraftJson(value) {
  let count=0;
  function check(v,depth=0) {
    if(++count>100000 || depth>32)fail('Evidence is too large or deeply nested.');
    if(v===null || typeof v==='boolean')return;
    if(typeof v==='number'){if(!Number.isFinite(v))fail('Use null for unknown values.');return;}
    if(typeof v==='string'){if(v.length>2000000)fail('Text is too large.');return;}
    if(!v || typeof v!=='object')fail('Only JSON evidence is supported.');
    if(Array.isArray(v)){if(v.length>16384)fail('Too many entries.');for(let i=0;i<v.length;i++){if(!(i in v))fail('Sparse arrays are unsupported.');check(v[i],depth+1);}}
    else for(const [key,child] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))fail('Unsupported evidence key.');check(child,depth+1);}
  }
  check(value);const text=JSON.stringify(value);if(text.length>4000000)fail('Evidence exceeds 4 MB.');return JSON.parse(text);
}
export function validateDraft(input) {
  const keys=['format','version','scoreSha256','recordingId','originalPlaybackOrder','originalTimingText','matchingEvidence','candidatePlan','unresolved'];
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!keys.includes(k)) || keys.some(k=>!Object.hasOwn(input,k)))fail('Invalid fields.');
  const draft=copyDraftJson(input);
  if(draft.format!==DRAFT_FORMAT || draft.version!==1)fail('Unsupported format/version.');
  if(!/^[a-f0-9]{64}$/.test(draft.scoreSha256) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(draft.recordingId) || /^(https?|file|data|javascript):/i.test(draft.recordingId))fail('Invalid score/recording identity.');
  if(!Array.isArray(draft.originalPlaybackOrder)||!draft.originalPlaybackOrder.length||draft.originalPlaybackOrder.length>4096||draft.originalPlaybackOrder.some(n=>!Number.isSafeInteger(n)||n<1||n>4096))fail('Invalid native traversal.');
  if(typeof draft.originalTimingText!=='string'||!draft.originalTimingText.length||draft.originalTimingText.length>2000000)fail('Original timing text is required.');
  if(!draft.matchingEvidence || typeof draft.matchingEvidence!=='object' || !draft.candidatePlan || typeof draft.candidatePlan!=='object' || Array.isArray(draft.candidatePlan))fail('Evidence and candidate plan are required.');
  const candidate=draft.candidatePlan;
  if(!Array.isArray(candidate.musicalVisits)||candidate.musicalVisits.length>4096||candidate.musicalVisits.some(v=>!v||typeof v!=='object'||Array.isArray(v)||!Array.isArray(v.anchors)||v.anchors.some(a=>!a||typeof a!=='object'))||!Array.isArray(candidate.intervals??candidate.explanations)||!Array.isArray(candidate.repeatResolution?.omittedOriginalVisits)||!Array.isArray(candidate.scoreOmissions??[])||(candidate.scoreOmissions??[]).some(o=>!o||typeof o!=='object'))fail('Candidate needs visit/anchor, interval, repeat and omission arrays.');
  if(!Array.isArray(draft.unresolved)||draft.unresolved.length>4096)fail('Invalid unresolved passages.');
  for(const issue of draft.unresolved)if(!issue || Object.keys(issue).some(k=>!['originalVisit','reason'].includes(k)) || !(issue.originalVisit===null || Number.isSafeInteger(issue.originalVisit)&&issue.originalVisit>0&&issue.originalVisit<=draft.originalPlaybackOrder.length) || typeof issue.reason!=='string'||!issue.reason.trim()||issue.reason.length>1000)fail('Invalid unresolved passage.');
  return draft;
}
export function checkDraftBinding(draft,{timeline,scoreSha256,recordingId}) {
  if(draft.scoreSha256!==scoreSha256||draft.recordingId!==recordingId)fail('Score or recording identity changed.');
  if(!timeline || draft.originalPlaybackOrder.length!==timeline.measures.length || draft.originalPlaybackOrder.some((n,i)=>n!==timeline.measures[i].measureNumber))fail('Original native traversal differs.');
}
export function inspectDraft(draft,working,options) {
  working=copyDraftJson(working);
  if(!working || Object.keys(working).some(k=>!['candidatePlan','unresolved','gapSuggestions'].includes(k)) ||
     (working.gapSuggestions!==undefined && !Array.isArray(working.gapSuggestions)))fail('Invalid working draft fields.');
  validateDraft({...draft,candidatePlan:working.candidatePlan,unresolved:working.unresolved});
  const candidate=working.candidatePlan;
  if(!Array.isArray(candidate.musicalVisits)||candidate.musicalVisits.length>4096||candidate.musicalVisits.some(v=>!v||typeof v!=='object'||Array.isArray(v)||!Array.isArray(v.anchors)||v.anchors.some(a=>!a||typeof a!=='object')))fail('Candidate musicalVisits need visit objects and anchor arrays.');
  if(!Array.isArray(candidate.intervals??candidate.explanations)||!Array.isArray(candidate.repeatResolution?.omittedOriginalVisits)||!Array.isArray(candidate.scoreOmissions??[])||(candidate.scoreOmissions??[]).some(o=>!o||typeof o!=='object'))fail('Keep interval, omission and repeat arrays in the candidate.');
  checkDraftBinding(draft,options);
  const issues=[],plan=working.candidatePlan,visits=Array.isArray(plan?.musicalVisits)?plan.musicalVisits:[];
  for(const issue of working.unresolved??[])issues.push(`Visit ${issue.originalVisit??'unassigned'}: ${issue.reason}`);
  for(const visit of visits) {
    const name=`Visit ${visit.originalVisit??'?'} (measure ${visit.scoreMeasure??'?'})`;
    if(!Number.isFinite(visit.startSeconds)||!Number.isFinite(visit.endSeconds))issues.push(name+': missing musical start or endpoint.');
    for(const [label,time] of [['start',visit.startSeconds],['end',visit.endSeconds],...(Array.isArray(visit.anchors)?visit.anchors:[]).map(a=>['anchor '+a.offset480,a.seconds])])
      if(Number.isFinite(time) && time*1000>options.durationMs+1)issues.push(`${name}: ${label} ${time} s is beyond recording duration ${options.durationMs/1000} s.`);
  }
  for(const interval of plan.intervals??plan.explanations??[]) {
    if(!interval || typeof interval!=='object'){issues.push('Invalid recording interval.');continue;}
    for(const key of ['startSeconds','endSeconds'])if(!Number.isFinite(interval[key]))issues.push(`Interval ${interval.id??'?'}: missing ${key}.`);else if(interval[key]*1000>options.durationMs+1)issues.push(`Interval ${interval.id??'?'}: ${interval[key]} s is beyond recording duration ${options.durationMs/1000} s.`);
  }
  const kept=new Set(visits.map(v=>v.originalVisit)),omitted=new Set([...(plan?.repeatResolution?.omittedOriginalVisits??[]),...(plan?.scoreOmissions??[]).map(o=>o.originalVisit)]);
  const missing=draft.originalPlaybackOrder.filter((_,i)=>!kept.has(i+1)&&!omitted.has(i+1)).length;
  const spans=[...visits,...(plan.intervals??[])].filter(s=>s && Number.isFinite(s.startSeconds) && Number.isFinite(s.endSeconds)).sort((a,b)=>a.startSeconds-b.startSeconds);
  const gap=spans.some((s,i)=>i>0 && s.startSeconds>spans[i-1].endSeconds);
  const partial=plan.format===INTERVAL_TIMING_FORMAT && visits.length>0 && (missing>0||gap);
  if(missing&&!partial)issues.push(`${missing} original visits have no musical correspondence.`);
  let compiled=null;
  try {
    if(plan?.scoreSha256!==draft.scoreSha256||plan?.recordingId!==draft.recordingId||JSON.stringify(plan?.originalPlaybackOrder)!==JSON.stringify(draft.originalPlaybackOrder))fail('Candidate identity/traversal must remain bound to the original.');
    let reviewedPlan=plan;
    if(!partial){
      try{compiled=compileTimingPlan(plan,options);}
      catch(error){
        if(!(error instanceof CrossingSustainError))throw error;
        if(plan.explanations){
          const {explanations,...music}=plan;
          reviewedPlan={...music,intervals:explanations.map(interval=>({...interval,kind:'explanation'})),scoreOmissions:[]};
        }
      }
    }
    if(!compiled)compiled=compileTimingPlan({...reviewedPlan,format:REVIEWED_PASSAGES_FORMAT},{...options,allowReviewed:true});
  } catch(error){issues.push(error.message);}
  return {issues,partial,compiled:issues.length?null:compiled};
}
