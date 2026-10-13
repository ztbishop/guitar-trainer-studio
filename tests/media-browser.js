import {AppState} from '../js/app-state.js';
import {LibraryStore,fingerprint} from '../js/library-store.js';
import {initAlphaTab,loadScoreFile,beginMediaPlayback,endMediaPlayback,toggleMediaPlayback,pauseMediaPlayback,updateMediaPosition,setPlaybackSpeed,acquireWaitTransport,holdWaitAtTick,pauseWaitTransport,releaseWaitTransport,finishWaitTransport} from '../js/alphatab-host.js';
import {tempoAlignedPoints} from '../js/media-sync.js';
import {WaitController} from '../js/wait-controller.js';
import {getPracticeEvents} from '../js/score-playback.js';

const output=document.getElementById('results');
async function until(check) {const deadline=performance.now()+12000;while(!check()){if(performance.now()>deadline)throw new Error('Native player did not reach the expected state.');await new Promise(resolve=>setTimeout(resolve,25));}}
document.getElementById('run').addEventListener('click',async()=>{
  const button=document.getElementById('run');button.disabled=true;output.textContent='Running…';
  const dbName='gts-media-test-'+crypto.randomUUID(),store=new LibraryStore({open:(_,version)=>indexedDB.open(dbName,version)}),lines=[];
  const check=(condition,label)=>{if(!condition)throw new Error(label);lines.push('PASS '+label);output.textContent=lines.join('\n');};let api,waitController;
  try {
    // Simulate the existing version-1 score library before upgrading it.
    const oldHash=await fingerprint(new Uint8Array([1,2,3]));
    await new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>{const scores=request.result.createObjectStore('scores',{keyPath:'id'});request.result.createObjectStore('folders',{keyPath:'id'});scores.put({id:'old-score',title:'Fixture',fileName:'fixture.gp5',bytes:new Uint8Array([1,2,3]),hash:oldHash,folderId:null});};request.onsuccess=()=>{request.result.close();resolve();};request.onerror=()=>reject(request.error);});
    const saved=await store.save({title:'Fixture',fileName:'fixture.gp5',bytes:new Uint8Array([1,2,3])});
    check((await store.open()).version===2 && saved.duplicate && (await store.list()).scores[0].id==='old-score','Version-1 database upgrades without losing scores');
    const profile={id:'fixture-profile',scoreHash:await fingerprint(new Uint8Array([1,2,3])),scoreName:'Fixture',name:'Recording',source:{kind:'local',label:'Fixture video',fileName:'fixture.webm',size:100,lastModified:1},durationMs:10000,layout:'right',points:[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:0},{barIndex:0,barOccurence:0,barPosition:1,millisecondOffset:10000}]};
    await store.saveProfile(profile);check((await store.listProfiles()).length===1,'Sync profile saves in IndexedDB');
    (await store.open()).close();store.dbPromise=null;check((await store.listProfiles())[0].name==='Recording','Sync profiles survive connection reopen');
    const backup=await store.backup();check(backup.version===2 && backup.mediaProfiles.length===1 && !JSON.stringify(backup).includes('recordingBytes'),'Library backup includes settings without recordings');
    check((await store.merge(backup)).profilesAdded===0,'Profile merge skips identical settings');
    let rejected=false;try{await store.merge({...backup,mediaProfiles:[{...profile,durationMs:-1}]});}catch{rejected=true;}
    check(rejected && (await store.listProfiles()).length===1 && (await store.list()).scores.length===1,'Invalid profile backup changes neither scores nor profiles');
    await store.deleteProfile(profile.id);check((await store.listProfiles()).length===0 && (await store.list()).scores[0].id===saved.score.id,'Deleting a sync profile keeps its score');
    api=await initAlphaTab(document.getElementById('alphatab-container'),{onPlayerPositionChanged(position){if(!AppState.media.preview)waitController?.positionChanged(position);}});
    const response=await fetch('./.media-fixtures/media-demo.musicxml');if(!response.ok)throw new Error('Generate media fixtures first.');
    await loadScoreFile(new File([await response.arrayBuffer()],'media-demo.musicxml'));await until(()=>AppState.playerReady && AppState.playbackTimeline);
    check(AppState.score.title.replace(/\s+/g,' ')==='Media sync demo','Real bundled native player loads the MusicXML fixture');
    api.tickPosition=1920;await until(()=>Math.abs(AppState.tickPosition-1920)<2);
    setPlaybackSpeed(0.75);const timeline=AppState.playbackTimeline,original=AppState.score.exportFlatSyncPoints();
    AppState.trainer.results={correct:2,wrong:1,accuracy:67};const results=AppState.trainer.results;
    let mediaTime=0,rate=1,volume=1,playing=false;
    const handler={backingTrackDuration:10000,get playbackRate(){return rate;},set playbackRate(value){rate=value;},get masterVolume(){return volume;},set masterVolume(value){volume=value;},seekTo(ms){mediaTime=ms;},play(){playing=true;},pause(){playing=false;}};
    check(beginMediaPlayback(handler,tempoAlignedPoints(timeline,10000)),'Native external-media mode attaches the handler');await until(()=>AppState.playerReady);
    toggleMediaPlayback();updateMediaPosition(2500);
    check(AppState.media.preview && playing && Math.abs(AppState.tickPosition-3840)<3,'Native sync maps recording time to score ticks');
    setPlaybackSpeed(0.5);updateMediaPosition(5000);
    check(rate===0.5 && Math.abs(AppState.tickPosition-7680)<3,'Native media cursor mapping stays correct at half speed');
    pauseMediaPlayback();check(!playing,'Native Pause pauses external media');
    endMediaPlayback();await until(()=>!AppState.media.preview && AppState.playerReady);
    check(!AppState.media.preview,'Native synthesizer becomes ready again after listening');
    try {await until(()=>Math.abs(AppState.tickPosition-1920)<=3);}catch(error){throw new Error(`Restore position: state tick ${AppState.tickPosition}, native tick ${api.tickPosition}, speed ${AppState.playbackSpeed}`);}
    check(AppState.playbackSpeed===0.75 && AppState.playbackTimeline===timeline && JSON.stringify(AppState.score.exportFlatSyncPoints())===JSON.stringify(original),'Return restores practice position, speed, timeline and embedded sync data');
    check(AppState.trainer.results===results && results.accuracy===67,'Listening transport leaves grading results untouched');
    AppState.mode='wait';
    waitController=new WaitController({acquire:acquireWaitTransport,hold:holdWaitAtTick,pause:pauseWaitTransport,release:releaseWaitTransport,finish:finishWaitTransport});
    const events=getPracticeEvents(timeline,'0');waitController.configure(events,timeline.endTick);waitController.start(0);
    await until(()=>waitController.phase==='waiting');
    waitController.noteOn({type:'note-on',midi:events[0].notes[0].midi,channel:1,at:performance.now()});
    await until(()=>waitController.phase==='waiting');waitController.toggle();
    const waitSession=waitController.session,waitResults=waitSession.stats();
    beginMediaPlayback(handler,tempoAlignedPoints(timeline,10000));await until(()=>AppState.playerReady);endMediaPlayback();await until(()=>!AppState.media.preview && AppState.playerReady);
    check(waitController.phase==='paused' && waitController.session===waitSession && waitSession.stats().correct===waitResults.correct,'Paused Wait results and target survive media transport replacement');
    waitController.toggle();await until(()=>waitController.phase==='waiting');
    check(api.player.state===0 && !playing && waitSession.stats().correct===1,'Wait resumes the same attempt with recording and accompaniment silent');
    waitController.stop();AppState.mode='realtime';
    output.textContent=lines.join('\n')+`\n${lines.length} browser checks passed.`;
  } catch(error) {output.textContent=lines.join('\n')+'\nFAIL '+error.message;}
  finally {api?.destroy();try{(await store.open()).close();indexedDB.deleteDatabase(dbName);}catch{}button.disabled=false;}
});

