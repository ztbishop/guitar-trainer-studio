import {initPdfCompanion} from './pdf-companion.js';
import {readDisplayPreferences, DISPLAY_PREFERENCES_KEY} from './display-preferences.js';
import {LibraryStore,fingerprint} from './library-store.js';
import {measureIntervals,putAnchor,recordingLoop,shiftAnchors} from './pdf-recording-timing.js';
import {initAudioReview} from './pdf-audio-review.js';

const el=id=>document.getElementById(id);
const media=el('recording'), fileInput=el('recording-file'), selected=el('tap-measure'), saved=el('anchors');
const first=el('loop-first'), last=el('loop-last'), speed=el('speed');
let pdfHash='', mediaHash='', objectUrl='', loading=0, measures=[], anchors=[], spans=[], loop=null, frame=0;
const status=text=>{el('status').textContent=text;};
const stamp=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const key=()=>pdfHash && mediaHash && 'gts.pdf.recording.taps.v1.'+pdfHash+'.'+mediaHash;
const time=()=>Math.round(media.currentTime*1000)/1000;
let localRecording=null, pdfFile=null, currentBoxes={}, restoredPair=null, restoredPdf=null, acceptedTiming={};
const library=new LibraryStore();
const audioReview=initAudioReview({recording:()=>localRecording,media,
  listen(t){stopLoop();media.currentTime=t;tick();media.play().catch(e=>status(e.message));},
  changed(accepted){acceptedTiming=accepted;spans=measureIntervals(anchors,accepted);stopLoop();tick();}
});

