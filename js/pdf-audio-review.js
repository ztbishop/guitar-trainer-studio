import {tapPassages,validEstimates} from './pdf-recording-timing.js';

export function initAudioReview({recording,media,listen,changed}) {
  const el=id=>document.getElementById(id);
  const select=el('audio-passage'),measure=el('audio-measure'),hint=el('audio-hint');
  let pending,decodedFile,decoded,passages=[],proposed=null,accepted={},storageKey='';
  const passage=()=>passages.find(p=>p.id===select.value);
  const stamp=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
  function save() {
    try{localStorage.setItem(storageKey,JSON.stringify(accepted));}
    catch{hint.textContent+=' This edit is available for this session only.';}
  }
  function resetComparison() {
    pending?.abort();pending=null;
    const p=passage();
    proposed=p && accepted[p.id];
    el('audio-comparison').hidden=!proposed;
    el('audio-find').disabled=select.disabled=!p;
    el('restore-even').hidden=!proposed;
    el('keep-audio').disabled=!!proposed;
    hint.textContent=p?(proposed?'Using reviewed audio timing.':'Listen to the estimates before applying them.') :
      'Tap across 2–16 measures within 90 seconds in one continuous passage.';
    if(proposed)showTimes();
  }
  function sync(anchors,pairKey) {
    const nextKey=pairKey?pairKey+'.audio.v1':'';
    let stored=accepted;
    if(storageKey!==nextKey){
      storageKey=nextKey;
      try{stored=JSON.parse(localStorage.getItem(storageKey)) || {};}catch{stored={};}
    }
    if(decodedFile!==recording()){decodedFile=null;decoded=null;}
    passages=tapPassages(anchors).filter(p=>p.count>=2 && p.count<=16 && p.end-p.start<=90);
    accepted={};
    for(const p of passages)if(validEstimates(p,stored?.[p.id]))accepted[p.id]=stored[p.id];
    const previous=select.value;
    select.replaceChildren(...passages.map(p=>new Option('M'+p.first+'–'+p.last+(p.endsAtRelease?' end':'')+' · '+stamp(p.start),p.id)));
    if(passages.some(p=>p.id===previous))select.value=previous;
    resetComparison();
    if(storageKey && Object.keys(stored||{}).length!==Object.keys(accepted).length)save();
    return accepted;
  }
  function even(p,index){return p.start+(index+1)*(p.end-p.start)/p.count;}
  function showTimes() {
    const p=passage();
    measure.replaceChildren(...proposed.map((t,i)=>new Option('M'+(p.first+i+1)+' · '+stamp(even(p,i))+' → '+stamp(t),i)));
    el('audio-comparison').hidden=false;
  }
  async function compare() {
    const p=passage(),file=recording();
    if(!p || !file)return;
    const controller=new AbortController(),{signal}=controller;
    pending=controller;
    el('audio-find').disabled=true;
    hint.textContent='Reading the recording and comparing measure starts…';
    let worker;
    try{
      if(file.size>256*1024*1024 || media.duration>45*60)throw Error('For audio estimates, choose a recording under 256 MiB and 45 minutes.');
      if(decodedFile!==file){
        const {decodeRecording}=await import('./audio-sync-controls.js');
        const bytes=await file.arrayBuffer();
        signal.throwIfAborted();
        const samples=await decodeRecording(bytes,media.duration,signal);
        signal.throwIfAborted();decoded=samples;decodedFile=file;
      }
      const {SAMPLE_RATE}=await import('./audio-sync-match.js');
      signal.throwIfAborted();
      const from=Math.max(0,Math.floor((p.start-.25)*SAMPLE_RATE));
      const samples=decoded.slice(from,Math.ceil((p.end+.25)*SAMPLE_RATE));
      worker=new Worker(new URL('./pdf-audio-worker.js',import.meta.url),{type:'module'});
      const result=await new Promise((resolve,reject)=>{
        signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
        worker.onmessage=e=>resolve(e.data);
        worker.onerror=()=>reject(Error('The browser could not analyze this passage.'));
        worker.postMessage({samples,offset:from/SAMPLE_RATE,start:p.start,end:p.end,count:p.count},[samples.buffer]);
      });
      signal.throwIfAborted();
      if(!validEstimates(p,result))throw Error('Too few clear attacks in this passage. Try a closer pair of taps.');
      proposed=result;showTimes();
      el('keep-audio').disabled=false;
      hint.textContent='Choose a measure and listen to both starts. Your taps stay fixed.';
    }catch(error){if(!signal.aborted)hint.textContent=error.message;}
    finally{worker?.terminate();if(pending===controller){pending=null;el('audio-find').disabled=false;}}
  }
  select.onchange=resetComparison;
  el('audio-find').onclick=compare;
  el('hear-even').onclick=()=>listen(even(passage(),measure.selectedIndex));
  el('hear-audio').onclick=()=>listen(proposed[measure.selectedIndex]);
  el('keep-audio').onclick=()=>{
    accepted[select.value]=proposed;
    changed(accepted);resetComparison();save();
  };
  el('restore-even').onclick=()=>{
    delete accepted[select.value];changed(accepted);resetComparison();
    hint.textContent='Even spacing restored for this passage.';save();
  };
  return {sync};
}
