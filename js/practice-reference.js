// SPDX-License-Identifier: AGPL-3.0-or-later
// Independent reference recording: never calls score transport, sync or grading.
import {mediaUrl,youtubeId} from './media-sync.js';
import {htmlMediaPlayer,youtubeMediaPlayer} from './media-player.js';
export function initPracticeReference(){
 const panel=document.createElement('section');panel.id='practice-reference-panel';panel.className='panel';panel.style.padding='16px';panel.hidden=true;panel.setAttribute('aria-label','Independent reference recording');
 const heading=document.createElement('h2');heading.textContent='Reference recording — not synchronized';
 const help=document.createElement('p');help.textContent='Use these recording controls independently. Score Play, Wait, loops and grading follow the score alone; video seeking does not move the score.';
 const video=document.createElement('video');video.id='practice-reference-video';video.playsInline=true;video.preload='metadata';video.controls=true;video.style.cssText='width:100%;max-height:360px;background:#000';
 const youtube=document.createElement('div');youtube.id='practice-reference-youtube';youtube.hidden=true;youtube.style.height='360px';
 const status=document.createElement('p');status.id='practice-reference-status';status.setAttribute('role','status');
 const close=document.createElement('button');close.type='button';close.id='practice-reference-close';close.textContent='Unload reference recording';
 panel.append(heading,help,video,youtube,status,close);document.getElementById('media-workspace').after(panel);
 let generation=0,player=null,blobUrl=null;
 function clear(){generation++;player?.destroy();player=null;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;panel.hidden=true;youtube.replaceChildren();youtube.hidden=true;youtube.style.height='360px';video.hidden=false;status.textContent='';}
 close.addEventListener('click',clear);
 async function load(recording){clear();const token=generation;panel.hidden=false;status.textContent='Loading independent reference recording…';
  try{const events={isCurrent:()=>token===generation,onState(){},onError(e){if(token===generation)status.textContent='Reference playback failed: '+e.message;}};
   if(recording.kind==='local'){blobUrl=URL.createObjectURL(recording.file);player=htmlMediaPlayer(video,blobUrl,events);}
   else{const url=mediaUrl(recording.url),host=new URL(url).hostname;if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){video.hidden=true;youtube.hidden=false;const created=await youtubeMediaPlayer(youtube,youtubeId(url),events);if(token!==generation){created.destroy();return;}player=created;}else player=htmlMediaPlayer(video,url,events);}
   video.controls=true;video.autoplay=false;
   await player.ready;if(token!==generation)return;player.pause();status.textContent='Ready as an unsynchronized reference. Nothing plays or saves automatically.';
  }catch(e){if(token===generation){clear();throw e;}}
 }
 return {capability:'reference-only-v1',load,clear};
}