function stopLoop() {
  loop=null;el('loop').setAttribute('aria-pressed','false');el('loop').textContent='Loop section';
}
function refreshAnchorFields() {
  const anchor=anchors[saved.selectedIndex];
  el('seconds').value=anchor?anchor.time.toFixed(3):'';
  for(const id of ['seconds','adjust','retap','remove'])el(id).disabled=!anchor;
}
function refreshTiming(chosen) {
  acceptedTiming=audioReview.sync(anchors,key());
  spans=measureIntervals(anchors,acceptedTiming);stopLoop();
  saved.replaceChildren(...anchors.map(a=>new Option('M'+a.measure+(a.end?' end':' start')+' · '+stamp(a.time),String(a.time)+(a.end?' end':''))));
  if(chosen)saved.selectedIndex=anchors.indexOf(chosen);
  refreshAnchorFields();updateReady();
  el('clear-taps').disabled=el('shift-taps').disabled=!anchors.length;
}
function updateReady() {
  const ready=Boolean(key() && Number.isFinite(media.duration) && measures.length);
  el('timing').disabled=el('loop-controls').disabled=!ready;
  speed.disabled=!Number.isFinite(media.duration);
  el('save-pair').disabled=!ready;
}
function restore() {
  anchors=[];
  try {
    const stored=key() && localStorage.getItem(key());
    const loaded=stored ? JSON.parse(stored) : mediaHash && mediaHash===restoredPair?.mediaHash ? restoredPair.anchors : null;
    if(Array.isArray(loaded))anchors=loaded.filter(a=>Number.isFinite(a?.time) && a.time>=0 &&
      Number.isInteger(a.measure) && a.measure>0 && a.measure<=Math.max(0,...measures)).sort((a,b)=>a.time-b.time || Number(Boolean(b.end))-Number(Boolean(a.end)));
  } catch { /* This browser may restrict local storage. */ }
  refreshTiming();tick();
  if(key())status(anchors.length?anchors.length+' saved taps restored.':'Play the recording and tap the first measure you recognize.');
}
function persist(message,chosen) {
  refreshTiming(chosen);tick();
  try {localStorage.setItem(key(),JSON.stringify(anchors));status(message);}
  catch {status(message+' This browser could only keep the edit for this session.');}
}
function setBoxes(boxes) {
  currentBoxes=boxes;
  measures=Object.keys(boxes).map(Number).sort((a,b)=>a-b);
  for(const select of [selected,first,last,el('repeat-end'),el('repeat-start'),el('shift-first'),el('shift-last')]) {
    const previous=select.value;
    select.replaceChildren(...measures.map(n=>new Option(String(n),String(n))));
    if(measures.includes(Number(previous)))select.value=previous;
    else if(select.id==='shift-last')select.selectedIndex=measures.length-1;
    else if(select===last && measures.length>1)select.selectedIndex=1;
  }
  updateReady();
}
function current() {
  const t=media.currentTime;
  return spans.find(s=>s.start<=t && t<s.end)?.measure ??
    anchors.find(a=>!a.end && Math.abs(t-a.time)<.035)?.measure ?? null;
}
const display=readDisplayPreferences();
const editor=initPdfCompanion(display,()=>{},null,{
  current,selectedMeasure:()=>Number(selected.value)||null,loop:()=>loop,boxesChanged:setBoxes,autoFind:()=>el('auto-find').checked,
  opened(hash,name,boxes,file) {
    media.pause();pdfFile=file;pdfHash=hash;
    if(file!==restoredPdf)restoredPair=null;el('pdf-attach').textContent=name;
    setBoxes(boxes);restore();
  },
  seek(number) {
    selected.value=String(number);
    const starts=[...spans.filter(s=>s.measure===number).map(s=>s.start),...anchors.filter(a=>!a.end && a.measure===number).map(a=>a.time)];
    if(!starts.length){tick();status('Measure '+number+' selected. Tap its start when you hear it.');return;}
    const closest=starts.reduce((best,t)=>Math.abs(t-media.currentTime)<Math.abs(best-media.currentTime)?t:best);
    if(loop && (closest<loop.start || closest>=loop.end))stopLoop();
    media.currentTime=closest;tick();
  }
});
document.addEventListener('open-printed-score',async e=>{
  const {pdf, pair, recording}=e.detail;
  restoredPair=pair;
  restoredPdf=pdf;
  let boxes=pair?.boxes;
  if(pair) {
    const hash=await fingerprint(await pdf.arrayBuffer());
    try {boxes=JSON.parse(localStorage.getItem('gts.pdf.recording.boxes.v1.'+hash)) ?? boxes;}catch {}
  }
  await editor.open(pdf,boxes);
  if(recording)await openRecording(recording);
  else if(pair)status('Choose the original recording to reconnect this saved PDF.');
});
function showTiming(editing) {
  el('timing').hidden=!editing;
  el('edit-sync').hidden=editing;
}
document.addEventListener('pdf-practice-view',()=>showTiming(false));
document.addEventListener('pdf-practice-close',()=>media.pause());
el('edit-sync').onclick=()=>showTiming(true);
el('save-pair').onclick=async()=>{
  const pdf=pdfFile, recording=localRecording;
  if(!pdf || !recording)return;
  const pair={boxes:currentBoxes,anchors,estimates:acceptedTiming,mediaHash,mediaName:recording.name};
  try {
    await library.savePdfRecording(pdf,recording,structuredClone(pair));
    status('PDF and recording saved to the library.');
    window.parent.dispatchEvent(new Event('pdf-library-saved'));
  } catch(error){status('Could not save to the library. '+error.message);}
};
window.addEventListener('storage',e=>{
  if(e.key===DISPLAY_PREFERENCES_KEY || e.key===null){display.ui=readDisplayPreferences().ui;editor.sync();}
});
selected.onchange=()=>editor.sync();
function tick() {
  if(loop && !media.paused && (media.currentTime>=loop.end || media.currentTime<loop.start-.02))media.currentTime=loop.start;
  const n=current(), text=n?'Measure '+n:'';
  if(el('following').textContent!==text)el('following').textContent=text;
  editor.sync();
}
function animate() {
  cancelAnimationFrame(frame);tick();
  if(!media.paused)frame=requestAnimationFrame(animate);
}
media.onplay=animate;
media.onpause=()=>{cancelAnimationFrame(frame);tick();};
media.onseeked=media.ontimeupdate=tick;
media.onended=()=>{if(loop){media.currentTime=loop.start;media.play().catch(e=>status(e.message));}};
media.onloadedmetadata=()=>{
  media.classList.toggle('audio-only',media.videoWidth===0);
  media.playbackRate=Number(speed.value);updateReady();
};
media.onerror=()=>{stopLoop();el('timing').disabled=el('loop-controls').disabled=true;status('This browser could not play the recording. Choose another audio or video file.');};
for(const rate of [.25,.5,.6,.7,.75,.8,.9,1,1.1,1.25,1.5,1.75,2])speed.add(new Option(Math.round(rate*100)+'%',String(rate)));
speed.value='1';speed.onchange=()=>{media.playbackRate=Number(speed.value);};

