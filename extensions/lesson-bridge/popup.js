// SPDX-License-Identifier: AGPL-3.0-or-later
import {scanPage} from './scanner.js';
import {discoverResources, displayUrl, displayLabel, readSyncPoints, redirectDestination} from './discovery.js';
import {appAddress,appPath,fetchBytes,base64Bytes,deliverLesson} from './transfer.js';
const get = id => document.getElementById(id);
function element(tag, text) { const node=document.createElement(tag); node.textContent=text; return node; }
let scanned=null,candidates=[];
get('recording').addEventListener('change',()=>{get('timing').disabled=get('recording').value==='';});
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
function choices(id,kind,optional=false) {
  const select=get(id);select.replaceChildren();
  if(optional)select.append(new Option('None',''));
  candidates.forEach((candidate,index)=>{
    if(candidate.kind!==kind || (id==='recording' && /Download.*mp3/i.test(candidate.label)))return;
    select.append(new Option(`${candidate.fileName || candidate.detail} · ${candidate.origin}`,String(index)));
  });
  if(optional) {
    const preferred=candidates.findIndex(c=>c.kind===kind && (kind==='Timing' || /\.mp4$/i.test(c.fileName)));
    if(preferred>=0)select.value=String(preferred);
  }
}
get('send').addEventListener('click',async()=>{
  get('send').disabled=get('scan').disabled=true;get('send-status').textContent='Preparing selected lesson…';
  try {
    const target=appAddress(get('app-address').value.trim()),score=candidates[Number(get('score').value)];
    const recording=get('recording').value===''?null:candidates[Number(get('recording').value)];
    const timing=recording && get('timing').value!==''?candidates[Number(get('timing').value)]:null;
    if(!score || score.kind!=='Score')throw new Error('Select a supported score first.');
    if(!/\.(gp[3-5]?|gpx|xml|musicxml|mxl)$/i.test(score.fileName))throw new Error('This score link has no verified supported filename. Choose a Guitar Pro or MusicXML download.');
    const urls=[target.href,score.url,redirectDestination(score.url),timing?.url].filter(Boolean);
    const origins=[...new Set(urls.map(value=>`${new URL(value).origin}/*`))];
    // Call immediately in this click gesture, before fetching anything.
    if(!await chrome.permissions.request({origins}))throw new Error('Site access was declined. Nothing was sent.');
    const tabs=await chrome.tabs.query({url:`${target.origin}/*`});
    const matches=tabs.filter(tab=>{try{const url=new URL(tab.url);return url.origin===target.origin && appPath(url)===appPath(target);}catch{return false;}});
    if(matches.length!==1)throw new Error(matches.length?'More than one matching app tab is open. Keep one open and try again.':'Open Guitar Trainer at the address above, then try again.');
    await chrome.storage.local.set({appAddress:target.href});
    const bytes=await fetchBytes(score.url,12*1024*1024);
    let syncPoints=null;
    if(timing) {
      const text=new TextDecoder().decode(await fetchBytes(timing.url,1000000));
      let data;try{data=JSON.parse(text);}catch{throw new Error('The selected timing response is not JSON. Rescan and choose another timing source.');}
      syncPoints=readSyncPoints(data).map(p=>[p.bar,p.seconds,p.position,p.hide]);
    }
    const payload={format:'gts-lesson',version:1,title:scanned.title,lessonUrl:scanned.page,
      score:{fileName:score.fileName || `lesson.${score.detail.toLowerCase()}`,base64:base64Bytes(bytes)},
      recording:recording?{url:recording.url,label:scanned.title}:null,syncPoints};
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:matches[0].id},func:deliverLesson,args:[payload]});
    if(!result?.ok)throw new Error(result?.message || 'The app could not receive this lesson.');
    get('send-status').textContent='Sent. Review the import in Guitar Trainer.';
    await chrome.tabs.update(matches[0].id,{active:true});
  } catch(error) {get('send-status').textContent=error.name==='TypeError' || error.name==='TimeoutError'?'A resource could not be retrieved. Sign in, rescan and check the app address.':error.message;}
  finally {get('send').disabled=get('scan').disabled=false;}
});

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
    const response=await fetch(url.href,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('The timing source could not be read. Its link may have expired or require sign-in.');
    const text=await response.text();
    if (text.length>1000000) throw new Error('Timing response is too large.');
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
  get('scan').disabled=true; get('results').replaceChildren(); get('notices').replaceChildren();
  get('transfer').hidden=true;scanned=null;candidates=[];get('send-status').textContent='';
  get('status').textContent='Scanning the open page…';
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw new Error('Open a normal HTTP or HTTPS lesson page first. Chrome internal pages cannot be scanned.');
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanPage});
    scanned=result;candidates=discoverResources(result.raw,result.page);
    choices('score','Score');choices('recording','Recording',true);choices('timing','Timing',true);
    get('timing').disabled=get('recording').value==='';
    get('transfer').hidden=!candidates.some(c=>c.kind==='Score');
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
  } finally { get('scan').disabled=false; }
});
