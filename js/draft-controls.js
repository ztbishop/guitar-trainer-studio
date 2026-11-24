// Draft-only editor. The immutable incoming draft and editable working copy are separate.
import {copyDraftJson,inspectDraft,reviewedDraftChoice} from './draft-timing.js';
import {editDraftPiece} from './draft-alignment.js';
import {draftMusicRanges} from './draft-alignment.js';
import {createDraftTimeline} from './draft-timeline.js';
export function createDraftEditor({container,options,transport,highlight,stop,apply,exportFile}) {
  const panel=document.createElement('section');panel.id='media-draft-timing';panel.hidden=true;
  const title=document.createElement('h3');title.textContent='Draft timing — needs review';
  const warning=document.createElement('p');warning.textContent='Editing preview · Not verified synchronization. Grading is paused. Amber areas need review; original timing is preserved.';
  const issues=document.createElement('ul');issues.id='media-draft-issues';issues.setAttribute('role','status');
  const rows=document.createElement('div');rows.id='media-draft-passages';
  const visual=createDraftTimeline({container:rows,options,transport,highlight,change:next=>change(next),error:e=>showError(e)});
  const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Mapping, intervals and unresolved passages (JSON)';
  const text=document.createElement('textarea');text.id='media-draft-json';text.rows=14;text.style.width='100%';text.setAttribute('aria-label','Editable draft timing');
  const commit=document.createElement('button');commit.textContent='Apply advanced edits';commit.id='media-draft-preview';advanced.append(summary,text,commit);
  const actions=document.createElement('div');actions.className='media-actions';
  const reviewActions=document.createElement('div');reviewActions.className='media-actions draft-review-actions';
  const reviewStatus=document.createElement('p');reviewStatus.id='media-draft-review-status';reviewStatus.setAttribute('role','status');
  const button=(id,label,fn)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.addEventListener('click',()=>{try{fn();}catch(e){showError(e);}});actions.append(b);return b;};
  let original=null,working=null,undo=[],redo=[],revision=0;
  const use=button('media-draft-use','Use reviewed timing',()=>acceptIfReady().catch(showError));
  async function acceptIfReady(){
    if(use.disabled)return false;
    const choice=reviewedDraftChoice(original,working,options()),token=revision;
    use.disabled=true;
    try{await apply(choice.compiled,()=>revision===token,working.candidatePlan);return true;}
    finally{if(revision===token)use.disabled=false;}
  }
  const clearNotices=button('media-draft-clear-notices','Clear reviewed notices',()=>change({...working,unresolved:[]}));
  clearNotices.title='Acknowledge notices you have reviewed. Timestamps stay unchanged and timing checks still run.';
  use.setAttribute('aria-describedby',reviewStatus.id);clearNotices.setAttribute('aria-describedby',reviewStatus.id);
  function lastEndChoice(){
    const plan=working.candidatePlan,v=plan.musicalVisits.at(-1),seconds=options().durationMs/1000;
    if(v?.originalVisit!==original.originalPlaybackOrder.length || !Number.isFinite(v?.startSeconds) || v.endSeconds!==null ||
       !Number.isFinite(seconds) || seconds<=v.startSeconds || v.anchors.some(a=>a.seconds>=seconds) ||
       (plan.intervals??plan.explanations??[]).some(i=>i.endSeconds>v.startSeconds))return null;
    return {key:'music:'+(plan.musicalVisits.length-1),seconds};
  }
  const recordingEnd=button('media-draft-recording-end','Use recording end for last measure',()=>{
    const choice=lastEndChoice();
    if(choice)change(editDraftPiece(working,choice.key,'endSeconds',choice.seconds,choice.seconds).working);
  });
  reviewActions.append(recordingEnd,clearNotices,use);
  button('media-draft-stop','Stop preview',stop);
  const back=button('media-draft-undo','Undo draft edit',()=>{if(!undo.length)return;redo.push(copyDraftJson(working));working=undo.pop();render();});
  const forward=button('media-draft-redo','Redo draft edit',()=>{if(!redo.length)return;undo.push(copyDraftJson(working));working=redo.pop();render();});
  button('media-draft-original','Restore supplied draft',()=>change({candidatePlan:original.candidatePlan,unresolved:original.unresolved}));
  const exportButton=button('media-draft-export','Export draft and original evidence',()=>exportFile({format:'gts-draft-work',version:1,original,working},'guitar-trainer-draft.json'));
  const file=document.createElement('input');file.type='file';file.accept='.json';file.hidden=true;
  button('media-draft-open','Open saved draft work',()=>file.click());
  file.addEventListener('change',async()=>{try{const f=file.files[0];if(!f)return;if(f.size>12000000)throw Error('Draft work file exceeds 12 MB.');const saved=copyDraftJson(JSON.parse(await f.text()));if(saved.format!=='gts-draft-work'||saved.version!==1||JSON.stringify(saved.original)!==JSON.stringify(original))throw Error('Saved draft belongs to different original evidence.');change(saved.working);}catch(e){showError(e);}finally{file.value='';}});
  const evidence=document.createElement('details'),evidenceTitle=document.createElement('summary'),evidenceText=document.createElement('textarea');evidenceTitle.textContent='Original supplied timing and matching evidence';evidenceText.readOnly=true;evidenceText.rows=8;evidenceText.style.width='100%';evidence.append(evidenceTitle,evidenceText);
  const diagnostics=document.createElement('details'),diagnosticTitle=document.createElement('summary');diagnosticTitle.textContent='Review issues';diagnostics.append(diagnosticTitle,issues);panel.append(title,warning,reviewActions,reviewStatus,rows,diagnostics,advanced,actions,file,evidence);container.append(panel);
  function showError(error){reviewStatus.textContent=error.message;diagnostics.open=true;issues.replaceChildren();const li=document.createElement('li');li.textContent=error.message;issues.append(li);}
  function change(next){inspectDraft(original,next,options());stop();undo.push(copyDraftJson(working));redo=[];working=copyDraftJson(next);render();}
  let musicRanges=[];
  function render(){
    musicRanges=draftMusicRanges(working.candidatePlan,options().timeline);
    revision++;stop();text.value=JSON.stringify(working,null,2);issues.replaceChildren();visual.render(original,working);document.querySelector('#media-draft-timing').dataset.revision=revision;
    const report=inspectDraft(original,working,options());
    for(const issue of report.issues){const li=document.createElement('li');li.textContent=issue;issues.append(li);}
    if(!report.issues.length){const li=document.createElement('li');li.textContent='Structural checks pass. Listen and review, then choose Use reviewed timing.';issues.append(li);}
    let checks;
    try{checks=reviewedDraftChoice(original,working,options());}
    catch(error){use.disabled=true;showError(error);return;}
    recordingEnd.hidden=!lastEndChoice();
    clearNotices.disabled=!working.unresolved.length;
    if(checks.compiled)reviewStatus.textContent=checks.partial
      ? `Use reviewed timing applies ${checks.compiled.visits.length} timed measure visits. Recording gaps play without grading.`
      : 'If the preview sounds right, choose Use reviewed timing, then Play.';
    else reviewStatus.textContent=(working.candidatePlan.musicalVisits.length
      ? 'Use reviewed timing plays the recording with the same score tracking you heard in the preview. Grading is off.'
      : 'Use reviewed timing plays the recording without score tracking or grading. To follow a measure, choose Add unmapped passage and place its start and end.')+
      (recordingEnd.hidden?'':' To grade the last measure, place its end first.');
    if(!checks.compiled && checks.issues.length)reviewStatus.textContent+=' '+checks.issues[0];
    diagnostics.open=Boolean(report.issues.length);
    use.disabled=false;back.disabled=!undo.length;forward.disabled=!redo.length;
    diagnosticTitle.textContent=report.issues.length?`Review issues (${report.issues.length})`:'Checks pass — ready for review';
  }
  commit.addEventListener('click',()=>{try{const next=copyDraftJson(JSON.parse(text.value));if(!next.candidatePlan||!Array.isArray(next.unresolved))throw Error('Keep candidatePlan and unresolved.');change(next);}catch(e){showError(e);}});
  function showWorking(){
    reviewActions.hidden=reviewStatus.hidden=false;title.textContent='Draft timing — needs review';
    warning.hidden=rows.hidden=advanced.hidden=false;for(const b of actions.children)b.hidden=false;
    panel.hidden=false;render();
  }
  return {reopen:showWorking,acceptIfReady,selectMeasure:visual.selectMeasure,get musicRanges(){return musicRanges;},replaceMapping(candidatePlan,gapSuggestions=[]) {
    change({candidatePlan,unresolved:[],gapSuggestions});
  },update(time,playing){if(original&&!rows.hidden)visual.update(time,playing);},load(draft){original=copyDraftJson(draft);working={candidatePlan:copyDraftJson(draft.candidatePlan),unresolved:copyDraftJson(draft.unresolved)};undo=[];redo=[];evidenceText.value=JSON.stringify(original,null,2);showWorking();},complete(){stop();visual.clear();revision++;reviewActions.hidden=reviewStatus.hidden=true;title.textContent='Reviewed timing — original draft retained';warning.hidden=rows.hidden=advanced.hidden=true;issues.replaceChildren();for(const b of actions.children)b.hidden=b!==exportButton;},clear(){stop();original=null;working=null;revision++;panel.hidden=true;visual.clear();},get active(){return !panel.hidden;}};
}
