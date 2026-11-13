// Isolated native audio delivery on a long original score. No owner profile/MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');

(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString('\\title "Long score audio regression" \\tempo 104 \\instrument 25 . '+
    Array.from({length:160},()=>Array.from({length:16},(_,i)=>`${i%5}.${i%6+1}.16`).join(' ')).join(' | '),new at.Settings());
  const buffer=Buffer.from(new at.exporter.Gp7Exporter().export(parser.readScore(),new at.Settings()));
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    // External scores remain read-only and are never copied into fixtures/library.
    const sources=process.env.GTS_AUDIO_SCORES?JSON.parse(process.env.GTS_AUDIO_SCORES):
      [{name:'long-score.gp',mimeType:'application/octet-stream',buffer}];
    for(const source of sources) {
      await page.locator('#score-file-input').setInputFiles(source);
      await page.waitForFunction(async()=>{
        window.audioHost=await import('./js/alphatab-host.js');
        window.audioState=(await import('./js/app-state.js')).AppState;
        return audioState.playerReady && audioState.expectedEvents.length>2000;
      });
      await page.waitForTimeout(300);
      // Test initial playback and a fresh attempt late in the same long score.
      for(const fraction of [0,0.85]) {
        await page.evaluate(fraction=>{
          const api=audioHost.getAlphaTabApi();
          api.tickPosition=Math.floor(audioState.playbackTimeline.endTick*fraction);
        },fraction);
        await page.locator('#play-pause-button').click();
        await page.waitForFunction(()=>audioState.isPlaying && !audioState.countInActive);
        // Ignore the native output's initial empty requests before the first samples.
        await page.waitForTimeout(600);
        await page.evaluate(()=>{
          window.audioDelivery={empty:0,full:0};
          window.stopAudioDelivery=audioHost.getAlphaTabApi().player.output.samplesPlayed.on(n=>audioDelivery[n?'full':'empty']++);
          window.audioStart={wall:performance.now(),score:audioState.timePositionMs};
        });
        await page.waitForTimeout(4000);
        const result=await page.evaluate(()=>{
          stopAudioDelivery();
          return {...audioDelivery,wallMs:performance.now()-audioStart.wall,
            scoreMs:audioState.timePositionMs-audioStart.score};
        });
        console.log(typeof source==='string'?require('node:path').basename(source):source.name,fraction,result);
        assert(result.scoreMs/result.wallMs>0.9,'score clock must keep pace with wall time');
        assert(result.empty/(result.empty+result.full)<0.02,'steady playback must deliver audio without repeated empty blocks');
        await page.locator('#play-pause-button').click();
        await page.waitForFunction(()=>!audioState.isPlaying);
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Long-score native audio delivery passed. Audible/hardware acceptance remains local.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
