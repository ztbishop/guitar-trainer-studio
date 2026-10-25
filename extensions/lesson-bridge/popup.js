// SPDX-License-Identifier: AGPL-3.0-or-later
import {scanPage} from './scanner.js';
import {discoverResources, displayUrl, displayLabel, readSyncPoints} from './discovery.js';
const get = id => document.getElementById(id);
function element(tag, text) { const node=document.createElement(tag); node.textContent=text; return node; }

async function inspectTiming(candidate, button, article) {
  button.disabled=true;
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
  } catch (error) {
    output.textContent=error.name==='TypeError' || error.name==='TimeoutError' ? 'Timing could not be retrieved. The host may require sign-in, redirect elsewhere or block access.' : error.message;
  } finally { button.disabled=false; }
}

get('scan').addEventListener('click',async()=>{
  get('scan').disabled=true; get('results').replaceChildren(); get('notices').replaceChildren();
  get('status').textContent='Scanning the open page…';
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw new Error('Open a normal HTTP or HTTPS lesson page first. Chrome internal pages cannot be scanned.');
    const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanPage});
    const candidates=discoverResources(result.raw,result.page);
    get('status').textContent=`${result.title || 'Page'}: ${candidates.length} candidate${candidates.length===1?'':'s'} found.`;
    for (const notice of result.notices) get('notices').append(element('li',notice));
    if (!candidates.length) get('results').append(element('p','No supported resources were exposed. Start the player, reveal download links and scan again.'));
    for (const candidate of candidates) {
      const article=element('article','');
      article.append(element('h2',`${candidate.kind} · ${candidate.detail}`));
      if (candidate.label) article.append(element('p',displayLabel(candidate.label)));
      article.append(element('code',displayUrl(candidate.url)),element('p',`Found in: ${candidate.origin}`));
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
