// Exercises the actual bootstrap/DOM wiring in a separate frame, not a mock host.
const preview=document.getElementById('preview'),output=document.getElementById('ui-results');
async function until(check) {const deadline=performance.now()+12000;while(!check()){if(performance.now()>deadline)throw new Error('UI action timed out.');await new Promise(resolve=>setTimeout(resolve,25));}}
document.getElementById('ui-run').addEventListener('click',async()=>{
  const button=document.getElementById('ui-run');button.disabled=true;output.textContent='Running…';
  const lines=[],previous=localStorage.getItem('gts.mediaLayout');
  const savedPreferences=['gts.workspacePanelSizes','gts.displayPreferences'].map(key=>[key,localStorage.getItem(key)]);
  const check=(condition,label)=>{if(!condition)throw new Error(label);lines.push('PASS '+label);output.textContent=lines.join('\n');};
  try {
    await until(()=>preview.contentDocument?.readyState==='complete' && preview.contentDocument.getElementById('media-status'));
    const doc=preview.contentDocument,view=preview.contentWindow,get=id=>doc.getElementById(id);
    const {AppState:state}=await view.eval('import("../js/app-state.js")');
    const engine=await view.eval('import("../js/practice-engine.js")');
    const host=await view.eval('import("../js/alphatab-host.js")');
    const mapping=await view.eval('import("../js/media-sync.js")');
    await until(()=>get('score-file-input') && get('media-status'));
    const choose=async(input,path,name)=>{const response=await fetch(path);if(!response.ok)throw new Error('Generate media fixtures first.');const transfer=new view.DataTransfer();transfer.items.add(new view.File([await response.arrayBuffer()],name,{lastModified:1}));input.files=transfer.files;input.dispatchEvent(new view.Event('change',{bubbles:true}));};
    await choose(get('score-file-input'),'./.media-fixtures/media-demo.musicxml','media-demo.musicxml');
    await until(()=>!get('play-pause-button').disabled && get('media-measure').options.length===4);
    check(true,'Normal score picker builds practice and media measure options');
    await choose(get('media-file'),'./.media-fixtures/media-demo.wav','UI-fixture.wav');await until(()=>!get('media-listen').disabled);
    check(get('media-point-list').children.length===2,'Local audio loads with start/end alignment');
    get('media-show-editor').checked=true;get('media-show-editor').dispatchEvent(new view.Event('change'));
    get('media-measure').value='1';get('media-audio').currentTime=2;get('media-point-time').value='8';get('media-add-point').click();
    await until(()=>!get('media-undo').disabled);check(get('media-point-list').children.length===3,'Add point reaches the injected native-sync intent');
    check(get('media-point-time').value==='2.000','Add point captures the playhead independently of typed seconds');
    get('media-add-point').click();await until(()=>get('media-status').textContent.includes('Point updated'));
    check(get('media-point-list').children.length===3,'Adding an existing measure selects its point without duplication');
    get('media-undo').click();await until(()=>get('media-point-list').children.length===2);check(true,'Undo restores the previous alignment');
    get('media-redo').click();await until(()=>get('media-point-list').children.length===3);check(true,'Redo restores the added point');
    get('media-point-list').children[1].click();get('media-point-time').value='2.2';get('media-apply-time').click();
    await until(()=>get('media-point-list').children[1].textContent.includes('0:02.2'));check(true,'Selected point updates from precise timestamp fields');
    get('media-point-list').children[1].click();get('media-remove-point').click();await until(()=>get('media-point-list').children.length===2);check(true,'Remove keeps the two endpoint markers');
    get('media-point-list').children[0].click();get('media-remove-point').click();await until(()=>get('media-status').textContent.includes('at least a start and end'));check(get('media-point-list').children.length===2,'Removing the final endpoint is rejected without changing alignment');
    for(const layout of ['above','below','left','right']) {get('media-layout').value=layout;get('media-layout').dispatchEvent(new view.Event('change'));check(get('media-workspace').dataset.layout===layout,`Placement ${layout} applies to the actual score/media grid`);}
    get('media-listen').click();await until(()=>doc.body.classList.contains('media-preview') && !get('media-listen').disabled);
    check(!get('practice-popup').inert && !get('tempo-popup').inert,'Recording keeps practice and Tempo controls available');
    get('playback-speed-percent').value='50';get('playback-speed-percent').dispatchEvent(new view.Event('change'));
    await until(()=>get('media-audio').playbackRate===0.5);
    check(state.playbackSpeed===0.5,'Tempo percentage changes real recording playback speed');
    host.seekMediaTime(0);
    const target=state.expectedEvents[1],targetMs=mapping.mediaTimeAtTick(state.media.points,state.playbackTimeline,target.startTick);
    get('play-pause-button').click();await until(()=>!get('media-audio').paused && Math.abs(get('media-audio').currentTime*1000-targetMs)<12);
    engine.handleMidiEvent({type:'note-on',midi:target.pitches[0],channel:1,at:view.performance.now()});
    check(state.trainer.results.correct>=1,'Realtime accepts a MIDI pitch against the real recording clock at 50% speed');
    get('play-pause-button').click();
    get('playback-speed-percent').value='100';get('playback-speed-percent').dispatchEvent(new view.Event('change'));
    await until(()=>get('media-audio').playbackRate===1);
    const timelineRect=get('media-timeline').getBoundingClientRect(),ratio=0.63;
    const seekMs=(ratio*1024-12)/1000*10000;
    get('media-timeline').dispatchEvent(new view.PointerEvent('pointerdown',{clientX:timelineRect.left+ratio*timelineRect.width,clientY:timelineRect.top+55,button:0,bubbles:true}));
    await until(()=>Math.abs(state.tickPosition-mapping.tickAtMediaTime(state.media.points,state.playbackTimeline,seekMs))<3);
    check(get('media-audio').paused && Math.abs(get('media-audio').currentTime*1000-seekMs)<5,'Paused waveform seek moves both real audio and native score cursor');
    if(view.qaMidiInput) {
      const radio=doc.querySelector('input[name="practice-mode"][value="wait"]');radio.checked=true;radio.dispatchEvent(new view.Event('change'));
      host.seekMediaTime(0);get('play-pause-button').click();
      await until(()=>state.waitTrainer?.active && ['waiting','seeking'].includes(state.waitTrainer.phase));
      check(get('media-audio').paused && get('media-audio').muted,'Wait starts with recording audio paused and muted');
      const target=state.waitTrainer.currentEvent;
      const message=new view.Event('midimessage');message.data=new Uint8Array([0x90,target.pitches[0],100]);view.qaMidiInput.dispatchEvent(message);
      await until(()=>state.waitTrainer.results.correct>=1 && state.tickPosition>target.startTick);
      check(get('media-audio').paused && get('media-audio').currentTime>0,'Wait MIDI completion advances the media frame silently with the score');
      const release=new view.Event('midimessage');release.data=new Uint8Array([0x80,target.pitches[0],0]);view.qaMidiInput.dispatchEvent(release);
      const realtime=doc.querySelector('input[name="practice-mode"][value="realtime"]');realtime.checked=true;realtime.dispatchEvent(new view.Event('change'));
    }
    get('media-practice').click();await until(()=>!doc.body.classList.contains('media-preview') && !get('play-pause-button').disabled && get('media-status').textContent.includes('Practice restored'));
    check(!get('practice-popup').inert && get('toolbar-score-value').textContent==='—','Return re-enables ordinary practice without producing grades');
    get('media-source-kind').value='url';get('media-source-kind').dispatchEvent(new view.Event('change'));get('media-url').value='javascript:alert(1)';get('media-load-link').click();await until(()=>get('media-status').textContent.includes('http(s)'));
    check(get('media-point-list').children.length===2,'Unsupported URL is rejected and current recording remains available');
    get('media-close-editor').click();check(get('media-editor').hidden && !get('media-show-editor').checked,'Editor close synchronizes its menu checkbox');
    get('media-close-player').click();check(get('media-player-panel').hidden && !get('media-show-player').checked,'Recording close hides the panel without unloading');
    get('media-listen').click();await until(()=>doc.body.classList.contains('media-preview') && !get('media-listen').disabled);
    check(get('media-player-panel').hidden && !get('media-show-player').checked && get('media-editor').hidden,'Selecting Recording preserves hidden panel/editor preferences');
    check(get('media-listen').getAttribute('aria-pressed')==='true' && get('media-practice').getAttribute('aria-pressed')==='false','Playback mode buttons reflect recording selection');
    get('media-practice').click();await until(()=>!doc.body.classList.contains('media-preview') && get('media-status').textContent.includes('Practice restored'));
    get('media-edit-sync').click();check(!get('media-editor').hidden && get('media-show-editor').checked,'Edit sync opens the editor directly');
    const mediaLauncher=doc.querySelector('[data-open-media-editor]');mediaLauncher.click();mediaLauncher.click();
    check(!get('btn-media-sync') && !get('media-panel-listen') && !get('media-speed'),'Media Sync is More-only and recording has no duplicate Play or speed controls');
    check(!get('media-editor').hidden && !doc.body.classList.contains('media-preview'),'Main Media Sync toggles editor visibility without changing playback mode');
    check(get('media-popup').contains(get('media-source-kind')) && get('media-editor').contains(get('media-save-profile')),'Load/options holds setup while Save stays directly in the editor');
    if(view.innerWidth>700) {
      const panel=get('media-editor').getBoundingClientRect();
      check(['media-add-point','media-apply-time','media-save-profile'].every(id=>{const rect=get(id).getBoundingClientRect();return rect.top>=panel.top && rect.bottom<=panel.bottom;}),'Desktop point creation, typed time and Save are visible without scrolling');
    }
    get('media-zoom-in').click();check(get('media-timeline-zoom').textContent==='120%','Magnifier increases timeline zoom by twenty percent');
    get('media-zoom-fit').click();check(get('media-timeline-zoom').textContent==='100%','Fit recording restores the full timeline');
    await until(()=>get('media-timeline').querySelector('.media-wave'));
    const labelHeight=get('media-timeline').querySelector('.media-marker text').getBoundingClientRect().height;
    const fullWave=get('media-timeline').querySelector('.media-wave').getAttribute('d');
    for(let i=0;i<9;i++)get('media-zoom-in').click();
    const zoomedLabel=get('media-timeline').querySelector('.media-marker text').getBoundingClientRect();
    check(get('media-timeline-zoom').textContent==='516%' && Math.abs(zoomedLabel.height-labelHeight)<0.1 && zoomedLabel.height>=12,'Measure labels retain readable height at 516% zoom');
    const wave=get('media-timeline').querySelector('.media-wave');
    check(view.getComputedStyle(wave).vectorEffect==='non-scaling-stroke' && wave.getAttribute('d')!==fullWave,'Zoom redraws detailed waveform columns with constant screen stroke width');
    const labels=[...get('media-timeline').querySelectorAll('.media-marker text,.media-guide text')].filter(node=>view.getComputedStyle(node).visibility!=='hidden').map(node=>node.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
    check(labels.every((box,i)=>i===0 || box.left>=labels[i-1].right+3),'Visible measure labels do not overlap');
    const axis=get('media-timeline').querySelector(':scope > text').getBoundingClientRect();
    check(axis.height>=12 && axis.bottom<get('media-timeline').getBoundingClientRect().bottom,'Recording time labels remain readable inside the timeline');
    get('media-zoom-fit').click();
    check(get('media-timeline').querySelector('[data-guide]'),'Timeline includes estimated measure and beat guides');
    get('media-measure').value='1';get('media-beat').value='1';
    get('media-listen').click();await until(()=>doc.body.classList.contains('media-preview') && !get('media-listen').disabled);
    get('play-pause-button').click();await until(()=>get('media-audio').currentTime>0.2 && !get('media-audio').paused);
    check(true,'Main Play advances real local recording time after alignment edits');
    get('media-audio').currentTime=1.5;get('media-add-point').click();
    await until(()=>get('media-point-list').children.length===3);
    check(get('media-point-list').children[1].textContent.includes('0:01.5') && get('media-audio').paused,'Capture adds selected score position at actual recording time and pauses');
    get('media-audio').currentTime=1.7;get('media-add-point').click();await until(()=>get('media-point-list').children[1].textContent.includes('0:01.7'));
    check(get('media-point-list').children.length===3,'Capturing an existing score position updates its anchor without duplication');
    get('media-nudge-left').click();await until(()=>get('media-point-time').value==='1.690');
    check(get('media-dirty').textContent==='Unsaved changes','Nudge retains selection and marks unsaved alignment');
    get('media-point-list').lastElementChild.click();get('media-remove-point').click();await until(()=>get('media-point-list').children.length===2);
    check(get('media-remove-point').disabled,'Removing the last selected anchor leaves a valid unselected editor');
    get('media-undo').click();await until(()=>get('media-point-list').children.length===3);
    get('media-practice').click();await until(()=>!doc.body.classList.contains('media-preview'));
    get('show-fretboard').checked=true;get('show-fretboard').dispatchEvent(new view.Event('change'));
    get('fretboard-close').click();check(!get('show-fretboard').checked && get('fretboard-container').classList.contains('hidden'),'Fretboard close uses the saved Display preference');
    get('show-fretboard').checked=true;get('show-fretboard').dispatchEvent(new view.Event('change'));
    get('media-reset-layout').click();
    for(const id of ['media-editor','fretboard-container']) {
      const handle=get(id).querySelector('[data-resize-panel]');handle.dispatchEvent(new view.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
      check(JSON.parse(localStorage.getItem('gts.workspacePanelSizes'))[id]<({'media-editor':400,'fretboard-container':190}[id]),`${id} keyboard resizing persists`);
    }
    for(const id of ['scores-panel','practice-popup','tempo-popup','looper-popup','audio-popup','display-popup','media-popup','help-popup','options-overlay']) {
      const launcher=doc.querySelector(`[data-launch-panel="${id}"]`) || get({'scores-panel':'btn-scores','practice-popup':'btn-practice','tempo-popup':'btn-tempo','looper-popup':'btn-looper','options-overlay':'btn-options'}[id]);
      launcher.click();const panel=get(id),rect=panel.getBoundingClientRect();
      check(!panel.classList.contains('hidden') && rect.left>=-1 && rect.right<=view.innerWidth+1,`${id} opens within viewport width`);
      doc.dispatchEvent(new view.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(panel.classList.contains('hidden'),`${id} closes with Escape`);
    }
    check(doc.documentElement.scrollWidth<=view.innerWidth,'App has no document horizontal overflow');
    get('media-reset-layout').click();
    await choose(get('score-file-input'),'./.media-fixtures/media-embedded.gp','media-embedded.gp');
    await until(()=>!get('play-pause-button').disabled && get('media-measure').options.length===2);
    check(get('media-player-panel').hidden && get('media-listen').disabled && get('media-point-list').children.length===0,'Changing scores unloads the old recording and alignment');
    await until(()=>!get('media-load-embedded').disabled && get('media-status').textContent.includes('Score ready'));
    get('media-source-kind').value='embedded';get('media-source-kind').dispatchEvent(new view.Event('change'));get('media-load-embedded').click();
    await until(()=>!get('media-listen').disabled);
    check(get('fretboard-content').querySelector('svg') && get('media-point-list').children.length===2,'Native tablature and embedded audio load with source alignment');
    get('fretboard-close').click();
    get('media-editor').querySelector('[data-resize-panel]').dispatchEvent(new view.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    const expectedHeight=JSON.parse(localStorage.getItem('gts.workspacePanelSizes'))['media-editor'];
    view.location.reload();
    await until(()=>preview.contentDocument!==doc && preview.contentDocument?.readyState==='complete' && preview.contentDocument.querySelector('#media-editor [aria-valuenow]'));
    const restored=preview.contentDocument;
    check(!restored.getElementById('media-editor').hidden && !restored.getElementById('show-fretboard').checked,'Panel visibility survives a real reload');
    check(Math.abs(restored.getElementById('media-editor').getBoundingClientRect().height-expectedHeight)<2,'Editor size survives a real reload');
    output.textContent=lines.join('\n')+`\n${lines.length} UI checks passed.`;
  }catch(error){output.textContent=lines.join('\n')+'\nFAIL '+error.message;}
  finally {if(previous===null)localStorage.removeItem('gts.mediaLayout');else localStorage.setItem('gts.mediaLayout',previous);for(const [key,value] of savedPreferences){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}button.disabled=false;}
});
