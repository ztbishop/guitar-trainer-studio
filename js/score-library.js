// Library UI owns storage and file intent; loading remains an injected host action.
import {AppState} from './app-state.js';
import {LibraryStore} from './library-store.js';
import {DEMO_SCORES} from './demo-scores.js';

export function libraryTitle(title,fileName) {
  const trimmed=String(title||'').trim();
  return !trimmed || /^untitled(?: song)?$/i.test(trimmed) ? fileName.replace(/\.[^.]+$/,'') : trimmed;
}

export function initScoreLibrary(loadFile,store=new LibraryStore()) {
  const get=id=>document.getElementById(id);
  const status=get('library-status'),folderList=get('library-folder-list'),list=get('library-list');
  let snapshot={folders:[],scores:[]},activeFolderId='__all__',busy=false;
  const managing={folders:false,scores:false},selected={folders:new Set(),scores:new Set()};
  const actions=['library-save','library-import','library-backup','library-restore','library-new-folder'];
  const message=text=>{status.textContent=text;};

  function sync() {
    for(const key of actions)get(key).disabled=busy;
    get('library-save').disabled=busy || !AppState.currentScoreFile;
    get('library-search').disabled=busy;
    get('library-import').disabled=busy || activeFolderId==='__demos__';
    for(const button of folderList.querySelectorAll('button'))button.disabled=busy;
    for(const button of list.querySelectorAll('button'))button.disabled=busy;
    for(const input of [...folderList.querySelectorAll('input'),...list.querySelectorAll('input')])input.disabled=busy;
    for(const kind of ['folders','scores']) {
      const button=get(`library-manage-${kind}`);
      button.disabled=busy || (kind==='scores' && activeFolderId==='__demos__') || (!managing[kind] && !snapshot[kind].length);
      button.textContent=managing[kind]?'Done':'Manage';
      button.setAttribute('aria-pressed',String(managing[kind]));
      for(const action of get(`library-${kind}-bulk`).querySelectorAll('button'))
        action.disabled=busy || (action.dataset.needsSelection==='true' && !selected[kind].size);
    }
  }

  function visibleScores() {
    const query=get('library-search').value.trim().toLowerCase();
    return snapshot.scores.filter(score=>(activeFolderId==='__all__' || (score.folderId||'')===activeFolderId) &&
      `${score.title} ${score.fileName}`.toLowerCase().includes(query)).sort((a,b)=>a.title.localeCompare(b.title));
  }

  function selectionRow(kind,item,label) {
    const row=document.createElement('label');row.className='library-selection-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=selected[kind].has(item.id);
    const text=document.createElement('span');text.textContent=label;
    check.addEventListener('change',()=>{
      check.checked?selected[kind].add(item.id):selected[kind].delete(item.id);
      renderBulk(kind);sync();
    });
    row.append(check,text);return row;
  }

  function renderBulk(kind) {
    const bar=get(`library-${kind}-bulk`);bar.replaceChildren();bar.hidden=!managing[kind];
    if(!managing[kind])return;
    const count=document.createElement('span');count.textContent=`${selected[kind].size} selected`;count.setAttribute('role','status');bar.append(count);
    const add=(label,handler,needsSelection=false)=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.dataset.needsSelection=String(needsSelection);button.addEventListener('click',handler);bar.append(button);
    };
    const items=kind==='scores'?visibleScores():snapshot.folders;
    const all=items.length>0 && items.every(item=>selected[kind].has(item.id));
    add(all?'Deselect All':'Select All',()=>{
      for(const item of items)all?selected[kind].delete(item.id):selected[kind].add(item.id);
      renderFolders();renderList();
    });
    if(kind==='scores')add('Move',()=>run(async()=>{
      const ids=[...selected.scores];if(!ids.length)return;
      const destination=await requestFolder(snapshot.folders,'',`Move ${ids.length} selected scores`);
      if(destination===undefined)return;
      await store.moveScores(ids,destination||null);selected.scores.clear();activeFolderId=destination;
      await refresh();message(`Moved ${ids.length} scores to ${folderName(destination)}.`);
    }),true);
    add('Delete',()=>run(async()=>{
      const ids=[...selected[kind]];if(!ids.length)return;
      const text=kind==='folders'
        ?folderDeletionWarning(ids,`Delete ${ids.length} selected ${ids.length===1?'folder':'folders'}?`)
        :`Delete ${ids.length} selected scores from this browser's library? The open score and original files will remain available.`;
      if(!await confirmLibraryAction(text,kind==='folders'?'Delete folders':'Delete scores'))return;
      if(kind==='folders')await store.deleteFoldersAndScores(ids);else await store.deleteScores(ids);
      selected[kind].clear();await refresh();message(kind==='folders'?'Selected folders and their saved scores deleted.':`Deleted ${ids.length} saved scores.`);
    }),true);
    bar.lastElementChild.classList.add('is-danger');
  }

  function folderDeletionWarning(ids,question) {
    const selectedIds=new Set(ids);
    const count=snapshot.scores.filter(score=>selectedIds.has(score.folderId)).length;
    return `${question} ${count?`This will also delete ${count} saved ${count===1?'score':'scores'} inside. `:''}This cannot be undone. The open score and original disk files will remain available.`;
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
      {id:'__demos__',name:'Demo Scores',system:true},
      ...snapshot.folders.slice().sort((a,b)=>a.name.localeCompare(b.name))
    ];
    for(const folder of options) {
      if(managing.folders && !folder.system) {
        folderList.append(selectionRow('folders',folder,folder.name));continue;
      }
      const row=document.createElement('div');row.className='library-folder-row';
      const open=document.createElement('button');open.type='button';open.className='library-folder-open';
      open.textContent=folder.name;
      if(activeFolderId===folder.id){open.classList.add('is-active');open.setAttribute('aria-current','page');}
      open.addEventListener('click',()=>{activeFolderId=folder.id;managing.scores=false;selected.scores.clear();renderFolders();renderList();});
      row.append(open);
      if(!folder.system) {
        const menu=document.createElement('button');menu.type='button';menu.className='library-row-menu';
        menu.textContent='⋯';menu.setAttribute('aria-label',`Actions for folder ${folder.name}`);
        menu.addEventListener('click',async()=>{
          const action=await showActionMenu(folder.name,[['rename','Rename'],['delete','Delete folder','danger']]);
          if(!action)return;
          await run(async()=>{
            if(action==='rename') {
              const name=await requestText('Rename folder',folder.name,'Folder name');
              if(name===null)return;
              await store.renameFolder(folder.id,name);message(`Folder renamed to ${name}.`);
            } else {
              if(!await confirmLibraryAction(folderDeletionWarning([folder.id],`Delete folder “${folder.name}”?`),'Delete folder'))return;
              await store.deleteFolderAndScores(folder.id);
              if(activeFolderId===folder.id)activeFolderId='__all__';
              message('Folder and its saved scores deleted.');
            }
            await refresh();
          });
        });
        row.append(menu);
      }
      folderList.append(row);
    }
    renderBulk('folders');
  }

  function renderList() {
    list.replaceChildren();
    const demos=activeFolderId==='__demos__';
    get('library-demos').hidden=!demos;list.hidden=demos;
    if(demos) {
      const query=get('library-search').value.trim().toLowerCase();let count=0;
      for(const button of get('library-demos').querySelectorAll('[data-demo-score]')) {
        const demo=DEMO_SCORES[button.dataset.demoScore];
        button.hidden=!`${demo.title} ${demo.file}`.toLowerCase().includes(query);
        if(!button.hidden)count++;
      }
      get('library-folder-title').textContent='Demo Scores';
      get('library-score-count').textContent=`${count} ${count===1?'score':'scores'}`;
      renderBulk('scores');sync();return;
    }
    const scores=visibleScores();
    get('library-folder-title').textContent=folderName(activeFolderId);
    get('library-score-count').textContent=`${scores.length} ${scores.length===1?'score':'scores'}`;

    if(!scores.length) {
      const empty=document.createElement('p');empty.className='library-empty-state';
      empty.textContent=snapshot.scores.length?'No scores match this view.':'No saved scores yet. Add files or save the current score.';
      list.append(empty);
    }
    for(const score of scores) {
      if(managing.scores){list.append(selectionRow('scores',score,score.title));continue;}
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
        await refresh();message('');
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
    renderBulk('scores');sync();
  }

  function folderName(id) {
    if(id==='__all__')return 'All Scores';
    if(id==='__demos__')return 'Demo Scores';
    if(!id)return 'Unfiled';
    return snapshot.folders.find(folder=>folder.id===id)?.name || 'All Scores';
  }

  async function refresh() {
    snapshot=await store.list();
    for(const kind of ['folders','scores']) {
      const existing=new Set(snapshot[kind].map(item=>item.id));
      for(const id of selected[kind])if(!existing.has(id))selected[kind].delete(id);
    }
    if(activeFolderId && !['__all__','__demos__'].includes(activeFolderId) && !snapshot.folders.some(folder=>folder.id===activeFolderId))activeFolderId='__all__';
    renderFolders();renderList();
  }

  async function run(action) {
    if(busy)return;
    busy=true;sync();
    try {await action();}
    catch(error){message(error.message || 'The library action failed.');}
    finally {busy=false;sync();}
  }

  for(const kind of ['folders','scores'])get(`library-manage-${kind}`).addEventListener('click',()=>{
    managing[kind]=!managing[kind];selected[kind].clear();renderFolders();renderList();
  });
  get('library-search').addEventListener('input',()=>{selected.scores.clear();renderList();});
  get('library-save').addEventListener('click',()=>run(async()=>{
    const file=AppState.currentScoreFile;if(!file)throw new Error('Open a score first.');
    const folderId=['__all__','__demos__'].includes(activeFolderId)?'':activeFolderId;
    const result=await store.save({...file,title:libraryTitle(AppState.score?.title,file.fileName),folderId:folderId||null});
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
  return {sync,scoreLoaded(){sync();refresh().then(()=>message('')).catch(error=>message(error.message||'Could not refresh the library.'));}};
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

function requestFolder(folders,currentId,title='Move score') {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='library-action-dialog';
    const heading=document.createElement('h2');heading.textContent=title;
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
