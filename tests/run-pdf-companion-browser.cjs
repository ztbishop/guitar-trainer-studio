// Run with Node and Playwright. Both input files are generated in memory.
const {chromium} = require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {createAppServer} = require('../local-web-server.cjs');

function twoBarMidi() {
  const track = [];
  for (const pitch of [60,62,64,65,67,69,71,72]) {
    track.push(0, 0x90, pitch, 96, 96, 0x80, pitch, 0);
  }
  track.push(0, 0xff, 0x2f, 0);
  return Buffer.concat([Buffer.from('MThd'), Buffer.from([0,0,0,6,0,0,0,1,0,96]),
    Buffer.from('MTrk'), Buffer.from([0,0,0,track.length]), Buffer.from(track)]);
}

(async () => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:process.env.GTS_BROWSER_CHANNEL || 'chrome', headless:true});
    const page = await browser.newPage();
    const staff='<svg width="600" height="90"><path d="M10 20h560 M10 28h560 M10 36h560 M10 44h560 M10 52h560 M10 20v32 M570 20v32" fill="none" stroke="black"/></svg>';
    await page.setContent('<div>'+staff+'</div><div style="break-before:page">'+staff+'</div>');
    const pdf = {name:'exercise.pdf', mimeType:'application/pdf', buffer:await page.pdf()};
    const midi = {name:'exercise.mid', mimeType:'audio/midi', buffer:twoBarMidi()};
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(async () => {window.practiceState = (await import('/js/app-state.js')).AppState;});
    await page.waitForFunction(() => practiceState.ui.playerStatus.includes('Choose'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const loadPair = async (name=midi.name) => {
      await page.locator('#score-file-input').setInputFiles({...midi,name});
      await page.waitForFunction(() => practiceState.playerReady && !document.querySelector('#pdf-attach').disabled);
      const loaded = await page.evaluate(() => ({
        bars:practiceState.playbackTimeline.measures.length, pitches:practiceState.expectedEvents.map(e => e.pitches[0]),
        bytes:practiceState.currentScoreFile.bytes.length
      }));
      assert.deepEqual(loaded, {bars:2, pitches:[60,62,64,65,67,69,71,72], bytes:midi.buffer.length});
      await page.locator('#pdf-file').setInputFiles(pdf);
      await page.waitForFunction(() => !document.querySelector('#pdf-view').hidden && document.querySelector('#pdf-canvas').width > 1);
    };
    await loadPair();
    assert.equal(await page.locator('#pdf-page option').count(), 2);
    for (const pageNumber of [1,2]) {
      await page.locator('#pdf-page').selectOption(String(pageNumber));
      await page.waitForFunction(() => document.querySelector('#pdf-sheet').style.visibility !== 'hidden');
      if(pageNumber===2) {
        await page.locator('#pdf-find').click();
        await page.locator('#pdf-use').waitFor();
        const proposed=page.locator('#pdf-boxes .pdf-box');
        assert.equal(await proposed.count(),1);
        await page.locator('#pdf-action').selectOption('split');
        const box=await proposed.first().boundingBox();
        await page.mouse.click(box.x+box.width/2, box.y+box.height/2);
        assert.equal(await proposed.count(),2);
        assert.equal(await page.locator('#pdf-use').isDisabled(),true);
        await page.locator('#pdf-action').selectOption('join');
        await page.mouse.click(box.x+box.width/4, box.y+box.height/2);
        assert.equal(await proposed.count(),1);
        await page.locator('#pdf-use').click();
        continue;
      }
      const rect = await page.locator('#pdf-sheet').boundingBox();
      await page.mouse.move(rect.x + 20, rect.y + 25);
      await page.mouse.down(); await page.mouse.move(rect.x + 180, rect.y + 80); await page.mouse.up();
    }
    await page.locator('#pdf-map').click();
    assert.equal(await page.locator('#pdf-page').inputValue(), '1');
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(() => document.querySelector('#pdf-page').value === '2' && document.querySelector('#pdf-boxes .current'));
    await page.locator('#play-pause-button').click();
    await loadPair();
    assert.equal(await page.locator('#pdf-map').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#pdf-boxes .current').count(), 1);
    await page.locator('#pdf-page').selectOption('2');
    await page.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    await page.waitForFunction(()=>Math.abs(practiceState.tickPosition-practiceState.playbackTimeline.measures[1].startTick)<=1);
    await page.locator('#pdf-note').selectOption({index:2});
    await page.waitForFunction(()=>Math.abs(practiceState.tickPosition-practiceState.expectedEvents[5].startTick)<=1 && !practiceState.isPlaying);
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    await page.locator('#practice-loop-end').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('change'));});
    await page.locator('#pdf-page').selectOption('2');
    await page.locator('button.outside-loop').waitFor();
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    assert.equal(await page.locator('button.outside-loop').count(),0);
    // Re-scan page one with two proposed boxes. Measure two initially
    // belongs to page two, so a replacement must protect that assignment.
    await page.locator('#pdf-map').click();
    await page.locator('#pdf-page').selectOption('1');
    const splitFirstPage=async()=>{
      await page.locator('#pdf-find').click();
      await page.locator('#pdf-use').waitFor();
      const rect=await page.locator('#pdf-boxes .pdf-box').first().boundingBox();
      await page.locator('#pdf-action').selectOption('split');
      await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
      await page.locator('#pdf-action').selectOption('draw');
      await page.locator('#pdf-replace').check();
    };
    await splitFirstPage();
    assert.ok(await page.locator('#pdf-use').isDisabled());
    await page.locator('#pdf-cancel').click();
    await page.locator('#pdf-measure').selectOption('2');
    await page.locator('#pdf-remove').click();
    await page.locator('#pdf-page').selectOption('1');
    await splitFirstPage();
    const handle=page.getByRole('slider',{name:'Move barline before measure 2'});
    await handle.focus();
    const initial=Number(await handle.getAttribute('aria-valuenow'));
    await handle.press('ArrowRight');
    assert.ok(Number(await handle.getAttribute('aria-valuenow'))>initial);
    await page.locator('#pdf-use').click();
    const pos=await handle.boundingBox();
    await page.mouse.move(pos.x+pos.width/2,pos.y+pos.height/2);await page.mouse.down();
    await page.mouse.move(pos.x+1500,pos.y);await page.mouse.up();
    assert.equal(await handle.getAttribute('aria-valuenow'),await handle.getAttribute('aria-valuemax'));
    const maximum=await handle.getAttribute('aria-valuenow');
    await loadPair('exercise.midi');await page.locator('#pdf-map').click();
    assert.equal(await handle.getAttribute('aria-valuenow'),maximum);
    assert.deepEqual(errors, []);
    console.log('Passed MIDI conversion, manual and detected PDF boxes, split/join, page turn, restore, measure/note seek and loop shading.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
