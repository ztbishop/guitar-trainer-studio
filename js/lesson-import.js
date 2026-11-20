// SPDX-License-Identifier: AGPL-3.0-or-later
// Validate one same-window offer, then orchestrate injected existing app loaders.
import {validateLesson,validateRecordingFile,verifyLessonScoreHash} from './lesson-import-data.js';
import {DRAFT_FORMAT,DRAFT_CAPABILITY} from './draft-timing.js';
import {INTERVAL_TIMING_FORMAT,timingPlanIntervals} from './explanation-timing.js';
export const LESSON_AUTO_IMPORT_KEY='gts.lessonImport.auto';

function repeatAdjustment(plan) {
  const omitted=plan.repeatResolution.omittedOriginalVisits,counts=new Map();
  const passes=plan.originalPlaybackOrder.map(measure=>{const pass=(counts.get(measure)??0)+1;counts.set(measure,pass);return pass;});
  const measures=[...new Set(omitted.map(visit=>plan.originalPlaybackOrder[visit-1]))].sort((a,b)=>a-b),ranges=[];
  for(const measure of measures) {
    const last=ranges.at(-1);
    if(last && measure===last[1]+1)last[1]=measure;else ranges.push([measure,measure]);
  }
  const label=ranges.slice(0,4).map(([first,last])=>first===last?String(first):`${first}–${last}`).join(', ')+(ranges.length>4?' and others':'');
  return `Skip ${omitted.every(visit=>passes[visit-1]===2)?'the second pass of':'extra repeats of'} ${measures.length===1?'measure':'measures'} ${label} to match this recording. Original score stays unchanged.`;
}

