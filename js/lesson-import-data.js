// SPDX-License-Identifier: AGPL-3.0-or-later
// Untrusted bridge payload and timing conversion only; no native/player calls.
import {mediaUrl,validatePoints} from './media-sync.js';
export function validateLesson(data) {
  if(data?.format!=='gts-lesson' || data.version!==1 || typeof data.title!=='string' || data.title.length>240)
    throw new Error('Unsupported Lesson Bridge payload.');
  const fileName=data.score?.fileName,encoded=data.score?.base64;
  if(typeof fileName!=='string' || fileName.length>240 || /[\\/\x00-\x1f]/.test(fileName) || !/\.(gp[3-5]?|gpx|xml|musicxml|mxl)$/i.test(fileName) ||
      typeof encoded!=='string' || !encoded.length || encoded.length>16*1024*1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length%4)
    throw new Error('Choose a supported score of at most 12 MB.');
  let binary;try{binary=atob(encoded);}catch{throw new Error('The score data is invalid.');}
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  if(!bytes.length || bytes.length>12*1024*1024)throw new Error('The score is empty or too large.');
  const lessonUrl=mediaUrl(data.lessonUrl);
  let recording=null;
  if(data.recording)recording={url:mediaUrl(data.recording.url),label:String(data.recording.label || data.title).slice(0,240)};
  const syncPoints=data.syncPoints===null || data.syncPoints===undefined?null:validateSoundslice(data.syncPoints);
  if(syncPoints && !recording)throw new Error('Timing needs a selected recording.');
  return {title:data.title,lessonUrl,score:{fileName,bytes},recording,syncPoints};
}
export function validateSoundslice(data) {
  if(!Array.isArray(data) || data.length<2 || data.length>4096)throw new Error('Expected 2–4096 Soundslice timing points.');
  let lastPosition=-1,lastTime=-1;
  return data.map(point=>{
    if(!Array.isArray(point) || point.length<2 || point.length>4)throw new Error('Invalid Soundslice point.');
    const [bar,seconds,position=0,hide=0]=point;
    if(!Number.isInteger(bar) || bar<0 || !Number.isFinite(seconds) || seconds<0 || seconds>86400 ||
      !Number.isFinite(position) || position<0 || position>480 || ![0,1].includes(hide) || bar+position/480<=lastPosition || seconds<=lastTime)
      throw new Error('Soundslice positions and seconds must increase.');
    if(lastPosition===-1 && (bar!==0 || position!==0))throw new Error('Timing must start at playback bar 0.');
    lastPosition=bar+position/480;lastTime=seconds;
    return [bar,seconds,position,hide];
  });
}
export function soundslicePoints(data,timeline,durationMs=null) {
  const input=validateSoundslice(data),measures=timeline?.measures;
  if(!measures?.length)throw new Error('Wait for the score timeline.');
  if(input.some(point=>point[3]!==0))throw new Error('This timing hides parts of the playhead. Align this recording manually instead.');
  const last=input.at(-1);
  // A terminal bar denotes the end of the expanded performance, not a new bar.
  if(!(last[0]===measures.length && last[2]===0) && !(last[0]===measures.length-1 && last[2]===480))
    throw new Error('Timing length does not match this score’s playback measures. Choose manual alignment.');
  const points=input.map(([bar,seconds,position])=>{
    if(bar>measures.length || (bar===measures.length && position!==0))throw new Error('Timing refers beyond this score.');
    const end=bar===measures.length,measure=end?measures.at(-1):measures[bar];
    return {barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,barPosition:end?1:position/480,millisecondOffset:seconds*1000};
  });
  return validatePoints(points,timeline,durationMs);
}
