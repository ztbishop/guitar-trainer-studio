// Library UI owns storage and file intent; loading remains an injected host action.
import {AppState} from './app-state.js';
import {LibraryStore} from './library-store.js';

export function initScoreLibrary(loadFile,store=new LibraryStore()) {
  const get=id=>document.getElementById(id);
  const status=get('library-status'),folderList=get('library-folder-list'),list=get('library-list');
  let snapshot={folders:[],scores:[]},activeFolderId='__all__',busy=false;
  const actions=['library-save','library-import','library-backup','library-restore','library-new-folder'];
  const message=text=>{status.textContent=text;};

  function sync() {
    for(const key of actions)get(key).disabled=busy;
    get('library-save').disabled=busy || !AppState.currentScoreFile;
    get('library-search').disabled=busy;
    for(const button of folderList.querySelectorAll('button'))button.disabled=busy;
    for(const button of list.querySelectorAll('button'))button.disabled=busy;
  }

  function currentScoreMatches(score) {
    const current=AppState.currentScoreFile;
    if(!current || !score || String(current.fileName||'').toLowerCase()!==String(score.fileName||'').toLowerCase())return false;
    const left=current.bytes,right=score.bytes;
    if(!left || !right || left.length!==right.length)return false;
    for(let index=0;index<left.length;index++)if(left[index]!==right[index])return false;
    return true;
  }

  function renderFolders() {
    folderList.replaceChildren();
    const options=[
      {id:'__all__',name:'All Scores',system:true},
      {id:'',name:'Unfiled',system:true},
      ...snapshot.folders.slice().sort((a,b)=>a.name.localeCompare(b.name))
    ];
    for(const folder of options) {
      const row=document.createElement('div');row.className='library-folder-row';
      const open=document.createElement('button');open.type='button';open.className='library-folder-open';
      open.textContent=folder.name;
      if(activeFolderId===folder.id){open.classList.add('is-active');open.setAttribute('aria-current','page');}
      open.addEventListener('click',()=>{activeFolderId=folder.id;renderList();renderFolders();});
      row.append(open);
      if(!folder.system) {
        const menu=document.createElement('button');menu.type='button';menu.className='library-row-menu';
        menu.textContent='⋯';menu.setAttribute('aria-label',`Actions for folder ${folder.name}`);
        menu.addEventListener('click',async()=>{
          const action=await showActionMenu(folder.name,[['rename','Rename'],['remove','Remove folder','danger']]);
          if(!action)return;
          await run(async()=>{
            if(action==='rename') {
              const name=await requestText('Rename folder',folder.name,'Folder name');
              if(name===null)return;
              await store.renameFolder(folder.id,name);message(`Folder renamed to ${name}.`);
            } else {
              if(!await confirmLibraryAction(`Remove “${folder.name}”? Its scores will move to Unfiled.`,'Remove folder'))return;
              await store.deleteFolder(folder.id);
              if(activeFolderId===folder.id)activeFolderId='__all__';
              message('Folder removed. Its scores are now in Unfiled.');
            }
            await refresh();
          });
        });
        row.append(menu);
      }
      folderList.append(row);
    }
  }

  function renderList() {
    list.replaceChildren();
    const query=get('library-search').value.trim().toLowerCase();
    const scores=snapshot.scores.filter(score=>
      (activeFolderId==='__all__' || (score.folderId||'')===activeFolderId) &&
      `${score.title} ${score.fileName}`.toLowerCase().includes(query)
    ).sort((a,b)=>a.title.localeCompare(b.title));
    get('library-folder-title').textContent=folderName(activeFolderId);
    get('library-score-count').textContent=`${scores.length} ${scores.length===1?'score':'scores'}`;

    if(!scores.length) {
      const empty=document.createElement('p');empty.className='library-empty-state';
      empty.textContent=snapshot.scores.length?'No scores match this view.':'No saved scores yet. Add files or save the current score.';
      list.append(empty);
    }
    for(const score of scores) {
      const row=document.createElement('div');row.className='library-score-row';
      const open=document.createElement('button');open.type='button';open.className='library-score-open';
      open.title=`Open ${score.fileName}`;
      const title=document.createElement('span');title.className='library-score-title';title.textContent=score.title;
      open.append(title);
      if(currentScoreMatches(score)) {
        const badge=document.createElement('span');badge.className='library-loaded-badge';badge.textContent='Loaded';open.append(badge);
      }
      const baseName=score.fileName.replace(/\.[^.]+$/,'');
      if(baseName.toLowerCase()!==score.title.toLowerCase()) {
        const fileName=document.createElement('span');fileName.className='library-score-filename';fileName.textContent=score.fileName;
        open.append(fileName);
      }
      open.addEventListener('click',()=>run(async()=>{
        const accepted=await loadFile(new File([score.bytes],score.fileName));
        if(accepted===false)throw new Error('This score could not be opened.');
        await refresh();message(`Opened ${score.title}.`);
      }));
      const menu=document.createElement('button');menu.type='button';menu.className='library-row-menu';
      menu.textContent='⋯';menu.setAttribute('aria-label',`Actions for ${score.title}`);
      menu.addEventListener('click',async()=>{
        const action=await showActionMenu(score.title,[['rename','Rename'],['move','Move'],['delete','Delete','danger']]);
        if(!action)return;
        await run(async()=>{
          if(action==='rename') {
            const title=await requestText('Rename score',score.title,'Score title');
            if(title===null)return;
            await store.updateScore(score.id,{title,folderId:score.folderId||null});message('Score renamed.');
          } else if(action==='move') {
            const folderId=await requestFolder(snapshot.folders,score.folderId||'');
            if(folderId===undefined)return;
            await store.updateScore(score.id,{title:score.title,folderId:folderId||null});
            activeFolderId=folderId||'__all__';message(`Moved ${score.title} to ${folderName(folderId||'')}.`);
          } else {
            if(!await confirmLibraryAction(`Delete “${score.title}” from this browser's library? The open score and original file will remain available.`,'Delete score'))return;
            await store.deleteScore(score.id);message('Saved score deleted.');
          }
          await refresh();
        });
      });
      row.append(open,menu);list.append(row);
    }
    sync();
  }

  function folderName(id) {
    if(id==='__all__')return 'All Scores';
    if(!id)return 'Unfiled';
    return snapshot.folders.find(folder=>folder.id===id)?.name || 'All Scores';
  }

  async function refresh() {
    snapshot=await store.list();
    if(activeFolderId && activeFolderId!=='__all__' && !snapshot.folders.some(folder=>folder.id===activeFolderId))activeFolderId='__all__';
    renderFolders();renderList();
  }

  async function run(action) {
    if(busy)return;
    busy=true;sync();
    try {await action();}
    catch(error){message(error.message || 'The library action failed.');}
    finally {busy=false;sync();}
  }

  get('library-search').addEventListener('input',renderList);
  get('library-save').addEventListener('click',()=>run(async()=>{
    const file=AppState.currentScoreFile;if(!file)throw new Error('Open a score first.');
    const folderId=activeFolderId==='__all__'?'':activeFolderId;
    const result=await store.save({...file,title:AppState.score?.title || file.fileName.replace(/\.[^.]+$/,''),folderId:folderId||null});
    await refresh();message(result.duplicate?'This score is already saved in the library.':'Saved to the library.');
  }));
  get('library-new-folder').addEventListener('click',()=>run(async()=>{
    const name=await requestText('New folder','', 'Folder name');if(name===null)return;
    const folder=await store.createFolder(name);activeFolderId=folder.id;await refresh();message(`Folder ready: ${folder.name}.`);
  }));
  get('library-import').addEventListener('click',()=>{const input=get('library-import-input');input.value='';input.click();});
  get('library-import-input').addEventListener('change',event=>{
    const files=[...event.target.files];if(!files.length)return;
    const folderId=activeFolderId==='__all__'?'':activeFolderId;
    run(async()=>{
      let added=0,skipped=0,failed=0;
      for(const file of files)try {
        const result=await store.save({fileName:file.name,title:file.name.replace(/\.[^.]+$/,''),bytes:new Uint8Array(await file.arrayBuffer()),folderId:folderId||null});
        result.duplicate?skipped++:added++;
      } catch {failed++;}
      await refresh();message(`Added ${added}; already saved ${skipped}; failed ${failed}.`);
    }).finally(()=>{event.target.value='';});
  });
  get('library-backup').addEventListener('click',()=>run(async()=>{
    const backup=await store.backup();download(JSON.stringify(backup),'guitar-trainer-library.json');
    message(`Library backup downloaded: ${backup.scores.length} scores and ${backup.mediaProfiles.length} sync profiles.`);
  }));
  get('library-restore').addEventListener('click',()=>{const input=get('library-backup-input');input.value='';input.click();});
  get('library-backup-input').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    run(async()=>{const result=await store.merge(JSON.parse(await file.text()));await refresh();
      message(`Library merged: ${result.added} scores added; ${result.skipped} already saved; ${result.profilesAdded} sync profiles added.`);}).finally(()=>{event.target.value='';});
  });

  run(async()=>{await refresh();message('');});
  return {sync,scoreLoaded(){sync();refresh().then(()=>message('Score opened.')).catch(error=>message(error.message||'Could not refresh the library.'));}};
}

