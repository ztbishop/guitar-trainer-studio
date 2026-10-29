// SPDX-License-Identifier: AGPL-3.0-or-later
// A single explicit send; independent of the short-lived toolbar popup.
import {appAddress,appPath,fetchBytes,base64Bytes,deliverLesson,checkScoreBytes} from './transfer.js';
import {readSyncPoints,redirectDestination,webUrl} from './discovery.js';

export async function sendJob(job,api=chrome) {
  const target=appAddress(job.target),{score,recording,timing}=job;
  if(!score && !recording && !timing)throw new Error('Select a score, recording or timing update.');
  if(typeof job.title!=='string' || job.title.length>240 || !webUrl(job.page))throw new Error('Rescan the lesson before sending.');
  for(const item of [score,recording,timing])if(item?.url && !webUrl(item.url))throw new Error('Choose a valid resource URL.');
  const urls=[target.href,score?.url,score?redirectDestination(score.url):null,timing?.url].filter(Boolean);
  const origins=[...new Set(urls.map(value=>`${new URL(value).origin}/*`))];
  // Must be the first asynchronous API call: retain the message's click gesture.
  if(!await api.permissions.request({origins}))throw new Error('Site access was declined. Nothing was sent.');
  const tabs=await api.tabs.query({url:`${target.origin}/*`});
  const matches=tabs.filter(tab=>{try{const url=new URL(tab.url);return url.origin===target.origin && appPath(url)===appPath(target);}catch{return false;}});
  if(matches.length!==1)throw new Error(matches.length?'More than one matching app tab is open. Keep one open and try again.':'Open Guitar Trainer at the selected address, then try again.');
  await api.storage.local.set({appAddress:target.href});
  // Both bounded requests share a <=25-second window between extension API
  // calls, rather than two sequential waits exceeding the worker idle limit.
  const [scoreData,syncPoints]=await Promise.all([(async()=>{
    if(!score)return null;
    const bytes=await fetchBytes(score.url,12*1024*1024);checkScoreBytes(bytes,score.fileName);
    return {fileName:score.fileName,base64:base64Bytes(bytes)};
  })(),(async()=>{
    if(!timing)return null;
    let data=timing.points;
    if(!data){const text=new TextDecoder().decode(await fetchBytes(timing.url,1000000));try{data=JSON.parse(text);}catch{throw new Error('The timing response is not JSON.');}}
    return readSyncPoints(data).map(p=>[p.bar,p.seconds,p.position,p.hide]);
  })()]);
  const payload={format:'gts-lesson',version:2,title:job.title,lessonUrl:job.page,score:scoreData,
    recording:recording?{url:recording.url,label:job.title}:null,syncPoints,keepRecording:job.keepRecording===true};
  const [{result}]=await api.scripting.executeScript({target:{tabId:matches[0].id},func:deliverLesson,args:[payload]});
  if(!result?.ok)throw new Error(result?.message || 'The app could not receive this lesson.');
  // Delivery succeeded even if the tab disappears before focus can be changed.
  await api.tabs.update(matches[0].id,{active:true}).catch(()=>{});
  return {ok:true,message:'Sent. Review the import in Guitar Trainer.'};
}
