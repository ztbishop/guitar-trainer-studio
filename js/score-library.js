// Library UI owns storage and file intent; loading remains an injected host action.
import {AppState} from './app-state.js';
import {LibraryStore} from './library-store.js';

export function initScoreLibrary(loadFile,store=new LibraryStore()) {
  const get=id=>document.getElementById(id);
  const status=get('library-status'),list=get('library-list'),filter=get('library-folder-filter'),destination=get('library-destination');
  let snapshot={folders:[],scores:[]},selectedId=null,busy=false;
  const actions=['library-save','library-import','library-backup','library-restore','library-new-folder','library-rename-folder','library-remove-folder','library-update','library-delete'];
  const message=text=>{status.textContent=text;};
  function sync() {
    for(const key of actions)get(key).disabled=busy;
    get('library-save').disabled=busy || !AppState.currentScoreFile;
    get('library-update').disabled=get('library-delete').disabled=busy || !selectedId;
    get('library-rename-folder').disabled=get('library-remove-folder').disabled=busy || ['__all__',''].includes(filter.value);
    filter.disabled=destination.disabled=get('library-search').disabled=busy;
    for(const button of list.querySelectorAll('button'))button.disabled=busy;
  }
  function renderList() {
    list.replaceChildren();
    const query=get('library-search').value.trim().toLowerCase();
    const scores=snapshot.scores.filter(score=>(filter.value==='__all__' || (score.folderId||'')===filter.value) && `${score.title} ${score.fileName}`.toLowerCase().includes(query))
      .sort((a,b)=>a.title.localeCompare(b.title));
    if(!scores.length){const empty=document.createElement('p');empty.className='field-help';empty.textContent=snapshot.scores.length?'No scores match this view.':'No saved scores yet. Open a file and save it, or import score files.';list.append(empty);}
    for(const score of scores) {
      const row=document.createElement('div');row.className='library-score';
      const open=document.createElement('button');open.type='button';open.className='library-open';open.textContent=score.title;open.title=`Open ${score.fileName}`;
      open.addEventListener('click',()=>run(async()=>{
        const accepted=await loadFile(new File([score.bytes],score.fileName));
        if(accepted===false)throw new Error('This score could not be opened.');
        message(`Opened ${score.title}.`);
      }));
      const meta=document.createElement('span');meta.className='field-help';meta.textContent=snapshot.folders.find(folder=>folder.id===score.folderId)?.name || 'Unfiled';
      const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.setAttribute('aria-label',`Edit ${score.title}`);
      edit.addEventListener('click',()=>{
        selectedId=score.id;get('library-score-title').value=score.title;destination.value=score.folderId || '';
        get('library-edit-heading').textContent=`Edit: ${score.title}`;get('library-editor').open=true;get('library-score-title').focus();sync();
      });
      row.append(open,meta,edit);list.append(row);
    }
    sync();
  }
  function options(select,all=false) {
    const previous=select.value;select.replaceChildren();
    const values=[...(all?[{id:'__all__',name:'All scores'}]:[]),{id:'',name:'Unfiled'},...snapshot.folders.slice().sort((a,b)=>a.name.localeCompare(b.name))];
    for(const value of values){const option=document.createElement('option');option.value=value.id;option.textContent=value.name;select.append(option);}
    select.value=values.some(value=>value.id===previous)?previous:(all?'__all__':'');
  }
  async function refresh() {
    snapshot=await store.list();options(filter,true);options(destination);
    if(selectedId && !snapshot.scores.some(score=>score.id===selectedId))selectedId=null;renderList();
  }
  async function run(action) {
    if(busy)return;busy=true;sync();
    try {await action();}catch(error){message(error.message || 'The library action failed.');}
    finally {busy=false;sync();}
  }
  filter.addEventListener('change',()=>{
    get('library-folder-name').value=snapshot.folders.find(folder=>folder.id===filter.value)?.name || '';
    destination.value=filter.value==='__all__'?'':filter.value;renderList();
  });
  get('library-search').addEventListener('input',renderList);
  get('library-save').addEventListener('click',()=>run(async()=>{
    const file=AppState.currentScoreFile;if(!file)throw new Error('Open a score first.');
    const result=await store.save({...file,title:AppState.score?.title || file.fileName.replace(/\.[^.]+$/,''),folderId:destination.value || null});
    await refresh();message(result.duplicate?'This score is already saved. Use Edit to rename or move it.':'Saved to your library.');
  }));
  get('library-new-folder').addEventListener('click',()=>run(async()=>{
    const folder=await store.createFolder(get('library-folder-name').value);await refresh();filter.value=destination.value=folder.id;renderList();message(`Folder ready: ${folder.name}`);
  }));
  get('library-rename-folder').addEventListener('click',()=>run(async()=>{await store.renameFolder(filter.value,get('library-folder-name').value);await refresh();message('Folder renamed.');}));
  get('library-remove-folder').addEventListener('click',()=>run(async()=>{
    if(!await confirmLibraryAction('Remove this folder? Its scores will move to Unfiled.','Remove folder'))return;
    await store.deleteFolder(filter.value);await refresh();message('Folder removed; scores kept in Unfiled.');
  }));
  get('library-update').addEventListener('click',()=>run(async()=>{
    if(!get('library-score-title').value.trim())throw new Error('Enter a score title.');
    await store.updateScore(selectedId,{title:get('library-score-title').value,folderId:destination.value || null});await refresh();message('Saved score title and folder.');
  }));
  get('library-delete').addEventListener('click',()=>run(async()=>{
    if(!await confirmLibraryAction('Delete this saved score? Export a backup first if you need a copy. The open score stays available.','Delete score'))return;
    await store.deleteScore(selectedId);selectedId=null;await refresh();get('library-edit-heading').textContent='Save location & edit score';message('Saved score deleted.');
  }));
  for(const [button,input] of [['library-import','library-import-input'],['library-restore','library-backup-input']])get(button).addEventListener('click',()=>{get(input).value='';get(input).click();});
  get('library-import-input').addEventListener('change',event=>{
    const files=[...event.target.files],folderId=destination.value || null;
    run(async()=>{
      let added=0,skipped=0,failed=0;
      for(const file of files)try {
        const result=await store.save({fileName:file.name,title:file.name.replace(/\.[^.]+$/,''),bytes:new Uint8Array(await file.arrayBuffer()),folderId});
        result.duplicate?skipped++:added++;
      }catch{failed++;}
      await refresh();message(`Imported ${added}; already saved ${skipped}; failed ${failed}.`);
    });
  });
  get('library-backup').addEventListener('click',()=>run(async()=>{
    const backup=await store.backup();download(JSON.stringify(backup),'guitar-trainer-library.json');message(`Backup downloaded: ${backup.scores.length} scores. Keep it somewhere safe.`);
  }));
  get('library-backup-input').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    run(async()=>{const result=await store.merge(JSON.parse(await file.text()));await refresh();message(`Backup merged: added ${result.added}; already saved ${result.skipped}.`);});
  });
  run(async()=>{await refresh();message(`${snapshot.scores.length} saved scores. Choose a file or open a saved score.`);});
  return {sync,scoreLoaded(){sync();message('Score opened. Save to library to keep it in this browser.');}};
}

function download(text,fileName) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;link.addEventListener('click',event=>event.stopPropagation());document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

// Native HTML dialog keeps keyboard focus/escape behavior without a blocking
// JavaScript prompt. Cancel is focused by default for destructive actions.
function confirmLibraryAction(message,action) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-confirm';
    const title=document.createElement('h2');title.id='library-confirm-title';title.textContent=action;
    dialog.setAttribute('aria-labelledby',title.id);
    const text=document.createElement('p');text.textContent=message;
    const actions=document.createElement('div');actions.className='menu-library-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.autofocus=true;
    const confirm=document.createElement('button');confirm.type='button';confirm.textContent=action;
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));
    dialog.addEventListener('click',event=>event.stopPropagation());
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    actions.append(cancel,confirm);dialog.append(title,text,actions);document.body.append(dialog);dialog.showModal();
  });
}
