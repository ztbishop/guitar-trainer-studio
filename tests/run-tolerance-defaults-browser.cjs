// Isolated fresh/returning profiles; no owner storage, browser or physical MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    for(const returning of [false,true]) {
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      if(returning)await context.addInitScript(()=>{
        if(!localStorage.getItem('gts.practicePreferences'))localStorage.setItem('gts.practicePreferences',JSON.stringify({heldNoteTolerance:'one',extraStringTolerance:'off',feedback:{inferPolyMistakes:false,showTabMistakes:false}}));
      });
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      for(const reload of [false,true]) {
        if(reload)await page.reload();else await page.goto(base);
        await page.locator('#fretboard-content svg').waitFor();
        assert.equal(await page.locator('#held-note-tolerance').inputValue(),returning?'one':'two');
        assert.equal(await page.locator('#extra-string-tolerance').inputValue(),returning?'off':'internal');
        assert(await page.locator('#filter-hex-spikes').isChecked());
        assert(!(await page.locator('#filter-score-range').isChecked()));
        assert(!(await page.locator('#ignore-brief-errors').isChecked()));
        assert.equal(await page.locator('#minimum-error-ms').inputValue(),'30');
        assert(await page.locator('#show-notation-feedback').isChecked());assert(await page.locator('#show-tab-circles').isChecked());
        assert.equal(await page.locator('#show-tab-mistakes').isChecked(),!returning);
        assert.equal(await page.locator('#infer-poly-mistakes').isChecked(),!returning);
      }
      if(!returning) {
        for(const width of [1440,390]) {
          await page.setViewportSize({width,height:900});
          await page.locator('#btn-practice').click();
          await page.locator('.practice-input-filters > summary').click();
          assert(await page.locator('#practice-tolerance-summary').textContent().then(s=>s.includes('Held notes: Two')));
          assert.match(await page.locator('.practice-filter-intro').textContent(),/tracking causes unexpected errors/);
          assert.match(await page.locator('#poly-estimate-help').textContent(),/not detected fingering/);
          assert(await page.locator('#practice-popup').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Practice overflow ${width}`);
          await page.keyboard.press('Escape');
          await page.locator('#btn-more').click();await page.locator('[data-launch-panel="help-popup"]').click();
          assert.match(await page.locator('#help-popup').textContent(),/review Practice → MIDI input tolerance/);
          assert(await page.locator('#help-popup').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Help overflow ${width}`);
          await page.keyboard.press('Escape');
          // Reset disclosure state for the next viewport without changing preferences.
          await page.locator('.practice-input-filters').evaluate(el=>{el.open=false;});
        }
      }
      assert.deepEqual(errors,[]);await context.close();
    }
    console.log('PASS: fresh Two/Skipped defaults; saved One/Off and feedback off retained across reload; spike/range/brief defaults unchanged; desktop/phone Practice/Help guidance without overflow or page errors.');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
