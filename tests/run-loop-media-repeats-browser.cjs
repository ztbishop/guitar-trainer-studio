// Real native renderer/media in an isolated profile; no hardware or owner data.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
function wav() {
  const data=Buffer.alloc(44+44100*2*6);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(44100,24);
  data.writeUInt32LE(88200,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;
}
(async()=>{
  const {repeatCases,repeatFixture,longLoopFixture}=await import('./media-repeat-fixtures.js');
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.stack || e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#fretboard-content svg').waitFor();
    await page.evaluate(async()=>{window.s=(await import('./js/app-state.js')).AppState;window.h=await import('./js/alphatab-host.js');});
    const change=async(id,value,event='change')=>page.evaluate(({id,value,event})=>{
      const c=document.getElementById(id);if(typeof value==='boolean')c.checked=value;else c.value=String(value);c.dispatchEvent(new Event(event));
    },{id,value,event});
    const load=async(bytes,name)=>{
      await page.locator('#score-file-input').setInputFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
      await page.waitForFunction(()=>s.playerReady && s.expectedEvents.length && h.getAlphaTabApi().boundsLookup);
      await page.waitForTimeout(600); // Native practice-track regeneration/layout.
    };
    const media=async()=>{
      await page.locator('#media-file').setInputFiles({name:'repeat-clock.wav',mimeType:'audio/wav',buffer:wav()});
      await page.waitForFunction(()=>!document.querySelector('#media-listen').disabled);
      await page.evaluate(()=>document.querySelector('#media-listen').click());
      await page.waitForFunction(()=>s.media.preview && s.playerReady);
    };
    const visible=()=>page.waitForFunction(()=>{
      const a=document.querySelector('#alphatab-wrapper').getBoundingClientRect(),b=document.querySelector('.at-cursor-beat').getBoundingClientRect();
      return h.getAlphaTabApi()._currentBeatBounds?.beat?.voice.bar.index===s.practiceLoop.startIndex &&
        b.height>0 && b.top>=a.top-2 && b.bottom<=a.bottom+2 && b.left>=a.left-2 && b.right<=a.right+2;
    },null,{timeout:5000});
    await load(longLoopFixture(),'long-loop.gp');
    await change('show-fretboard',false);await change('practice-loop-enabled',true);
    for(const recording of [false,true]) {
      if(recording)await media();
      for(const auto of [true,false]) {
        await change('score-auto-scroll',auto);
        // Slider and typed fields must reveal distant cursors without any Play.
        await change('loop-start-slider',36,'input');await visible();
        assert(await page.evaluate(()=>document.querySelector('#alphatab-wrapper').scrollTop>0));
        await change('practice-loop-start',2);await visible();
        // Rapid edits must reveal only the final destination.
        await page.evaluate(()=>{for(const value of [40,3,42]){const c=document.querySelector('#loop-start-slider');c.value=value;c.dispatchEvent(new Event('input'));}});
        await visible();
        assert.equal(await page.evaluate(()=>s.practiceLoop.startIndex),41);
        await page.evaluate(()=>{document.querySelector('#alphatab-wrapper').scrollTop=0;});
        await change('loop-end-slider',47,'input');await visible();
        await change('practice-loop-end',48);
        assert.equal(await page.evaluate(()=>s.ui.autoScroll),auto);
        assert(await page.evaluate(()=>!s.isPlaying && !s.countInActive && !s.trainer.sessionStarted));
        assert(await page.locator('.loop-shading-overlay rect').count()>0);
        console.log(`PASS paused loop slider/field/rapid edits: ${recording?'Recording':'Synth'}, auto-scroll ${auto}`);
      }
    }
    for(const spec of repeatCases) {
      const fixture=repeatFixture(spec);
      await load(fixture.bytes,spec.name+'.gp');
      assert.deepEqual(await page.evaluate(()=>s.playbackTimeline.measures.map(m=>m.measureNumber)),spec.order);
      await media();
      await page.evaluate(points=>h.applyMediaSyncPoints(points),fixture.points);
      // Paused recording seeks distinguish the same written measure on each pass.
      for(let i=0;i<fixture.timeline.measures.length;i++) {
        const tick=fixture.timeline.measures[i].startTick+240;
        const barIndex=fixture.timeline.measures[i].measureNumber-1;
        const time=fixture.points[i].millisecondOffset+(fixture.points[i+1].millisecondOffset-fixture.points[i].millisecondOffset)/16;
        await page.evaluate(time=>h.seekMediaTime(time),time);
        await page.waitForFunction(({tick,time,barIndex})=>Math.abs(s.tickPosition-tick)<5 &&
          h.getAlphaTabApi()._currentBeatBounds?.beat?.voice.bar.index===barIndex &&
          Math.abs(document.querySelector('#media-audio').currentTime*1000-time)<25,{tick,time,barIndex});
        assert(await page.evaluate(()=>!s.isPlaying && !s.trainer.sessionStarted));
      }
      await page.evaluate(()=>h.seekMediaTime(500));
      await page.waitForFunction(()=>Math.abs(s.tickPosition)<5);
      // Sample continuous recording playback at 10ms, across every written jump.
      await page.evaluate(()=>{
        window.seenVisits=new Set();window.seenTimer=setInterval(()=>{
          if(!s.isPlaying)return;
          const i=s.playbackTimeline.measures.findIndex(m=>s.tickPosition>=m.startTick && s.tickPosition<m.endTick);
          if(i>=0)seenVisits.add(i);
        },10);
      });
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(count=>seenVisits.size===count,fixture.timeline.measures.length,{timeout:15000});
      await page.evaluate(()=>{clearInterval(seenTimer);document.querySelector('#play-pause-button').click();});
      await page.waitForFunction(()=>!s.isPlaying);
      assert.equal(await page.evaluate(()=>s.trainer.sessionStarted),true,'ordinary recording playback grades after count-in');
      console.log(`PASS ${spec.name}: native GP import, per-visit media seeks and continuous recording/cursor traversal`);
    }
    assert.deepEqual(errors,[]);
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
