// SPDX-License-Identifier: AGPL-3.0-or-later
import {scanPage} from './scanner.js';
import {discoverResources, displayUrl, displayLabel, readSyncPoints, redirectDestination,webUrl,youtubeVideoId} from './discovery.js';
import {appAddress,appPath,fetchBytes,base64Bytes,deliverLesson,checkScoreBytes} from './transfer.js';
const get = id => document.getElementById(id);
function element(tag, text) { const node=document.createElement(tag); node.textContent=text; return node; }
let scanned=null,candidates=[];
const defaultAppAddress='https://ztbishop.github.io/guitar-trainer-studio/index.html';
get('app-address').value=defaultAppAddress;
let addressEdited=false;
chrome.storage.local.get('appAddress').then(saved=>{
  if(addressEdited)return;
  try{get('app-address').value=appAddress(saved.appAddress || defaultAppAddress).href;}catch{get('app-address').value=defaultAppAddress;}
}).catch(()=>{});
get('app-address').addEventListener('input',()=>{
  addressEdited=true;let value;
  try{value=appAddress(get('app-address').value.trim()).href;}catch{return;}
  chrome.storage.local.set({appAddress:value}).catch(()=>{get('send-status').textContent='The address could not be saved. You can still enter it for this session.';});
});
function choices(id,kind) {
  const select=get(id);select.replaceChildren();
  select.append(new Option(id==='score'?'Use score already loaded':id==='recording'?'No new recording (keep it if keeping score)':'No new timing (keep only if score/recording unchanged)',''));
  if(id==='recording')select.append(new Option('Keep current recording even with a new score','keep'));
  candidates.forEach((candidate,index)=>{
    if((!get('manual-mode').checked && candidate.kind!==kind) || (id==='recording' && /Download.*mp3/i.test(candidate.label) && !get('manual-mode').checked))return;
    select.append(new Option(`${candidate.fileName || candidate.detail} · ${candidate.origin}`,String(index)));
  });
  select.append(new Option(id==='timing'?'Paste timing JSON or URL':'Paste a URL','custom'));
  const preferred=id==='score'?candidates.findIndex(c=>c.kind==='Score'):id==='timing'?candidates.findIndex(c=>c.kind==='Timing'):
    [candidates.findIndex(c=>c.kind==='Recording' && /\.mp4$/i.test(c.fileName)),candidates.findIndex(c=>c.kind==='Recording' && youtubeVideoId(c.url)),candidates.findIndex(c=>c.kind==='Recording' && /m3u8|mpd/i.test(c.fileName))].find(i=>i>=0);
  if(preferred>=0)select.value=String(preferred);
}
function fields() {
  for(const role of ['score','recording','timing'])get(role==='timing'?'timing-text-label':role+'-url-label').hidden=get(role).value!=='custom';
  get('score-name-label').hidden=get('score').value==='';
  const candidate=candidates[Number(get('score').value)];
  if(get('score').value!=='' && get('score').value!=='custom')get('score-name').value=candidate?.fileName || 'lesson.gp5';
  if(get('score').value==='custom' && !get('score-name').value)get('score-name').value='lesson.gp5';
}
for(const role of ['score','recording','timing'])get(role).addEventListener('change',()=>{
  fields();get('test-'+role+'-status').textContent='';
  if(role==='recording')clearPreview();
});
get('manual-mode').addEventListener('change',()=>{
  for(const [role,kind] of [['score','Score'],['recording','Recording'],['timing','Timing']]) {
    const previous=get(role).value;choices(role,kind);if([...get(role).options].some(o=>o.value===previous))get(role).value=previous;
  }fields();
});
function selected(role) {
  const value=get(role).value;if(value==='' || value==='keep')return null;
  const text=role==='timing'?get('timing-text').value.trim():get(role+'-url').value.trim();
  if(text.length>1000000)throw new Error('Use at most 1 MB of timing JSON.');
  if(value==='custom' && role==='timing' && text.startsWith('[')) {
    try{return {points:readSyncPoints(JSON.parse(text)).map(p=>[p.bar,p.seconds,p.position,p.hide])};}catch{throw new Error('Paste a complete valid Soundslice timing array.');}
  }
  const url=value==='custom'?webUrl(text):candidates[Number(value)]?.url;
  if(!url)throw new Error(`Choose or paste a valid ${role} URL.`);
  return {url,fileName:role==='score'?get('score-name').value.trim():null};
}
async function allow(urls) {
  const origins=[...new Set(urls.filter(Boolean).map(value=>`${new URL(value).origin}/*`))];
  if(!origins.length)return;
  if(!await chrome.permissions.request({origins}))throw new Error('Site access was declined. Nothing was sent.');
}
async function timingData(selection) {
  if(!selection)return null;if(selection.points)return selection.points;
  const text=new TextDecoder().decode(await fetchBytes(selection.url,1000000));
  let data;try{data=JSON.parse(text);}catch{throw new Error('The timing response is not JSON.');}
  return readSyncPoints(data).map(p=>[p.bar,p.seconds,p.position,p.hide]);
}
function clearPreview() {
  get('recording-preview').querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
  get('recording-preview').replaceChildren();
}
for(const role of ['score','recording','timing'])get('test-'+role).addEventListener('click',async()=>{
  const button=get('test-'+role),status=get('test-'+role+'-status');button.disabled=true;status.textContent='Checking…';
  try {
    const selection=selected(role);if(!selection)throw new Error('This choice keeps an existing item; select a resource to test it.');
    if(role==='recording') {
      clearPreview();const id=youtubeVideoId(selection.url);
      if(id){const frame=element('iframe','');frame.src=`https://www.youtube-nocookie.com/embed/${id}`;frame.title='Selected YouTube preview';frame.allow='fullscreen';get('recording-preview').append(frame);status.textContent='YouTube preview opened. Press its Play button to test.';}
      else {
        const video=element('video','');video.controls=true;video.preload='metadata';video.src=selection.url;
        video.addEventListener('loadedmetadata',()=>{if(video.isConnected)status.textContent=`Recording metadata loaded (${Number.isFinite(video.duration)?video.duration.toFixed(1)+' seconds':'unknown duration'}). Press Play to test playback.`;},{once:true});
        video.addEventListener('error',()=>{if(video.isConnected)status.textContent='Preview could not load. Check access/expiry or choose an MP4 source; streaming support varies.';},{once:true});
        get('recording-preview').append(video);status.textContent='Loading preview metadata; playback will not start automatically.';
      }
    } else {
      await allow([selection.url,role==='score' && selection.url?redirectDestination(selection.url):null]);
      if(role==='score')status.textContent=checkScoreBytes(await fetchBytes(selection.url,12*1024*1024),selection.fileName);
      else {const points=await timingData(selection);status.textContent=`${points.length} timing points checked. They still need to match the score and recording in Guitar Trainer.`;}
    }
  } catch(error){status.textContent=error.message || 'This resource could not be tested.';}finally{button.disabled=false;}
});
const sendButtons=[get('send'),get('send-top')];
function disableSend(disabled){sendButtons.forEach(button=>{button.disabled=disabled;});}
async function sendLesson(){
  if(!scanned || get('scan').disabled)return;
  clearPreview();
  disableSend(true);get('scan').disabled=true;get('send-status').textContent='Preparing selected lesson…';
  try {
    const target=appAddress(get('app-address').value.trim()),score=selected('score'),recording=selected('recording'),timing=selected('timing');
    if(!score && !recording && !timing)throw new Error('Select a score, recording or timing update.');
    const urls=[target.href,score?.url,score?redirectDestination(score.url):null,timing?.url].filter(Boolean);
    // Call immediately in this click gesture, before fetching anything.
    await allow(urls);
    const tabs=await chrome.tabs.query({url:`${target.origin}/*`});
    const matches=tabs.filter(tab=>{try{const url=new URL(tab.url);return url.origin===target.origin && appPath(url)===appPath(target);}catch{return false;}});
    if(matches.length!==1)throw new Error(matches.length?'More than one matching app tab is open. Keep one open and try again.':'Open Guitar Trainer at the address above, then try again.');
    await chrome.storage.local.set({appAddress:target.href});
    let scoreData=null;
    if(score){const bytes=await fetchBytes(score.url,12*1024*1024);checkScoreBytes(bytes,score.fileName);scoreData={fileName:score.fileName,base64:base64Bytes(bytes)};}
    const payload={format:'gts-lesson',version:2,title:scanned.title,lessonUrl:scanned.page,score:scoreData,
      recording:recording?{url:recording.url,label:scanned.title}:null,syncPoints:await timingData(timing),keepRecording:get('recording').value==='keep' || (!score && !recording)};
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:matches[0].id},func:deliverLesson,args:[payload]});
    if(!result?.ok)throw new Error(result?.message || 'The app could not receive this lesson.');
    get('send-status').textContent='Sent. Review the import in Guitar Trainer.';
    await chrome.tabs.update(matches[0].id,{active:true});
  } catch(error) {get('send-status').textContent=error.name==='TypeError' || error.name==='TimeoutError'?'A resource could not be retrieved. Sign in, rescan and check the app address.':error.message;}
  finally {disableSend(false);get('scan').disabled=false;}
}
sendButtons.forEach(button=>button.addEventListener('click',sendLesson));

