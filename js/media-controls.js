import {printedMeasure} from './printed-measure.js';
// Media UI, browser players and profile intents. Native calls stay in the host.
import {createDraftEditor} from './draft-controls.js';
import {createAudioSuggestions} from './audio-sync-controls.js';
import {validateDraft,checkDraftBinding,DRAFT_CAPABILITY} from './draft-timing.js';
import {AppState} from './app-state.js';
import {recordingScoreRange,recordingRegion} from './media-score-range.js';
import {LibraryStore,fingerprint} from './library-store.js';
import {MEDIA_PROFILE_FORMAT,MEDIA_LAYOUTS,mediaUrl,youtubeId,sourceMatches,matchMediaProfile,validatePoints,tempoAlignedPoints,parseProfileExport,pointTick,mediaTimeAtTick} from './media-sync.js';
import {htmlMediaPlayer,youtubeMediaPlayer,waveformPeaks} from './media-player.js';
import {timelineGuides,moveAnchors,timeFromClientX,zoomWindow,anchorIndex,visibleWaveform,syncPointLabel,timelineRuler} from './media-timeline.js';
import {soundslicePoints,lessonTimelineKey} from './lesson-import-data.js';
import {compileTimingPlan,planPositionAtTime,timingPlanIntervals,INTERVAL_TIMING_FORMAT} from './explanation-timing.js';