document.getElementById('generate').addEventListener('click',async()=>{
  const button=document.getElementById('generate'),canvas=document.getElementById('video-fixture');button.disabled=true;canvas.hidden=false;
  let context,stream;
  try {
    context=new AudioContext();await context.resume();const destination=context.createMediaStreamDestination(),oscillator=context.createOscillator(),gain=context.createGain();gain.gain.value=0.03;oscillator.connect(gain).connect(destination);oscillator.start();
    stream=new MediaStream([...canvas.captureStream(10).getVideoTracks(),...destination.stream.getAudioTracks()]);
    const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?'video/webm;codecs=vp8,opus':'video/webm';
    const recorder=new MediaRecorder(stream,{mimeType}),chunks=[];recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    const finished=new Promise(resolve=>recorder.onstop=resolve),start=performance.now(),drawing=canvas.getContext('2d');
    const timer=setInterval(()=>{drawing.fillStyle='#172554';drawing.fillRect(0,0,480,270);drawing.fillStyle='white';drawing.font='32px system-ui';drawing.fillText('Media sync video fixture',35,100);drawing.fillText(((performance.now()-start)/1000).toFixed(1)+' seconds',35,170);},100);
    recorder.start();await new Promise(resolve=>setTimeout(resolve,6000));recorder.stop();await finished;clearInterval(timer);oscillator.stop();
    const url=URL.createObjectURL(new Blob(chunks,{type:'video/webm'})),link=document.createElement('a');link.href=url;link.download='media-demo.webm';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);output.textContent='Generated six-second WebM video with audio. Use it in the app for local video/layout/picture-in-picture checks.';
  }catch(error){output.textContent='Video generation failed: '+error.message;}
  finally {stream?.getTracks().forEach(track=>track.stop());await context?.close();button.disabled=false;}
});
