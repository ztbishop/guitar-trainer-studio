// Browser/provider playback only. The host consumes this public handler shape.
export function htmlMediaPlayer(element,url,{onState=()=>{},onError=()=>{}}={}) {
  let destroyed=false,cancelReady=()=>{},playGeneration=0,pendingSeek=null;
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Recording did not load. Check the link, access and browser format support.')),20000);
    const cleanup=()=>{clearTimeout(timer);element.removeEventListener('loadedmetadata',loaded);element.removeEventListener('loadeddata',loaded);element.removeEventListener('error',failed);};
    const loaded=()=>{if(!Number.isFinite(element.duration) || element.duration<=0){cleanup();reject(new Error('Choose a finite recording, rather than a live stream.'));return;}if(element.readyState<2)return;cleanup();resolve();};
    const failed=()=>{cleanup();reject(new Error('This recording could not be played. Check its format and access.'));};
    cancelReady=()=>{cleanup();reject(new Error('Recording load cancelled.'));};
    element.addEventListener('loadedmetadata',loaded);
    element.addEventListener('loadeddata',loaded);
    element.addEventListener('error',failed,{once:true});
  });
  const state=()=>{if(!destroyed)onState(element.ended?'ended':element.paused?'paused':element.readyState<3?'buffering':'playing');};
  const rateChanged=()=>{if(!destroyed)onState('ratechange');};element.addEventListener('ratechange',rateChanged);
  const seek=(target)=>{if(Math.abs(element.currentTime-target)>0.000001)element.currentTime=target;};
  const seeked=()=>{
    if(destroyed)return;
    if(pendingSeek!==null){const target=pendingSeek;pendingSeek=null;seek(target);if(element.seeking)return;}
    state();
  };
  element.addEventListener('seeked',seeked);
  for(const type of ['playing','pause','waiting','ended'])element.addEventListener(type,state);
  const error=()=>{if(!destroyed)onError(new Error('Recording playback failed.'));};element.addEventListener('error',error);
  element.preload='auto';element.controls=false;element.playsInline=true;element.src=url;element.load();
  return {
    ready,
    get backingTrackDuration(){return Number.isFinite(element.duration)?element.duration*1000:0;},
    get currentTime(){return element.currentTime*1000;},
    get playing(){return !element.paused && !element.ended;},
    get playbackRate(){return element.playbackRate;},set playbackRate(value){element.playbackRate=value;},
    get masterVolume(){return element.volume;},set masterVolume(value){element.volume=value;},
    seekTo(ms){const target=Math.max(0,Math.min(element.duration || 0,ms/1000));if(element.seeking)pendingSeek=target;else seek(target);},
    play(){const token=++playGeneration;element.play().catch(err=>{if(!destroyed && token===playGeneration)onError(err);});},
    pause(){playGeneration++;element.pause();},
    destroy(){destroyed=true;pendingSeek=null;cancelReady();element.pause();for(const type of ['playing','pause','waiting','ended'])element.removeEventListener(type,state);element.removeEventListener('seeked',seeked);element.removeEventListener('ratechange',rateChanged);element.removeEventListener('error',error);element.removeAttribute('src');element.load();},
  };
}

let youtubeApiPromise=null;
function loadYoutubeApi() {
  if(globalThis.YT?.Player)return Promise.resolve();
  if(!youtubeApiPromise)youtubeApiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
    const previous=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>{youtubeApiPromise=null;reject(new Error('YouTube did not load. Check internet access or browser blocking.'));},20000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve();};
    script.onerror=()=>{clearTimeout(timer);youtubeApiPromise=null;reject(new Error('Could not load YouTube.'));};document.head.append(script);
  });
  return youtubeApiPromise;
}
export async function youtubeMediaPlayer(container,videoId,{onState=()=>{},onError=()=>{},isCurrent=()=>true}={}) {
  await loadYoutubeApi();
  if(!isCurrent())throw new Error('Recording load cancelled.');
  let player,destroyed=false,pauseAfterSeek=false,cancelReady=()=>{},durationMs=0;
  const ready=new Promise((resolve,reject)=>{
    const target=document.createElement('div');container.replaceChildren(target);
    const timer=setTimeout(()=>reject(new Error('YouTube video did not become ready.')),20000);
    cancelReady=()=>{clearTimeout(timer);reject(new Error('Recording load cancelled.'));};
    player=new YT.Player(target,{host:'https://www.youtube-nocookie.com',videoId,width:'100%',height:'100%',
      playerVars:{autoplay:0,playsinline:1,controls:1,origin:location.origin},
      events:{onReady(){clearTimeout(timer);resolve();},onStateChange(event){
        if(destroyed)return;
        if(event.data===1 && pauseAfterSeek){pauseAfterSeek=false;player.pauseVideo();onState('paused');return;}
        onState(({0:'ended',1:'playing',2:'paused',3:'buffering',5:'cued'})[event.data] || 'paused');
      },onPlaybackRateChange(){if(!destroyed)onState('ratechange');},onError(event){if(destroyed)return;clearTimeout(timer);const error=new Error(`YouTube cannot play this video (code ${event.data}). It may disallow embedding or require sign-in.`);reject(error);onError(error);}},
    });
  });
  ready.catch(()=>{}); // A superseded source can be discarded before awaiting ready.
  const handler={ready,
    // YouTube can refine its rounded duration after playback starts. Keep the
    // editor's coordinate system stable across sub-second metadata changes;
    // otherwise its untouched End anchor can invalidate an edit to Start.
    get backingTrackDuration(){
      const next=(player.getDuration?.() || 0)*1000;
      if(Number.isFinite(next) && next>0 && (!durationMs || Math.abs(next-durationMs)>1000))durationMs=next;
      return durationMs;
    },
    get currentTime(){return (player.getCurrentTime?.() || 0)*1000;},
    get playing(){return player.getPlayerState?.()===1;},
    get playbackRate(){return player.getPlaybackRate() || 1;},
    set playbackRate(value){const supported=player.getAvailablePlaybackRates();if(!supported.includes(value))throw new Error(`This YouTube video supports speeds: ${supported.join(', ')}.`);player.setPlaybackRate(value);},
    get masterVolume(){return (player.isMuted()?0:player.getVolume())/100;},set masterVolume(value){player.setVolume(value*100);if(value>0)player.unMute();},
    seekTo(ms){const seconds=Math.max(0,ms/1000);if(![1,2].includes(player.getPlayerState())){pauseAfterSeek=true;player.mute();}player.seekTo(seconds,true);},
    play(){pauseAfterSeek=false;player.playVideo();},pause(){player.pauseVideo();},
    destroy(){destroyed=true;cancelReady();player.destroy();},
  };
  return handler;
}

// Waveforms are optional and never stored in profiles. The editor requests a
// detailed envelope, then draws only visible columns at the current zoom.
export async function waveformPeaks(file,bins=1800) {
  if(file.size>80*1024*1024)throw new Error('This recording exceeds 80 MB. Use the time/marker editor; waveform generation is optional.');
  const context=new AudioContext();
  try {
    const audio=await context.decodeAudioData(await file.arrayBuffer());
    const channels=Array.from({length:audio.numberOfChannels},(_,index)=>audio.getChannelData(index)),samples=channels[0],step=Math.max(1,Math.ceil(samples.length/bins));
    const peaks=[];for(let start=0;start<samples.length;start+=step) {
      let peak=0;for(const channel of channels)for(let i=start;i<Math.min(start+step,samples.length);i++)peak=Math.max(peak,Math.abs(channel[i]));peaks.push(peak);
    }
    return peaks;
  } finally {await context.close();}
}
