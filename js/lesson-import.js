// SPDX-License-Identifier: AGPL-3.0-or-later
// Review one same-window offer, then orchestrate injected existing app loaders.
import {validateLesson} from './lesson-import-data.js';
export function initLessonImport({loadFile,mediaControls,state}) {
  let pending=null,busy=false,generation=0,ownLoad=false;
  const dialog=document.createElement('dialog');dialog.id='lesson-import-dialog';dialog.className='lesson-import-dialog';
  const heading=document.createElement('h2');heading.textContent='Import lesson from Lesson Bridge?';
  heading.id='lesson-import-heading';dialog.setAttribute('aria-labelledby',heading.id);
  const description=document.createElement('p'),status=document.createElement('p');status.setAttribute('role','status');
  const note=document.createElement('p');note.textContent='Import replaces the open score. Unsaved alignment and practice results will be cleared. Nothing is saved to the library automatically.';
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.type='button';
  const accept=document.createElement('button');accept.textContent='Import lesson';accept.type='button';
  const actions=document.createElement('div');actions.className='lesson-import-actions';actions.append(cancel,accept);
  dialog.append(heading,description,note,status,actions);document.body.append(dialog);
  const notice=document.createElement('p');notice.id='lesson-import-notice';notice.className='lesson-import-notice';notice.setAttribute('role','status');notice.hidden=true;document.body.append(notice);
  let noticeTimer;
  const hideNotice=()=>{clearTimeout(noticeTimer);notice.hidden=true;};
  const notify=text=>{hideNotice();notice.textContent=text;notice.hidden=false;noticeTimer=setTimeout(hideNotice,6000);};
  const clear=()=>{pending=null;generation++;dialog.close();};
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
  accept.addEventListener('click',async()=>{
    if(busy || !pending)return;
    const lesson=pending,token=++generation;let success=false;
    busy=true;accept.disabled=cancel.disabled=true;status.textContent='Opening score…';
    try {
      const retained=lesson.score && !lesson.recording && lesson.keepRecording?mediaControls.captureRecording():null;
      if(lesson.keepRecording && lesson.score && !lesson.recording && !retained)throw new Error('There is no current recording to retain. Choose no recording or provide a link.');
      if(retained?.source.kind==='embedded')throw new Error('Embedded backing audio belongs to the current score. Provide a recording link or choose no recording.');
      if(lesson.score) {
        ownLoad=true;let accepted;
        try{accepted=await loadFile(new File([lesson.score.bytes],lesson.score.fileName));}finally{ownLoad=false;}
        if(!accepted)throw new Error('The score could not be opened, or its loading was superseded.');
        await waitForScore(lesson,token);current(token);
      } else if(!state.currentScoreFile || !state.playerReady)throw new Error('Load a score in Guitar Trainer before sending recording/timing alone.');
      let readyToPractice=true;
      if(lesson.recording || lesson.syncPoints || retained) {
        status.textContent='Applying selected recording and alignment…';
        ({readyToPractice}=await mediaControls.importLesson(lesson.recording,lesson.syncPoints,{retained}));current(token);
      } else mediaControls.finishEditing();
      notify(readyToPractice?'Lesson ready. Press Play to practice. Saving is optional.':'Recording loaded. Add alignment in Media Sync, then Finish editing to practice.');
      success=true;
    } catch(error) {heading.textContent='Import needs attention';status.textContent=error.message+' The import did not finish; any successfully opened score remains available.';}
    finally {
      pending=null;busy=false;note.hidden=true;accept.hidden=true;cancel.disabled=false;cancel.textContent='Close';
      if(success){dialog.close();document.getElementById('play-pause-button')?.focus();}else cancel.focus();
    }
  });
  window.addEventListener('message',event=>{
    if(event.source!==window || event.origin!==location.origin || event.data?.type!=='gts-lesson-offer' || typeof event.data.id!=='string' || event.data.id.length>100)return;
    const reply=(ok,message)=>window.postMessage({type:'gts-lesson-reply',id:event.data.id,ok,message},location.origin);
    if(busy || dialog.open){reply(false,'An import review is already open. Finish or close it first.');return;}
    try {
      pending=validateLesson(event.data.payload);
      hideNotice();
      heading.textContent='Import lesson from Lesson Bridge?';note.hidden=false;
      if(!pending.score && (!state.currentScoreFile || !state.playerReady))throw new Error('Load a score in Guitar Trainer before sending recording/timing alone.');
      description.textContent=`${pending.title} · ${pending.score?pending.score.fileName:'keep current score: '+state.currentScoreFile.fileName} · from ${new URL(pending.lessonUrl).origin} · ${pending.recording?'recording from '+new URL(pending.recording.url).origin:pending.keepRecording?'keep current recording':'no recording'} · ${pending.syncPoints?pending.syncPoints.length+' timing points':'no new timing'}`;
      note.textContent=pending.score?'The score will be replaced. Changing score or recording discards incompatible alignment; supply matching timing or align manually. Nothing saves automatically.':'Only selected components will be updated. Replacing a recording clears its previous alignment; timing-only updates keep the current score and recording. Saving remains optional.';
      status.textContent='';cancel.textContent='Cancel';accept.hidden=false;accept.disabled=false;
      dialog.showModal();cancel.focus();reply(true,'Review the lesson in Guitar Trainer.');
    } catch(error) {pending=null;reply(false,error.message.includes('Load a score')?error.message:'The lesson payload is invalid or unsupported. Rescan and select supported resources.');}
  });
  return {scoreLoading(){hideNotice();if(!ownLoad){generation++;pending=null;if(dialog.open && !busy)dialog.close();}}};
}
