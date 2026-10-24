// With Live Server running; uses synthetic ports in an isolated browser profile.
// GTS_PLAYWRIGHT_MODULE may point to a Playwright package outside this project.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const make=(id,name)=>({id,name,manufacturer:'Synthetic test',type:'input',state:'connected',
        addEventListener(_,fn){this.receive=fn;},removeEventListener(){this.receive=null;},close(){return Promise.resolve();}});
      const usb=make('fixture-usb','Test guitar'),poly=make('fixture-poly','Test Poly');
      const access={inputs:new Map([[poly.id,poly]])};
      window.testMidi={access,usb,poly,connect(port){port.state='connected';access.inputs.set(port.id,port);access.onstatechange?.({port});}};
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>access});
      if(!localStorage.getItem('gts.settingsFixtureSeeded')) {
        localStorage.setItem('gts.settingsFixtureSeeded','true');
        localStorage.setItem('gts.midiDevices',JSON.stringify({version:1,lastInput:usb,profiles:[{device:usb,
          settings:{inputMode:'hex-6ch',singleChannel:'9',hexChannelBase:6,hexChannelReverse:true,pitchBendRange:12,latencyMs:25}}]}));
      }
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const base=process.argv[2] || 'http://127.0.0.1:5500';
    await page.goto(`${base}/index.html`);await page.locator('#btn-options').click();
    await page.locator('#midi-status').filter({hasText:'Waiting for Test guitar'}).waitFor();
    assert(await page.locator('input[name=midi-input-mode]').first().isDisabled());
    await page.evaluate(()=>testMidi.connect(testMidi.usb));
    await page.waitForFunction(()=>document.querySelector('#midi-input-select').value==='fixture-usb');
    assert(await page.evaluate(async()=>!(await import('./js/app-state.js')).AppState.tracks.length),'late device arrives before first score');
    assert(await page.locator('input[name=midi-input-mode][value=hex-6ch]').isChecked());
    assert.equal(await page.locator('#hex-channel-base-select').inputValue(),'6');
    assert(await page.locator('#hex-channel-reverse').isChecked());
    assert(!await page.locator('#midi-status').isVisible(),'routine connected status is hidden');
    assert.equal(await page.locator('#midi-profile-status').count(),0);
    assert.equal(await page.locator('#hex-channel-order-help').textContent(),'Channels, lowest → highest string: 6, 5, 4, 3, 2, 1');
    assert.match(await page.locator('#hex-channel-order-help').textContent(),/6, 5, 4, 3, 2, 1/);
    await page.locator('#hex-channel-base-select').selectOption('10');
    await page.locator('#wait-hex-bend-range').selectOption('24');
    await page.locator('#midi-input-select').selectOption('fixture-poly');
    assert(await page.locator('input[name=midi-input-mode][value=single-channel]').isChecked());
    await page.locator('#midi-single-channel-select').selectOption('3');
    await page.locator('#midi-input-select').selectOption('fixture-usb');
    assert.equal(await page.locator('#hex-channel-base-select').inputValue(),'10');
    assert(await page.locator('#hex-channel-reverse').isChecked());
    assert.equal(await page.locator('#wait-hex-bend-range').inputValue(),'24');
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:process.env.GTS_SCREENSHOT_DIR+'/settings-hex.png'});
    await page.reload();await page.locator('#btn-options').click();
    await page.locator('#midi-status').filter({hasText:'Waiting for Test guitar'}).waitFor();
    await page.evaluate(()=>testMidi.connect(testMidi.usb));
    await page.waitForFunction(()=>document.querySelector('#midi-input-select').value==='fixture-usb');
    assert.equal(await page.locator('#hex-channel-base-select').inputValue(),'10');
    assert(await page.locator('#hex-channel-reverse').isChecked());
    assert.equal(await page.locator('#wait-hex-bend-range').inputValue(),'24');
    await page.locator('#midi-input-select').selectOption('fixture-poly');
    assert.equal(await page.locator('#midi-single-channel-select').inputValue(),'3');
    assert(await page.locator('input[name=midi-input-mode][value=single-channel]').isChecked());
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:process.env.GTS_SCREENSHOT_DIR+'/settings-poly.png'});
    // Manual selection takes priority over a previously preferred port arriving.
    await page.reload();await page.locator('#btn-options').click();
    await page.waitForFunction(()=>document.querySelector('#midi-input-select').value==='fixture-poly');
    await page.evaluate(()=>testMidi.connect(testMidi.usb));
    assert.equal(await page.locator('#midi-input-select').inputValue(),'fixture-poly');
    for(const mode of ['hex-6ch','single-channel']) {
      await page.locator(`input[name=midi-input-mode][value=${mode}]`).check();
      assert(!await page.locator('#midi-status').isVisible(),'routine mode confirmation is hidden');
      for(const width of [1440,800,620,390]) {
        await page.setViewportSize({width,height:1000});
        assert(!await page.locator('#options-overlay').evaluate(el=>el.scrollWidth>el.clientWidth),`${mode} overflow at ${width}`);
        if(mode==='hex-6ch' && width===390 && process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:process.env.GTS_SCREENSHOT_DIR+'/settings-phone.png'});
      }
    }
    const help=page.locator('.settings-device-help > summary');
    await help.focus();await page.keyboard.press('Enter');
    assert(await page.locator('.settings-device-help').evaluate(el=>el.open));
    await page.locator('#midi-input-select').selectOption('');
    await page.reload();await page.locator('#btn-options').click();
    await page.locator('#midi-status').filter({hasText:'No MIDI input selected'}).waitFor();
    await page.evaluate(()=>testMidi.connect(testMidi.usb));
    assert.equal(await page.locator('#midi-input-select').inputValue(),'');
    assert(await page.locator('input[name=midi-input-mode]').first().isDisabled());
    assert.deepEqual(errors,[]);
    console.log('PASS: actual Settings controls, separate Poly/Hex device profiles, channel/order/bend reloads, preferred late arrival before score, manual/None priority, keyboard help and four responsive widths; no page errors. Synthetic MIDI only.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
