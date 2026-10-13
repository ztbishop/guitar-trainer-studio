import {LibraryStore,encodeBytes} from '../js/library-store.js';

document.getElementById('run').addEventListener('click',async()=>{
  const button=document.getElementById('run'),output=document.getElementById('results');
  button.disabled=true;output.textContent='Running…';
  const dbName=`guitarTrainerLibrary-test-${crypto.randomUUID()}`;
  const store=new LibraryStore({open:(_,version)=>indexedDB.open(dbName,version)});
  const lines=[];
  function check(condition,label){if(!condition)throw new Error(label);lines.push(`PASS ${label}`);output.textContent=lines.join('\n');}
  try {
    const folder=await store.createFolder('Practice');
    check((await store.createFolder('practice')).id===folder.id,'Folder creation reuses case-insensitive names');
    const original=new Uint8Array([0,1,255,128,64]);
    const saved=await store.save({title:'Song',fileName:'song.gp5',bytes:original,folderId:folder.id});
    check(!saved.duplicate,'Original score bytes are saved');
    check((await store.save({title:'Duplicate',fileName:'renamed.gp5',bytes:original})).duplicate,'Identical bytes deduplicate across filenames/folders');
    await store.updateScore(saved.score.id,{title:'Renamed song',folderId:null});
    let snapshot=await store.list();
    check(snapshot.scores[0].title==='Renamed song' && snapshot.scores[0].folderId===null,'Rename and move keep the same saved score');
    await store.renameFolder(folder.id,'Lessons');
    await store.updateScore(saved.score.id,{title:'Renamed song',folderId:folder.id});
    const backup=await store.backup();
    check(backup.scores[0].data===encodeBytes(original),'Backup preserves binary score bytes');
    const duplicateMerge=await store.merge(backup);
    check(duplicateMerge.added===0 && duplicateMerge.skipped===1,'Reimport skips duplicates without overwriting metadata');
    const additive=structuredClone(backup);
    additive.scores.push({...additive.scores[0],id:'incoming',title:'Added song',data:encodeBytes(new Uint8Array([5,6,7]))});
    const merged=await store.merge(additive);
    check(merged.added===1 && merged.skipped===1,'Merge adds new files and preserves existing scores');
    const bad=structuredClone(additive);bad.scores[1].folderId='missing';let rejected=false;
    try{await store.merge(bad);}catch{rejected=true;}
    check(rejected && (await store.list()).scores.length===2,'Invalid backup leaves existing storage untouched');
    await store.deleteFolder(folder.id);snapshot=await store.list();
    check(snapshot.folders.length===0 && snapshot.scores.every(score=>score.folderId===null),'Removing a folder keeps every score in Unfiled');
    await store.deleteScore(saved.score.id);
    check((await store.list()).scores.length===1,'Deleting one saved score preserves other files');
    // Reopen through a new connection to verify committed persistence.
    (await store.open()).close();store.dbPromise=null;
    check((await store.list()).scores.length===1,'Library survives database close/reopen');
    // Restore a backup into an empty library without clearing the live database.
    for(const score of (await store.list()).scores)await store.deleteScore(score.id);
    const restored=await store.merge(backup);snapshot=await store.list();
    check(restored.added===1 && snapshot.folders[0].name==='Lessons' && snapshot.scores[0].bytes.every((byte,index)=>byte===original[index]),'Backup restores folders and original bytes into an empty library');
    output.textContent=lines.join('\n')+`\n${lines.length} browser checks passed.`;
  }catch(error){output.textContent=lines.join('\n')+`\nFAIL ${error.message}`;}
  finally {
    try{(await store.open()).close();indexedDB.deleteDatabase(dbName);}catch{}
    button.disabled=false;
  }
});