function download(text,fileName) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;link.addEventListener('click',event=>event.stopPropagation());document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function showActionMenu(title,items) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-action-dialog';
    const heading=document.createElement('h2');heading.textContent=title;
    const actions=document.createElement('div');actions.className='library-dialog-actions';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    for(const [value,label,danger] of items) {
      const button=document.createElement('button');button.type='button';button.textContent=label;
      if(danger)button.classList.add('is-danger');
      button.addEventListener('click',()=>finish(value));actions.append(button);
    }
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>finish(null));
    actions.append(cancel);dialog.addEventListener('click',event=>{event.stopPropagation();if(event.target===dialog)finish(null);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.append(heading,actions);document.body.append(dialog);dialog.showModal();actions.querySelector('button')?.focus();
  });
}

function requestText(title,value,labelText) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-action-dialog';
    const heading=document.createElement('h2');heading.textContent=title;
    const label=document.createElement('label');label.className='library-dialog-label';label.textContent=labelText;
    const input=document.createElement('input');input.type='text';input.maxLength=240;input.value=value;label.append(input);
    const actions=document.createElement('div');actions.className='library-dialog-actions';
    const finish=result=>{dialog.close();dialog.remove();resolve(result);};
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>finish(null));
    const save=document.createElement('button');save.type='button';save.textContent='Save';save.addEventListener('click',()=>{if(!input.value.trim()){input.setCustomValidity('Enter a name.');input.reportValidity();return;}finish(input.value.trim());});
    input.addEventListener('input',()=>input.setCustomValidity(''));
    actions.append(cancel,save);dialog.addEventListener('click',event=>{event.stopPropagation();if(event.target===dialog)finish(null);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.append(heading,label,actions);document.body.append(dialog);dialog.showModal();input.focus();input.select();
  });
}