el('choose-media').onclick=()=>fileInput.click();
fileInput.onchange=async()=>{
  const file=fileInput.files[0];fileInput.value='';if(file)await openRecording(file);
};
async function openRecording(file) {
  const version=++loading;
  media.pause();localRecording=null;mediaHash='';restore();status('Opening recording…');
  try {
    // Read a small sample for identity. Native media playback streams the file.
    const sample=new Blob([String(file.size),file.slice(0,65536),file.slice(-65536)]);
    const hash=await fingerprint(await sample.arrayBuffer());
    if(version!==loading)return;
    const old=objectUrl;objectUrl=URL.createObjectURL(file);media.src=objectUrl;
    if(old)URL.revokeObjectURL(old);
    el('recording-name').textContent=file.name;localRecording=file;mediaHash=hash;
    if(hash===restoredPair?.mediaHash){
      try {if(localStorage.getItem(key()+'.audio.v1')===null)localStorage.setItem(key()+'.audio.v1',JSON.stringify(restoredPair.estimates));}catch {}
    }
    restore();
    if(!pdfHash)status('Open the printed PDF to find its measures.');
  } catch(e){if(version===loading)status('Could not open the recording. '+e.message);}
}
function add(end) {
  const measure=Number(selected.value), t=time();
  try {
    const anchor={measure,time:t,end};
    anchors=putAnchor(anchors,anchor);
    if(!end && selected.selectedIndex<selected.length-1)selected.selectedIndex++;
    persist('Measure '+measure+(end?' ends':' starts')+' at '+stamp(t)+'.',anchor);
  }catch(e){status(e.message);}
}
el('tap').onclick=()=>add(false);
el('passage-end').onclick=()=>add(true);
el('repeat').onclick=()=>{
  const end=Number(el('repeat-end').value), start=Number(el('repeat-start').value), t=time();
  if(start>end){status('Choose a repeat start at or before the last measure of the first pass.');return;}
  const next={measure:start,time:t,end:false};
  try {
    anchors=putAnchor(putAnchor(anchors,{measure:end,time:t,end:true}),next);
    selected.value=String(measures[measures.indexOf(start)+1] ?? start);
    persist('Measure '+end+' ends and measure '+start+' repeats at '+stamp(t)+'.',next);
  }catch(error){status(error.message);}
};
saved.onchange=refreshAnchorFields;
function adjust(t) {
  const anchor=anchors[saved.selectedIndex];
  if(!anchor || !Number.isFinite(t) || t<0 || t>media.duration){status('Enter a time within this recording.');return;}
  try {
    const replacement={...anchor,time:t};
    anchors=putAnchor(anchors,replacement,anchor);
    persist('Updated measure '+anchor.measure+' to '+stamp(t)+'.',replacement);
  }catch(e){status(e.message);}
}
el('adjust').onclick=()=>adjust(el('seconds').valueAsNumber);
el('retap').onclick=()=>adjust(time());
el('remove').onclick=()=>{anchors=anchors.filter((_,i)=>i!==saved.selectedIndex);persist('Tap removed.');};
el('shift-taps').onclick=()=>{
  const from=Number(el('shift-first').value), through=Number(el('shift-last').value);
  const offset=el('shift-offset').valueAsNumber;
  try {
    anchors=shiftAnchors(anchors,measures,from,through,offset);
    persist('Shifted taps for measures '+from+'–'+through+' by '+(offset>0?'+':'')+offset+'. Recording times stayed the same.');
  }catch(error){status(error.message);}
};
el('clear-taps').onclick=()=>{
  if(!anchors.length || !window.confirm('Clear all '+anchors.length+' taps and reviewed timing for this PDF and recording?'))return;
  anchors=[];
  selected.selectedIndex=0;
  persist('All taps cleared. Your measure boxes are still in place.');
};
first.onchange=last.onchange=()=>{stopLoop();tick();};
el('loop').onclick=async()=>{
  if(loop){stopLoop();tick();return;}
  loop=recordingLoop(spans,Number(first.value),Number(last.value),media.currentTime);
  if(!loop){status('Choose measures in one timed passage. Tap a later downbeat or mark the final measure’s end to give the loop an endpoint.');return;}
  el('loop').setAttribute('aria-pressed','true');el('loop').textContent='Stop looping';
  media.currentTime=loop.start;tick();
  try {await media.play();}catch(e){stopLoop();tick();status(e.message);}
};
