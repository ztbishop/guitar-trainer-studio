// Isolated real Chrome; external GPX files are optional and read-only.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createAppServer}=require('../local-web-server.cjs');
const {tapProbe,witness,savedInputs,modelMarks,writtenNotes}=require('./right-hand-tap-fixtures.cjs');

function painted(view){
  return [...document.querySelectorAll(`.at-right-hand-tap-${view}`)].map(e=>Number(e.className.baseVal.match(/at-right-hand-tap-note-(\d+)/)[1])).sort((a,b)=>a-b);
}

(async()=>{
  const probe=tapProbe();
  const inputs=[{id:'synthetic-dual',bytes:witness(probe,{dual:true,kind:'tie'}).bytes},
    {id:'synthetic-pair',bytes:witness(probe,{scope:'pair'}).bytes},
    ...savedInputs(process.env.GTS_TAP_REFERENCE).map(x=>({...x,bytes:fs.readFileSync(x.file)}))];
  const out=process.env.GTS_SCREENSHOT_DIR;
  if(out)fs.mkdirSync(out,{recursive:true});
  const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
    page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async()=>{
      window.host=await import('./js/alphatab-host.js');
      window.state=(await import('./js/app-state.js')).AppState;
      window.api=host.getAlphaTabApi();
      state.ui.scoreDisplay='both';api.settings.core.enableLazyLoading=false;host.applyScoreDisplay();
      window.marks=()=>{
        const rows=[];for(let bi=0;bi<api.score.masterBars.length;bi++)api.score.tracks.flatMap(t=>t.staves).forEach((s,si)=>
          s.bars[bi]?.voices.forEach((v,vi)=>v.beats.forEach((b,ei)=>b.notes.forEach((n,ni)=>{
            if(n.isRightHandTapped||n.isLeftHandTapped)rows.push([bi,si,vi,ei,ni,n.isRightHandTapped,n.isLeftHandTapped]);
          }))));return rows;
      };
      window.markIds=view=>[...document.querySelectorAll(`#alphatab-container .at-right-hand-tap-${view}`)].map(e=>Number(e.className.baseVal.match(/at-right-hand-tap-note-(\d+)/)[1])).sort((a,b)=>a-b);
      window.markGeometry=()=>{
        const heads=new Map(),root=api.canvasElement.element.getBoundingClientRect();
        for(const sys of api.boundsLookup.staffSystems)for(const master of sys.bars)for(const bar of master.bars)for(const beat of bar.beats)for(const n of beat.notes||[]){
          const head=n.noteHeadBounds;if(!heads.has(n.note.id))heads.set(n.note.id,[]);heads.get(n.note.id).push(head);
        }
        return [...document.querySelectorAll('#alphatab-container .at-right-hand-tap')].every(group=>{
          const id=Number(group.className.baseVal.match(/at-right-hand-tap-note-(\d+)/)[1]),text=group.querySelector('text');
          const svg=text.ownerSVGElement.getBoundingClientRect();
          const x=+text.getAttribute('x')+svg.x-root.x,y=+text.getAttribute('y')+svg.y-root.y;
          return (heads.get(id)||[]).some(h=>Math.abs(h.y+h.h/2-y)<2 && x>=h.x+h.w-2);
        });
      };
      window.renderCount=0;api.postRenderFinished.on(()=>renderCount++);
      window.openForPrint=window.open;window.open=(...args)=>{const p=openForPrint(...args);p.print=()=>{p.printRequested=true;};return p;};
    });
    for(const input of inputs){
      const read=probe.read(input.bytes),expected=modelMarks(read);
      const count=writtenNotes(read).filter(({n})=>n.isVisible&&n.isRightHandTapped&&n.beat.notes.some(p=>!p.isRightHandTapped)).length;
      assert(count>0);
      const fileName=input.id+(input.file?'.gpx':'.gp');
      await page.locator('#score-file-input').setInputFiles({name:fileName,mimeType:'application/octet-stream',buffer:input.bytes});
      await page.waitForFunction(({fileName,count})=>state.currentScoreFile?.fileName===fileName&&state.playerReady&&api.boundsLookup?.isFinished&&markIds('tab').length===count,{fileName,count});
      assert.deepEqual(await page.evaluate(()=>marks()),expected);
      const ids=await page.evaluate(()=>markIds('score'));
      assert.equal(ids.length,count);
      assert.deepEqual(await page.evaluate(()=>markIds('tab')),ids);
      assert(await page.evaluate(()=>markGeometry()),`${input.id}: each T aligns with its own notehead/fret`);
      if(out){const mark=page.locator('.at-right-hand-tap-tab').first();await mark.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${input.id}-screen.png`)});}
      if(input.id==='synthetic-pair'){
        for(const [view,zoom] of [['notation',125],['tab',150],['both',100]]){
          const before=await page.evaluate(({view,zoom})=>{const before=renderCount;state.ui.scoreDisplay=view;state.ui.zoomPercent=zoom;host.applyScoreDisplay();return before;},{view,zoom});
          await page.waitForFunction(n=>renderCount>n&&api.boundsLookup?.isFinished,before);
          assert.deepEqual(await page.evaluate(()=>markIds('score')),view==='tab'?[]:ids);
          assert.deepEqual(await page.evaluate(()=>markIds('tab')),view==='notation'?[]:ids);
          assert(await page.evaluate(()=>markGeometry()));
        }
      }
      const [print]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>host.printScore())]);
      await print.waitForFunction(()=>window.printRequested===true,null,{timeout:15000});
      for(const view of ['score','tab'])assert.deepEqual(await print.evaluate(painted,view),ids);
      if(out && !input.file){await print.setViewportSize({width:900,height:850});await print.screenshot({path:path.join(out,`${input.id}-print.png`)});}
      await print.close();
      assert.deepEqual(await page.evaluate(()=>marks()),expected);
      if(input.file)assert.deepEqual(fs.readFileSync(input.file),input.bytes);
      console.log(`${input.id}: ${count} selected mixed-chord note marks per staff/TAB and print`);
    }
    // A separate native SVG API actually serializes the score to a renderer
    // worker. The trainer's text-layout SVG uses the main thread by design.
    const worker=await page.evaluate(async bytes=>{
      const at=window.alphaTab,element=document.createElement('div');element.style.width='900px';document.body.append(element);
      const render=new at.AlphaTabApi(element,{core:{engine:'svg',useWorkers:true,enableLazyLoading:false,scriptFile:api.settings.core.scriptFile},player:{enablePlayer:false}});
      const score=at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new at.Settings());
      const staff=score.tracks[0].staves[0];staff.showStandardNotation=staff.showTablature=true;
      try{
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker render timeout')),12000);
          render.error.on(e=>{clearTimeout(timer);reject(e);});render.postRenderFinished.on(()=>{clearTimeout(timer);resolve();});render.renderScore(score);});
        return {engine:render.renderer.instance.constructor.name,score:element.querySelectorAll('.at-right-hand-tap-score').length,tab:element.querySelectorAll('.at-right-hand-tap-tab').length};
      }finally{render.destroy();element.remove();}
    },Array.from(inputs[1].bytes));
    assert.deepEqual(worker,{engine:'AlphaTabWorkerScoreRenderer',score:2,tab:2});
    assert.deepEqual(errors,[]);
    console.log('PASS real renderer worker, note geometry, view/zoom changes, and native print for every score.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