function requestFolder(folders,currentId) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-action-dialog';
    const heading=document.createElement('h2');heading.textContent='Move score';
    const label=document.createElement('label');label.className='library-dialog-label';label.textContent='Move to';
    const select=document.createElement('select');
    const options=[{id:'',name:'Unfiled'},...folders.slice().sort((a,b)=>a.name.localeCompare(b.name))];
    for(const folder of options){const option=document.createElement('option');option.value=folder.id;option.textContent=folder.name;select.append(option);}
    select.value=currentId;label.append(select);
    const actions=document.createElement('div');actions.className='library-dialog-actions';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>finish(undefined));
    const move=document.createElement('button');move.type='button';move.textContent='Move';move.addEventListener('click',()=>finish(select.value));
    actions.append(cancel,move);dialog.addEventListener('click',event=>{event.stopPropagation();if(event.target===dialog)finish(undefined);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(undefined);});
    dialog.append(heading,label,actions);document.body.append(dialog);dialog.showModal();select.focus();
  });
}

function confirmLibraryAction(message,action) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-action-dialog library-confirm';
    const title=document.createElement('h2');title.textContent=action;
    const text=document.createElement('p');text.textContent=message;
    const actions=document.createElement('div');actions.className='library-dialog-actions';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.autofocus=true;
    const confirm=document.createElement('button');confirm.type='button';confirm.textContent=action;
    confirm.classList.add('is-danger');
    cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));
    dialog.addEventListener('click',event=>{event.stopPropagation();if(event.target===dialog)finish(false);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    actions.append(cancel,confirm);dialog.append(title,text,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
}
