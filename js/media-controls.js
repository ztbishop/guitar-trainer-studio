// Media UI, browser players and profile intents. Native calls stay in the host.
import {AppState} from './app-state.js';
import {LibraryStore,fingerprint} from './library-store.js';
import {MEDIA_PROFILE_FORMAT,MEDIA_LAYOUTS,mediaUrl,youtubeId,sourceMatches,matchMediaProfile,validatePoints,tempoAlignedPoints,parseProfileExport} from './media-sync.js';
import {htmlMediaPlayer,youtubeMediaPlayer,waveformPeaks} from './media-player.js';

const svg=(tag,attrs={},text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;};
const clock=ms=>{const seconds=Math.max(0,ms/1000);return `${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;};
function download(data,fileName) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}

export function initMediaControls(host,{beforeListen=()=>{},afterPractice=()=>{}}={},store=new LibraryStore()) {
  const get=id=>document.getElementById('media-'+id);
  let player=null,source=null,localFile=null,blobUrl=null,points=[],peaks=[],selected=-1,undo=[],redo=[],profiles=[],scoreHash='',profileId='',pendingProfile=null;
  let generation=0,scoreBytes=null,busy=false,pendingDelete=null,playhead=null,dirty=false;
  let layout='above',share=35,showPlayer=true,showEditor=false;
  try {const saved=JSON.parse(localStorage.getItem('gts.mediaLayout') || '{}');if(MEDIA_LAYOUTS.includes(saved.layout))layout=saved.layout;if(saved.share>=20 && saved.share<=65)share=saved.share;if(typeof saved.showPlayer==='boolean')showPlayer=saved.showPlayer;if(typeof saved.showEditor==='boolean')showEditor=saved.showEditor;}catch{}
  const message=text=>{get('status').textContent=text;get('action-status').textContent=text;};
  function persistLayout() {try{localStorage.setItem('gts.mediaLayout',JSON.stringify({layout,share,showPlayer,showEditor}));}catch{}}
  function renderLayout() {
    const workspace=get('workspace'),visible=Boolean(player && showPlayer);
    workspace.classList.toggle('has-media',visible);workspace.dataset.layout=layout;workspace.style.setProperty('--media-share',share+'%');
    get('player-panel').hidden=get('divider').hidden=!visible;get('divider').setAttribute('aria-valuenow',String(share));
    get('divider').setAttribute('aria-orientation',['left','right'].includes(layout) && window.innerWidth>700?'vertical':'horizontal');
    get('editor').hidden=!showEditor;document.body.classList.toggle('media-editor-visible',showEditor);
    get('layout').value=layout;get('show-player').checked=showPlayer;get('show-editor').checked=showEditor;
  }
  function sync() {
    const ready=Boolean(player && player.backingTrackDuration>0 && points.length>=2 && AppState.playbackTimeline && !busy && !AppState.media.returning && (!AppState.media.preview || AppState.playerReady));
    for(const key of ['listen','panel-listen']) {get(key).disabled=!ready;get(key).textContent=AppState.media.preview && AppState.isPlaying?'⏸ Pause recording':'▶ Listen & sync';}
    for(const key of ['practice','panel-practice'])get(key).disabled=!AppState.media.preview || AppState.media.returning;
    get('unload').disabled=!player || busy;get('save-profile').disabled=!ready || !scoreHash;
    get('delete-profile').disabled=!profileId || busy;get('export-profile').disabled=!profiles.length || busy;
    get('waveform').disabled=!localFile || busy;get('undo').disabled=!undo.length;get('redo').disabled=!redo.length;
    get('update-point').disabled=get('remove-point').disabled=selected<0;
    get('add-point').disabled=get('capture-time').disabled=!player || !AppState.playbackTimeline;
    get('seek').disabled=!player || busy;
    get('speed').disabled=!AppState.media.preview || busy;
    get('load-embedded').disabled=!host.embeddedMedia();
    for(const key of ['source-kind','choose-file','load-link','load-embedded','profile-select'])get(key).disabled=busy || (key==='load-embedded' && !host.embeddedMedia());
    get('pip').disabled=!player || source?.kind==='youtube' || !document.pictureInPictureEnabled || !get('video').videoWidth;
    const floatingReason=source?.kind==='youtube'?'YouTube floating video uses browser controls, if available. Our Float button supports local video and direct video URLs.':
      !document.pictureInPictureEnabled?'This browser does not provide floating video.':!get('video').videoWidth?'Choose a video recording to enable floating video.':'';
    get('pip').title=floatingReason || 'Open this video in a floating browser window';
    get('float-status').hidden=!floatingReason || source?.kind!=='youtube';get('float-status').textContent=floatingReason;
    get('float-help').textContent=floatingReason || 'Float video opens a separate browser window while synchronization continues.';
    document.body.classList.toggle('media-preview',AppState.media.preview);
  }
  function sourceControls() {
    const kind=get('source-kind').value;
    get('local-controls').hidden=kind!=='local';get('link-controls').hidden=!['url','youtube'].includes(kind);get('embedded-controls').hidden=kind!=='embedded';
  }
  function disposal() {
    player?.destroy();player=null;source=null;localFile=null;peaks=[];
    if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;
    get('youtube').replaceChildren();get('youtube').hidden=true;get('video').hidden=false;
  }
  async function returnToPractice() {
    if(!AppState.media.preview)return;
    host.endMediaPlayback();
    const deadline=performance.now()+10000;
    while(AppState.media.preview && performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
    if(AppState.media.preview)throw new Error('Practice player is still loading. Wait before changing recordings.');
    afterPractice();sync();
  }
  async function loadRecording(nextSource,file=null) {
    if(!AppState.playbackTimeline)throw new Error('Load a score and wait for its player first.');
    const token=++generation;busy=true;sync();
    try {
      await returnToPractice();if(token!==generation)return;
      disposal();source=nextSource;localFile=file;get('recording-label').textContent=source.label;
      get('profile-name').value=source.label;message('Loading recording…');
      const events={isCurrent:()=>token===generation,onState(state){
        if(token!==generation)return;
        if(!AppState.media.preview) {player?.pause();return;}
        if(state==='ratechange') {if(player && player.playbackRate!==AppState.playbackSpeed)host.setSpeed(player.playbackRate);if(player)get('speed').value=String(player.playbackRate);sync();return;}
        if(state==='playing' && !AppState.isPlaying && !AppState.media.returning)host.toggleMediaPlayback();
        // Buffering must not pause the media element: that aborts its pending play.
        if(['ended','paused'].includes(state))host.pauseMediaPlayback();
        sync();
      },onError(error){if(token!==generation)return;host.pauseMediaPlayback();message(error.message || 'Browser playback was blocked. Try Listen again.');sync();}};
      if(source.kind==='youtube') {
        get('video').hidden=true;get('youtube').hidden=false;
        const created=await youtubeMediaPlayer(get('youtube'),source.videoId,events);
        if(token!==generation){created.destroy();return;}player=created;
      } else {
        let url=source.url;
        if(file){blobUrl=URL.createObjectURL(file);url=blobUrl;}
        if(source.kind==='embedded'){const embedded=host.embeddedMedia();if(!embedded)throw new Error('This score has no embedded backing recording.');blobUrl=URL.createObjectURL(new Blob([embedded.bytes]));url=blobUrl;}
        player=htmlMediaPlayer(get('video'),url,events);
      }
      await player.ready;if(token!==generation)return;
      player.masterVolume=AppState.audio.mediaPercent/100;
      if(!(player.backingTrackDuration>0))throw new Error('Choose a recording with a known duration.');
      get('player-panel').classList.toggle('audio-only',source.kind!=='youtube' && !get('video').videoWidth);
      let matched=matchMediaProfile(profiles,scoreHash,source,pendingProfile);
      points=matched?validatePoints(matched.points,AppState.playbackTimeline,player.backingTrackDuration):
        source.kind==='embedded' && host.embeddedMedia().points.length>=2?validatePoints(host.embeddedMedia().points,AppState.playbackTimeline,player.backingTrackDuration):tempoAlignedPoints(AppState.playbackTimeline,player.backingTrackDuration);
      const relinked=Boolean(matched && pendingProfile?.id===matched.id && source.kind==='local' && !sourceMatches(matched.source,source));
      if(relinked) {
        matched={...matched,source,durationMs:player.backingTrackDuration};
        await store.saveProfile(matched);
      }
      profileId=matched?.id || '';get('profile-name').value=matched?.name || source.label;
      if(matched)layout=matched.layout;
      pendingProfile=null;selected=-1;undo=[];redo=[];dirty=false;
      get('seek').max=String(player.backingTrackDuration/1000);get('speed').value='1';
      renderPoints();await refreshProfiles();renderLayout();
      message(relinked?'Saved alignment restored and linked to this local file. Press Listen & sync.':matched?'Saved alignment restored. Press Listen & sync.':'Recording ready. Initial alignment spans the recording; adjust its start/end and add points where needed.');
    } catch(error) {if(token===generation){disposal();message(error.message);renderLayout();throw error;}}
    finally {if(token===generation){busy=false;sync();}}
  }
  async function listen() {
    if(!player || busy)return;
    if(!AppState.media.preview) {
      beforeListen();
      if(!host.beginMediaPlayback(player,points))throw new Error('Wait for the score player to become ready.');
      const token=generation,deadline=performance.now()+5000;
      while(!AppState.playerReady && performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
      if(token!==generation)return;
      if(!AppState.playerReady)throw new Error('The sync player is still preparing. Try Listen again.');
      get('speed').value=String(player.playbackRate);
    }
    if(!AppState.media.preview || AppState.media.returning)return;
    host.toggleMediaPlayback();message('Listening & alignment — MIDI grading paused. Return to practice to use Realtime or Wait.');sync();
  }
  function edit(next) {
    const checked=validatePoints(next,AppState.playbackTimeline,player?.backingTrackDuration);
    if(checked.length<2)throw new Error('Keep at least a start and end point.');
    undo.push(structuredClone(points));if(undo.length>100)undo.shift();redo=[];
    points=checked;dirty=true;host.applyMediaSyncPoints(points);renderPoints();sync();message('Alignment edited. Save profile to keep these changes.');
  }
  function formPoint() {
    const measure=AppState.playbackTimeline?.measures[Number(get('measure').value)];
    if(!measure)throw new Error('Choose a score measure.');
    const beats=AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    const beat=Number(get('beat').value),time=Number(get('point-time').value);
    if(!get('beat').value || !get('point-time').value || beat<1 || beat>beats+1)throw new Error(`Beat position must be between 1 and ${beats+1} (bar end).`);
    return {barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:(beat-1)/beats,millisecondOffset:time*1000};
  }
  function selectPoint(index) {
    selected=index;const point=points[index];if(!point)return;
    const measureIndex=AppState.playbackTimeline.measures.findIndex(m=>m.measureNumber===point.barIndex+1 && m.occurrence===point.barOccurence+1);
    get('measure').value=String(measureIndex);
    get('beat').value=String(1+point.barPosition*AppState.score.masterBars[point.barIndex].timeSignatureNumerator);
    get('point-time').value=(point.millisecondOffset/1000).toFixed(3);renderPoints();sync();
  }
  function renderPoints() {
    const timeline=get('timeline'),duration=player?.backingTrackDuration || 1;
    timeline.replaceChildren();timeline.style.width=(Number(get('timeline-zoom').value)*100)+'%';
    for(let i=0;i<=10;i++)timeline.append(svg('text',{x:i*98,y:98},clock(duration*i/10)));
    if(peaks.length)timeline.append(svg('path',{d:peaks.map((peak,i)=>`M${i/peaks.length*1000},${50-peak*30}v${peak*60}`).join(' '),class:'media-wave',fill:'none'}));
    points.forEach((point,index)=>{
      const x=point.millisecondOffset/duration*1000;
      const marker=svg('g',{class:'media-marker'+(selected===index?' is-selected':''),transform:`translate(${x} 0)`,'data-point':index});
      marker.append(svg('line',{x1:0,x2:0,y1:16,y2:84}),svg('path',{d:'M-7 2 L7 2 L0 16 Z'}),svg('text',{x:4,y:28},`${point.barIndex+1}${point.barOccurence?` (${point.barOccurence+1})`:''}`),svg('rect',{x:-9,y:0,width:18,height:85,fill:'transparent'}));
      timeline.append(marker);
    });
    playhead=svg('line',{class:'media-playhead',x1:0,x2:0,y1:0,y2:90});timeline.append(playhead);
    get('point-list').replaceChildren();points.forEach((point,index)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(index===selected));
      button.textContent=`M${point.barIndex+1} · pass ${point.barOccurence+1} · ${clock(point.millisecondOffset)}`;
      button.addEventListener('click',()=>selectPoint(index));get('point-list').append(button);
    });
  }
  function renderProfiles() {
    get('profile-select').replaceChildren(new Option('New profile',''));
    for(const profile of profiles.filter(p=>p.scoreHash===scoreHash))get('profile-select').append(new Option(profile.name,profile.id));
    get('profile-select').value=profileId;
    const size=new TextEncoder().encode(JSON.stringify(profiles)).length;
    get('profile-storage').textContent=`${profiles.length} profiles · ${(size/1024).toFixed(1)} KB of settings. Recordings are separate.`;
    const search=get('profile-search').value.trim().toLowerCase();get('profile-list').replaceChildren();
    for(const profile of profiles.filter(p=>`${p.name} ${p.scoreName} ${p.source.label}`.toLowerCase().includes(search))) {
      const row=document.createElement('div');row.className='media-profile-row';
      const label=document.createElement('span');label.textContent=`${profile.name} — ${profile.scoreName} — ${profile.source.label} (${profile.points.length} points)`;
      const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete ${profile.name}`);remove.addEventListener('click',()=>confirmDelete(profile.id));
      const rename=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Rename';
      const name=document.createElement('input');name.value=profile.name;name.maxLength=240;name.setAttribute('aria-label',`New name for ${profile.name}`);
      const save=document.createElement('button');save.type='button';save.textContent='Save name';
      save.addEventListener('click',action(async()=>{if(!name.value.trim())throw new Error('Enter a profile name.');await store.saveProfile({...profile,name:name.value.trim()});if(profileId===profile.id)get('profile-name').value=name.value.trim();await refreshProfiles();message('Profile renamed.');}));
      rename.append(summary,name,save);row.append(label,rename,remove);get('profile-list').append(row);
    }
    sync();
  }
  async function refreshProfiles() {profiles=await store.listProfiles();renderProfiles();}
  function confirmDelete(id) {pendingDelete=id;get('delete-confirm').firstElementChild.textContent=`Delete “${profiles.find(profile=>profile.id===id)?.name || 'this profile'}”? The recording and score will be kept.`;get('delete-confirm').hidden=false;get('delete-cancel').focus();}
  function action(callback) {return ()=>Promise.resolve().then(callback).catch(error=>message(error.message || 'Media action failed.'));}
  get('source-kind').addEventListener('change',sourceControls);
  get('choose-file').addEventListener('click',()=>{get('file').value='';get('file').click();});
  get('file').addEventListener('change',action(async()=>{const file=get('file').files[0];if(file)await loadRecording({kind:'local',label:file.name,fileName:file.name,size:file.size,lastModified:file.lastModified},file);}));
  get('load-link').addEventListener('click',action(()=>{
    const kind=get('source-kind').value,value=get('url').value.trim();
    return loadRecording(kind==='youtube'?{kind,videoId:youtubeId(value),label:'YouTube '+youtubeId(value)}:{kind:'url',url:mediaUrl(value),label:mediaUrl(value)});
  }));
  get('load-embedded').addEventListener('click',action(()=>loadRecording({kind:'embedded',label:'Embedded backing audio'})));
  for(const key of ['listen','panel-listen'])get(key).addEventListener('click',action(listen));
  for(const key of ['practice','panel-practice'])get(key).addEventListener('click',action(async()=>{await returnToPractice();message('Practice restored at its previous position. Recording alignment is retained.');}));
  get('unload').addEventListener('click',action(async()=>{await returnToPractice();generation++;disposal();points=[];profileId='';pendingProfile=null;renderPoints();renderLayout();sync();message('Recording unloaded. Saved profiles are kept.');}));
  get('pip').addEventListener('click',action(()=>document.pictureInPictureElement?document.exitPictureInPicture():get('video').requestPictureInPicture()));
  for(const key of ['layout','show-player','show-editor'])get(key).addEventListener('change',()=>{layout=get('layout').value;showPlayer=get('show-player').checked;showEditor=get('show-editor').checked;renderLayout();persistLayout();});
  get('speed').addEventListener('change',action(()=>{if(!player || !AppState.media.preview)return;const value=Number(get('speed').value);try{player.playbackRate=value;host.setSpeed(value);}catch(error){get('speed').value=String(player.playbackRate);throw error;}}));
  get('seek').addEventListener('input',action(async()=>{if(!AppState.media.preview){beforeListen();if(!host.beginMediaPlayback(player,points))throw new Error('Wait for the score player.');}host.pauseMediaPlayback();player.seekTo(Number(get('seek').value)*1000);host.updateMediaPosition(player.currentTime);sync();}));
  get('capture-time').addEventListener('click',()=>{if(player)get('point-time').value=(player.currentTime/1000).toFixed(3);});
  get('add-point').addEventListener('click',action(()=>{edit([...points,formPoint()]);selected=-1;renderPoints();sync();}));
  get('update-point').addEventListener('click',action(()=>{const next=structuredClone(points);next[selected]=formPoint();edit(next);selected=-1;renderPoints();sync();}));
  get('remove-point').addEventListener('click',action(()=>{edit(points.filter((_,index)=>index!==selected));selected=-1;renderPoints();sync();}));
  for(const key of ['undo','redo'])get(key).addEventListener('click',action(()=>{
    const from=key==='undo'?undo:redo,to=key==='undo'?redo:undo;if(!from.length)return;
    to.push(structuredClone(points));points=from.pop();selected=-1;dirty=true;host.applyMediaSyncPoints(points);renderPoints();sync();message('Alignment edited. Save profile to keep changes.');
  }));
  get('timeline-zoom').addEventListener('change',renderPoints);
  get('waveform').addEventListener('click',action(async()=>{if(player.backingTrackDuration>15*60*1000)throw new Error('For recordings over 15 minutes, use timestamp editing or a shorter clip; waveform generation is optional.');const token=generation;busy=true;sync();message('Building optional waveform…');try{const result=await waveformPeaks(localFile);if(token===generation){peaks=result;renderPoints();message('Waveform ready. Drag a marker or edit its time.');}}finally{if(token===generation){busy=false;sync();}}}));
  get('timeline').addEventListener('pointerdown',event=>{
    const marker=event.target.closest('[data-point]');if(!marker || !player)return;
    event.preventDefault();host.pauseMediaPlayback();const index=Number(marker.dataset.point);selectPoint(index);
    const timeline=get('timeline'),initial=structuredClone(points),token=generation;timeline.setPointerCapture(event.pointerId);
    let nextTime=initial[index].millisecondOffset;
    const move=e=>{const rect=timeline.getBoundingClientRect();nextTime=Math.max(0,Math.min(player.backingTrackDuration,(e.clientX-rect.left)/rect.width*player.backingTrackDuration));get('point-time').value=(nextTime/1000).toFixed(3);};
    const finish=e=>{timeline.removeEventListener('pointermove',move);timeline.removeEventListener('pointerup',finish);timeline.removeEventListener('pointercancel',cancel);if(token!==generation)return;const next=initial;next[index].millisecondOffset=nextTime;try{edit(next);}catch(error){message(error.message);renderPoints();}sync();};
    const cancel=()=>{timeline.removeEventListener('pointermove',move);timeline.removeEventListener('pointerup',finish);timeline.removeEventListener('pointercancel',cancel);renderPoints();};
    timeline.addEventListener('pointermove',move);timeline.addEventListener('pointerup',finish);timeline.addEventListener('pointercancel',cancel);
  });
  get('save-profile').addEventListener('click',action(async()=>{
    const snapshotHash=scoreHash,valid=validatePoints(points,AppState.playbackTimeline,player.backingTrackDuration);
    const name=get('profile-name').value.trim();if(!name)throw new Error('Enter a profile name.');
    const existing=profiles.find(profile=>profile.id===profileId);
    const profile={id:existing && sourceMatches(existing.source,source)?profileId:crypto.randomUUID(),scoreHash,scoreName:AppState.score.title || AppState.currentScoreFile.fileName,name,source,durationMs:player.backingTrackDuration,points:valid,layout};
    await store.saveProfile(profile);if(snapshotHash!==scoreHash)return;profileId=profile.id;dirty=false;await refreshProfiles();message('Sync profile saved. Recordings are not copied into browser storage.');
  }));
  get('profile-select').addEventListener('change',action(async()=>{
    await returnToPractice();profileId=get('profile-select').value;
    const profile=profiles.find(p=>p.id===profileId);pendingProfile=profile || null;
    if(!profile){sync();return;}
    get('profile-name').value=profile.name;layout=profile.layout;persistLayout();renderLayout();
    if(player && sourceMatches(profile.source,source)){points=validatePoints(profile.points,AppState.playbackTimeline,player.backingTrackDuration);selected=-1;undo=[];redo=[];dirty=false;renderPoints();message('Saved alignment restored.');}
    else {disposal();points=[];get('source-kind').value=profile.source.kind;sourceControls();if(profile.source.kind==='url')get('url').value=profile.source.url;if(profile.source.kind==='youtube')get('url').value='https://www.youtube.com/watch?v='+profile.source.videoId;renderLayout();renderPoints();message(profile.source.kind==='local'?`Choose ${profile.source.fileName} again to restore this alignment.`:'Load the saved source to restore its alignment.');}
    sync();
  }));
  get('delete-profile').addEventListener('click',()=>confirmDelete(profileId));
  get('delete-cancel').addEventListener('click',()=>{pendingDelete=null;get('delete-confirm').hidden=true;});
  get('delete-confirm-button').addEventListener('click',action(async()=>{if(!pendingDelete)return;const id=pendingDelete;pendingDelete=null;get('delete-confirm').hidden=true;await store.deleteProfile(id);if(profileId===id)profileId='';if(pendingProfile?.id===id)pendingProfile=null;await refreshProfiles();message('Saved profile deleted; score, recording and current alignment kept.');}));
  get('profile-search').addEventListener('input',renderProfiles);
  get('export-profile').addEventListener('click',()=>download({format:MEDIA_PROFILE_FORMAT,version:1,profiles},'guitar-trainer-media-sync.json'));
  get('import-profile').addEventListener('click',()=>{get('profile-file').value='';get('profile-file').click();});
  get('profile-file').addEventListener('change',action(async()=>{const file=get('profile-file').files[0];if(!file)return;if(file.size>10*1024*1024)throw new Error('Sync settings backup exceeds 10 MB.');const added=await store.mergeProfiles(parseProfileExport(JSON.parse(await file.text())));await refreshProfiles();message(`Imported ${added} new sync profiles; identical settings were skipped.`);}));
  const divider=get('divider');
  divider.addEventListener('pointerdown',event=>{
    event.preventDefault();divider.setPointerCapture(event.pointerId);
    const move=e=>{const rect=get('workspace').getBoundingClientRect(),horizontal=['left','right'].includes(layout) && window.innerWidth>700;
      let fraction=horizontal?(e.clientX-rect.left)/rect.width:(e.clientY-rect.top)/rect.height;
      if(layout==='below' || (layout==='right' && horizontal))fraction=1-fraction;
      share=Math.max(20,Math.min(65,fraction*100));renderLayout();};
    const finish=()=>{divider.removeEventListener('pointermove',move);divider.removeEventListener('pointerup',finish);divider.removeEventListener('pointercancel',finish);persistLayout();};
    divider.addEventListener('pointermove',move);divider.addEventListener('pointerup',finish);divider.addEventListener('pointercancel',finish);
  });
  divider.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();share=Math.max(20,Math.min(65,share+(['ArrowRight','ArrowDown'].includes(event.key)?2:-2)));renderLayout();persistLayout();});
  window.addEventListener('resize',renderLayout);
  setInterval(()=>{
    if(!player)return;const duration=player.backingTrackDuration,time=player.currentTime;
    get('clock').textContent=`${clock(time)} / ${clock(duration)}`;
    if(document.activeElement!==get('seek'))get('seek').value=String(time/1000);
    const x=duration>0?time/duration*1000:0;playhead?.setAttribute('x1',x);playhead?.setAttribute('x2',x);
    if(AppState.media.preview && !AppState.media.returning && player.playing) {
      host.updateMediaPosition(Math.min(time,duration-0.1));
    }
  },50);
  async function timelineReady() {
    if(!AppState.currentScoreFile || !AppState.playbackTimeline || scoreBytes===AppState.currentScoreFile.bytes)return;
    scoreBytes=AppState.currentScoreFile.bytes;const current=scoreBytes,token=generation;
    const hash=await fingerprint(current);if(current!==scoreBytes || token!==generation)return;scoreHash=hash;
    const select=get('measure');select.replaceChildren();
    AppState.playbackTimeline.measures.forEach((measure,index)=>select.append(new Option(`Measure ${measure.measureNumber} · pass ${measure.occurrence}`,String(index))));
    await refreshProfiles();message('Score ready. Choose a recording or a saved profile.');sync();
  }
  renderLayout();sourceControls();sync();refreshProfiles().catch(error=>message(error.message));
  return {sync,timelineReady,async returnToPractice(){await returnToPractice();},
    setVolume(percent){
      if(!Number.isFinite(percent) || percent<0 || percent>100)return false;
      AppState.audio.mediaPercent=percent;
      if(player && !busy)player.masterVolume=percent/100;
      return true;
    },
    scoreLoading(){generation++;disposal();points=[];undo=[];redo=[];scoreBytes=null;scoreHash='';profileId='';pendingProfile=null;selected=-1;busy=false;renderPoints();renderLayout();sync();},
    mediaChanged(){sync();if(!AppState.media.preview)afterPractice();},
    get dirty(){return dirty;},
  };
}
