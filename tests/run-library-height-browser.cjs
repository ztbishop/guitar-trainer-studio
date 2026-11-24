const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const server=createAppServer();let browser;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1920,height:1400}});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#btn-scores').click();
  const sizes=()=>page.evaluate(()=>{
   const rect=id=>{const e=document.querySelector(id),r=e.getBoundingClientRect();return {height:r.height,bottom:r.bottom,client:e.clientHeight,scroll:e.scrollHeight};};
   return {panel:rect('#scores-panel'),scores:rect('#library-list'),folders:rect('#library-folder-list')};
  });
  const short=await sizes();assert(short.scores.height<450,'empty list stays compact');
  async function checkDropdowns(){
    for(const name of ['PDF','Library tools']){
      const button=page.getByRole('button',{name,exact:true});
      await button.click();
      const trigger=await button.boundingBox();
      const menu=await page.locator('.score-action-list:popover-open').boundingBox();
      const gap=menu.y-(trigger.y+trigger.height);
      const leftOffset=menu.x-trigger.x;
      const rightOffset=menu.x+menu.width-trigger.x-trigger.width;
      assert(gap>=-1 && gap<=8 && Math.min(Math.abs(leftOffset),Math.abs(rightOffset))<=2,
        name+' dropdown should touch its button edge: '+JSON.stringify({trigger,menu}));
      assert(menu.x>=0 && menu.x+menu.width<=page.viewportSize().width);
      await page.keyboard.press('Escape');
    }
  }
  const actions=page.locator('.scores-menu-content > .scores-library-actions > :visible');
  const tops=await actions.evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().top)));
  assert.equal(tops.length,4);assert.equal(new Set(tops).size,1);
  await checkDropdowns();
  await page.getByRole('button',{name:'PDF',exact:true}).press('Enter');
  assert(await page.locator('#open-pdf-recording').isVisible());
  assert(await page.locator('#pdf-attach').isDisabled());
  await page.keyboard.press('Escape');
  assert(await page.locator('#open-pdf-recording').isHidden());
  assert(await page.locator('#scores-panel').isVisible());
  assert(await page.locator('.library-backup-warning').isVisible());
  await page.evaluate(async()=>{
   const store=new (await import('./js/library-store.js')).LibraryStore();
   for(let i=0;i<65;i++){
    const folder=await store.createFolder('Folder '+String(i).padStart(2,'0'));
    await store.save({title:'Song '+i,fileName:'song-'+i+'.gp',bytes:new Uint8Array([1,2,i]),folderId:folder.id});
   }
  });
  await page.reload();await page.locator('#btn-scores').click();
  await page.waitForFunction(()=>document.querySelectorAll('.library-score-open').length===65);
  const tall=await sizes();assert(tall.scores.height>800,'long list grows beyond old 620px ceiling');
  assert(tall.panel.bottom<1400,'menu stays inside tall viewport');
  assert(tall.panel.scroll<=tall.panel.client+1,'header stays outside scrolling lists');
  assert(tall.scores.scroll>tall.scores.client && tall.folders.scroll>tall.folders.client);
  await page.screenshot({path:require('node:path').join(process.env.TEMP||'.','gts-library-tall.png')});
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(150);
  const laptop=await sizes();assert(laptop.scores.height<=512,'laptop retains previous 55vh ceiling plus padding');
  assert(laptop.panel.bottom<=900);assert(laptop.scores.scroll>laptop.scores.client);
  await page.locator('#library-search').fill('No matching song');
  assert((await sizes()).scores.height<450,'short filtered score list retains its minimum');
  await page.setViewportSize({width:390,height:700});await page.waitForTimeout(150);
  assert(await page.locator('#scores-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'narrow menu has no horizontal overflow');
  await checkDropdowns();
  console.log('PASS: compact empty/filtered lists, tall long score/folder lists, bounded menu, laptop ceiling, scrolling and narrow layout.');
 } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
