// Media UI, browser players and profile intents. Native calls stay in the host.
import {AppState} from './app-state.js';
import {LibraryStore,fingerprint} from './library-store.js';
import {MEDIA_PROFILE_FORMAT,MEDIA_LAYOUTS,mediaUrl,youtubeId,sourceMatches,matchMediaProfile,validatePoints,tempoAlignedPoints,parseProfileExport,mediaTimeAtTick,pointTick} from './media-sync.js';
import {htmlMediaPlayer,youtubeMediaPlayer,waveformPeaks} from './media-player.js';
import {timelineGuides,boundedAnchorTime,timeFromClientX,zoomWindow,anchorIndex,visibleWaveform} from './media-timeline.js';

const svg=(tag,attrs={},text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;};
const clock=ms=>{const seconds=Math.max(0,ms/1000);return `${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;};
function download(data,fileName) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}

export function initMediaControls(host,{beforeListen=()=>{},afterPractice=()=>{},closeMenu=()=>{}}={},store=new LibraryStore()) {
  const get=id=>document.getElementById('media-'+id);
  // Move existing controls, retaining their IDs and all storage/source wiring.
  get('editor-toolbar').append(get('mode-controls'));
  get('editor-toolbar').append(get('save-profile'),get('dirty'));
  get('point-tools').before(get('selection'));
  get('extra-tools').append(get('unload'));
  get('popup').firstElementChild.append(get('extra-tools'));
  let player=null,source=null,localFile=null,blobUrl=null,points=[],peaks=[],selected=-1,undo=[],redo=[],profiles=[],scoreHash='',profileId='',pendingProfile=null;
  let generation=0,scoreBytes=null,busy=false,pendingDelete=null,playhead=null,dirty=false;
  let zoom=1,waveformBusy=false,waveformGeneration=0,dragging=false,lastTimelineInteraction=0,buffering=false;
  let typedTime=false,seekGeneration=0;
  let layout='above',share=35,showPlayer=true,showEditor=false;
  try {const saved=JSON.parse(localStorage.getItem('gts.mediaLayout') || '{}');if(MEDIA_LAYOUTS.includes(saved.layout))layout=saved.layout;if(saved.share>=20 && saved.share<=65)share=saved.share;if(typeof saved.showPlayer==='boolean')showPlayer=saved.showPlayer;if(typeof saved.showEditor==='boolean')showEditor=saved.showEditor;}catch{}
  const message=text=>{get('status').textContent=text;get('action-status').textContent=text;};
  function persistLayout() {try{localStorage.setItem('gts.mediaLayout',JSON.stringify({layout,share,showPlayer,showEditor}));}catch{}}
  function renderLayout() {
    const workspace=get('workspace'),visible=Boolean(player && showPlayer && !get('player-panel').classList.contains('audio-only'));
    workspace.classList.toggle('has-media',visible);workspace.dataset.layout=layout;workspace.style.setProperty('--media-share',share+'%');
    get('player-panel').hidden=get('divider').hidden=!visible;get('divider').setAttribute('aria-valuenow',String(share));
    get('divider').setAttribute('aria-orientation',['left','right'].includes(layout) && window.innerWidth>700?'vertical':'horizontal');
    get('editor').hidden=!showEditor;document.body.classList.toggle('media-editor-visible',showEditor);
    get('layout').value=layout;get('show-player').checked=showPlayer;get('show-editor').checked=showEditor;
    get('edit-sync').setAttribute('aria-expanded',String(showEditor));
    document.querySelectorAll('[data-open-media-editor]').forEach(button=>button.setAttribute('aria-expanded',String(showEditor)));
    renderPoints();
  }
  function sync() {
    const silent=AppState.media.preview && AppState.mode==='wait';
    get('audio').muted=get('video').muted=silent;
    if(silent && player?.masterVolume)player.masterVolume=0;
    const ready=Boolean(player && player.backingTrackDuration>0 && points.length>=2 && AppState.playbackTimeline && !busy && !AppState.media.returning && (!AppState.media.preview || AppState.playerReady));
    get('listen').disabled=!ready;get('listen').setAttribute('aria-pressed',String(AppState.media.preview));
    get('practice').disabled=busy || AppState.media.returning;get('practice').setAttribute('aria-pressed',String(!AppState.media.preview));
    get('unload').disabled=!player || busy;get('save-profile').disabled=!ready || !scoreHash;
    get('delete-profile').disabled=!profileId || busy;get('export-profile').disabled=!profiles.length || busy;
    get('waveform').disabled=!localFile || busy || waveformBusy;get('undo').disabled=!undo.length || busy;get('redo').disabled=!redo.length || busy;
    get('remove-point').disabled=selected<0 || !ready;
    get('apply-time').disabled=get('add-point').disabled=!ready;
    for(const key of ['nudge-left','nudge-right'])get(key).disabled=selected<0 || !ready;
    get('dirty').textContent=dirty?'Unsaved changes':profileId?'Saved profile':'Not saved';
    get('save-profile').textContent=profileId?'Save changes':'Save profile';
    get('seek').disabled=!player || busy;
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
    typedTime=false;seekGeneration++;
    waveformGeneration++;waveformBusy=false;get('waveform-status').textContent='';
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
        buffering=state==='buffering';
        if(state==='ratechange') {if(player && player.playbackRate!==AppState.playbackSpeed)host.setSpeed(player.playbackRate);sync();return;}
        if(state==='playing' && AppState.mode==='wait'){player.pause();return;}
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
        const audioOnly=source.kind==='embedded' || file?.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)(?:[?#]|$)/i.test(file?.name || url || '');
        player=htmlMediaPlayer(get(audioOnly?'audio':'video'),url,events);
        get('video').hidden=audioOnly;
      }
      await player.ready;if(token!==generation)return;
      player.masterVolume=AppState.audio.mediaPercent/100;
      if(!(player.backingTrackDuration>0))throw new Error('Choose a recording with a known duration.');
      get('player-panel').classList.toggle('audio-only',source.kind!=='youtube' && (get('video').hidden || !get('video').videoWidth));
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
      get('seek').max=String(player.backingTrackDuration/1000);
      renderPoints();await refreshProfiles();renderLayout();
      closeMenu();
      message(relinked?'Saved alignment restored and linked to this local file.':matched?'Saved alignment restored.':'Recording ready. Select Recording as playback source, then use the main Play button.');
      if(localFile)buildWaveform();
      else get('waveform-status').textContent='Waveform unavailable for this source; alignment controls still work.';
    } catch(error) {if(token===generation){disposal();message(error.message);renderLayout();throw error;}}
    finally {if(token===generation){busy=false;sync();}}
  }
  async function selectRecording() {
    if(!player || busy)return;
    if(!AppState.media.preview) {
      beforeListen();
      if(!host.beginMediaPlayback(player,points))throw new Error('Wait for the score player to become ready.');
      const token=generation,deadline=performance.now()+5000;
      while(!AppState.playerReady && performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
      if(token!==generation)return;
      if(!AppState.playerReady)throw new Error('The sync player is still preparing. Try Listen again.');
    }
    if(!AppState.media.preview || AppState.media.returning)return;
    message(AppState.mode==='wait'?'Recording selected. Wait stays silent and seeks the video as you solve each target.':'Recording selected. Main Play/Pause and Tempo control it; Realtime grading remains active.');sync();
  }
  function openEditor() {showEditor=true;renderLayout();persistLayout();closeMenu();get('add-point').focus();}
  function edit(next) {
    const checked=validatePoints(next,AppState.playbackTimeline,player?.backingTrackDuration);
    if(checked.length<2)throw new Error('Keep at least a start and end point.');
    if(JSON.stringify(checked)===JSON.stringify(points))return;
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
    typedTime=true;get('point-time').value=(point.millisecondOffset/1000).toFixed(3);renderPoints();sync();
  }
  function chooseGuide(measureIndex,beat,time) {
    get('measure').value=String(measureIndex);get('beat').value=String(beat);
    typedTime=true;get('point-time').value=(time/1000).toFixed(3);
    selected=anchorIndex(points,formPoint(),AppState.playbackTimeline);
    // Selection keeps the clicked guide alive until its pointer event completes.
    get('timeline').querySelectorAll('[data-guide]').forEach(node=>{
      const active=Number(node.dataset.guide)===measureIndex && Number(node.dataset.beat)===beat;
      node.classList.toggle('is-selected',active);node.querySelector('line').setAttribute('y2',active?31:84);
    });
    get('timeline').querySelectorAll('[data-point]').forEach(node=>node.classList.toggle('is-selected',Number(node.dataset.point)===selected));
    renderTarget();
    sync();
  }
  function renderTarget(time=player?.currentTime || 0) {
    const measure=AppState.playbackTimeline?.measures[Number(get('measure').value)];
    get('selection').textContent=measure?`Aligning: measure ${measure.measureNumber}${measure.occurrence>1?` (repeat ${measure.occurrence})`:''} · beat ${get('beat').value} → Recording: ${clock(time)}. Red: target · Dark: playhead.`:'Choose a measure/beat to align with the recording playhead.';
  }
  async function seekRecording(time) {
    const token=++seekGeneration,sourceToken=generation;
    await selectRecording();
    if(token!==seekGeneration || sourceToken!==generation || !AppState.media.preview || AppState.media.returning)return;
    host.seekMediaTime(time);typedTime=false;get('point-time').value=(time/1000).toFixed(3);renderTarget(time);sync();
  }
  function applyForm() {
    const point=formPoint(),existing=anchorIndex(points,point,AppState.playbackTimeline);
    const next=structuredClone(points);
    if(existing>=0)next[existing]=point;
    else next.push(point);
    try{edit(next);}catch(error){if(error.message.includes('move forward'))throw new Error('This time crosses a neighboring point. Choose a time between the previous and next points.');throw error;}
    selectPoint(anchorIndex(points,point,AppState.playbackTimeline));
    message(`Point ${existing>=0?'updated':'added'}: measure ${point.barIndex+1}${point.barOccurence?`, repeat ${point.barOccurence+1}`:''} at ${clock(point.millisecondOffset)}. Drag it to fine tune; Save profile keeps your edits.`);
  }
  function addPoint() {
    if(!player)return;
    const time=player.currentTime;host.pauseMediaPlayback();player.pause();
    get('point-time').value=(time/1000).toFixed(3);applyForm();
  }
  function nudge(delta) {
    if(selected<0 || !player)return;
    const next=structuredClone(points),index=selected;
    next[index].millisecondOffset=boundedAnchorTime(points,index,points[index].millisecondOffset+delta,player.backingTrackDuration);
    edit(next);selectPoint(index);
  }
  async function buildWaveform() {
    if(!localFile || waveformBusy)return;
    if(player.backingTrackDuration>15*60*1000 || localFile.size>80*1024*1024) {
      get('waveform-status').textContent='Waveform skipped for large recordings; use timeline anchors and timestamps.';return;
    }
    const token=generation,waveToken=++waveformGeneration,file=localFile;
    waveformBusy=true;get('waveform-status').textContent='Building waveform…';sync();renderWaveform();
    try {
      const result=await waveformPeaks(file,Math.min(900000,Math.max(1800,Math.ceil(player.backingTrackDuration))));
      if(token===generation && waveToken===waveformGeneration){peaks=result;renderPoints();get('waveform-status').textContent='Waveform ready';}
    } catch(error) {if(token===generation && waveToken===waveformGeneration)get('waveform-status').textContent=`Waveform unavailable: ${error.message}. Alignment still works.`;}
    finally {if(token===generation && waveToken===waveformGeneration){waveformBusy=false;sync();renderWaveform();}}
  }
  function changeZoom(next) {
    const scroll=get('timeline').parentElement,width=scroll.clientWidth;
    const ratio=selected>=0?points[selected].millisecondOffset/(player?.backingTrackDuration || 1):(player?.currentTime || 0)/(player?.backingTrackDuration || 1);
    const nextZoom=Math.max(1,Math.min(256,next));
    const left=zoomWindow(zoom,nextZoom,scroll.scrollLeft,width,(12+ratio*1000)/1024);
    zoom=nextZoom;renderPoints();scroll.scrollLeft=left;renderWaveform();
  }
  function renderWaveform() {
    const timeline=get('timeline');timeline.querySelectorAll('.media-wave,.media-wave-fallback').forEach(node=>node.remove());
    const scroll=timeline.parentElement,width=timeline.getBoundingClientRect().width;
    if(!width)return;
    if(!peaks.length) {
      if(!player)return;
      const unit=1024/width,center=(scroll.scrollLeft+scroll.clientWidth/2)*unit-12;
      const label=waveformBusy?'Building waveform · Click timeline to seek':scroll.clientWidth<320?'No waveform · Click to seek':'Waveform unavailable · Click timeline to seek';
      const fallback=svg('g',{class:'media-wave-fallback'});
      fallback.append(svg('line',{x1:0,x2:1000,y1:55,y2:55}),svg('line',{x1:0,x2:1000,y1:32,y2:32}),svg('rect',{x:center-Math.min(scroll.clientWidth-8,340)*unit/2,y:61,width:Math.min(scroll.clientWidth-8,340)*unit,height:18}),svg('text',{transform:`translate(${center} 74) scale(${unit} 1)`,'text-anchor':'middle','font-size':12},label));
      timeline.insertBefore(fallback,timeline.querySelector('.media-playhead'));return;
    }
    const start=Math.max(0,(scroll.scrollLeft/width*1024-12)/1000);
    const end=Math.min(1,((scroll.scrollLeft+scroll.clientWidth)/width*1024-12)/1000);
    const samples=visibleWaveform(peaks,start,end,Math.max(1,Math.ceil(scroll.clientWidth)));
    const wave=svg('path',{d:samples.map((peak,i)=>`M${(start+(end-start)*i/samples.length)*1000},${55-peak*22}v${peak*44}`).join(' '),class:'media-wave',fill:'none'});
    timeline.prepend(wave);
  }
  function renderPoints() {
    if(dragging)return;
    if(selected>=points.length)selected=-1;
    const timeline=get('timeline'),duration=player?.backingTrackDuration || 1;
    timeline.replaceChildren();timeline.style.width=(zoom*100)+'%';get('timeline-zoom').textContent=`${Math.round(zoom*100)}%`;
    const unit=1024/(timeline.getBoundingClientRect().width || 1000);
    // Counter-scale only horizontally: the SVG widens on zoom, its height does not.
    for(let i=0;i<=10*zoom;i++)timeline.append(svg('text',{transform:`translate(${i/(10*zoom)*1000} 94) scale(${unit} 1)`,'font-size':12},clock(duration*i/(10*zoom))));
    for(const guide of timelineGuides(AppState.score,AppState.playbackTimeline,points)) {
      if(guide.anchor>=0)continue;
      const x=guide.millisecondOffset/duration*1000;
      const active=Number(get('measure').value)===guide.measureIndex && Number(get('beat').value)===guide.beat;
      const marker=svg('g',{class:'media-guide'+(active?' is-selected':''),transform:`translate(${x} 0)`,'data-guide':guide.measureIndex,'data-beat':guide.beat,'data-time':guide.millisecondOffset});
      marker.append(svg('line',{x1:0,x2:0,y1:16,y2:active?31:84,'pointer-events':'none'}),svg('rect',{x:-6*unit,y:0,width:12*unit,height:30,fill:'transparent'}),svg('path',{class:guide.beat===1?'':'media-beat-arrow',d:`M${-7*unit} 2 L${7*unit} 2 L0 16 Z`}));
      if(guide.beat===1)marker.append(svg('text',{transform:`scale(${unit} 1)`,x:4,y:28,'font-size':12},`${guide.barIndex+1}${guide.barOccurence?` (${guide.barOccurence+1})`:''}`));
      timeline.append(marker);
    }
    points.forEach((point,index)=>{
      const x=point.millisecondOffset/duration*1000;
      const marker=svg('g',{class:'media-marker'+(selected===index?' is-selected':''),transform:`translate(${x} 0)`,'data-point':index});
      marker.append(svg('line',{x1:0,x2:0,y1:16,y2:31,'pointer-events':'none'}),svg('path',{d:`M${-7*unit} 2 L${7*unit} 2 L0 16 Z`}),svg('text',{transform:`scale(${unit} 1)`,x:4,y:28,'font-size':12},`${point.barIndex+1}${point.barOccurence?` (${point.barOccurence+1})`:''}`),svg('rect',{x:-9*unit,y:0,width:18*unit,height:30,fill:'transparent'}));
      timeline.append(marker);
    });
    // Keep selected/saved point labels first; hide only text where guides crowd.
    const occupied=[],bounds=timeline.getBoundingClientRect();
    for(const label of timeline.querySelectorAll(':scope > text'))if(label.getBoundingClientRect().right>bounds.right)label.setAttribute('text-anchor','end');
    const labels=[...timeline.querySelectorAll('.media-marker.is-selected text'),...timeline.querySelectorAll('.media-marker:not(.is-selected) text'),...timeline.querySelectorAll('.media-guide text')];
    for(const label of labels) {
      let box=label.getBoundingClientRect();
      if(box.right>bounds.right){label.setAttribute('text-anchor','end');label.setAttribute('x','-4');box=label.getBoundingClientRect();}
      if(occupied.some(other=>box.left<other.right+4 && box.right>other.left-4))label.style.visibility='hidden';
      else occupied.push(box);
    }
    const playX=(player?.currentTime || 0)/duration*1000;
    playhead=svg('line',{class:'media-playhead',x1:playX,x2:playX,y1:33,y2:84});timeline.append(playhead);
    renderTarget();
    renderWaveform();
    get('point-list').replaceChildren();points.forEach((point,index)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(index===selected));
      const beat=1+point.barPosition*AppState.score.masterBars[point.barIndex].timeSignatureNumerator;
      const position=index===0?'Start':index===points.length-1?'End':`Measure ${point.barIndex+1}, beat ${Number(beat.toFixed(2))}`;
      button.textContent=`${position}${point.barOccurence?` (repeat ${point.barOccurence+1})`:''} → ${clock(point.millisecondOffset)}`;
      button.title=`Measure ${point.barIndex+1}, beat ${Number(beat.toFixed(2))} matches ${clock(point.millisecondOffset)} in the recording. Click to select.`;
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
  get('listen').addEventListener('click',action(selectRecording));
  get('practice').addEventListener('click',action(async()=>{await returnToPractice();message('Practice restored with synthesized audio. Recording alignment is retained.');}));
  get('unload').addEventListener('click',action(async()=>{await returnToPractice();generation++;disposal();points=[];profileId='';pendingProfile=null;renderPoints();renderLayout();sync();message('Recording unloaded. Saved profiles are kept.');}));
  get('pip').addEventListener('click',action(()=>document.pictureInPictureElement?document.exitPictureInPicture():get('video').requestPictureInPicture()));
  get('close-player').addEventListener('click',()=>{showPlayer=false;renderLayout();persistLayout();document.getElementById('play-pause-button').focus();});
  get('close-editor').addEventListener('click',()=>{showEditor=false;renderLayout();persistLayout();(showPlayer && player?get('edit-sync'):document.getElementById('btn-more')).focus();});
  get('edit-sync').addEventListener('click',()=>{showEditor=!showEditor;renderLayout();persistLayout();if(showEditor)get('close-editor').focus();});
  document.querySelectorAll('[data-open-media-editor]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();if(showEditor){showEditor=false;renderLayout();persistLayout();closeMenu();}else openEditor();}));
  get('reset-layout').addEventListener('click',()=>{share=35;renderLayout();persistLayout();document.dispatchEvent(new Event('reset-panel-sizes'));});
  for(const key of ['layout','show-player','show-editor'])get(key).addEventListener('change',()=>{layout=get('layout').value;showPlayer=get('show-player').checked;showEditor=get('show-editor').checked;renderLayout();persistLayout();});
  get('seek').addEventListener('input',action(()=>seekRecording(Number(get('seek').value)*1000)));
  get('point-time').addEventListener('input',()=>{typedTime=true;});
  get('add-point').addEventListener('click',action(addPoint));
  get('apply-time').addEventListener('click',action(()=>applyForm()));
  for(const key of ['measure','beat'])get(key).addEventListener('change',()=>{
    try{if(!player)return;const point=formPoint(),index=anchorIndex(points,point,AppState.playbackTimeline),time=mediaTimeAtTick(points,AppState.playbackTimeline,pointTick(point,AppState.playbackTimeline));if(index>=0)selectPoint(index);else chooseGuide(Number(get('measure').value),Number(get('beat').value),time);action(()=>seekRecording(time))();}catch(error){selected=-1;sync();message(error.message);}
  });
  get('nudge-left').addEventListener('click',action(()=>nudge(-10)));
  get('nudge-right').addEventListener('click',action(()=>nudge(10)));
  get('remove-point').addEventListener('click',action(()=>{edit(points.filter((_,index)=>index!==selected));selected=-1;renderPoints();sync();}));
  for(const key of ['undo','redo'])get(key).addEventListener('click',action(()=>{
    const from=key==='undo'?undo:redo,to=key==='undo'?redo:undo;if(!from.length)return;
    to.push(structuredClone(points));points=from.pop();selected=-1;dirty=true;host.applyMediaSyncPoints(points);renderPoints();sync();message('Alignment edited. Save profile to keep changes.');
  }));
  get('zoom-in').addEventListener('click',()=>changeZoom(zoom*1.2));
  get('zoom-out').addEventListener('click',()=>changeZoom(zoom/1.2));
  for(const key of ['timeline-zoom','zoom-fit'])get(key).addEventListener('click',()=>changeZoom(1));
  get('timeline').parentElement.addEventListener('scroll',renderWaveform);
  get('timeline').parentElement.addEventListener('wheel',()=>{lastTimelineInteraction=performance.now();},{passive:true});
  get('waveform').addEventListener('click',buildWaveform);
  get('timeline').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key) || selected<0)return;event.preventDefault();try{nudge((event.key==='ArrowLeft'?-1:1)*(event.shiftKey?100:10));}catch(error){message(error.message);}});
  get('timeline').addEventListener('pointerdown',event=>{
    lastTimelineInteraction=performance.now();
    if(event.button!==0 || !player || busy || AppState.media.returning)return;
    const marker=event.target.closest('[data-point]'),guide=event.target.closest('[data-guide]');
    if(!marker) {
      if(guide){const time=Number(guide.dataset.time);chooseGuide(Number(guide.dataset.guide),Number(guide.dataset.beat),time);action(()=>seekRecording(time))();}
      else {const time=timeFromClientX(event.clientX,get('timeline').getBoundingClientRect(),player.backingTrackDuration);action(()=>seekRecording(time))();}
      return;
    }
    event.preventDefault();host.pauseMediaPlayback();const index=Number(marker.dataset.point);selectPoint(index);
    const timeline=get('timeline'),initial=structuredClone(points),token=generation;timeline.setPointerCapture(event.pointerId);
    dragging=true;const startX=event.clientX,startTime=initial[index].millisecondOffset,rect=timeline.getBoundingClientRect();
    let nextTime=initial[index].millisecondOffset;
    const move=e=>{if(e.pointerId!==event.pointerId || token!==generation)return;nextTime=boundedAnchorTime(initial,index,startTime+(e.clientX-startX)/rect.width*1024/1000*player.backingTrackDuration,player.backingTrackDuration);get('point-time').value=(nextTime/1000).toFixed(3);timeline.querySelector(`[data-point="${index}"]`)?.setAttribute('transform',`translate(${nextTime/player.backingTrackDuration*1000} 0)`);};
    const cleanup=()=>{dragging=false;timeline.removeEventListener('pointermove',move);timeline.removeEventListener('pointerup',finish);timeline.removeEventListener('pointercancel',cancel);if(timeline.hasPointerCapture(event.pointerId))timeline.releasePointerCapture(event.pointerId);};
    const finish=e=>{if(e.pointerId!==event.pointerId)return;move(e);cleanup();if(token!==generation)return;const next=initial;next[index].millisecondOffset=nextTime;try{if(nextTime!==startTime)edit(next);selectPoint(index);action(()=>seekRecording(nextTime))();}catch(error){message(error.message);renderPoints();}sync();};
    const cancel=()=>{cleanup();if(token===generation)selectPoint(index);};
    timeline.addEventListener('pointermove',move);timeline.addEventListener('pointerup',finish);timeline.addEventListener('pointercancel',cancel);
  });
  get('save-profile').addEventListener('click',action(async()=>{
    const snapshotHash=scoreHash,token=generation,snapshot=JSON.stringify(points),valid=validatePoints(points,AppState.playbackTimeline,player.backingTrackDuration);
    const name=get('profile-name').value.trim();if(!name)throw new Error('Enter a profile name.');
    const existing=profiles.find(profile=>profile.id===profileId);
    const profile={id:existing && sourceMatches(existing.source,source)?profileId:crypto.randomUUID(),scoreHash,scoreName:AppState.score.title || AppState.currentScoreFile.fileName,name,source,durationMs:player.backingTrackDuration,points:valid,layout};
    await store.saveProfile(profile);if(snapshotHash!==scoreHash || token!==generation)return;profileId=profile.id;dirty=JSON.stringify(points)!==snapshot;await refreshProfiles();message(dirty?'Sync profile saved; newer alignment edits still need saving.':'Sync profile saved. Recordings are not copied into browser storage.');
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
  divider.addEventListener('keydown',event=>{const horizontal=['left','right'].includes(layout) && window.innerWidth>700;if(!(horizontal?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown']).includes(event.key))return;event.preventDefault();const reversed=layout==='below' || (layout==='right' && horizontal);share=Math.max(20,Math.min(65,share+(['ArrowRight','ArrowDown'].includes(event.key)?2:-2)*(reversed?-1:1)));
    renderLayout();persistLayout();});
  window.addEventListener('resize',()=>{renderLayout();if(!dragging)renderPoints();});
  setInterval(()=>{
    if(!player)return;const duration=player.backingTrackDuration,time=player.currentTime;
    get('clock').textContent=`${clock(time)} / ${clock(duration)}`;
    renderTarget(time);
    if(!typedTime && !dragging && document.activeElement!==get('point-time'))get('point-time').value=(time/1000).toFixed(3);
    if(document.activeElement!==get('seek'))get('seek').value=String(time/1000);
    const x=duration>0?time/duration*1000:0;playhead?.setAttribute('x1',x);playhead?.setAttribute('x2',x);
    if(showEditor && player.playing && !dragging && performance.now()-lastTimelineInteraction>1000) {
      const scroll=get('timeline').parentElement,position=(x+12)/1024*get('timeline').clientWidth;
      if(position<scroll.scrollLeft || position>scroll.scrollLeft+scroll.clientWidth)scroll.scrollLeft=Math.max(0,position-scroll.clientWidth/2);
    }
    if(AppState.media.preview && !AppState.media.returning) {
      host.updateMediaPosition(Math.min(time,duration-0.1),player.playing && !buffering);
    }
  },50);
  async function timelineReady() {
    if(!AppState.currentScoreFile || !AppState.playbackTimeline || scoreBytes===AppState.currentScoreFile.bytes)return;
    scoreBytes=AppState.currentScoreFile.bytes;const current=scoreBytes,token=generation;
    const hash=await fingerprint(current);if(current!==scoreBytes || token!==generation)return;scoreHash=hash;
    const select=get('measure');select.replaceChildren();
    AppState.playbackTimeline.measures.forEach((measure,index)=>select.append(new Option(`Measure ${measure.measureNumber}${measure.occurrence>1?` (repeat ${measure.occurrence})`:''}`,String(index))));
    await refreshProfiles();message('Score ready. Choose a recording or a saved profile.');sync();
  }
  renderLayout();sourceControls();sync();refreshProfiles().catch(error=>message(error.message));
  return {sync,timelineReady,async returnToPractice(){await returnToPractice();},
    setVolume(percent){
      if(!Number.isFinite(percent) || percent<0 || percent>100)return false;
      AppState.audio.mediaPercent=percent;
      if(player && !busy)player.masterVolume=AppState.media.preview && AppState.mode==='wait'?0:percent/100;
      return true;
    },
    scoreLoading(){generation++;disposal();points=[];undo=[];redo=[];scoreBytes=null;scoreHash='';profileId='';pendingProfile=null;selected=-1;busy=false;dirty=false;renderPoints();renderLayout();sync();},
    mediaChanged(){sync();if(!AppState.media.preview)afterPractice();},
    get dirty(){return dirty;},
  };
}
