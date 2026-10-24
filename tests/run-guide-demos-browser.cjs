// Isolated profile only; never reloads the owner's browser or changes its library.
const {chromium} = require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createAppServer} = require('../local-web-server.cjs');
(async () => {
  let server, browser;
  try {
    let base = process.argv[2];
    if (!base) {
      server = createAppServer();
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${server.address().port}`;
    }
    browser = await chromium.launch({headless:true, channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage(), errors = [], remote = [];
    page.on('pageerror', error => errors.push(error.message));
    // Emulate offline internet access while allowing the local launcher origin.
    await context.route('**/*', route => {
      if (route.request().url().startsWith(base) || /^(blob:|data:)/.test(route.request().url())) return route.continue();
      remote.push(route.request().url()); return route.abort();
    });
    await page.goto(base);
    await page.locator('#fretboard-content svg').waitFor();
    const snapshot = () => page.evaluate(async () => {
      const {AppState:s} = await import('./js/app-state.js');
      const {LibraryStore} = await import('./js/library-store.js');
      return {ready:s.playerReady, file:s.currentScoreFile?.fileName, title:s.score?.title,
        playing:s.isPlaying, count:s.expectedEvents.length, mode:s.mode,
        scores:(await new LibraryStore().list()).scores.length};
    });
    assert.equal((await snapshot()).scores, 0, 'no automatic first-run import');
    await page.locator('#btn-scores').click();
    await page.locator('.scores-demos summary').click();
    for (const [key,title,count] of [['melody','First notes',15],['chords','Easy chords',7],['picking','Gentle picking',29]]) {
      await page.locator(`[data-demo-score=${key}]`).click();
      await page.waitForFunction(async ({title,count}) => {
        const {AppState:s} = await import('./js/app-state.js');
        return s.playerReady && s.score?.title === title && s.expectedEvents.length === count;
      }, {title,count});
      const s = await snapshot(); assert.equal(s.playing,false); assert.equal(s.scores,0);
      await page.locator('#demo-score-status').filter({hasText:'opened'}).waitFor();
    }
    await page.locator('#library-save').click();
    await page.waitForFunction(() => document.querySelectorAll('.library-score-open').length === 1);
    await page.reload(); await page.locator('#fretboard-content svg').waitFor();
    assert.equal((await snapshot()).scores,1, 'only explicit Save persists');
    await page.locator('#btn-scores').click();
    await page.locator('.library-score-open').click();
    await page.waitForFunction(async () => { const {AppState:s} = await import('./js/app-state.js'); return s.playerReady && s.score?.title === 'Gentle picking'; });
    // A missing demo stays recoverable and reports an error rather than saving anything.
    await page.route('**/assets/demos/first-notes.gp', route => route.fulfill({status:404,body:'Missing'}));
    await page.locator('.scores-demos summary').click();
    await page.locator('[data-demo-score=melody]').click();
    await page.locator('#demo-score-status').filter({hasText:'could not be read'}).waitFor();
    assert(!(await page.locator('[data-demo-score=melody]').isDisabled()));
    assert.equal((await snapshot()).scores,1);
    await page.keyboard.press('Escape');
    await page.locator('#btn-more').click();
    await page.locator('[data-launch-panel="help-popup"]').click();
    const link = page.locator('#help-popup a');
    assert.equal(await link.getAttribute('target'),'_blank');
    const [guide] = await Promise.all([context.waitForEvent('page'),link.click()]);
    guide.on('pageerror', error => errors.push(error.message));
    await guide.waitForLoadState(); await guide.locator('#guide-content h1').waitFor();
    assert.match(await guide.locator('h1').textContent(), /Guitar Trainer Studio/);
    await guide.locator('a[href="#scores-and-your-library"]').click();
    assert.equal(new URL(guide.url()).hash,'#scores-and-your-library');
    assert(await guide.locator('#scores-and-your-library').isVisible());
    assert.equal(await guide.locator('a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(link.hash.slice(1))).length),0,'all contents links resolve');
    // Every relative Markdown link points to an existing file in the checkout.
    const md = fs.readFileSync(path.join(__dirname,'../README.md'),'utf8');
    for (const [,target] of md.matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^(https?:|#)/.test(target)) assert(fs.existsSync(path.resolve(__dirname,'..',target.split('#')[0])),target);
    }
    for (const width of [1440,390]) {
      await guide.setViewportSize({width,height:850});
      assert(await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`guide overflow at ${width}`);
      await page.setViewportSize({width,height:850});
      await page.keyboard.press('Escape');
      await page.locator('#btn-scores').click();
      assert(await page.locator('#scores-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1),`Scores overflow at ${width}`);
      await page.screenshot({path:path.join(process.env.TEMP || '.',`gts-scores-${width}.png`)});
      await guide.screenshot({path:path.join(process.env.TEMP || '.',`gts-guide-${width}.png`)});
    }
    await guide.goto(`${base}/README.html#practice-modes-and-feedback`);
    await guide.locator('#practice-modes-and-feedback').waitFor();
    assert(await guide.locator('#practice-modes-and-feedback').evaluate(el => Math.abs(el.getBoundingClientRect().top - 20) < 10),'initial anchor scroll');
    await guide.route('**/README.md', route => route.fulfill({status:500,body:'Unavailable'}));
    await guide.reload();
    await guide.locator('#guide-content').filter({hasText:'could not load'}).waitFor();
    assert.equal(errors.length,0,errors.join('\n')); assert.equal(remote.length,0,remote.join('\n'));
    console.log('PASS: three native demos, explicit save/reopen, recoverable demo error, full guide/new tab/anchors/fallback, desktop/phone fit, no external runtime requests or page errors.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