async function inspectTiming(candidate, button, article) {
  button.disabled=true;
  article.querySelector('.timing-copy')?.remove();
  const output=article.querySelector('pre') || article.appendChild(element('pre',''));
  try {
    const url=new URL(candidate.url);
    if (url.protocol !== 'https:') throw new Error('Timing inspection requires an HTTPS source.');
    const granted=await chrome.permissions.request({origins:[`${url.origin}/*`]});
    if (!granted) throw new Error('Site access was declined. You can still review the discovered link.');
    output.textContent='Reading timing…';
    const text=new TextDecoder().decode(await fetchBytes(url.href,1000000,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)}));
    let points;
    try { points=readSyncPoints(JSON.parse(text)); }
    catch { throw new Error('This response is not a supported Soundslice timing array.'); }
    output.textContent=`${points.length} valid timing points. Playback bars start at 0; within-bar positions use 0–480.\n`+
      points.slice(0,12).map(p=>`Bar ${p.bar} · ${p.seconds.toFixed(3)} s · position ${p.position}${p.hide?' · playhead hidden':''}`).join('\n')+
      (points.length>12?'\n…preview limited to 12 points.':'')+'\nNot yet matched to a Guitar Pro score or imported.';
    const controls=element('div','');controls.className='timing-copy';
    const label=element('label','Complete sync points (JSON)'),field=element('textarea','');
    field.readOnly=true;field.rows=4;field.value=JSON.stringify(points.map(p=>[p.bar,p.seconds,p.position,p.hide]));label.append(field);
    const copy=element('button','Copy sync points'),copied=element('p','');copied.setAttribute('role','status');
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(field.value);copied.textContent='Copied. In Guitar Trainer, load the score and recording, then open Media Sync → Paste sync points.';}
      catch{field.focus();field.select();copied.textContent='Copy was blocked. The full JSON is selected; press Ctrl+C (Command+C on Mac).';}
    });
    controls.append(label,copy,copied);article.append(controls);
  } catch (error) {
    output.textContent=error.name==='TypeError' || error.name==='TimeoutError' ? 'Timing could not be retrieved. The host may require sign-in, redirect elsewhere or block access.' : error.message;
  } finally { button.disabled=false; }
}