const svg=(tag,attrs={},text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;};
const clock=ms=>{const seconds=Math.max(0,ms/1000);return `${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;};
const intervalLabel=interval=>interval.kind==='unmatched-source-rest'?`Unscored break — ${interval.label}`:interval.label;
function download(data,fileName) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}

export function initMediaControls(host,{beforeListen=()=>{},afterPractice=()=>{},beforeEdit=()=>{},afterEdit=()=>{},closeMenu=()=>{}}={},store=new LibraryStore()) {
  const get=id=>document.getElementById('media-'+id);
  // Move existing controls, retaining their IDs and all storage/source wiring.
  get('editor-toolbar').append(get('mode-controls'));
  get('editor-toolbar').append(get('save-profile'),get('dirty'));
  get('point-tools').before(get('selection'));
  get('apply-time').before(get('add-point'));
  get('move-help').before(get('nudge-left'),get('nudge-right'));
  get('extra-tools').append(get('unload'));
  get('popup').firstElementChild.append(get('extra-tools'));
  get('extra-tools').before(get('paste-sync'));
  get('timeline').parentElement.before(get('zoom-toolbar'));
  get('extra-tools').append(get('workflow-help'));
  const timelineSpacer=document.createElement('div');timelineSpacer.className='media-timeline-spacer';
  timelineSpacer.setAttribute('aria-hidden','true');get('timeline').before(timelineSpacer);
  const explanationTools=document.createElement('div');explanationTools.id='media-explanation-tools';explanationTools.hidden=true;
  const explanationSummary=document.createElement('p'),explanationSelect=document.createElement('select');
  explanationSelect.id='media-explanation-select';explanationSelect.setAttribute('aria-label','Explanation to listen to');
  const listenExplanation=document.createElement('button'),skipExplanation=document.createElement('button');
  listenExplanation.type=skipExplanation.type='button';listenExplanation.textContent='Listen to explanation';skipExplanation.textContent='Skip to music';
  listenExplanation.id='media-listen-explanation';skipExplanation.id='media-skip-explanation';
  explanationTools.append(explanationSummary,explanationSelect,listenExplanation,skipExplanation);get('selection').before(explanationTools);
  const playerSkip=skipExplanation.cloneNode(true);playerSkip.id='media-player-skip-explanation';playerSkip.hidden=true;get('listening-notice').after(playerSkip);
  const recovery=document.createElement('div');recovery.id='media-recording-recovery';recovery.className='media-actions';recovery.hidden=true;
  const recoveryStatus=document.createElement('span');recoveryStatus.setAttribute('role','status');
  const reloadRecording=document.createElement('button');reloadRecording.id='media-reload-recording';reloadRecording.type='button';reloadRecording.textContent='Reload recording';
  reloadRecording.title='Retry this recording at the current time. Accepted timing and the score stay unchanged. Playback stays paused.';
  recovery.append(recoveryStatus,reloadRecording);get('workspace').after(recovery);
  let recordingError=null,reloadInProgress=false;
  let projectedGuides=[],timelineFrame=0;
  let sectionFirst=0,sectionLast=0,movementPositions='';
  let player=null,source=null,localFile=null,blobUrl=null,points=[],peaks=[],selected=-1,undo=[],redo=[],profiles=[],scoreHash='',profileId='',pendingProfile=null;
  let timingPlan=null,draftTiming=null,draftPreviewEnd=null;
  const stopDraftPreview=()=>{if(draftPreviewEnd!==null)player?.pause();draftPreviewEnd=null;};
  const draftEditor=createDraftEditor({container:get('selection').parentElement,
    options:()=>({notation:AppState.score,timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:draftTiming?.recordingId,durationMs:player?.backingTrackDuration}),
    transport(action,seconds){if(!draftTiming||!player)return;if(action==='pause'){stopDraftPreview();return;}if(action==='seek'){player.seekTo(seconds*1000);return;}beforeEdit();draftPreviewEnd=player.backingTrackDuration;player.play();},
    highlight:(position,reveal)=>host.showDraftPosition(position,reveal),
    stop:stopDraftPreview,exportFile:download,
    async apply(compiled,isCurrent){
      if(!draftTiming||!player||!isCurrent())throw new Error('Draft changed. Preview the current edits again.');
      const token=generation,originalDraft=draftTiming;
      stopDraftPreview();timingPlan=compiled;points=[];
      try{await selectRecording();if(token!==generation||!isCurrent()||!AppState.media.preview||AppState.media.timingPlan!==compiled)throw new Error('Recording selection changed. Review the draft again.');}
      catch(error){if(token===generation){await returnToPractice();timingPlan=null;draftTiming=originalDraft;openEditor();sync();}throw error;}
      draftTiming=null;draftEditor.complete();dirty=true;renderExplanationSummary();renderPoints();finishEditing();sync();message('Reviewed timing applied. Press Play to practice. Save profile is optional; Export draft retains original evidence.');
    }});
  let generation=0,scoreBytes=null,busy=false,pendingDelete=null,playhead=null,dirty=false;
  let zoom=1,waveformBusy=false,waveformGeneration=0,dragging=false,lastTimelineInteraction=0,buffering=false;
  let cancelDrag=null;
  let seekGeneration=0;
  let layout='left',share=35,showPlayer=true,showEditor=false,wideTimeline=false;
  try {
    const saved=JSON.parse(localStorage.getItem('gts.mediaLayout') || '{}');
    if(MEDIA_LAYOUTS.includes(saved.layout))layout=saved.layout;
    if(saved.share>=20 && saved.share<=65)share=saved.share;
    if(typeof saved.showPlayer==='boolean')showPlayer=saved.showPlayer;
    if(typeof saved.showEditor==='boolean')showEditor=saved.showEditor;
    wideTimeline=saved.wideTimeline===true;
  }catch{}
  const message=text=>{get('status').textContent=text;get('action-status').textContent=text;get('action-status').hidden=text.startsWith('Editing sync');};
  function persistLayout() {try{localStorage.setItem('gts.mediaLayout',JSON.stringify({layout,share,showPlayer,showEditor,wideTimeline}));}catch{}}
  const scrub=get('seek').closest('.media-scrub'),timelineBar=get('timeline-bar');
  const suggestions=createAudioSuggestions({
    after:get('editor-toolbar'),
    playhead:()=> (player?.currentTime ?? 0)/1000,
    context:()=>({notation:AppState.score,source,file:localFile,url:blobUrl || source?.url,score:AppState.currentScoreFile,
      scoreSha256:scoreHash,timeline:AppState.playbackTimeline,trackId:AppState.practiceTrackId,
      duration:(player?.backingTrackDuration || 0)/1000,generation,hasDraft:Boolean(draftTiming),
      blocked:busy || recordingError || !player?.backingTrackDuration?'Wait for the recording to be ready.':
        dirty && !draftTiming?'Save the current alignment before creating another draft.':''}),
    async preview(take){
      if(!showEditor || !take)return;
      if(draftTiming){beforeEdit();player.seekTo(take.start*1000);draftPreviewEnd=take.end*1000;player.play();}
      else await seekRecording(take.start*1000,{resume:true});
    },
    async review(draft,isCurrent){
      const check=()=>{
        if(!isCurrent() || !showEditor || busy || recordingError || dirty && !draftTiming)
          throw Error('Reopen Media Sync and check the current recording before reviewing suggestions.');
        checkDraftBinding(draft,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:draft.recordingId});
      };
      check();await returnToPractice();check();stopDraftPreview();player.pause();
      if(draftTiming)draftEditor.replaceMapping({...draft.candidatePlan,recordingId:draftTiming.recordingId});
      else {
        draftTiming=draft;points=[];timingPlan=null;profileId='';selected=-1;undo=[];redo=[];
        get('profile-name').value=source.label+' · Audio timing';
        draftEditor.load(draft);
      }
      dirty=true;renderExplanationSummary();renderPoints();sync();
      get('draft-timing').scrollIntoView({block:'nearest'});
      message('Listen across the suggested boundaries, then choose Use reviewed timing.');
    }
  });
  function placeRecordingTimeline() {
    timelineBar.hidden=!wideTimeline || !(player?.backingTrackDuration>0);
    if(wideTimeline && scrub.parentElement!==timelineBar)timelineBar.append(scrub,playerSkip);
    if(!wideTimeline && scrub.parentElement===timelineBar) {
      get('video-actions').before(scrub);
      get('listening-notice').after(playerSkip);
    }
    get('wide-timeline').checked=wideTimeline;
  }
  function showRecordingInfo(open) {
    get('info').hidden=!open;
    get('info-button').setAttribute('aria-expanded',String(open));
  }
  function renderLayout() {
    if(Boolean(AppState.media.editing)!==showEditor){if(showEditor)beforeEdit();host.setMediaEditing(showEditor);if(!showEditor)afterEdit();else message('Editing sync · Preview only. Choose Finish editing to restore grading and loops.');}
    const workspace=get('workspace'),visible=Boolean(player && showPlayer && !get('player-panel').classList.contains('audio-only'));
    workspace.classList.toggle('has-media',visible);workspace.dataset.layout=layout;workspace.style.setProperty('--media-share',share+'%');
    get('player-panel').hidden=get('divider').hidden=!visible;get('divider').setAttribute('aria-valuenow',String(share));
    if(!visible)showRecordingInfo(false);
    placeRecordingTimeline();
    get('divider').setAttribute('aria-orientation',['left','right'].includes(layout) && window.innerWidth>700?'vertical':'horizontal');
    get('editor').hidden=!showEditor;document.body.classList.toggle('media-editor-visible',showEditor);
    get('layout').value=layout;get('show-player').checked=showPlayer;get('show-editor').checked=showEditor;
    get('edit-sync').setAttribute('aria-expanded',String(showEditor));
    document.querySelectorAll('[data-open-media-editor]').forEach(button=>button.setAttribute('aria-expanded',String(showEditor)));
    renderPoints();
  }
  function sync() {
    suggestions.sync();
    document.body.classList.toggle('draft-timing-active',Boolean(draftTiming));
    recovery.hidden=!recordingError;recoveryStatus.textContent=reloadInProgress?'Reloading recording… Timing and score are retained.':recordingError?.message??'';reloadRecording.hidden=!player?.reload;reloadRecording.disabled=busy || reloadInProgress;
    get('finish-editing').disabled=Boolean(draftTiming) || busy || AppState.media.returning;
    const silent=AppState.media.preview && AppState.mode==='wait' && !AppState.media.editing;
    get('audio').muted=get('video').muted=silent;
    if(silent && player?.masterVolume)player.masterVolume=0;
    const ready=Boolean(player && player.backingTrackDuration>0 && (timingPlan || points.length>=2) && AppState.playbackTimeline && !busy && !dragging && !AppState.media.returning && (!AppState.media.preview || AppState.playerReady));
    get('listen').disabled=Boolean(draftTiming) || !ready;get('listen').setAttribute('aria-pressed',String(AppState.media.preview));
    get('practice').disabled=busy || AppState.media.returning;get('practice').setAttribute('aria-pressed',String(!AppState.media.preview));
    get('unload').disabled=!player || busy;get('save-profile').disabled=Boolean(draftTiming) || !ready || !scoreHash;
    get('delete-profile').disabled=!profileId || busy;get('export-profile').disabled=!profiles.length || busy;
    get('waveform').disabled=!localFile || busy || waveformBusy;get('undo').disabled=!undo.length || busy || dragging;get('redo').disabled=!redo.length || busy || dragging;
    get('remove-point').disabled=selected<0 || !ready;
    get('apply-time').disabled=get('add-point').disabled=!ready;
    get('apply-pasted-sync').disabled=!ready;
    explanationTools.hidden=!timingPlan;
    listenExplanation.disabled=!ready || !timingPlan?.intervals.length;
    const selectedInterval=timingPlan?.intervals.find(interval=>interval.id===explanationSelect.value);
    listenExplanation.textContent=selectedInterval?.kind==='unmatched-source-rest'?'Listen to break':'Listen to explanation';
    // A plan has two distinct times at a commentary boundary. Ordinary anchor
    // editing cannot represent that; keep its tools unavailable for this plan.
    if(timingPlan||draftTiming)for(const key of ['remove-point','apply-time','add-point','apply-pasted-sync','undo','redo'])get(key).disabled=true;
    get('add-point').textContent=targetIndex()>=0?'Update sync point':'Add sync point';
    const movable=movementRange(selected)!==null;
    const movingLabel={all:'all sync points',section:'selected section',stretch:'first point of stretch section',point:'selected sync point'}[get('move-scope').value];
    for(const [key,direction] of [['nudge-left','earlier'],['nudge-right','later']]) {
      get(key).disabled=Boolean(timingPlan||draftTiming) || !movable || !ready;
      get(key).setAttribute('aria-label',`Move ${movingLabel} 50 milliseconds ${direction}`);
    }
    for(const key of ['move-scope','section-first','section-last','measure','beat','point-time'])get(key).disabled=Boolean(timingPlan||draftTiming) || !ready;
    get('dirty').textContent=dirty?'Unsaved changes':profileId?'Saved profile':'Not saved';
    get('save-profile').textContent=profileId?'Save changes':'Save profile';
    get('seek').disabled=!player || busy;
    get('load-embedded').disabled=!host.embeddedMedia();
    for(const key of ['source-kind','choose-file','load-link','load-embedded','profile-select'])get(key).disabled=busy || dragging || (key==='load-embedded' && !host.embeddedMedia());
    get('pip').disabled=!player || source?.kind==='youtube' || !document.pictureInPictureEnabled || !get('video').videoWidth;
    const floatingReason=source?.kind==='youtube'?'YouTube floating video uses browser controls, if available. Our Float button supports local video and direct video URLs.':
      !document.pictureInPictureEnabled?'This browser does not provide floating video.':!get('video').videoWidth?'Choose a video recording to enable floating video.':'';
    get('pip').title=floatingReason || 'Open this video in a floating browser window';
    get('float-status').hidden=!floatingReason || source?.kind!=='youtube';get('float-status').textContent=floatingReason;
    get('float-help').textContent=floatingReason || 'Float video opens a separate browser window while synchronization continues.';
    document.body.classList.toggle('media-preview',AppState.media.preview);
    syncRecordingRegion();
  }
  function syncRecordingRegion() {
    const duration=player?.backingTrackDuration,range=timingPlan?{start:timingPlan.startMs,end:timingPlan.endMs}:recordingScoreRange(points,AppState.playbackTimeline,duration);
    const position=timingPlan && player?planPositionAtTime(timingPlan,player.currentTime):null;
    const region=range && AppState.media.preview?position?.kind??recordingRegion(points,AppState.playbackTimeline,player.currentTime):'music';
    const interval=position?.interval,isBreak=region==='explanation'||region==='unmatched-source-rest';
    skipExplanation.disabled=busy || !AppState.media.preview || !isBreak;
    skipExplanation.textContent=interval?.boundary.before?'Skip to music':region==='unmatched-source-rest'?'Skip break':'Skip explanation';
    playerSkip.hidden=!timingPlan || !isBreak;playerSkip.disabled=skipExplanation.disabled;playerSkip.textContent=skipExplanation.textContent;
    get('listening-notice').textContent=recordingError?(player?.reload?'Recording failed to load this position. Choose Reload recording below; timing is retained.':'Recording unavailable. Check the source in Load / options; timing is retained.'):draftTiming?'Draft timing needs review · Recording grading paused.':AppState.media.editing?'Preview only · Grading and loops paused. Choose Finish editing to practice.':
      AppState.mode==='wait'?'Use main Play/Pause and Tempo. Wait mode keeps playback silent.':
      isBreak?`${intervalLabel(interval)} · No grading`:
      region==='before'?'Before synced music · No grading':region==='after'?'After synced music · No grading':'Use main Play/Pause and Tempo.';
    const seek=get('seek');
    if(range && duration>0) {
      const start=range.start/duration*100,end=range.end/duration*100;
      if(timingPlan) {
        const bands=[];let cursor=0;
        for(const visit of timingPlan.visits){if(visit.startMs>cursor)bands.push(`#a7adb8 ${cursor/duration*100}% ${visit.startMs/duration*100}%`);bands.push(`#dce8f7 ${visit.startMs/duration*100}% ${visit.endMs/duration*100}%`);cursor=visit.endMs;}
        if(cursor<duration)bands.push(`#a7adb8 ${cursor/duration*100}% 100%`);
        seek.style.background=`linear-gradient(to right, ${bands.join(', ')})`;
      } else seek.style.background=`linear-gradient(to right, var(--media-outside-color, #a7adb8) 0% ${start}%, var(--media-music-color, #dce8f7) ${start}% ${end}%, var(--media-outside-color, #a7adb8) ${end}% 100%)`;
      seek.title='Shaded sections have no grading. They remain seekable.';
    } else {seek.style.background='';seek.title='';}
  }
  function sourceControls() {
    const kind=get('source-kind').value;
    get('local-controls').hidden=kind!=='local';get('link-controls').hidden=!['url','youtube'].includes(kind);get('embedded-controls').hidden=kind!=='embedded';
  }
  function disposal() {
    suggestions.reset();
    cancelDrag?.();
    timelineBar.hidden=true;
    showRecordingInfo(false);
    draftTiming=null;draftEditor.clear();
    player?.destroy();recordingError=null;reloadInProgress=false;buffering=false;player=null;source=null;localFile=null;peaks=[];timingPlan=null;
    resetMovement();
    get('point-time').value='0.000';seekGeneration++;
    get('sync-json').value='';get('paste-status').textContent='';get('paste-sync').open=false;
    waveformGeneration++;waveformBusy=false;get('waveform-status').textContent='';
    if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;
    get('youtube').replaceChildren();get('youtube').hidden=true;get('video').hidden=false;
  }
  async function returnToPractice() {
    stopDraftPreview();
    if(!AppState.media.preview)return;
    host.endMediaPlayback();
    const deadline=performance.now()+10000;
    while(AppState.media.preview && performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));
    if(AppState.media.preview)throw new Error('Practice player is still loading. Wait before changing recordings.');
    afterPractice();sync();
  }
  async function loadRecording(nextSource,file=null,{deferSelection=false}={}) {
    if(!AppState.playbackTimeline)throw new Error('Load a score and wait for its player first.');
    const token=++generation;busy=true;sync();
    try {
      await returnToPractice();if(token!==generation)return;
      disposal();source=nextSource;localFile=file;get('recording-label').textContent=source.label;
      get('profile-name').value=source.label;message('Loading recording…');
      const events={isCurrent:()=>token===generation,onState(state){
        if(token!==generation || reloadInProgress || recordingError)return;
        if(draftTiming){if(draftPreviewEnd===null)player?.pause();return;}
        if(!AppState.media.preview) {player?.pause();return;}
        buffering=state==='buffering';
        if(state==='ratechange') {if(player && player.playbackRate!==AppState.playbackSpeed)host.setSpeed(player.playbackRate);sync();return;}
        if(state==='playing' && AppState.mode==='wait' && !AppState.media.editing){player.pause();return;}
        // Provider notifications report state; only explicit controls start playback.
        if(state==='playing' && !AppState.isPlaying){player.pause();return;}
        // Buffering must not pause the media element: that aborts its pending play.
        if(['ended','paused'].includes(state))host.pauseMediaPlayback({ended:state==='ended'});
        sync();
      },onError(error){if(token!==generation)return;recordingError=error;stopDraftPreview();host.pauseMediaPlayback();player?.pause();message(error.message || 'Browser playback was blocked. Try Listen again.');sync();}};
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
      let matched=deferSelection?null:matchMediaProfile(profiles,scoreHash,source,pendingProfile);
      timingPlan=matched?.timingPlan?compileSavedPlan(matched):null;
      points=timingPlan || deferSelection?[]:matched?validatePoints(matched.points,AppState.playbackTimeline,player.backingTrackDuration):
        source.kind==='embedded' && host.embeddedMedia().points.length>=2?validatePoints(host.embeddedMedia().points,AppState.playbackTimeline,player.backingTrackDuration):tempoAlignedPoints(AppState.playbackTimeline,player.backingTrackDuration);
      const relinked=Boolean(matched && pendingProfile?.id===matched.id && source.kind==='local' && !sourceMatches(matched.source,source));
      if(relinked) {
        matched={...matched,source,durationMs:player.backingTrackDuration};
        if(!timingPlan)await store.saveProfile(matched);
      }
      profileId=matched?.id || '';get('profile-name').value=matched?.name || source.label;
      if(matched)layout=matched.layout;
      pendingProfile=null;selected=-1;undo=[];redo=[];dirty=Boolean(relinked && timingPlan);
      renderExplanationSummary();
      get('seek').max=String(player.backingTrackDuration/1000);
      renderPoints();await refreshProfiles();if(token!==generation)return;renderLayout();
      closeMenu();
      // Complete loading before selecting through the existing native host path.
      try {if(!deferSelection)await selectRecording({loading:true});}
      catch(error) {message(`Recording loaded, but playback selection failed: ${error.message} Choose Recording to retry.`);return;}
      if(token!==generation)return;
      message(relinked && timingPlan?'Imported timing restored for the selected recording. Check alignment; Save profile keeps this file choice.':relinked?'Saved alignment restored and linked to this local file.':matched?'Saved alignment restored.':'Recording selected. Press Preview to listen; choose a measure and recording time, then add/update its sync point.');
      if(localFile)buildWaveform();
      else get('waveform-status').textContent='Waveform unavailable for this source; alignment controls still work.';
    } catch(error) {if(token===generation){disposal();message(error.message);renderLayout();throw error;}}
    finally {if(token===generation){busy=false;sync();}}
  }
  async function selectRecording({loading=false}={}) {
    if(recordingError){message(recordingError.message);sync();return;}
    if(draftTiming && !timingPlan)throw new Error('Review Draft timing first.');
    if(!player || (busy && !loading))return;
    const selectedPlayer=player,token=generation;
    if(!AppState.media.preview) {
      beforeListen();
      if(token!==generation || selectedPlayer!==player)return;
      if(!host.beginMediaPlayback(selectedPlayer,points,{timingPlan}))throw new Error('Wait for the score player to become ready.');
      const deadline=performance.now()+5000;
      while(!AppState.playerReady && performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
      if(token!==generation || selectedPlayer!==player)return;
      if(!AppState.playerReady)throw new Error('The sync player is still preparing. Try Listen again.');
    }
    if(!AppState.media.preview || AppState.media.returning)return;
    message(AppState.media.editing?'Editing sync · Scoring paused. Use main Play/Pause; click the timeline to seek.':AppState.mode==='wait'?'Recording selected. Wait stays silent and seeks the video as you solve each target.':'Recording selected. Main Play/Pause and Tempo control it; Realtime grading remains active.');sync();
  }
  function openEditor() {showEditor=true;renderLayout();persistLayout();closeMenu();
    if(!player && !busy)document.querySelector('[data-launch-panel="media-popup"]').click();
    else (timingPlan?explanationSelect:get('add-point')).focus();
  }
  function compileSavedPlan(profile) {
    return compileTimingPlan(profile.timingPlan,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,
      recordingId:profile.timingPlan.recordingId,durationMs:player.backingTrackDuration});
  }
  function renderExplanationSummary() {
    explanationSelect.replaceChildren();if(!timingPlan)return;
    const omitted=timingPlan.plan.repeatResolution.omittedOriginalVisits.length,rests=timingPlan.intervals.filter(interval=>interval.kind==='unmatched-source-rest').length,silent=timingPlan.plan.scoreOmissions?.length??0;
    explanationSummary.textContent=`${timingPlan.explanations.length} explanation breaks${rests?` · ${rests} unscored breaks`:''}. ${omitted?`${omitted} extra repeat visits are skipped in this recording. `:''}${silent?`${silent} verified silent measure visits are skipped in this recording. `:''}Original score unchanged. This imported timing is read-only; import a revised lesson to change it.`;
    explanationSelect.setAttribute('aria-label',rests?'Recording break to listen to':'Explanation to listen to');
    for(const interval of timingPlan.intervals)explanationSelect.append(new Option(`${clock(interval.startMs)} — ${intervalLabel(interval)}`,interval.id));
  }
  function edit(next,{preservePlayback=false}={}) {
    if(draftTiming)throw new Error('Use the Draft timing editor to preserve the original evidence.');
    if(timingPlan)throw new Error('Import a revised lesson to change this timing plan.');
    if(cancelDrag){cancelDrag();renderPoints();sync();}
    const checked=validatePoints(next,AppState.playbackTimeline,player?.backingTrackDuration);
    if(checked.length<2)throw new Error('Keep at least a start and end point.');
    if(JSON.stringify(checked)===JSON.stringify(points))return;
    host.applyMediaSyncPoints(checked,{preservePlayback});
    undo.push(structuredClone(points));if(undo.length>100)undo.shift();redo=[];
    points=checked;dirty=true;renderPoints();sync();message('Alignment edited. Save profile to keep these changes.');
  }
  function resetMovement() {
    get('move-scope').value='point';sectionFirst=sectionLast=0;movementPositions='';
  }
  function movementRange(index) {
    if(timingPlan || draftTiming)return null;
    if(index<0 || index>=points.length)return null;
    const scope=get('move-scope').value;
    if(scope==='all')return [0,points.length-1];
    if(scope==='stretch')return index===sectionFirst && sectionFirst<sectionLast?[sectionFirst,sectionLast]:null;
    if(scope==='section')return index>=sectionFirst && index<=sectionLast?[sectionFirst,sectionLast]:null;
    return [index,index];
  }
  function renderMovement() {
    const positions=JSON.stringify(points.map(({barIndex,barOccurence,barPosition})=>[barIndex,barOccurence,barPosition]));
    // Inserting/removing/replacing score targets invalidates an index-based section.
    if(positions!==movementPositions) {
      resetMovement();movementPositions=positions;
      for(const key of ['section-first','section-last']) {
        get(key).replaceChildren();
        points.forEach((point,index)=>{
          const label=syncPointLabel(point,AppState.score,AppState.playbackTimeline);
          get(key).append(new Option(`${index+1}: ${label==='Start' || label==='End'?label:'Measure '+label}`,String(index)));
        });
      }
    }
    const scope=get('move-scope').value;
    get('section-first-label').hidden=get('section-last-label').hidden=scope!=='section' && scope!=='stretch';
    get('section-first').value=String(sectionFirst);get('section-last').value=String(sectionLast);
    get('move-help').textContent=scope==='point'?'Drag a saved point or use the nudge arrows.':
      scope==='all'?'Drag any saved point or nudge to shift all points together. Stops at the recording edges.':
      scope==='stretch'?'Drag or nudge the first point. The last stays fixed and the points between adjust proportionally.':
      'Drag a point in this section or nudge. Both endpoint points move; points outside stay fixed.';
  }
  function isMovingPoint(index) {
    const scope=get('move-scope').value;
    return scope==='all' || (scope==='section' && index>=sectionFirst && index<=sectionLast) ||
      (scope==='stretch' && index>=sectionFirst && index<sectionLast);
  }
  function movementMessage(delta,requested) {
    if(Math.abs(delta-requested)<0.001)return;
    message(delta===0?'Cannot move farther: a neighboring point or recording edge is in the way. Move one point to adjust the boundary.':
      'Move stopped at a neighboring point or recording edge. Save profile to keep changes.');
  }
  function formPoint() {
    const measure=AppState.playbackTimeline?.measures[Number(get('measure').value)];
    if(!measure)throw new Error('Choose a score measure.');
    const beats=AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    const beat=Number(get('beat').value),time=Number(get('point-time').value);
    if(!get('beat').value || !get('point-time').value || beat<1 || beat>beats+1)throw new Error(`Beat position must be between 1 and ${beats+1} (bar end).`);
    return {barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:(beat-1)/beats,millisecondOffset:time*1000};
  }
  function targetIndex() {
    const measure=AppState.playbackTimeline?.measures[Number(get('measure').value)];
    if(!measure)return -1;
    const beats=AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    return anchorIndex(points,{barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:(Number(get('beat').value)-1)/beats},AppState.playbackTimeline);
  }
  function selectTime(time) {
    get('point-time').value=(time/1000).toFixed(3);renderSelectedTime();renderTarget();
  }
  function renderSelectedTime() {
    const marker=get('timeline').querySelector('.media-time-selection');
    if(!marker)return;
    const time=Number(get('point-time').value)*1000,duration=player?.backingTrackDuration || 0;
    const valid=Boolean(duration>0 && get('point-time').value && Number.isFinite(time) && time>=0 && time<=duration);
    marker.style.display=valid?'':'none';
    if(valid){marker.setAttribute('transform',`translate(${time/duration*1000} 0)`);marker.setAttribute('aria-label',`Selected recording time ${clock(time)}`);}
  }
  function selectPoint(index,{preserveTime=false}={}) {
    selected=index;const point=points[index];if(!point)return;
    const measureIndex=AppState.playbackTimeline.measures.findIndex(m=>m.measureNumber===point.barIndex+1 && m.occurrence===point.barOccurence+1);
    get('measure').value=String(measureIndex);
    get('beat').value=String(1+point.barPosition*AppState.score.masterBars[point.barIndex].timeSignatureNumerator);
    if(!preserveTime)selectTime(point.millisecondOffset);
    renderPoints();sync();
    if(preserveTime)host.revealMediaScoreTarget(point);
  }
  function chooseGuide(measureIndex,beat,{reveal=true}={}) {
    const targetMeasure=AppState.playbackTimeline.measures[measureIndex],beats=AppState.score.masterBars[targetMeasure.measureNumber-1].timeSignatureNumerator;
    if(!Number.isFinite(beat) || beat<1 || beat>beats+1)throw new Error(`Beat position must be between 1 and ${beats+1} (bar end).`);
    get('measure').value=String(measureIndex);get('beat').value=String(beat);
    selected=targetIndex();
    // Selection keeps the clicked guide alive until its pointer event completes.
    get('timeline').querySelectorAll('[data-guide]').forEach(node=>{
      const active=Number(node.dataset.guide)===measureIndex && Number(node.dataset.beat)===beat;
      node.classList.toggle('is-selected',active);node.querySelector('line').setAttribute('y2',active?31:84);
    });
    get('timeline').querySelectorAll('[data-point]').forEach(node=>node.classList.toggle('is-selected',Number(node.dataset.point)===selected));
    renderTarget();
    sync();
    const measure=AppState.playbackTimeline.measures[measureIndex];
    if(reveal)host.revealMediaScoreTarget({barIndex:measure.measureNumber-1,barPosition:(beat-1)/AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator});
  }
  function renderTarget(time=player?.currentTime || 0) {
    get('selection').textContent=`Preview only · Grading and loops paused · Playhead: ${clock(time)}`;
  }
  function seekSelectedTarget() {
    const measure=AppState.playbackTimeline.measures[Number(get('measure').value)];
    const beats=AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
    const tick=measure.startTick+(measure.endTick-measure.startTick)*(Number(get('beat').value)-1)/beats;
    return seekRecording(mediaTimeAtTick(points,AppState.playbackTimeline,tick),{preserveTime:true});
  }
  async function seekRecording(time,{resume=false,preserveTime=false}={}) {
    const token=++seekGeneration,sourceToken=generation;
    await selectRecording();
    if(token!==seekGeneration || sourceToken!==generation || !AppState.media.preview || AppState.media.returning)return;
    host.seekMediaTime(time);if(!preserveTime)selectTime(time);renderTarget(time);sync();
    if(resume && AppState.media.editing && !AppState.isPlaying)host.toggleMediaPlayback();
  }
  function applyForm() {
    const point=formPoint(),existing=anchorIndex(points,point,AppState.playbackTimeline);
    host.pauseMediaPlayback();player?.pause();
    const next=structuredClone(points);
    if(existing>=0)next[existing]=point;
    else next.push(point);
    try{edit(next);}catch(error){if(error.message.includes('move forward'))throw new Error('This time crosses a neighboring point. Choose a time between the previous and next points.');throw error;}
    selectPoint(anchorIndex(points,point,AppState.playbackTimeline));
    message(`Point ${existing>=0?'updated':'added'}: measure ${printedMeasure(AppState.score,point.barIndex+1)}${point.barOccurence?`, repeat ${point.barOccurence+1}`:''} at ${clock(point.millisecondOffset)}. Drag it to fine tune; Save profile keeps your edits.`);
  }
  function addPoint() {
    if(!player)return;
    applyForm();
  }
  function nudge(delta) {
    if(selected<0 || !player)return;
    const range=movementRange(selected);if(!range)return;
    const index=selected,wasPlaying=AppState.isPlaying,token=generation;
    const {shift,points:next}=moveAnchors(points,...range,delta,player.backingTrackDuration,get('move-scope').value==='stretch');
    if(!shift){movementMessage(shift,delta);return;}
    edit(next,{preservePlayback:true});selectPoint(index);
    return seekRecording(next[index].millisecondOffset,{resume:wasPlaying}).then(()=>{if(token===generation)movementMessage(shift,delta);});
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
    zoom=nextZoom;timelineSpacer.style.width=(zoom*100)+'%';scroll.scrollLeft=left;renderPoints();
  }
  function timelineRect() {
    const scroll=get('timeline').parentElement,rect=scroll.getBoundingClientRect();
    return {left:rect.left-scroll.scrollLeft,width:scroll.clientWidth*zoom};
  }
  function renderWaveform() {
    const timeline=get('timeline');timeline.querySelectorAll('.media-wave,.media-wave-fallback').forEach(node=>node.remove());
    const scroll=timeline.parentElement,width=scroll.clientWidth*zoom;
    if(!width)return;
    if(!peaks.length) {
      if(!player)return;
      const unit=1024/width,center=(scroll.scrollLeft+scroll.clientWidth/2)*unit-12;
      const label=waveformBusy?'Building waveform · Click timeline to seek':scroll.clientWidth<320?'No waveform · Click to seek':'Waveform unavailable · Click timeline to seek';
      const fallback=svg('g',{class:'media-wave-fallback'});
      fallback.append(svg('line',{x1:0,x2:1000,y1:55,y2:55}),svg('line',{x1:0,x2:1000,y1:32,y2:32}),svg('rect',{x:center-Math.min(scroll.clientWidth-8,340)*unit/2,y:61,width:Math.min(scroll.clientWidth-8,340)*unit,height:18}),svg('text',{transform:`translate(${center} 74) scale(${unit} 1)`,'text-anchor':'middle','font-size':12},label));
      timeline.insertBefore(fallback,timeline.querySelector('.media-time-selection,.media-playhead'));return;
    }
    const start=Math.max(0,(scroll.scrollLeft/width*1024-12)/1000);
    const end=Math.min(1,((scroll.scrollLeft+scroll.clientWidth)/width*1024-12)/1000);
    const samples=visibleWaveform(peaks,start,end,Math.max(1,Math.ceil(scroll.clientWidth)));
    const wave=svg('path',{d:samples.map((peak,i)=>`M${(start+(end-start)*i/samples.length)*1000},${55-peak*22}v${peak*44}`).join(' '),class:'media-wave',fill:'none'});
    timeline.prepend(wave);
  }
  function renderPoints(viewportOnly=false) {
    if(dragging)return;
    if(selected>=points.length)selected=-1;
    if(!viewportOnly)renderMovement();
    const timeline=get('timeline'),duration=player?.backingTrackDuration || 1;
    const scroll=timeline.parentElement,width=scroll.clientWidth*zoom;
    if(!width)return;
    timelineSpacer.style.width=(zoom*100)+'%';
    const left=-12+scroll.scrollLeft/width*1024,span=1024/zoom;
    timeline.setAttribute('viewBox',`${left} 0 ${span} 100`);
    timeline.replaceChildren();get('timeline-zoom').textContent=`${Math.round(zoom*100)}%`;
    timeline.append(svg('line',{class:'media-lane-divider',x1:-12,x2:1012,y1:32,y2:32,'pointer-events':'none'}));
    const unit=1024/width;
    const range=timingPlan?{start:timingPlan.startMs,end:timingPlan.endMs}:recordingScoreRange(points,AppState.playbackTimeline,duration);
    if(range)for(const [start,end,label] of [[0,range.start,'Before synced music'],[range.end,duration,'After synced music'],
      ...(timingPlan?.intervals??[]).map(e=>[e.startMs,e.endMs,intervalLabel(e)])]) {
      if(end<=start)continue;
      const x=start/duration*1000,w=(end-start)/duration*1000;
      const shade=svg('rect',{class:'media-outside-score',x,y:33,width:w,height:51,'pointer-events':'none'});
      shade.append(svg('title',{},label));timeline.append(shade);
      if(w>110*unit)timeline.append(svg('text',{class:'media-outside-label',transform:`translate(${x+4*unit} 47) scale(${unit} 1)`,'font-size':11,'pointer-events':'none'},label));
    }
    for(const tick of timelineRuler(duration,width,scroll.scrollLeft,scroll.clientWidth).ticks) {
      const x=tick.time/duration*1000;
      timeline.append(svg('line',{class:'media-ruler-tick',x1:x,x2:x,y1:79,y2:84}),svg('text',{class:'media-ruler-label',transform:`translate(${x} 96) scale(${unit} 1)`,'font-size':12,'text-anchor':x-left<40*unit?'start':left+span-x<40*unit?'end':'middle'},tick.label));
    }
    if(!viewportOnly)projectedGuides=timingPlan?timingPlan.visits.flatMap(visit=>visit.anchors.map(anchor=>({
      anchor:-1,measureIndex:visit.originalVisit-1,barIndex:visit.scoreMeasure-1,barOccurence:visit.occurrence-1,
      beat:1+(anchor.tick-visit.startTick)/(visit.endTick-visit.startTick)*AppState.score.masterBars[visit.scoreMeasure-1].timeSignatureNumerator,
      millisecondOffset:anchor.timeMs,
    }))):
      timelineGuides(AppState.score,AppState.playbackTimeline,points,{measureIndex:Number(get('measure').value),beat:Number(get('beat').value)});
    for(const guide of projectedGuides) {
      if(guide.anchor>=0)continue;
      const x=guide.millisecondOffset/duration*1000;
      if(x<left-100*unit || x>left+span+100*unit)continue;
      const active=Number(get('measure').value)===guide.measureIndex && Number(get('beat').value)===guide.beat;
      const marker=svg('g',{class:'media-guide'+(active?' is-selected':''),transform:`translate(${x} 0)`,'data-guide':guide.measureIndex,'data-beat':guide.beat,'data-time':guide.millisecondOffset});
      marker.append(svg('line',{x1:0,x2:0,y1:16,y2:active?31:84,'pointer-events':'none'}),svg('rect',{x:-6*unit,y:0,width:12*unit,height:30,fill:'transparent'}),svg('path',{class:guide.beat===1?'':'media-beat-arrow',d:`M${-7*unit} 2 L${7*unit} 2 L0 16 Z`}));
      if(guide.beat===1)marker.append(svg('text',{transform:`scale(${unit} 1)`,x:4,y:28,'font-size':12},`${printedMeasure(AppState.score,guide.barIndex+1)}${guide.barOccurence?` (${guide.barOccurence+1})`:''}`));
      timeline.append(marker);
    }
    points.forEach((point,index)=>{
      const x=point.millisecondOffset/duration*1000;
      if(x<left-100*unit || x>left+span+100*unit)return;
      const marker=svg('g',{class:'media-marker'+(selected===index?' is-selected':'')+(isMovingPoint(index)?' is-moving':''),transform:`translate(${x} 0)`,'data-point':index});
      const label=syncPointLabel(point,AppState.score,AppState.playbackTimeline);
      marker.append(svg('line',{x1:0,x2:0,y1:16,y2:31,'pointer-events':'none'}),svg('path',{d:`M${-7*unit} 2 L${7*unit} 2 L0 16 Z`}),svg('text',{transform:`scale(${unit} 1)`,x:4,y:28,'font-size':12},label),svg('rect',{x:-9*unit,y:0,width:18*unit,height:30,fill:'transparent'}));
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
    const timeMarker=svg('g',{class:'media-time-selection',role:'img'});
    timeMarker.append(svg('line',{x1:0,x2:0,y1:38,y2:84}),svg('path',{d:`M${-4*unit} 33 L0 38 L${4*unit} 33 Z`}));
    timeline.insertBefore(timeMarker,playhead);renderSelectedTime();
    renderTarget();
    renderWaveform();
    if(viewportOnly)return;
    get('point-list').replaceChildren();points.forEach((point,index)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(index===selected));
      button.classList.toggle('is-moving',isMovingPoint(index));
      const beat=1+point.barPosition*AppState.score.masterBars[point.barIndex].timeSignatureNumerator;
      const position=pointTick(point,AppState.playbackTimeline)===0?'Start':syncPointLabel(point,AppState.score,AppState.playbackTimeline)==='End'?'End':`Measure ${printedMeasure(AppState.score,point.barIndex+1)}, beat ${Number(beat.toFixed(2))}`;
      button.textContent=`${position}${point.barOccurence?` (repeat ${point.barOccurence+1})`:''} → ${clock(point.millisecondOffset)}`;
      button.title=`Measure ${printedMeasure(AppState.score,point.barIndex+1)}, beat ${Number(beat.toFixed(2))} matches ${clock(point.millisecondOffset)} in the recording. Click to select.`;
      button.addEventListener('click',()=>selectPoint(index,{preserveTime:true}));get('point-list').append(button);
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
      const label=document.createElement('span');label.textContent=`${profile.name} — ${profile.scoreName} — ${profile.source.label} (${profile.timingPlan?timingPlanIntervals(profile.timingPlan).length+(profile.timingPlan.format===INTERVAL_TIMING_FORMAT?' recording breaks':' explanation breaks'):profile.points.length+' points'})`;
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
  explanationSelect.addEventListener('change',sync);
  listenExplanation.addEventListener('click',action(async()=>{
    const interval=timingPlan?.intervals.find(e=>e.id===explanationSelect.value);if(!interval)return;
    openEditor();await seekRecording(interval.startMs,{resume:true});
  }));
  for(const button of [skipExplanation,playerSkip])button.addEventListener('click',action(()=>{
    if(!timingPlan || !AppState.media.preview)return;
    const interval=planPositionAtTime(timingPlan,player.currentTime).interval;if(!interval)return;
    const next=interval.boundary.before?timingPlan.visits[interval.boundary.before.visit-1]:null;
    host.seekMediaTime(next?.startMs??interval.endMs,{planTransition:true});sync();
  }));
  get('source-kind').addEventListener('change',sourceControls);
  get('choose-file').addEventListener('click',()=>{get('file').value='';get('file').click();});
  get('file').addEventListener('change',action(async()=>{const file=get('file').files[0];if(file)await loadRecording({kind:'local',label:file.name,fileName:file.name,size:file.size,lastModified:file.lastModified},file);}));
  get('load-link').addEventListener('click',action(()=>{
    const kind=get('source-kind').value,value=get('url').value.trim();
    return loadRecording(kind==='youtube'?{kind,videoId:youtubeId(value),label:'YouTube '+youtubeId(value)}:{kind:'url',url:mediaUrl(value),label:mediaUrl(value)});
  }));
  get('load-embedded').addEventListener('click',action(()=>loadRecording({kind:'embedded',label:'Embedded backing audio'})));
  reloadRecording.addEventListener('click',action(async()=>{
    if(!player?.reload || busy || reloadInProgress)return;
    const selectedPlayer=player,token=generation;
    stopDraftPreview();host.pauseMediaPlayback();selectedPlayer.pause();reloadInProgress=true;busy=true;sync();
    try {
      await selectedPlayer.reload();if(token!==generation || selectedPlayer!==player)return;
      // Recheck the unchanged accepted contract against the reloaded duration.
      if(timingPlan)compileTimingPlan(timingPlan.plan,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:timingPlan.plan.recordingId,durationMs:player.backingTrackDuration});
      else if(points.length)validatePoints(points,AppState.playbackTimeline,player.backingTrackDuration);
      recordingError=null;buffering=false;
      if(AppState.media.preview)host.seekMediaTime(selectedPlayer.currentTime);
      message('Recording reloaded. Timing and score are unchanged. Press Play to resume; Wait mode remains silent.');
    } catch(error) {if(token===generation){recordingError=error;message(error.message);}}
    finally {if(token===generation){reloadInProgress=false;busy=false;sync();}}
  }));
  get('listen').addEventListener('click',action(selectRecording));
  get('practice').addEventListener('click',action(async()=>{await returnToPractice();message('Practice restored with synthesized audio. Recording alignment is retained.');}));
  get('unload').addEventListener('click',action(async()=>{await returnToPractice();generation++;disposal();points=[];profileId='';pendingProfile=null;renderPoints();renderLayout();sync();message('Recording unloaded. Saved profiles are kept.');}));
  get('pip').addEventListener('click',action(()=>document.pictureInPictureElement?document.exitPictureInPicture():get('video').requestPictureInPicture()));
  get('close-player').addEventListener('click',()=>{showPlayer=false;renderLayout();persistLayout();document.getElementById('play-pause-button').focus();});
  get('info-button').addEventListener('click',()=>showRecordingInfo(get('info').hidden));
  get('wide-timeline').addEventListener('change',()=>{
    wideTimeline=get('wide-timeline').checked;
    placeRecordingTimeline();persistLayout();
  });
  function finishEditing() {
    if(draftTiming){message('Draft timing needs review. Recording grading remains paused.');return;}
    showEditor=false;renderLayout();persistLayout();
    message('Editing finished. Press Play to practice with the selected audio source. Save profile to keep unsaved alignment changes.');
    document.getElementById('play-pause-button').focus();
  }
  get('close-editor').addEventListener('click',finishEditing);
  get('finish-editing').addEventListener('click',finishEditing);
  get('edit-sync').addEventListener('click',()=>{if(!showEditor)openEditor();else {showEditor=false;renderLayout();persistLayout();}});
  document.querySelectorAll('[data-open-media-editor]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();if(showEditor){showEditor=false;renderLayout();persistLayout();closeMenu();}else openEditor();}));
  get('reset-layout').addEventListener('click',()=>{share=35;renderLayout();persistLayout();document.dispatchEvent(new Event('reset-panel-sizes'));});
  for(const key of ['layout','show-player','show-editor'])get(key).addEventListener('change',()=>{layout=get('layout').value;showPlayer=get('show-player').checked;showEditor=get('show-editor').checked;renderLayout();persistLayout();});
  get('seek').addEventListener('input',action(()=>draftTiming?player?.seekTo(Number(get('seek').value)*1000):seekRecording(Number(get('seek').value)*1000)));
  get('point-time').addEventListener('input',()=>{renderSelectedTime();renderTarget();});
  get('add-point').addEventListener('click',action(addPoint));
  get('apply-pasted-sync').addEventListener('click',()=>{
    try {
      if(!player || busy || AppState.media.returning || !AppState.playbackTimeline)throw new Error('Load a score and recording before applying sync points.');
      const text=get('sync-json').value.trim();
      if(text.length>1000000)throw new Error('Use at most 1 MB of sync-point JSON.');
      let data;try{data=JSON.parse(text);}catch{throw new Error('Paste a complete Soundslice sync-point JSON array.');}
      const next=soundslicePoints(data,AppState.playbackTimeline,player.backingTrackDuration),changed=JSON.stringify(next)!==JSON.stringify(points);
      edit(next);
      get('paste-status').textContent=changed?'Sync points applied. Review alignment; Undo restores the previous points. Save profile to keep changes.':'These sync points are already applied.';
    } catch(error) {get('paste-status').textContent=error.message;}
  });
  get('apply-time').addEventListener('click',()=>{if(player){selectTime(player.currentTime);message('Playhead time selected. Add or update the sync point to apply it.');}});
  for(const key of ['measure','beat'])get(key).addEventListener('change',()=>{
    try{if(!player)return;const index=targetIndex();if(index>=0)selectPoint(index,{preserveTime:true});else chooseGuide(Number(get('measure').value),Number(get('beat').value));}catch(error){selected=-1;sync();message(error.message);}
  });
  get('nudge-left').addEventListener('click',action(()=>nudge(-50)));
  get('nudge-right').addEventListener('click',action(()=>nudge(50)));
  get('move-scope').addEventListener('change',()=>{
    const stretch=get('move-scope').value==='stretch';
    if(stretch && sectionFirst===sectionLast && points.length>=2) {
      sectionFirst=Math.max(0,Math.min(selected,points.length-2));sectionLast=sectionFirst+1;
    } else if(get('move-scope').value==='section') {
      sectionFirst=Math.max(0,selected);sectionLast=Math.min(points.length-1,sectionFirst+1);
    }
    if(stretch && points.length)selectPoint(sectionFirst,{preserveTime:true});
    else if(selected<0 && points.length)selectPoint(0,{preserveTime:true});
    renderPoints();sync();
  });
  for(const key of ['section-first','section-last'])get(key).addEventListener('change',()=>{
    if(key==='section-first'){sectionFirst=Number(get(key).value);sectionLast=Math.max(sectionFirst,sectionLast);}
    else {sectionLast=Number(get(key).value);sectionFirst=Math.min(sectionFirst,sectionLast);}
    if(get('move-scope').value==='stretch' || selected<sectionFirst || selected>sectionLast)selectPoint(sectionFirst,{preserveTime:true});
    renderPoints();sync();
  });
  get('remove-point').addEventListener('click',action(()=>{edit(points.filter((_,index)=>index!==selected));selected=-1;renderPoints();sync();}));
  for(const key of ['undo','redo'])get(key).addEventListener('click',action(()=>{
    if(dragging)return;
    const from=key==='undo'?undo:redo,to=key==='undo'?redo:undo;if(!from.length)return;
    to.push(structuredClone(points));points=from.pop();selected=-1;dirty=true;host.applyMediaSyncPoints(points);renderPoints();sync();message('Alignment edited. Save profile to keep changes.');
  }));
  get('zoom-in').addEventListener('click',()=>changeZoom(zoom*1.2));
  get('zoom-out').addEventListener('click',()=>changeZoom(zoom/1.2));
  for(const key of ['timeline-zoom','zoom-fit'])get(key).addEventListener('click',()=>changeZoom(1));
  get('timeline').parentElement.addEventListener('scroll',()=>{
    if(timelineFrame)return;timelineFrame=requestAnimationFrame(()=>{timelineFrame=0;renderPoints(true);});
  });
  get('timeline').parentElement.addEventListener('wheel',()=>{lastTimelineInteraction=performance.now();},{passive:true});
  get('waveform').addEventListener('click',buildWaveform);
  get('timeline').addEventListener('keydown',event=>{if(dragging || !['ArrowLeft','ArrowRight'].includes(event.key) || selected<0)return;event.preventDefault();action(()=>nudge((event.key==='ArrowLeft'?-1:1)*(event.shiftKey?100:10)))();});
  get('timeline').addEventListener('pointerdown',event=>{
    lastTimelineInteraction=performance.now();
    if(event.button!==0 || !player || busy || dragging || AppState.media.returning)return;
    const marker=event.target.closest('[data-point]'),guide=event.target.closest('[data-guide]');
    if(!marker) {
      if(guide){
        if(timingPlan)action(()=>seekRecording(Number(guide.dataset.time)))();
        else {chooseGuide(Number(guide.dataset.guide),Number(guide.dataset.beat),{reveal:false});action(seekSelectedTarget)();}
      }
      else {const time=timeFromClientX(event.clientX,timelineRect(),player.backingTrackDuration);action(()=>seekRecording(time))();}
      return;
    }
    event.preventDefault();const index=Number(marker.dataset.point);selectPoint(index,{preserveTime:true});
    const range=movementRange(index);
    if(!range){
      const token=generation;
      action(async()=>{await seekSelectedTarget();if(token===generation)message(get('move-scope').value==='stretch'?'Choose two distinct endpoints and drag the first point to stretch the section.':'Choose a point inside the selected section to move it, or change Drag / nudge to Move one point.');})();
      return;
    }
    const timeline=get('timeline'),initialPoints=points,initial=structuredClone(points),token=generation;timeline.setPointerCapture(event.pointerId);
    dragging=true;const startX=event.clientX,startTime=initial[index].millisecondOffset,rect=timelineRect(),wasPlaying=AppState.isPlaying,previousTime=get('point-time').value;
    sync();
    const stretch=get('move-scope').value==='stretch';
    let nextTime=startTime,shift=0,requested=0,moved=false,preview=initial;
    const move=e=>{
      if(e.pointerId!==event.pointerId || token!==generation)return;
      if(!moved){if(Math.abs(e.clientX-startX)<3)return;moved=true;host.pauseMediaPlayback();player.pause();}
      requested=(e.clientX-startX)/rect.width*1024/1000*player.backingTrackDuration;
      ({shift,points:preview}=moveAnchors(initial,...range,requested,player.backingTrackDuration,stretch));
      nextTime=preview[index].millisecondOffset;selectTime(nextTime);
      for(let i=range[0];i<=range[1];i++)timeline.querySelector(`[data-point="${i}"]`)?.setAttribute('transform',`translate(${preview[i].millisecondOffset/player.backingTrackDuration*1000} 0)`);
    };
    const cleanup=()=>{dragging=false;cancelDrag=null;timeline.removeEventListener('pointermove',move);timeline.removeEventListener('pointerup',finish);timeline.removeEventListener('pointercancel',cancel);if(timeline.hasPointerCapture(event.pointerId))timeline.releasePointerCapture(event.pointerId);};
    const finish=e=>{
      if(e.pointerId!==event.pointerId)return;
      move(e);cleanup();
      if(token!==generation || initialPoints!==points){renderPoints();sync();return;}
      try {
        if(!moved){selectPoint(index,{preserveTime:true});action(seekSelectedTarget)();return;}
        if(shift)edit(preview);
        selectPoint(index);
        action(async()=>{await seekRecording(nextTime,{resume:wasPlaying});if(token===generation)movementMessage(shift,requested);})();
      } catch(error){message(error.message);renderPoints();}
      sync();
    };
    const cancel=()=>{cleanup();if(token===generation){get('point-time').value=previousTime;selectPoint(index,{preserveTime:true});}else {renderPoints();sync();}};
    cancelDrag=cleanup;
    timeline.addEventListener('pointermove',move);timeline.addEventListener('pointerup',finish);timeline.addEventListener('pointercancel',cancel);
  });
  get('save-profile').addEventListener('click',action(async()=>{
    if(draftTiming)throw new Error('Export the draft to keep unresolved work.');
    const snapshotHash=scoreHash,token=generation,snapshot=JSON.stringify(points),valid=timingPlan?null:validatePoints(points,AppState.playbackTimeline,player.backingTrackDuration);
    if(timingPlan)compileTimingPlan(timingPlan.plan,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:timingPlan.plan.recordingId,durationMs:player.backingTrackDuration});
    const name=get('profile-name').value.trim();if(!name)throw new Error('Enter a profile name.');
    const existing=profiles.find(profile=>profile.id===profileId);
    const profile={id:existing && sourceMatches(existing.source,source)?profileId:crypto.randomUUID(),scoreHash,scoreName:AppState.score.title || AppState.currentScoreFile.fileName,name,source,durationMs:player.backingTrackDuration,...(timingPlan?{timingPlan:timingPlan.plan}:{points:valid}),layout};
    await store.saveProfile(profile);if(snapshotHash!==scoreHash || token!==generation)return;profileId=profile.id;dirty=JSON.stringify(points)!==snapshot;await refreshProfiles();message(dirty?'Sync profile saved; newer alignment edits still need saving.':'Sync profile saved. Recordings are not copied into browser storage.');
  }));
  get('profile-select').addEventListener('change',action(async()=>{
    await returnToPractice();profileId=get('profile-select').value;
    const profile=profiles.find(p=>p.id===profileId);pendingProfile=profile || null;
    if(!profile){sync();return;}
    get('profile-name').value=profile.name;layout=profile.layout;persistLayout();renderLayout();
    if(player && sourceMatches(profile.source,source)){timingPlan=profile.timingPlan?compileSavedPlan(profile):null;points=timingPlan?[]:validatePoints(profile.points,AppState.playbackTimeline,player.backingTrackDuration);selected=-1;undo=[];redo=[];dirty=false;renderExplanationSummary();renderPoints();message('Saved alignment restored.');}
    else {disposal();points=[];get('source-kind').value=profile.source.kind;sourceControls();if(profile.source.kind==='url')get('url').value=profile.source.url;if(profile.source.kind==='youtube')get('url').value='https://www.youtube.com/watch?v='+profile.source.videoId;renderLayout();renderPoints();message(profile.source.kind==='local'?`Choose ${profile.source.fileName} again to restore this alignment.`:'Load the saved source to restore its alignment.');}
    sync();
  }));
  get('delete-profile').addEventListener('click',()=>confirmDelete(profileId));
  get('delete-cancel').addEventListener('click',()=>{pendingDelete=null;get('delete-confirm').hidden=true;});
  get('delete-confirm-button').addEventListener('click',action(async()=>{if(!pendingDelete)return;const id=pendingDelete;pendingDelete=null;get('delete-confirm').hidden=true;await store.deleteProfile(id);if(profileId===id)profileId='';if(pendingProfile?.id===id)pendingProfile=null;await refreshProfiles();message('Saved profile deleted; score, recording and current alignment kept.');}));
  get('profile-search').addEventListener('input',renderProfiles);
  get('export-profile').addEventListener('click',()=>download({format:MEDIA_PROFILE_FORMAT,version:profiles.some(p=>p.timingPlan)?2:1,profiles},'guitar-trainer-media-sync.json'));
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
    if(draftPreviewEnd!==null && time>=draftPreviewEnd)stopDraftPreview();
    if(draftTiming){draftEditor.update(time/1000,player.playing);const b=document.getElementById('play-pause-button');b.textContent=player.playing?'Pause editing preview':'Preview recording';b.setAttribute('aria-label',b.textContent);}
    get('clock').textContent=`${clock(time)} / ${clock(duration)}`;
    syncRecordingRegion();
    renderTarget(time);
    const seek=get('seek');
    if(document.activeElement!==seek || (player.playing && !seek.matches(':active')))seek.value=String(time/1000);
    const x=duration>0?time/duration*1000:0;playhead?.setAttribute('x1',x);playhead?.setAttribute('x2',x);
    if(showEditor && player.playing && !dragging && performance.now()-lastTimelineInteraction>1000) {
      const scroll=get('timeline').parentElement,position=(x+12)/1024*scroll.clientWidth*zoom;
      if(position<scroll.scrollLeft || position>scroll.scrollLeft+scroll.clientWidth)scroll.scrollLeft=Math.max(0,position-scroll.clientWidth/2);
    }
    if(AppState.media.preview && !AppState.media.returning) {
      host.updateMediaPosition(Math.min(time,duration-0.1),player.playing && !buffering);
    }
  },50);
  let timelineReadyPromise=Promise.resolve();
  function timelineReady() {
    if(!AppState.currentScoreFile || !AppState.playbackTimeline)return Promise.resolve();
    if(scoreBytes===AppState.currentScoreFile.bytes)return timelineReadyPromise;
    scoreBytes=AppState.currentScoreFile.bytes;const current=scoreBytes;
    timelineReadyPromise=(async()=>{
      // Selecting a recording changes its generation, not the score bytes.
      // Do not cache an abandoned hash promise for an otherwise current score.
      const hash=await fingerprint(current);if(current!==scoreBytes)return;scoreHash=hash;
      const select=get('measure');select.replaceChildren();
      AppState.playbackTimeline.measures.forEach((measure,index)=>select.append(new Option(`Measure ${printedMeasure(AppState.score,measure.measureNumber)}${measure.occurrence>1?` (repeat ${measure.occurrence})`:''}`,String(index))));
      await refreshProfiles();if(current!==scoreBytes)return;
      message('Score ready. Choose a recording or a saved profile.');sync();
    })();return timelineReadyPromise;
  }
  renderLayout();sourceControls();sync();refreshProfiles().catch(error=>message(error.message));
  return {sync,timelineReady,finishEditing,
    draftTransport(action){if(!draftTiming||!player)return false;if(action==='reset'){stopDraftPreview();player.seekTo(0);}else if(player.playing)stopDraftPreview();else{beforeEdit();draftPreviewEnd=player.backingTrackDuration;player.play();}return true;},
    draftTimingCapability:DRAFT_CAPABILITY,
    async importDraft(recording,input){
      const draft=validateDraft(input),score=AppState.currentScoreFile,initial=generation;
      await timelineReady();if(score!==AppState.currentScoreFile||initial!==generation)throw new Error('Draft import superseded.');
      checkDraftBinding(draft,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:recording.id});
      const token=generation+1;
      if(recording.kind==='local'){const file=recording.file;await loadRecording({kind:'local',label:file.name,fileName:file.name,size:file.size,lastModified:file.lastModified},file,{deferSelection:true});}
      else {const url=mediaUrl(recording.url),youtube=['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(new URL(url).hostname);await loadRecording(youtube?{kind:'youtube',videoId:youtubeId(url),label:recording.label}:{kind:'url',url,label:recording.label},null,{deferSelection:true});}
      if(token!==generation||score!==AppState.currentScoreFile||!player)throw new Error('Draft import superseded.');
      checkDraftBinding(draft,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId:recording.id});
      draftTiming=draft;points=[];timingPlan=null;profileId='';dirty=true;draftEditor.load(draft);openEditor();sync();message('Draft timing needs review. Recording grading is paused. Export draft to keep your work.');
      return {readyToPractice:false,draft:true};
    },async returnToPractice(){await returnToPractice();},
    captureRecording() {
      return source && player?{source:structuredClone(source),file:localFile,score:AppState.currentScoreFile}:null;
    },
    async importLesson(recording,syncPoints,{retained=null,timingWarning=null,rejectedSyncPoints=null,timingPlan:incomingPlan=null,recordingId=null}={}) {
      const score=AppState.currentScoreFile,initialGeneration=generation;
      await timelineReady();
      if(score!==AppState.currentScoreFile || initialGeneration!==generation)throw new Error('Lesson import was superseded by a score/source change.');
      const expectedTimeline=AppState.playbackTimeline,expectedTimelineKey=lessonTimelineKey(expectedTimeline);
      if(expectedTimelineKey===null)throw new Error('The score playback timeline is not ready.');
      if(incomingPlan) {
        if(syncPoints || retained || !recording)throw new Error('A timing plan needs its selected recording and cannot use legacy timing.');
        compileTimingPlan(incomingPlan,{timeline:expectedTimeline,scoreSha256:scoreHash,recordingId});
        openEditor();
      }
      // Timing incompatibility must not prevent an otherwise valid recording load.
      // Lifecycle, URL, native score and media errors remain hard failures below.
      let imported=null,checked=null;
      if(syncPoints && !timingWarning) {
        try {imported=soundslicePoints(syncPoints,expectedTimeline);}
        catch(error){timingWarning=error.message;}
      }
      if(!recording && !retained && !player)throw new Error('Load a recording before sending timing alone.');
      const replacing=Boolean(recording || retained),loadGeneration=generation+(replacing?1:0);
      if(recording?.kind==='local') {
        const file=recording.file;
        await loadRecording({kind:'local',label:file.name,fileName:file.name,size:file.size,lastModified:file.lastModified},file,{deferSelection:Boolean(incomingPlan)});
      } else if(recording) {
        const url=mediaUrl(recording.url),hostName=new URL(url).hostname;
        const isYoutube=['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(hostName);
        await loadRecording(isYoutube?{kind:'youtube',videoId:youtubeId(url),label:recording.label}:{kind:'url',url,label:recording.label},null,{deferSelection:Boolean(incomingPlan)});
      } else if(retained) {
        if(retained.source.kind==='embedded')throw new Error('Embedded backing audio cannot be retained across a score replacement. Choose a recording link instead.');
        await loadRecording(retained.source,retained.file);
      }
      const checkImport=()=>{
        if(generation!==loadGeneration || score!==AppState.currentScoreFile || !player)throw new Error('Lesson import was superseded by a score/source change.');
        if(lessonTimelineKey(AppState.playbackTimeline)!==expectedTimelineKey)throw new Error('Lesson import stopped because the score playback timeline changed. Prepare and send the lesson again.');
      };
      checkImport();
      if(incomingPlan) {
        timingPlan=compileTimingPlan(incomingPlan,{timeline:AppState.playbackTimeline,scoreSha256:scoreHash,recordingId,durationMs:player.backingTrackDuration});
        points=[];profileId='';dirty=true;undo=[];redo=[];selected=-1;renderExplanationSummary();renderPoints();
        const importedPlan=timingPlan;
        await selectRecording();checkImport();
        if(!AppState.media.preview || AppState.media.returning || AppState.media.timingPlan!==importedPlan)
          throw new Error('Recording selection changed before imported timing was activated. Choose Recording to retry.');
        finishEditing();sync();
        message(incomingPlan.format===INTERVAL_TIMING_FORMAT?'Matched timing ready. Recording breaks pause grading; reviewed repeats and verified silent score omissions are skipped. Press Play to begin. Saving is optional.':'Explanation timing ready. Breaks pause grading; extra repeat visits shown in review are skipped. Press Play to begin. Saving is optional.');
        return {readyToPractice:true,timingWarning:null};
      }
      if(imported) {
        try {checked=validatePoints(imported,AppState.playbackTimeline,player.backingTrackDuration);}
        catch(error){timingWarning=error.message;}
      }
      openEditor();
      if(checked && !replacing)edit(checked);
      else if(checked) {
        // Loading already selected Recording with its provisional alignment.
        // Publish imported anchors to that active native player as well as the editor.
        host.applyMediaSyncPoints(checked);
        profileId='';points=checked;dirty=true;undo=[];redo=[];selected=-1;
        get('profile-name').value=recording?.label || retained?.source.label || 'Imported alignment';renderPoints();sync();
      }
      if(replacing)await selectRecording();
      checkImport();
      if(checked)finishEditing();
      if(timingWarning) {
        const evidence=rejectedSyncPoints ?? syncPoints;
        get('sync-json').value=evidence?JSON.stringify(evidence):'';
        get('paste-sync').open=true;
        get('paste-status').textContent=`Imported timing was not applied: ${timingWarning}${evidence?' Original timing is kept here for reference.':''}`;
        message(`Score and recording are loaded. Imported timing was not applied: ${timingWarning} ${replacing?'Review the alignment manually':'Existing alignment is unchanged; review it in the editor'}, then Save profile.`);
      } else message(checked?'Lesson ready. Press Play to practice. Save profile to keep the imported alignment.':'Recording loaded. Align it manually, then Save profile.');
      return {readyToPractice:Boolean(checked),timingWarning};
    },
    setVolume(percent){
      if(!Number.isFinite(percent) || percent<0 || percent>100)return false;
      AppState.audio.mediaPercent=percent;
      if(player && !busy)player.masterVolume=AppState.media.preview && AppState.mode==='wait' && !AppState.media.editing?0:percent/100;
      return true;
    },
    scoreLoading(){generation++;disposal();points=[];undo=[];redo=[];scoreBytes=null;scoreHash='';profileId='';pendingProfile=null;selected=-1;busy=false;dirty=false;renderPoints();renderLayout();sync();},
    mediaChanged(){sync();if(!AppState.media.preview)afterPractice();},
    scoreTargetSelected({measureIndex,barPosition}){
      if(!showEditor || !player || busy)return;
      seekGeneration++; // A native score click supersedes an unfinished timeline seek.
      const measure=AppState.playbackTimeline?.measures[measureIndex];if(!measure)return;
      const beat=1+barPosition*AppState.score.masterBars[measure.measureNumber-1].timeSignatureNumerator;
      chooseGuide(measureIndex,beat,{reveal:false});renderPoints();
      const guide=projectedGuides.find(g=>g.measureIndex===measureIndex && g.beat===beat);
      if(guide && player.backingTrackDuration>0) {
        const scroll=get('timeline').parentElement;
        const x=(12+guide.millisecondOffset/player.backingTrackDuration*1000)/1024*scroll.clientWidth*zoom;
        if(x<scroll.scrollLeft || x>scroll.scrollLeft+scroll.clientWidth)scroll.scrollLeft=Math.max(0,x-scroll.clientWidth/2);
        lastTimelineInteraction=performance.now();renderPoints(true);
      }
    },
    get dirty(){return dirty;},
    explanationTimingCapability:'explanation-timing-v1',
    scoreTimingMatchCapability:'score-timing-match-v1',
  };
}