export function initLessonImport({loadFile,mediaControls,state,practiceReference=null}) {
  let pending=null,busy=false,reviewing=false,generation=0,ownLoad=false,recordingFile=null;
  let autoImport=true;
  try{autoImport=window.localStorage?.getItem(LESSON_AUTO_IMPORT_KEY)!=='false';}catch{ /* Keep the first-use default if storage is unavailable. */ }
  const autoOption=document.getElementById('lesson-import-auto');
  if(autoOption) {
    autoOption.checked=autoImport;
    autoOption.addEventListener('change',()=>{
      autoImport=autoOption.checked===true;
      try{window.localStorage?.setItem(LESSON_AUTO_IMPORT_KEY,String(autoImport));}catch{ /* The choice still applies to this session. */ }
    });
  }
  const supportsExplanationTiming=()=>mediaControls.explanationTimingCapability==='explanation-timing-v1';
  const supportsReference=()=>practiceReference?.capability==='reference-only-v1';
  const supportsDraft=()=>mediaControls.draftTimingCapability===DRAFT_CAPABILITY;
  const supportsScoreTimingMatch=()=>mediaControls.scoreTimingMatchCapability==='score-timing-match-v1';
  function requirePlanSupport(plan) {
    if(plan.format===INTERVAL_TIMING_FORMAT) {
      if(!supportsScoreTimingMatch())throw new Error('This trainer cannot apply matched score timing.');
    } else if(!supportsExplanationTiming())throw new Error('This trainer cannot apply explanation-aware timing.');
  }
  const dialog=document.createElement('dialog');dialog.id='lesson-import-dialog';dialog.className='lesson-import-dialog';
  const heading=document.createElement('h2');heading.textContent='Import lesson from Lesson Bridge?';
  heading.id='lesson-import-heading';dialog.setAttribute('aria-labelledby',heading.id);
  const description=document.createElement('p'),status=document.createElement('p');status.setAttribute('role','status');
  const resources=document.createElement('dl');resources.id='lesson-import-resources';resources.hidden=true;
  const resourceValues={};
  for(const label of ['Lesson','Score','Recording']) {
    const term=document.createElement('dt'),value=document.createElement('dd');term.textContent=label;
    resourceValues[label]=value;resources.append(term,value);
  }
  const note=document.createElement('p');note.textContent='Import replaces the open score. Unsaved alignment and practice results will be cleared. Nothing is saved to the library automatically.';
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.type='button';
  const accept=document.createElement('button');accept.textContent='Import lesson';accept.type='button';
  const localRecording=document.createElement('div');localRecording.id='lesson-local-recording';localRecording.hidden=true;
  const choose=document.createElement('button');choose.type='button';choose.textContent='Choose recording…';choose.id='lesson-choose-recording';
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='audio/*,video/*';fileInput.hidden=true;fileInput.id='lesson-recording-file';
  const fileLabel=document.createElement('p');fileLabel.id='lesson-recording-name';fileLabel.setAttribute('role','status');
  const fileHelp=document.createElement('p');fileHelp.textContent='Choose the matching recording, then Import lesson. The file stays on this computer.';
  localRecording.append(choose,fileInput,fileLabel,fileHelp);
  const timingReview=document.createElement('p');timingReview.id='lesson-timing-review';timingReview.hidden=true;
  const repeatReview=document.createElement('p');repeatReview.id='lesson-repeat-review';repeatReview.hidden=true;
  const repeatWarning=document.createElement('strong');repeatReview.append(repeatWarning);
  const details=document.createElement('details');details.id='lesson-import-details';details.hidden=true;
  const detailsLabel=document.createElement('summary');detailsLabel.textContent='Details';
  const recordingIdentity=document.createElement('p'),repeatDetails=document.createElement('p'),omissionDetails=document.createElement('p'),sourceDetails=document.createElement('p');
  details.append(detailsLabel,recordingIdentity,repeatDetails,omissionDetails,sourceDetails);
  function syncAccept(){accept.disabled=busy || !pending || pending.recording?.kind==='local-choice' && !recordingFile;}
  function resetRecording(){recordingFile=null;fileInput.value='';fileLabel.textContent='No recording selected.';choose.disabled=false;localRecording.hidden=true;
    resources.hidden=true;description.hidden=false;details.open=false;details.hidden=true;timingReview.hidden=true;repeatReview.hidden=true;}
  choose.addEventListener('click',()=>{if(!busy && pending?.recording?.kind==='local-choice')fileInput.click();});
  fileInput.addEventListener('change',()=>{
    if(busy || pending?.recording?.kind!=='local-choice')return;
    const file=fileInput.files[0];if(!file)return;
    recordingFile=null;fileLabel.textContent='No recording selected.';resourceValues.Recording.textContent='Choose a local file';
    try{recordingFile=validateRecordingFile(file);resourceValues.Recording.textContent=recordingFile.name;fileLabel.textContent=recordingFile.name+' · '+(recordingFile.size/1024/1024).toFixed(2)+' MB';status.textContent=(pending.timingPlan?'':'Recording selected. Import lesson to continue.')+(pending.timingWarning?' Imported timing needs manual alignment: '+pending.timingWarning:'');}
    catch(error){status.textContent=error.message;}
    finally{fileInput.value='';syncAccept();}
  });
  const actions=document.createElement('div');actions.className='lesson-import-actions';actions.append(cancel,accept);
  dialog.append(heading,description,resources,timingReview,repeatReview,localRecording,note,details,status,actions);document.body.append(dialog);
  const notice=document.createElement('p');notice.id='lesson-import-notice';notice.className='lesson-import-notice';notice.setAttribute('role','status');notice.hidden=true;document.body.append(notice);
  let noticeTimer;
  const hideNotice=()=>{clearTimeout(noticeTimer);notice.hidden=true;};
  const notify=(text,persistent=false)=>{hideNotice();notice.textContent=text;notice.hidden=false;if(!persistent)noticeTimer=setTimeout(hideNotice,6000);};
  const clear=()=>{pending=null;generation++;resetRecording();dialog.close();};
  cancel.addEventListener('click',()=>{if(!busy)clear();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();else clear();});
  const current=token=>{if(token!==generation)throw new Error('Import cancelled because another score was opened.');};
  async function waitForScore(lesson,token) {
    const deadline=performance.now()+25000;
    while(performance.now()<deadline) {
      current(token);
      const score=state.currentScoreFile;
      if(state.playerReady && state.playbackTimeline && score?.fileName===lesson.score.fileName &&
        score.bytes?.length===lesson.score.bytes.length && score.bytes.every((b,i)=>b===lesson.score.bytes[i]))return;
      await new Promise(resolve=>setTimeout(resolve,40));
    }
    throw new Error('The score player did not become ready. Check the score, then retry.');
  }
  async function importPendingLesson({automatic=false}={}) {
    if(busy || !pending)return;
    if(pending.recording?.kind==='local-choice' && !recordingFile){status.textContent='Choose a recording before importing.';return;}
    const lesson=pending,recording=lesson.recording?.kind==='local-choice'?{kind:'local',file:recordingFile,label:recordingFile.name,...(lesson.timingPlan||lesson.draftTiming?{id:lesson.recording.id}:{})}:lesson.recording,token=++generation;let success=false;
    busy=true;accept.disabled=cancel.disabled=choose.disabled=true;status.textContent=lesson.score?'Opening score…':'Loading recording…';
    if(automatic)notify('Importing lesson…',true);
    try {
      practiceReference?.clear();
      if(lesson.recordingMode==='reference-only'&&!supportsReference())throw new Error('Independent reference recordings are unsupported.');
      if(lesson.draftTiming && !supportsDraft())throw new Error('Draft timing is unsupported.');
      if(lesson.timingPlan)requirePlanSupport(lesson.timingPlan);
      const retained=lesson.score && !lesson.recording && lesson.keepRecording?mediaControls.captureRecording():null;
      if(lesson.keepRecording && lesson.score && !lesson.recording && !retained)throw new Error('There is no current recording to retain. Choose no recording or provide a link.');
      if(retained?.source.kind==='embedded')throw new Error('Embedded backing audio belongs to the current score. Provide a recording link or choose no recording.');
      if(lesson.score) {
        ownLoad=true;let accepted;
        try{accepted=await loadFile(new File([lesson.score.bytes],lesson.score.fileName));}finally{ownLoad=false;}
        if(!accepted)throw new Error('The score could not be opened, or its loading was superseded.');
        await waitForScore(lesson,token);current(token);
      } else if(!state.currentScoreFile || !state.playerReady)throw new Error('Load a score in Guitar Trainer before sending recording/timing alone.');
      let readyToPractice=true,timingWarning=lesson.timingWarning??null;
      if(lesson.recordingMode==='reference-only'){
        await practiceReference.load(recording);current(token);mediaControls.finishEditing();readyToPractice=true;
      } else if(lesson.draftTiming) {
        await mediaControls.importDraft(recording,lesson.draftTiming);current(token);readyToPractice=false;
      } else if(lesson.timingPlan) {
        status.textContent='Validating musical visits, recording breaks and the selected recording…';
        const result=await mediaControls.importLesson(recording,null,{timingPlan:lesson.timingPlan,recordingId:lesson.recording.id});current(token);
        if(!result?.readyToPractice || result.timingWarning)throw new Error(result?.timingWarning || 'Imported timing was not applied.');
        readyToPractice=true;
      } else if(lesson.recording || lesson.syncPoints || retained || !lesson.score && timingWarning) {
        status.textContent='Applying selected recording and alignment…';
        const result=await mediaControls.importLesson(recording,lesson.syncPoints,{retained,
          timingWarning,rejectedSyncPoints:lesson.rejectedSyncPoints??null});current(token);
        readyToPractice=result.readyToPractice;timingWarning=result.timingWarning??timingWarning;
      } else mediaControls.finishEditing();
      notify(lesson.recordingMode==='reference-only'?'Practice score ready. Reference recording is independent and unsynchronized. Use its own controls; Wait and grading follow the score.':lesson.draftTiming?'Draft timing loaded — needs review in Media Sync. Recording grading is paused. Export the draft to keep your work.':timingWarning?'Imported timing was not applied. '+timingWarning+(readyToPractice?' Score loaded; practice with synth or add a recording.':' Review alignment in Media Sync before practicing with the recording.'):
        readyToPractice?'Lesson ready. Press Play to practice. Saving is optional.':'Recording loaded. Add alignment in Media Sync, then Finish editing to practice.');
      success=true;
    } catch(error) {hideNotice();heading.textContent='Import needs attention';status.textContent=error.message+' The import did not finish; any successfully opened score remains available.';}
    finally {
      pending=null;resetRecording();busy=false;note.hidden=true;accept.hidden=true;cancel.disabled=false;cancel.textContent='Close';
      if(lesson.timingPlan){description.hidden=true;resources.hidden=false;}
      if(success){dialog.close();document.getElementById('play-pause-button')?.focus();}
      else {if(!dialog.open)dialog.showModal();cancel.focus();}
    }
  }
  accept.addEventListener('click',()=>importPendingLesson());
  window.addEventListener('message',async event=>{
    if(event.source!==window || event.origin!==location.origin || typeof event.data?.id!=='string' || event.data.id.length>100)return;
    if(event.data.type==='gts-lesson-capabilities-request') {
      const supported=supportsExplanationTiming(),matched=supportsScoreTimingMatch(),draft=supportsDraft();
      window.postMessage({type:'gts-lesson-capabilities',id:event.data.id,lessonVersions:[...(draft?[1,2,3,4,5]:supported||matched?[1,2,3,4]:[1,2,3]),...(supportsReference()?[6]:[])],
        ...(supportsReference()?{recordingModes:['reference-only-v1']}:{}),
        timingPlans:[...(supported?[{format:'musical-visits-and-explanations',version:1,capability:'explanation-timing-v1'}]:[]),
          ...(matched?[{format:INTERVAL_TIMING_FORMAT,version:1,capability:'score-timing-match-v1'}]:[]),
          ...(draft?[{format:DRAFT_FORMAT,version:1,capability:DRAFT_CAPABILITY}]:[])]},location.origin);return;
    }
    if(event.data.type!=='gts-lesson-offer')return;
    const reply=(ok,message)=>window.postMessage({type:'gts-lesson-reply',id:event.data.id,ok,message},location.origin);
    if(busy || reviewing || dialog.open){reply(false,'Another lesson import is in progress or awaiting review. Finish or close it first.');return;}
    const token=++generation;
    try {
      reviewing=true;resetRecording();
      const lesson=validateLesson(event.data.payload);
      if(lesson.draftTiming) {
        if(!supportsDraft())throw new Error('Draft timing is unsupported.');
        await verifyLessonScoreHash(lesson);current(token);
      }
      if(lesson.timingPlan) {
        requirePlanSupport(lesson.timingPlan);
        await verifyLessonScoreHash(lesson);current(token);
      }
      if(lesson.recordingMode==='reference-only'&&!supportsReference())throw new Error('Independent reference recordings are unsupported.');
      pending=lesson;
      hideNotice();
      heading.textContent='Import lesson from Lesson Bridge?';note.hidden=false;
      if(!pending.score && (!state.currentScoreFile || !state.playerReady))throw new Error('Load a score in Guitar Trainer before sending recording/timing alone.');
      description.textContent=`${pending.title} · ${pending.score?pending.score.fileName:'keep current score: '+state.currentScoreFile.fileName} · from ${new URL(pending.lessonUrl).origin} · ${pending.recording?.kind==='local-choice'?'choose a local recording here':pending.recording?'recording from '+new URL(pending.recording.url).origin:pending.keepRecording?'keep current recording':'no recording'} · ${pending.timingPlan?'explanation-aware timing':pending.timingWarning?'timing needs manual alignment':pending.syncPoints?pending.syncPoints.length+' timing points':'no new timing'}`;
      note.textContent=pending.score?'The score will be replaced. Changing score or recording discards incompatible alignment; supply matching timing or align manually. Nothing saves automatically.':'Only selected components will be updated. Replacing a recording clears its previous alignment; timing-only updates keep the current score and recording. Saving remains optional.';
      status.textContent=pending.timingWarning?'The selected resources can still load. Imported timing needs manual alignment: '+pending.timingWarning:'';cancel.textContent='Cancel';accept.hidden=false;
      if(pending.timingPlan) {
        const plan=pending.timingPlan,omitted=plan.repeatResolution.omittedOriginalVisits,restOmissions=plan.scoreOmissions??[];
        const intervals=timingPlanIntervals(plan),rests=intervals.filter(interval=>interval.kind==='unmatched-source-rest').length,explanations=intervals.length-rests;
        heading.textContent='Import lesson?';description.hidden=true;resources.hidden=false;
        resourceValues.Lesson.textContent=pending.title;resourceValues.Score.textContent=pending.score.fileName;
        resourceValues.Recording.textContent=pending.recording.kind==='local-choice'?'Choose a local file':`${pending.recording.label} (${new URL(pending.recording.url).hostname})`;
        note.textContent='Import lesson uses this recording and replaces the open score. Nothing plays or saves automatically.';
        timingReview.hidden=false;timingReview.textContent=`${plan.musicalVisits.length} musical visit${plan.musicalVisits.length===1?'':'s'} · ${explanations} explanation break${explanations===1?'':'s'}${rests?` · ${rests} unscored break${rests===1?'':'s'}`:''}.`;
        repeatReview.hidden=!omitted.length && !restOmissions.length;
        repeatWarning.textContent=[omitted.length?repeatAdjustment(plan):'',restOmissions.length?`Skip ${restOmissions.length} silent measure visit${restOmissions.length===1?'':'s'} in this recording. Original score stays unchanged.`:''].filter(Boolean).join(' ');
        details.hidden=false;recordingIdentity.textContent=`Recording ID: ${plan.recordingId}`;
        repeatDetails.hidden=!omitted.length;repeatDetails.textContent=omitted.length?`Skipped original playback visits: ${omitted.join(', ')}.`:'';
        omissionDetails.hidden=!restOmissions.length;omissionDetails.textContent=restOmissions.length?`Silent score omissions (checked against the original score before applying): ${restOmissions.map(item=>`visit ${item.originalVisit}, measure ${item.scoreMeasure}, pass ${item.occurrence}`).join('; ')}.`:'';
        sourceDetails.textContent=`Lesson source: ${new URL(pending.lessonUrl).origin}. Original score bytes, playback order and recording length are checked before timing is applied.`;
        status.textContent='';
      }
      if(pending.recordingMode==='reference-only'){heading.textContent='Import practice score with reference recording?';note.textContent='The recording uses independent controls. No alignment is supplied or estimated. Video play and seek do not affect score transport, Wait or grading. Nothing plays or saves automatically.';status.textContent='Reference only — not synchronized.';}
      if(pending.draftTiming){heading.textContent='Import draft timing?';status.textContent='Draft timing needs review. Recording grading stays paused until reviewed timing passes validation.';}
      localRecording.hidden=pending.recording?.kind!=='local-choice';syncAccept();
      if(autoImport && !pending.draftTiming && pending.recording?.kind!=='local-choice') {
        // Acknowledge receipt before awaiting score/media loads; the sender has a short reply timeout.
        reply(true,'Importing lesson in Guitar Trainer.');void importPendingLesson({automatic:true});
      } else {dialog.showModal();cancel.focus();reply(true,'Review the lesson in Guitar Trainer.');}
    } catch(error) {pending=null;resetRecording();reply(false,error.message.includes('Load a score') || [4,5,6].includes(event.data.payload?.version)?error.message:'The lesson payload is invalid or unsupported. Rescan and select supported resources.');}
    finally{reviewing=false;}
  });
  return {scoreLoading(){practiceReference?.clear();if(!ownLoad){hideNotice();generation++;pending=null;resetRecording();if(dialog.open && !busy)dialog.close();}}};
}