get('scan').addEventListener('click',async()=>{
  clearPreview();
  disableSend(true);
  get('scan').disabled=true; get('results').replaceChildren(); get('notices').replaceChildren();
  get('transfer').hidden=true;scanned=null;candidates=[];get('send-status').textContent='';
  get('status').textContent='Scanning the open page…';
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw new Error('Open a normal HTTP or HTTPS lesson page first. Chrome internal pages cannot be scanned.');
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanPage});
    scanned=result;candidates=discoverResources(result.raw,result.page,{includeOther:true});
    choices('score','Score');choices('recording','Recording');choices('timing','Timing');
    fields();get('transfer').hidden=false;
    get('status').textContent=`${result.title || 'Page'}: ${candidates.length} candidate${candidates.length===1?'':'s'} found.`;
    for (const notice of result.notices) get('notices').append(element('li',notice));
    if (!candidates.length) get('results').append(element('p','No supported resources were exposed. Start the player, reveal download links and scan again.'));
    for (const candidate of candidates) {
      const article=element('article','');
      article.append(element('h2',`${candidate.kind} · ${candidate.detail}`));
      if (candidate.label) article.append(element('p',displayLabel(candidate.label)));
      article.append(element('code',displayUrl(candidate.url)),element('p',`Found in: ${candidate.origin}`));
      const copyLink=element('button','Copy link'),linkStatus=element('p','');linkStatus.setAttribute('role','status');
      copyLink.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(candidate.url);linkStatus.textContent='Full asset link copied.';}
        catch{
          let field=article.querySelector('.asset-link-copy');
          if(!field){field=element('textarea','');field.className='asset-link-copy';field.readOnly=true;field.rows=3;field.setAttribute('aria-label','Full asset link');field.value=candidate.url;copyLink.after(field);}
          field.focus();field.select();linkStatus.textContent='Copy was blocked. The full link is selected; press Ctrl+C (Command+C on Mac).';
        }
      });
      article.append(copyLink,linkStatus);
      if (candidate.kind==='Timing') {
        const button=element('button','Inspect timing');
        button.addEventListener('click',()=>inspectTiming(candidate,button,article)); article.append(button);
      }
      get('results').append(article);
    }
  } catch (error) {
    get('status').textContent=error.message.includes('Open a normal') ? error.message : 'Chrome could not scan this page. Refresh the lesson, reopen Lesson Bridge and try again. Protected pages may not allow scanning.';
  } finally { get('scan').disabled=false;disableSend(!scanned); }
});
