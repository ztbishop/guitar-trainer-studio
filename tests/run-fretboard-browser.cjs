// Isolated browser profile against the owner's existing Live Server; no hardware.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{if(!localStorage.getItem('gts.workspacePanelSizes'))localStorage.setItem('gts.workspacePanelSizes',JSON.stringify({'fretboard-container':140,fretboardAutoHeight:true}));});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const base=process.argv[2] || 'http://127.0.0.1:5500';
    await page.goto(`${base}/index.html`);
    await page.locator('#fretboard-content svg').waitFor();
    assert(await page.locator('#fretboard-next').isDisabled(),JSON.stringify(await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,loop:s.practiceLoop,current:s.trainer.currentEvent?.startTick};})));
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'fixtures/fretboard-multistring.gp'));
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady && s.expectedEvents.length;});
    const state=()=>page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,playing:s.isPlaying,countIn:s.countInActive,wait:s.waitTrainer?.active,phase:s.waitTrainer?.phase,events:s.expectedEvents.map(e=>e.startTick),view:s.ui.fretboardView,labels:s.ui.fretboardLabels};});
    await page.locator('#fretboard-settings').click();
    await page.locator('#fretboard-view').selectOption('next');
    assert(await page.locator('.fretboard-marker-context[data-state=future]').count()>0);
    await page.locator('#fretboard-view').selectOption('bar');
    assert(await page.locator('.fretboard-marker-context').count()>0);
    await page.locator('#fretboard-labels').selectOption('fingers');
    assert.equal(await page.locator('.fretboard-marker-target text').count(),0,'missing finger data stays blank');
    await page.locator('#fretboard-labels').selectOption('frets');
    assert.match(await page.locator('.fretboard-marker-target text').first().textContent(),/^\d+$/);
    await page.locator('#fretboard-left').check();
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('gts.displayPreferences')).ui.leftHanded));
    assert.equal(await page.locator('#left-handed-fretboard').count(),0);
    assert.equal(await page.locator('#display-popup .display-fretboard-help').count(),0);
    await page.locator('#fretboard-help').click();
    assert(await page.locator('#fretboard-help-status').isVisible());
    assert.match(await page.locator('#fretboard-help-status').textContent(),/string/);
    await page.locator('#fretboard-help').click();
    await page.locator('#fretboard-settings').focus();await page.keyboard.press('Escape');
    assert(!await page.locator('#fretboard-options').isVisible());
    await page.locator('#fretboard-next').click();
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return Math.abs(s.tickPosition-s.expectedEvents[1].startTick)<3;});
    assert.equal((await state()).playing,false);assert.equal((await state()).countIn,false);
    assert(await page.locator('.fretboard-marker-context[data-state=past]').count()>0);
    await page.locator('#fretboard-previous').click();
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.tickPosition<3;});
    await page.reload();await page.locator('#fretboard-content svg').waitFor();
    assert.equal((await state()).view,'bar');assert.equal((await state()).labels,'frets');
    await page.locator('#fretboard-settings').click();
    assert(await page.locator('#fretboard-left').isChecked(),'orientation restores after reload without a Display checkbox');
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{const control=document.querySelector('#show-fretboard');control.checked=false;control.dispatchEvent(new Event('change'));control.checked=true;control.dispatchEvent(new Event('change'));});
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('gts.displayPreferences')).ui.leftHanded),'hiding the neck retains orientation');
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'fixtures/fretboard-multistring.gp'));
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady && s.expectedEvents.length;});
    // Exercise both running modes: arrows must leave the destination ungraded and paused.
    for(const mode of ['wait','realtime']) {
      await page.evaluate(mode=>{const control=document.querySelector(`input[name=practice-mode][value="${mode}"]`);control.checked=true;control.dispatchEvent(new Event('change'));},mode);
      await page.locator('#play-pause-button').click();
      await page.locator('#fretboard-next').click();
      await page.waitForTimeout(250);
      const s=await state();assert.equal(s.playing,false);assert.equal(s.countIn,false);assert(!s.wait,'no active Wait gate after browsing');
      await page.locator('#fretboard-previous').click();
    }
    // A limited range must constrain previews and both arrow endpoints.
    await page.evaluate(async()=>{
      const {AppState:s}=await import('./js/app-state.js');
      const {applyPracticeLoop}=await import('./js/alphatab-host.js');
      const range={startTick:s.expectedEvents[1].startTick,endTick:s.expectedEvents[3].startTick};
      s.practiceLoop={...s.practiceLoop,enabled:true,range};applyPracticeLoop(range);
    });
    await page.waitForTimeout(150);
    assert(await page.locator('#fretboard-previous').isDisabled());
    await page.locator('#fretboard-next').click();await page.waitForTimeout(150);
    assert(await page.locator('#fretboard-next').isDisabled(),JSON.stringify(await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,loop:s.practiceLoop,current:s.trainer.currentEvent?.startTick};})));
    assert.equal((await state()).playing,false);
    await page.evaluate(async()=>{
      const {AppState:s}=await import('./js/app-state.js');
      const {setMediaEditing}=await import('./js/alphatab-host.js');
      setMediaEditing(true);
    });
    assert(await page.locator('#fretboard-previous').isDisabled());
    assert(await page.locator('#fretboard-next').isDisabled());
    await page.evaluate(async()=>{const {setMediaEditing}=await import('./js/alphatab-host.js');setMediaEditing(false);});
    for(const [index,count] of [[0,1],[1,4],[2,5],[3,6],[4,7],[5,8],[6,12]]) {
      await page.evaluate(index=>{const control=document.querySelector('#practice-track-select');control.value=String(index);control.dispatchEvent(new Event('change'));},index);
      await page.waitForFunction(count=>document.querySelectorAll('#fretboard-content .fretboard-string').length===count,count);
      await page.waitForFunction(()=>['#fretboard-container','#fretboard-content','.fretboard-scroll'].every(id=>{const el=document.querySelector(id);return el.scrollHeight<=el.clientHeight+1;}));
    }
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gts.workspacePanelSizes'))['fretboard-container']),140,'automatic content fit does not overwrite saved panel size');
    await page.evaluate(()=>{const control=document.querySelector('#practice-track-select');control.value='3';control.dispatchEvent(new Event('change'));});
    assert.equal(await page.locator('.fretboard-capo text').textContent(),'Capo 2');
    let neckHeight=null;
    for(const width of [1440,800,390]) {
      await page.setViewportSize({width,height:900});
      await page.waitForFunction(async()=>{
        const {fretboardGeometry}=await import('./js/fretboard-geometry.js');
        const svg=document.querySelector('#fretboard-content svg'),content=document.querySelector('#fretboard-content');
        const maxFret=Math.max(...[...svg.querySelectorAll('.fretboard-fret')].map(el=>Number(el.dataset.fret)));
        const padding=getComputedStyle(content),available=content.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight);
        return svg.getBoundingClientRect().width===fretboardGeometry(maxFret,6,available).width &&
          Number(svg.getAttribute('width'))===svg.getBoundingClientRect().width;
      });
      const dimensions=await page.evaluate(()=>{
        const svg=document.querySelector('#fretboard-content svg'),circle=svg.querySelector('.fretboard-marker-target circle');
        const box=circle.getBoundingClientRect();
        return {height:svg.getBoundingClientRect().height,markerWidth:box.width,markerHeight:box.height,
          font:getComputedStyle(svg.querySelector('.fretboard-marker-target text')).fontSize,
          labels:[...svg.querySelectorAll('[data-fret-label]')].map(el=>Number(el.dataset.fretLabel))};
      });
      neckHeight??=dimensions.height;assert.equal(dimensions.height,neckHeight);
      await page.waitForFunction(()=>['#fretboard-container','#fretboard-content','.fretboard-scroll'].every(id=>{const el=document.querySelector(id);return el.scrollHeight<=el.clientHeight+1;}));
      assert(await page.evaluate(()=>{const svg=document.querySelector('#fretboard-content svg'),scroll=svg.parentElement,nut=svg.querySelector('.fretboard-nut').getBoundingClientRect(),box=scroll.getBoundingClientRect();return nut.x>box.x && nut.x<box.right;}),'left-handed nut stays in view when a full neck becomes scrollable');
      assert.equal(dimensions.markerWidth,20);assert.equal(dimensions.markerHeight,20);assert.equal(dimensions.font,'12px');
      assert(dimensions.labels.includes(0));
      if(width<=800)assert(!dimensions.labels.includes(1),'sparse labels omit 1');
      await page.locator('#fretboard-settings').click();
      assert(await page.locator('#fretboard-options').isVisible());
      const box=await page.locator('#fretboard-options').boundingBox();assert(box.x>=0 && box.x+box.width<=width,'popup fits viewport');
      await page.locator('#fretboard-help').click();
      const helpBox=await page.locator('#fretboard-options').boundingBox();assert(helpBox.y>=0 && helpBox.y+helpBox.height<=900,'expanded help fits viewport');
      await page.locator('#fretboard-help').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
      if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,`fretboard-${width}.png`)});
      await page.keyboard.press('Escape');
      if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,`fretboard-neck-${width}.png`)});
    }
    const handle=page.locator('[data-resize-panel="fretboard-container"]');
    const automaticHeight=await page.locator('#fretboard-container').evaluate(el=>el.getBoundingClientRect().height);
    await handle.focus();await page.keyboard.press('ArrowDown');
    assert(await page.locator('#fretboard-container').evaluate(el=>el.getBoundingClientRect().height)<automaticHeight,'keyboard can shrink below the automatic fit');
    const dragBox=await handle.boundingBox();
    await page.mouse.move(dragBox.x+dragBox.width/2,dragBox.y+5);await page.mouse.down();
    await page.mouse.move(dragBox.x+dragBox.width/2,dragBox.y+17);await page.mouse.up();
    const manual=await page.evaluate(()=>JSON.parse(localStorage.getItem('gts.workspacePanelSizes')));
    assert.equal(manual.fretboardAutoHeight,false);
    assert(manual['fretboard-container']<automaticHeight-10,'divider drag saves a smaller height');
    await page.waitForFunction(()=>{const svg=document.querySelector('#fretboard-content svg'),scroll=svg.parentElement;return Number(svg.dataset.scale)<1 && scroll.scrollHeight<=scroll.clientHeight+1;});
    const scaledCircle=await page.locator('.fretboard-marker-target circle').first().boundingBox();
    assert(scaledCircle.width<20 && Math.abs(scaledCircle.width-scaledCircle.height)<0.1,'short-frame markers shrink evenly and remain round');
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'fretboard-short.png')});
    await page.reload();await page.locator('#fretboard-content svg').waitFor();
    await page.waitForFunction(height=>Math.abs(document.querySelector('#fretboard-container').getBoundingClientRect().height-height)<1,manual['fretboard-container']);
    await page.waitForFunction(()=>{const svg=document.querySelector('#fretboard-content svg'),scroll=svg.parentElement;return Number(svg.dataset.scale)<1 && scroll.scrollHeight<=scroll.clientHeight+1;});
    assert(await page.evaluate(()=>{const scroll=document.querySelector('.fretboard-scroll'),box=scroll.getBoundingClientRect();return [...scroll.querySelectorAll('.fretboard-string')].every(el=>{const b=el.getBoundingClientRect();return b.top>=box.top && b.bottom<=box.bottom;});}),'all strings fit after restoring a shorter saved frame');
    await page.locator('[data-resize-panel="fretboard-container"]').dblclick();
    await page.waitForFunction(()=>{const el=document.querySelector('.fretboard-scroll');return el.scrollHeight<=el.clientHeight+1;});
    await page.waitForFunction(()=>Number(document.querySelector('#fretboard-content svg').dataset.scale)===1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gts.workspacePanelSizes')).fretboardAutoHeight),true);
    await page.reload();await page.locator('#fretboard-content svg').waitFor();
    await page.waitForFunction(()=>{const el=document.querySelector('.fretboard-scroll');return el.scrollHeight<=el.clientHeight+1;});
    await page.goto(`${base}/tests/fretboard-browser.html`);
    await page.waitForFunction(()=>document.querySelector('#result').textContent.startsWith('Ready.'));
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});await page.locator('#run').click();
      assert.match(await page.locator('#result').textContent(),/^PASS: 56/);
    }
    await page.goto(`${base}/tests/media-layout.html`);
    for(const viewport of ['desktop','phone']) {
      await page.locator('#'+viewport).click();await page.locator('#ui-run').click();
      await page.waitForFunction(()=>!document.querySelector('#ui-run').disabled,{},{timeout:45000});
      const result=await page.locator('#ui-results').textContent();
      assert(!result.includes('FAIL'),result);assert.match(result,/UI checks passed/);
      console.log(viewport+': '+result.split('\n').at(-1));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: native fretboard modes/labels, missing fingers, orientation, persistence, paused navigation in Wait/Realtime, loop bounds, sync-editing gates, responsive popup, and 56 geometry scenarios at desktop/phone widths.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
