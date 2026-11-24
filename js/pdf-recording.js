import {initPdfCompanion} from './pdf-companion.js';
import {readDisplayPreferences, DISPLAY_PREFERENCES_KEY} from './display-preferences.js';
import {fingerprint} from './library-store.js';
import {measureIntervals,putAnchor,recordingLoop} from './pdf-recording-timing.js';
import {initAudioReview} from './pdf-audio-review.js';

const el=id=>document.getElementById(id);
const media=el('recording'), fileInput=el('recording-file'), selected=el('tap-measure'), saved=el('anchors');
const first=el('loop-first'), last=el('loop-last'), speed=el('speed');
let pdfHash='', mediaHash='', objectUrl='', loading=0, measures=[], anchors=[], spans=[], loop=null, frame=0;
const status=text=>{el('status').textContent=text;};
const stamp=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
const key=()=>pdfHash && mediaHash && 'gts.pdf.recording.taps.v1.'+pdfHash+'.'+mediaHash;
const time=()=>Math.round(media.currentTime*1000)/1000;
let localRecording=null;
const audioReview=initAudioReview({recording:()=>localRecording,media,
  listen(t){stopLoop();media.currentTime=t;tick();media.play().catch(e=>status(e.message));},
  changed(accepted){spans=measureIntervals(anchors,accepted);stopLoop();tick();}
});

function stopLoop() {
  loop=null;el('loop').setAttribute('aria-pressed','false');el('loop').textContent='Loop section';
}
function refreshAnchorFields() {
  const anchor=anchors[saved.selectedIndex];
  el('seconds').value=anchor?anchor.time.toFixed(3):'';
  for(const id of ['seconds','adjust','retap','remove'])el(id).disabled=!anchor;
}
function refreshTiming(selectTime) {
  spans=measureIntervals(anchors,audioReview.sync(anchors,key()));stopLoop();
  saved.replaceChildren(...anchors.map(a=>new Option('M'+a.measure+(a.end?' end':' start')+' · '+stamp(a.time),String(a.time))));
  if(selectTime!=null)saved.value=String(selectTime);
  refreshAnchorFields();updateReady();
}
function updateReady() {
  const ready=Boolean(key() && Number.isFinite(media.duration) && measures.length);
  el('timing').disabled=el('loop-controls').disabled=!ready;
  speed.disabled=!Number.isFinite(media.duration);
}
function restore() {
  anchors=[];
  try {
    const loaded=key() && JSON.parse(localStorage.getItem(key()));
    if(Array.isArray(loaded))anchors=loaded.filter(a=>Number.isFinite(a?.time) && a.time>=0 &&
      Number.isInteger(a.measure) && a.measure>0 && a.measure<=Math.max(0,...measures)).sort((a,b)=>a.time-b.time);
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
  measures=Object.keys(boxes).map(Number).sort((a,b)=>a-b);
  for(const select of [selected,first,last]) {
    const previous=select.value;
    select.replaceChildren(...measures.map(n=>new Option(String(n),String(n))));
    if(measures.includes(Number(previous)))select.value=previous;
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
  opened(hash,name,boxes) {
    media.pause();pdfHash=hash;el('pdf-attach').textContent=name;
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
document.addEventListener('open-printed-score',e=>editor.open(e.detail));
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
  const file=fileInput.files[0];fileInput.value='';if(!file)return;
  const version=++loading;
  media.pause();localRecording=null;mediaHash='';restore();status('Opening recording…');
  try {
    // Read a small sample for identity. Native media playback streams the file.
    const sample=new Blob([String(file.size),file.slice(0,65536),file.slice(-65536)]);
    const hash=await fingerprint(await sample.arrayBuffer());
    if(version!==loading)return;
    const old=objectUrl;objectUrl=URL.createObjectURL(file);media.src=objectUrl;
    if(old)URL.revokeObjectURL(old);
    el('recording-name').textContent=file.name;localRecording=file;mediaHash=hash;restore();
    if(!pdfHash)status('Open the printed PDF to find its measures.');
  } catch(e){if(version===loading)status('Could not open the recording. '+e.message);}
};
function add(end) {
  const measure=Number(selected.value), t=time();
  try {
    anchors=putAnchor(anchors,{measure,time:t,end});
    if(!end && selected.selectedIndex<selected.length-1)selected.selectedIndex++;
    persist('Measure '+measure+(end?' ends':' starts')+' at '+stamp(t)+'.',t);
  }catch(e){status(e.message);}
}
el('tap').onclick=()=>add(false);
el('passage-end').onclick=()=>add(true);
saved.onchange=refreshAnchorFields;
function adjust(t) {
  const anchor=anchors[saved.selectedIndex];
  if(!anchor || !Number.isFinite(t) || t<0 || t>media.duration){status('Enter a time within this recording.');return;}
  try {
    anchors=putAnchor(anchors,{...anchor,time:t},anchor.time);
    persist('Updated measure '+anchor.measure+' to '+stamp(t)+'.',t);
  }catch(e){status(e.message);}
}
el('adjust').onclick=()=>adjust(el('seconds').valueAsNumber);
el('retap').onclick=()=>adjust(time());
el('remove').onclick=()=>{anchors=anchors.filter((_,i)=>i!==saved.selectedIndex);persist('Tap removed.');};
first.onchange=last.onchange=()=>{stopLoop();tick();};
el('loop').onclick=async()=>{
  if(loop){stopLoop();tick();return;}
  loop=recordingLoop(spans,Number(first.value),Number(last.value),media.currentTime);
  if(!loop){status('Choose measures in one timed passage. Tap a later downbeat or mark the final measure’s end to give the loop an endpoint.');return;}
  el('loop').setAttribute('aria-pressed','true');el('loop').textContent='Stop looping';
  media.currentTime=loop.start;tick();
  try {await media.play();}catch(e){stopLoop();tick();status(e.message);}
};
