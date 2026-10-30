// Actual backup/download/import controls in isolated browser profiles only.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const server=createAppServer();let browser;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const source=await browser.newPage(),target=await browser.newPage();
  const url=`http://127.0.0.1:${server.address().port}`;
  await source.goto(url);await target.goto(url);
  await source.evaluate(async()=>{
   const {LibraryStore}=await import('./js/library-store.js');const store=new LibraryStore();
   const a=await store.createFolder('Lessons'),b=await store.createFolder('Jazz');await store.createFolder('Empty folder');
   for(const [i,folderId] of [a.id,b.id,null].entries()) {
    const {score}=await store.save({title:'Renamed score '+i,fileName:'original-'+i+'.gp',bytes:new Uint8Array([1,2,255,i]),folderId});
    for(const [j,source] of [
     {kind:'local',label:'Local take',fileName:'take.mp4',size:12345,lastModified:123456},
     {kind:'youtube',label:'Online take',videoId:'abcdefghijk'}
    ].entries())await store.saveProfile({id:`profile-${i}-${j}`,scoreHash:score.hash,scoreName:score.title,name:'Take '+j,source,durationMs:12000,layout:'left',points:[
     {barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:350},
     {barIndex:1,barOccurence:1,barPosition:0.5,millisecondOffset:4321.25},
     {barIndex:3,barOccurence:0,barPosition:1,millisecondOffset:12000}
    ]});
   }
  });
  await source.reload();await source.locator('#btn-scores').click();
  const downloaded=source.waitForEvent('download');await source.locator('#library-backup').click();
  const buffer=await fs.readFile(await (await downloaded).path());
  const backup=JSON.parse(buffer);assert.equal(backup.folders.length,3);assert.equal(backup.scores.length,3);assert.equal(backup.mediaProfiles.length,6);
  const canonical=data=>({
   folders:data.folders.map(f=>f.name).sort(),
   scores:data.scores.map(s=>({title:s.title,fileName:s.fileName,data:s.data,folder:data.folders.find(f=>f.id===s.folderId)?.name||null})).sort((a,b)=>a.fileName.localeCompare(b.fileName)),
   profiles:data.mediaProfiles.map(({id,...p})=>p).sort((a,b)=>(a.scoreHash+a.name).localeCompare(b.scoreHash+b.name))
  });
  await target.locator('#btn-scores').click();
  const restore=async()=>{
   await target.evaluate(()=>document.querySelector('#library-status').textContent='');
   await target.locator('#library-backup-input').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});
   await target.waitForFunction(()=>document.querySelector('#library-status').textContent.startsWith('Library merged:'));
  };
  const snapshot=()=>target.evaluate(async()=>new (await import('./js/library-store.js')).LibraryStore().backup());
  await restore();assert.deepEqual(canonical(await snapshot()),canonical(backup));
  await target.reload();assert.deepEqual(canonical(await snapshot()),canonical(backup));
  // A merge keeps newer metadata, and preserves distinct sync-point versions.
  await target.evaluate(async()=>{
   const store=new (await import('./js/library-store.js')).LibraryStore();const data=await store.backup();
   await store.updateScore(data.scores[0].id,{title:'Newer local name',folderId:null});
   const profile=data.mediaProfiles[0];profile.points[1].millisecondOffset+=100;await store.saveProfile(profile);
  });
  await target.locator('#btn-scores').click();await restore();
  let merged=await snapshot();assert.equal(merged.scores.length,3);assert(merged.scores.some(s=>s.title==='Newer local name' && !s.folderId));
  assert.equal(merged.mediaProfiles.length,7);
  await target.locator('#library-backup-input').setInputFiles([]);await restore();
  assert.deepEqual(canonical(await snapshot()),canonical(merged));
  // Standalone transfer remains available, but starts collapsed beside management.
  await source.keyboard.press('Escape');
  await source.evaluate(()=>document.querySelector('[data-launch-panel="media-popup"]').click());
  const transfer=source.locator('#media-profile-transfer');
  assert.equal(await transfer.getAttribute('open'),null);
  assert.equal(await source.locator('#media-export-profile').isVisible(),false);
  assert(await transfer.textContent().then(text=>text.includes('Backup Library already includes')));
  await transfer.locator('summary').click();
  const profilesDownload=source.waitForEvent('download');await source.locator('#media-export-profile').click();
  const profilesBuffer=await fs.readFile(await (await profilesDownload).path());
  assert.equal(JSON.parse(profilesBuffer).profiles.length,6);
  await target.keyboard.press('Escape');
  await target.evaluate(()=>document.querySelector('[data-launch-panel="media-popup"]').click());
  await target.locator('#media-profile-transfer summary').click();
  const chooser=target.waitForEvent('filechooser');await target.locator('#media-import-profile').click();
  await (await chooser).setFiles({name:'profiles.json',mimeType:'application/json',buffer:profilesBuffer});
  await target.waitForFunction(()=>document.querySelector('#media-status').textContent.startsWith('Imported 0 new sync profiles'));
  assert.deepEqual(canonical(await snapshot()),canonical(merged));
  console.log('PASS: profile transfer starts collapsed; expanding enables export/import with unchanged duplicate handling.');
  console.log('PASS: real backup download/import restores empty folders, renamed titles, memberships, unfiled scores, exact bytes and six complete sync profiles; reload, duplicate merge, newer metadata and distinct sync edits preserved.');
 } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
