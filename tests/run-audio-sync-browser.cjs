const assert = require('node:assert/strict');
const {chromium} = require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer} = require('../local-web-server.cjs');
const alphaTab = require('../assets/vendor/alphatab/alphaTab.js');

async function run() {
  const {sampleRate,lessonSamples} = await import('./audio-sync-fixture.js');
  const pcm = lessonSamples(), wav = Buffer.alloc(44+2*pcm.length);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(sampleRate,24); wav.writeUInt32LE(2*sampleRate,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36);
  wav.writeUInt32LE(2*pcm.length,40);
  pcm.forEach((v,i) => wav.writeInt16LE(Math.round(v*32767),44+i*2));
  const settings = new alphaTab.Settings(), parser = new alphaTab.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . \ro 0.6.4 3.6.4 7.6.4 2.6.4 | \rc 2 10.6.4 5.6.4 8.6.4 12.6.4`,settings);
  const gp = Buffer.from(new alphaTab.exporter.Gp7Exporter().export(parser.readScore(),settings));
  const server = createAppServer();
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = []; page.on('pageerror',e => errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#score-file-input').setInputFiles({name:'lesson.gp',mimeType:'application/octet-stream',buffer:gp});
    await page.waitForFunction(async () => {
      window.s = (await import('./js/app-state.js')).AppState;
      return s.playerReady && s.expectedEvents.length;
    });
    await page.waitForFunction(() => document.querySelector('#media-status').textContent.includes('Score ready'));
    await page.waitForTimeout(700); // Let the native selected-track regeneration settle.
    await page.locator('#media-file').setInputFiles({name:'lesson.wav',mimeType:'audio/wav',buffer:wav});
    await page.waitForFunction(() => s.media.preview && s.playerReady);
    await page.locator('#media-show-editor').evaluate(box => {box.checked=true;box.dispatchEvent(new Event('change'));});
    const panel = page.locator('#media-audio-suggestions');
    const toggle = panel.locator(':scope > summary');
    await toggle.click();
    await panel.evaluate(node => {
      const actions = node.querySelectorAll('button');
      actions[0].click(); actions[1].click();
    });
    assert.match(await panel.innerText(),/canceled/);
    await panel.getByText('Analyze lesson audio').click();
    const selects = panel.locator('label').filter({hasText:/^Measure \d/}).locator('select');
    async function selectTakeNear(row,seconds) {
      const value = await selects.nth(row).locator('option').evaluateAll((options,target) => {
        const found = options.find(o => {
          const parts = o.textContent.match(/· (\d+):(\d+\.\d+)–/);
          return parts && Math.abs(60*Number(parts[1])+Number(parts[2])-target)<0.15;
        });
        return found?.value;
      },seconds);
      assert(value !== undefined,`Missing take near ${seconds}s`);
      await selects.nth(row).selectOption(value);
    }
    await selects.nth(3).waitFor();
    assert.notEqual(await selects.nth(0).inputValue(),'-1');
    await selects.nth(0).selectOption('-1');
    const missing=panel.getByRole('group',{name:'Time a missing measure'});
    await missing.getByLabel('Missing measure and pass').selectOption('1');
    await missing.getByLabel('Start (s)').fill('0.81');
    await missing.getByLabel('End (s)').fill('2.65');
    await missing.getByRole('button',{name:'Add timed measure'}).click();
    assert.match(await selects.nth(0).locator('option:checked').innerText(),/Manually timed/);
    await selectTakeNear(0,0.8);
    await panel.getByRole('button',{name:'Continue this take'}).nth(0).click();
    assert.equal(await selects.nth(1).inputValue(),'0',await panel.innerText());
    await selectTakeNear(2,12);
    await panel.getByRole('button',{name:'Continue this take'}).nth(2).click();
    await panel.getByText('Play from take').nth(2).click();
    await page.waitForFunction(() => document.querySelector('#media-audio').currentTime > 11.7);
    await page.waitForFunction(()=>document.querySelector('#draft-score-cursor')?.dataset.originalVisit==='3' &&
      document.body.classList.contains('media-take-audition') && getComputedStyle(document.querySelector('.at-cursor-beat')).visibility==='hidden');
    await page.waitForFunction(()=>!document.body.classList.contains('media-take-audition'));
    assert(await page.locator('#media-audio').evaluate(el=>el.paused && Math.abs(el.currentTime-14)<0.3));
    const range = panel.getByRole('group',{name:'Refine a continuous passage'});
    await range.getByLabel('Start measure').selectOption('2');
    await range.getByLabel('End measure').selectOption('3');
    await range.getByText('Use playhead for start').click();
    assert(Number(await range.getByLabel('Start time (s)').inputValue()) > 11);
    await range.getByLabel('Start time (s)').fill('12.013');
    await range.getByLabel('End time (s)').fill('11');
    await range.getByText('Refine points between pins').click();
    await panel.getByText(/enter a start and a later end/).waitFor();
    await range.getByLabel('End time (s)').fill('16.006');
    await range.getByText('Refine points between pins').click();
    await panel.getByText(/both pins fixed/).waitFor();
    await panel.getByText('Review selected takes').click();
    await page.locator('#media-draft-timing').waitFor();
    assert(await page.evaluate(() => s.media.editing && !s.media.preview));
    const plan = JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan;
    await page.waitForFunction(()=>document.querySelector('#media-seek').style.backgroundImage.includes('linear-gradient'));
    assert.deepEqual(plan.originalPlaybackOrder,[1,2,1,2]);
    assert(plan.intervals.some(i => i.startSeconds < 5 && i.endSeconds > 11));
    assert.equal(plan.musicalVisits[2].startSeconds,12.013);
    assert.equal(plan.musicalVisits[3].endSeconds,16.006);
    assert(Math.abs(plan.musicalVisits[3].startSeconds-14)<0.15);
    // Reconsider an instructor take after hearing the draft. Use the draft's
    // existing Undo history to restore the first selection.
    await toggle.click();
    await selectTakeNear(2,7);
    await panel.getByRole('button',{name:'Replace draft mapping with selected takes'}).click();
    const draftJSON = page.locator('#media-draft-json');
    await page.waitForFunction(() => JSON.parse(document.querySelector('#media-draft-json').value).candidatePlan.musicalVisits[2].startSeconds < 8);
    await page.locator('#media-draft-undo').click();
    assert.deepEqual(JSON.parse(await draftJSON.inputValue()).candidatePlan,plan);
    await page.locator('#media-draft-use').click();
    await page.waitForFunction(() => s.media.preview && s.media.timingPlan?.visits.length === 4);
    await page.locator('#media-show-editor').evaluate(box=>{box.checked=true;box.dispatchEvent(new Event('change'));});
    await page.locator('#media-edit-timed-measures').click();
    await page.locator('#media-draft-use').waitFor();
    assert.deepEqual(JSON.parse(await draftJSON.inputValue()).candidatePlan,plan);
    await page.locator('#media-draft-use').click();
    await page.waitForFunction(()=>s.media.preview && s.media.timingPlan?.visits.length===4 && !s.media.editing);
    // A saved analyzer profile must also be editable after restoring it from storage.
    await page.locator('#media-show-editor').evaluate(box=>{box.checked=true;box.dispatchEvent(new Event('change'));});
    await page.locator('#media-save-profile').click();
    await page.waitForFunction(()=>document.querySelector('#media-status').textContent.includes('profile saved'));
    await page.locator('#media-profile-select').evaluate(select=>{select.value=[...select.options].find(o=>o.value).value;select.dispatchEvent(new Event('change'));});
    await page.waitForFunction(()=>document.querySelector('#media-status').textContent.includes('Saved alignment restored'));
    await page.locator('#media-edit-timed-measures').click();
    await page.locator('#media-draft-use').waitFor();
    assert.deepEqual(JSON.parse(await draftJSON.inputValue()).candidatePlan.musicalVisits,plan.musicalVisits);
    await page.locator('#media-draft-use').click();
    await page.waitForFunction(()=>s.media.preview && !s.media.editing);
    const skipMusic=page.locator('#media-player-skip-explanation'), mainPlay=page.locator('#play-pause-button');
    const scrubTo=seconds=>page.locator('#media-seek').evaluate((el,t)=>{el.value=t;el.dispatchEvent(new Event('input'));},seconds);
    await scrubTo(0);
    await skipMusic.click(); // Audio-only, with both video and wide timeline hidden.
    await page.waitForFunction(t=>Math.abs(document.querySelector('#media-audio').currentTime-t)<0.025,plan.musicalVisits[0].startSeconds);
    assert(await page.locator('#media-audio').evaluate(el=>el.paused));
    await scrubTo(8);
    await skipMusic.click();
    await mainPlay.click();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>12.3);
    await mainPlay.click();
    await page.waitForTimeout(150);
    const paused=await page.locator('#media-audio').evaluate(el=>el.currentTime);
    assert.ok(paused>12.2 && paused<14,'Pause must retain the second take');
    await mainPlay.click();
    await page.waitForFunction(t=>document.querySelector('#media-audio').currentTime>t+.2,paused);
    await mainPlay.click();
    // Exercise the link reader independently of local File access. A player
    // can load a URL even when a separate scripted fetch fails.
    let deny = true;
    // A separate take holds the fourth note for three seconds. Both measures
    // still appear once; the audible second downbeat is 4.5 seconds in.
    const {phrases} = await import('./audio-sync-fixture.js');
    const linkWav = Buffer.alloc(wav.length + Math.ceil(7*sampleRate)*2);
    wav.copy(linkWav);
    linkWav.writeUInt32LE(linkWav.length-8,4); linkWav.writeUInt32LE(linkWav.length-44,40);
    let onset = pcm.length;
    for (const [i,pitch] of phrases.flat().entries()) {
      const length = Math.round((i===3 ? 3 : 0.5)*sampleRate);
      for (let n = 0; n < length; n++) {
        const sample = Math.sin(2*Math.PI*440*2**((pitch-69)/12)*n/sampleRate)*14000;
        linkWav.writeInt16LE(Math.round(sample),44+(onset+n)*2);
      }
      onset += length;
    }
    const mediaUrl = 'http://127.0.0.1:'+server.address().port+'/assets/test-lesson.wav';
    await page.route(mediaUrl,route => {
      if (route.request().resourceType() === 'fetch' && deny) return route.abort('accessdenied');
      return route.fulfill({contentType:'audio/wav',body:linkWav});
    });
    await page.evaluate(url => {
      const kind = document.querySelector('#media-source-kind'); kind.value='url'; kind.dispatchEvent(new Event('change'));
      document.querySelector('#media-url').value=url; document.querySelector('#media-load-link').click();
    },mediaUrl);
    await page.waitForFunction(() => document.querySelector('#media-audio').src.endsWith('test-lesson.wav') && s.playerReady && s.media.preview && !s.media.timingPlan);
    await page.locator('#media-show-editor').evaluate(box => {box.checked=true;box.dispatchEvent(new Event('change'));});
    await toggle.click();
    await panel.getByText('Analyze lesson audio').click();
    await panel.getByText(/host must allow cross-origin/).waitFor();
    deny = false;
    await panel.getByText('Analyze lesson audio').click();
    await selects.nth(3).waitFor();
    await selectTakeNear(2,7);
    for (let i=0;i<4;i++) await selects.nth(i).selectOption('-1');
    await range.getByLabel('Start measure').selectOption('0');
    await range.getByLabel('End measure').selectOption('1');
    await range.getByLabel('Start time (s)').fill('17');
    await range.getByLabel('End time (s)').fill('23.5');
    await range.getByText('Refine points between pins').click();
    await panel.getByText('Compare alternate measure starts (1)').click();
    await panel.getByText('Hear alternate').click();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime > 21.3);
    await panel.getByText('Use alternate start').click();
    await selects.nth(1).selectOption('-1');
    assert.equal(await panel.getByText(/Compare alternate measure starts/).isVisible(),false);
    await selects.nth(1).selectOption({label:await selects.nth(1).locator('option').last().textContent()});
    await panel.getByText('Review selected takes').click();
    await page.locator('#media-draft-timing').waitFor();
    const placed = JSON.parse(await draftJSON.inputValue()).candidatePlan.musicalVisits;
    assert.equal(placed.length,2);
    assert.equal(placed[0].startSeconds,17); assert.equal(placed[1].endSeconds,23.5);
    assert(Math.abs(placed[1].startSeconds-21.5)<0.15);
    assert.equal(placed[0].endSeconds,placed[1].startSeconds);
    assert.deepEqual(errors,[]);
    console.log('Chrome passed local and direct-link audio, cancel/retry, written repeats, undo, unscored gaps, and auditioning and applying an alternate interior start with both passage pins fixed.');
  } finally {
    await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => {console.error(error);process.exitCode=1;});
