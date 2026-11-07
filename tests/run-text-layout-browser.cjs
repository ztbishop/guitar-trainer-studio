// Original synthetic fixture; optional private input paths are read-only.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createAppServer}=require('../local-web-server.cjs');
const baseline=process.env.GTS_TEXT_BASELINE==='1';
function textBoxes(labels) {
  const root=document.querySelector('#alphatab-container') || document;
  const texts=[...root.querySelectorAll('svg text')].filter(e=>/[A-Za-z]/.test(e.textContent)).map(e=>{
    const r=e.getBoundingClientRect(),text=e.textContent;
    return {text,x:r.x,y:r.y,w:r.width,h:r.height,target:labels.some(label=>label.includes(text))};
  });
  const overlaps=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
    const a=texts[i],b=texts[j],x=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),y=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    if(x>2 && y>2)overlaps.push({a:a.text,b:b.text,x,y,atY:a.y,target:a.target||b.target});
  }
  return {textCount:texts.length,targetCount:texts.filter(t=>t.target).length,overlaps,targetOverlaps:overlaps.filter(o=>o.target)};
}
(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),settings=new at.Settings();
  function track(name){const p=new at.importer.AlphaTexImporter();p.initFromString(`\\title "Text layout QA" \\track "${name}" \\tempo 96 . 0.1.4 2.1.4 3.1.4 5.1.4 | 7.1.4 5.1.4 3.1.4 2.1.4 | 0.1.1 | 2.1.1`,settings);return p.readScore();}
  const score=track('Guitar');score.addTrack(track('Second guitar').tracks[0]);
  score.masterBars[0].section=new at.model.Section();score.masterBars[0].section.marker='A';score.masterBars[0].section.text='A long section heading above the chord';
  let bid=0,vid=0,eid=0,nid=0;
  for(const t of score.tracks)for(const s of t.staves){
    const chord=new at.model.Chord();chord.name='Cmaj7(add9)/G';chord.showDiagram=false;chord.strings=[0,0,0,2,3,-1];s.addChord('c',chord);
    for(const b of s.bars){b.id=bid++;for(const v of b.voices){v.id=vid++;for(const e of v.beats){e.id=eid++;for(const n of e.notes)n.id=nid++;e.chordId='c';e.text=e.index%2?'Another adjacent instruction':'Play evenly with relaxed fingers\nKeep the sound ringing';}}}
    s.bars[1].voices[0].beats[2].text='UnbrokenInstructionABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  score.finish(settings);
  const inputs=[{role:'synthetic',name:'text-layout.gp',bytes:Buffer.from(new at.exporter.Gp7Exporter().export(score,settings))}];
  for(const [role,key] of [['saved-gpx','GTS_TEXT_GPX'],['soundslice-gp','GTS_TEXT_GP']])if(process.env[key])inputs.push({role,file:process.env[key],name:path.basename(process.env[key]),bytes:fs.readFileSync(process.env[key])});
  const out=process.env.GTS_SCREENSHOT_DIR || path.resolve('dist/text-layout-2026-11-05');fs.mkdirSync(out,{recursive:true});
  const server=createAppServer();let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const results=[],errors=[];
  try{
    browser=await chromium.launch({channel:process.env.GTS_BROWSER_CHANNEL || 'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1600,height:1000}});
    page.setDefaultTimeout(20000);
    if(baseline)await page.route('**/js/alphatab-host.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../js/alphatab-host.js'),'utf8').replace('const textLayoutEngine=installAlphaTabTextLayout(alphaTabGlobal);','const textLayoutEngine=null;')}));
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async()=>{
      window.state=(await import('./js/app-state.js')).AppState;
      window.host=await import('./js/alphatab-host.js');
      window.sync=await import('./js/media-sync.js');
      window.timelineTools=await import('./js/score-playback.js');
      window.lessonTools=await import('./js/lesson-import-data.js');
      window.projection=new (await import('./js/score-display.js')).ScoreDisplayProjection();
      window.renders=0;host.getAlphaTabApi().postRenderFinished.on(()=>renders++);
      window.signature=()=>{
        const api=host.getAlphaTabApi(),score=api.score,at=window.alphaTab;
        const midi=new at.midi.MidiFile(),gen=new at.midi.MidiFileGenerator(score,api.settings,new at.midi.AlphaSynthMidiFileHandler(midi,true));gen.generate();
        const beat=e=>[e.text,e.chord?.name,e.playbackStart,e.playbackDuration,e.notes.map(n=>[n.realValue,n.string,n.fret,n.isTieOrigin,n.isTieDestination])];
        return JSON.stringify({midi:[...midi.toBinary()],timeline:timelineTools.buildPlaybackTimeline(gen.tickLookup,{tempo:score.tempo}),sections:score.masterBars.map(b=>b.section),events:score.tracks.map(t=>t.staves.map(s=>s.bars.map(b=>b.voices.map(v=>v.beats.map(beat)))))});
      };
      window.syncSignature=data=>{
        const timeline=state.playbackTimeline;
        const points=data ? lessonTools.soundslicePoints(data,timeline) : timeline.measures.map((m,i)=>({barIndex:m.measureNumber-1,barOccurence:m.occurrence-1,barPosition:0,millisecondOffset:1000+i*1100+i*i*30}));
        if(!data){const m=timeline.measures.at(-1),i=timeline.measures.length;points.push({barIndex:m.measureNumber-1,barOccurence:m.occurrence-1,barPosition:1,millisecondOffset:1000+i*1100+i*i*30});}
        const samples=points.flatMap((p,i)=>i ? [p.millisecondOffset,(p.millisecondOffset+points[i-1].millisecondOffset)/2] : [p.millisecondOffset]);
        const mappings=samples.map(time=>{const tick=sync.tickAtMediaTime(points,timeline,time),back=sync.mediaTimeAtTick(points,timeline,tick);if(Math.abs(back-time)>0.001)throw Error('Sync round-trip changed');return [time,tick,back];});
        return JSON.stringify({points,mappings});
      };
    });
    for(const input of inputs){
      const started=Date.now();
      await page.locator('#score-file-input').setInputFiles({name:input.name,mimeType:'application/octet-stream',buffer:input.bytes});
      await page.waitForFunction(()=>state.playerReady && host.getAlphaTabApi().boundsLookup?.isFinished);
      const before=await page.evaluate(()=>signature());
      const timing=input.role==='soundslice-gp' && process.env.GTS_TEXT_TIMING ? JSON.parse(fs.readFileSync(process.env.GTS_TEXT_TIMING,'utf8')) : null;
      const alignment=await page.evaluate(data=>syncSignature(data),timing);
      const labels=await page.evaluate(()=>{
        const score=host.getAlphaTabApi().score,labels=[];
        for(const bar of score.masterBars)if(bar.section)labels.push((bar.section.marker?'['+bar.section.marker+'] ':'')+bar.section.text);
        for(const t of score.tracks)for(const s of t.staves)for(const b of s.bars)for(const v of b.voices)for(const e of v.beats)labels.push(e.text||'',e.chord?.name||'');
        return labels.filter(Boolean).map(s=>s.replace(/\s+/g,' '));
      });
      // Compare generated MIDI with the same unadapted native model outside the app.
      const native=at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(input.bytes),settings);
      const midi=new at.midi.MidiFile();new at.midi.MidiFileGenerator(native,settings,new at.midi.AlphaSynthMidiFileHandler(midi,true)).generate();
      assert.deepEqual(JSON.parse(before).midi,[...midi.toBinary()]);
      assert.deepEqual(JSON.parse(before).timeline,JSON.parse(JSON.stringify((await import('../js/score-playback.js')).buildPlaybackTimeline((()=>{const g=new at.midi.MidiFileGenerator(native,settings,new at.midi.AlphaSynthMidiFileHandler(new at.midi.MidiFile(),true));g.generate();return g.tickLookup;})(),{tempo:native.tempo}))));
      for(const width of (baseline?[600]:[1600,600,390]))for(const zoom of (baseline?[100]:[75,100,150,200]))for(const view of (baseline?['both']:['both','notation','tab'])){
        const renderStart=Date.now();
        await page.setViewportSize({width,height:1000});
        const count=await page.evaluate(({zoom,view})=>{
          const count=renders,api=host.getAlphaTabApi();
          api.settings.core.enableLazyLoading=false;
          state.ui.zoomPercent=zoom;state.ui.scoreDisplay=view;host.applyScoreDisplay();api.renderTracks(api.score.tracks);return count;
        },{zoom,view});
        await page.waitForFunction(n=>renders>n && host.getAlphaTabApi().boundsLookup?.isFinished,count);
        await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(60);
        assert.equal(await page.evaluate(()=>signature()),before,'notes, clocks, strings, exact labels and MIDI unchanged');
        assert.equal(await page.evaluate(data=>syncSignature(data),timing),alignment,'sync points and interpolated tick/time mapping unchanged');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'score scrolls inside its panel without widening the page');
        const report=await page.evaluate(textBoxes,labels);assert(report.textCount>0 && report.targetCount>0);
        results.push({role:input.role,width,zoom,view,renderMs:Date.now()-renderStart,...report});
        if(!baseline)assert.equal(report.targetOverlaps.length,0,JSON.stringify(results.at(-1)));
        console.log(input.role,width,zoom,view,'target overlaps',report.targetOverlaps.length,'other',report.overlaps.length-report.targetOverlaps.length);
        if(view==='both')await page.screenshot({path:path.join(out,`${baseline?'baseline-':''}${input.role}-${width}-${zoom}.png`)});
      }
      if(baseline)continue; // Screen-only unadapted control; final cases test native printing.
      // Resize back at 100% and exercise the real native print renderer.
      await page.setViewportSize({width:1000,height:1000});
      await page.evaluate(()=>{const api=host.getAlphaTabApi();api.settings.display.scale=1;projection.apply(api.score,'both');api.updateSettings();api.render();window.openOriginal=window.open;window.open=(...args)=>{const p=openOriginal(...args);p.print=()=>p.printRequested=true;return p;};});
      const promise=page.waitForEvent('popup');await page.evaluate(()=>host.printScore());const popup=await promise;
      await popup.waitForFunction(()=>window.printRequested===true,null,{timeout:20000});await popup.setViewportSize({width:900,height:1000});await popup.evaluate(()=>document.fonts.ready);
      const print=await popup.evaluate(textBoxes,labels);
      assert(print.textCount>0);results.push({role:input.role,print:true,...print});
      if(!baseline)assert.equal(print.targetOverlaps.length,0,JSON.stringify(results.at(-1)));
      await popup.screenshot({path:path.join(out,`${baseline?'baseline-':''}${input.role}-print.png`)});await popup.close();
      await page.evaluate(()=>window.open=window.openOriginal);
      assert.equal(await page.evaluate(()=>signature()),before);
      assert.equal(await page.evaluate(data=>syncSignature(data),timing),alignment);
      console.log(input.role,'print',print.overlaps.length,'elapsed',Date.now()-started);
      if(!baseline){
        // Real native synth transport, without listening or hardware input.
        await page.locator('#play-pause-button').click();
        await page.waitForFunction(()=>!state.countInActive && host.getAlphaTabApi().tickPosition>200);
        await page.locator('#play-pause-button').click();
        assert.equal(await page.evaluate(()=>signature()),before);
      }
      if(input.file)assert.deepEqual(fs.readFileSync(input.file),input.bytes,'external source bytes unchanged');
    }
    assert.deepEqual(errors,[]);
  }finally{fs.writeFileSync(path.join(out,baseline?'baseline-report.json':'report.json'),JSON.stringify({results,errors,inputs:inputs.map(i=>({role:i.role,sha256:crypto.createHash('sha256').update(i.bytes).digest('hex')}))},null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
