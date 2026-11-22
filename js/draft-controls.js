// Draft-only editor. The immutable incoming draft and editable working copy are separate.
import {copyDraftJson,inspectDraft} from './draft-timing.js';
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
  const use=button('media-draft-use','Use reviewed timing',()=>{
    const report=inspectDraft(original,working,options());if(!report.compiled)throw Error('Resolve the listed issues first.');
    use.disabled=true;const token=revision;Promise.resolve(apply(report.compiled,()=>revision===token)).catch(showError);
  });
  const clearNotices=button('media-draft-clear-notices','Clear reviewed notices',()=>change({...working,unresolved:[]}));
  clearNotices.title='Acknowledge notices you have reviewed. Timestamps stay unchanged and timing checks still run.';
  use.setAttribute('aria-describedby',reviewStatus.id);clearNotices.setAttribute('aria-describedby',reviewStatus.id);
  reviewActions.append(clearNotices,use);
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
  function showError(error){reviewStatus.textContent=error.message;diagnostics.open=true;issues.replaceChildren();const li=document.createElement('li');li.textContent=error.message;issues.append(li);use.disabled=true;}
  function change(next){inspectDraft(original,next,options());stop();undo.push(copyDraftJson(working));redo=[];working=copyDraftJson(next);render();}
  let musicRanges=[];
  function render(){
    musicRanges=draftMusicRanges(working.candidatePlan,options().timeline);
    revision++;stop();text.value=JSON.stringify(working,null,2);issues.replaceChildren();visual.render(original,working);document.querySelector('#media-draft-timing').dataset.revision=revision;
    const report=inspectDraft(original,working,options());
    for(const issue of report.issues){const li=document.createElement('li');li.textContent=issue;issues.append(li);}
    if(!report.issues.length){const li=document.createElement('li');li.textContent='Structural checks pass. Listen and review, then choose Use reviewed timing.';issues.append(li);}
    const checks=inspectDraft(original,{candidatePlan:working.candidatePlan,unresolved:[]},options());
    clearNotices.disabled=!working.unresolved.length;
    reviewStatus.textContent=working.unresolved.length
      ? checks.compiled ? 'Timing checks pass. If the preview looks right, choose Clear reviewed notices, then Use reviewed timing.'
        : 'Review and clear the notices. The timing issues listed below must also be fixed before acceptance.'
      : report.compiled ? 'Ready to accept: choose Use reviewed timing, then Play.'
        : 'Use reviewed timing is unavailable until the timing issues listed below are fixed.';
    diagnostics.open=Boolean(report.issues.length);
    use.disabled=!report.compiled;back.disabled=!undo.length;forward.disabled=!redo.length;
    diagnosticTitle.textContent=report.issues.length?`Review issues (${report.issues.length})`:'Checks pass — ready for review';
  }
  commit.addEventListener('click',()=>{try{const next=copyDraftJson(JSON.parse(text.value));if(!next.candidatePlan||!Array.isArray(next.unresolved))throw Error('Keep candidatePlan and unresolved.');change(next);}catch(e){showError(e);}});
  return {get musicRanges(){return musicRanges;},replaceMapping(candidatePlan) {
    change({candidatePlan,unresolved:[]});
  },update(time,playing){if(original&&!rows.hidden)visual.update(time,playing);},load(draft){reviewActions.hidden=reviewStatus.hidden=false;title.textContent='Draft timing — needs review';warning.hidden=rows.hidden=advanced.hidden=false;for(const b of actions.children)b.hidden=false;original=copyDraftJson(draft);working={candidatePlan:copyDraftJson(draft.candidatePlan),unresolved:copyDraftJson(draft.unresolved)};undo=[];redo=[];evidenceText.value=JSON.stringify(original,null,2);panel.hidden=false;render();},complete(){stop();visual.clear();revision++;reviewActions.hidden=reviewStatus.hidden=true;title.textContent='Reviewed timing — original draft retained';warning.hidden=rows.hidden=advanced.hidden=true;issues.replaceChildren();for(const b of actions.children)b.hidden=b!==exportButton;},clear(){stop();original=null;working=null;revision++;panel.hidden=true;visual.clear();},get active(){return !panel.hidden;}};
}
