// SPDX-License-Identifier: AGPL-3.0-or-later
// Explicit extension-side fetch and one-shot delivery; no app/native API access.
export function appAddress(value) {
  const url=new URL(value);
  if (!(url.protocol==='https:' || (url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash)
    throw new Error('Use your app HTTPS address or localhost/127.0.0.1 address, without query parameters.');
  return url;
}
export function appPath(url) { return url.pathname.replace(/\/index\.html$/,'/'); }
export async function fetchBytes(url,limit) {
  const response=await fetch(url,{credentials:'include',signal:AbortSignal.timeout(25000)});
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || ''))
    throw new Error('A selected resource could not be downloaded. Sign in and rescan; the link may have expired.');
  const reader=response.body.getReader(),chunks=[];let length=0;
  try {
    while(true) {
      const {value,done}=await reader.read();if(done)break;
      length+=value.length;if(length>limit)throw new Error('The selected resource exceeds the import size limit.');chunks.push(value);
    }
  } finally { await reader.cancel().catch(()=>{}); }
  if(!length)throw new Error('The selected resource is empty.');
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}
export function base64Bytes(bytes) {
  const parts=[];for(let i=0;i<bytes.length;i+=8192)parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(parts.join(''));
}
export function checkScoreBytes(bytes,fileName) {
  if(!/\.(gp[3-5]?|gpx|musicxml|xml|mxl)$/i.test(fileName || ''))throw new Error('Set a Guitar Pro or MusicXML filename, including its extension.');
  const head=new TextDecoder().decode(bytes.subarray(0,4096)).replace(/^\uFEFF/,'').trimStart();
  if(/<score-(?:partwise|timewise)(?:\s|>)/i.test(head)) {
    if(!/\.(xml|musicxml)$/i.test(fileName))throw new Error('This appears to be MusicXML. Set a .musicxml or .xml filename.');
    return 'MusicXML text detected; final score parsing happens in Guitar Trainer.';
  }
  if(/FICHIER GUITAR PRO|^BCF[ZS]/.test(head))return 'Guitar Pro header detected; final score parsing happens in Guitar Trainer.';
  if(bytes[0]===80 && bytes[1]===75)return 'ZIP score container detected; final score parsing happens in Guitar Trainer.';
  throw new Error('No supported score header found. PDF, webpage and Soundslice notation JSON are not Guitar Pro/MusicXML files.');
}
// Serialized into an isolated content world on the exact user-selected app tab.
export function deliverLesson(payload) {
  return new Promise(resolve=>{
    const id=crypto.randomUUID();
    const finish=result=>{clearTimeout(timer);window.removeEventListener('message',receive);resolve(result);};
    const receive=event=>{
      if(event.source===window && event.origin===location.origin && event.data?.type==='gts-lesson-reply' && event.data.id===id)
        finish({ok:event.data.ok===true,message:String(event.data.message || '')});
    };
    const timer=setTimeout(()=>finish({ok:false,message:'The app did not respond. Refresh the updated Guitar Trainer tab and try again.'}),4000);
    window.addEventListener('message',receive);
    window.postMessage({type:'gts-lesson-offer',id,payload},location.origin);
  });
}
