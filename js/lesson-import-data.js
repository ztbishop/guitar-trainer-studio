// SPDX-License-Identifier: AGPL-3.0-or-later
// Bridge payload, timing conversion and import snapshots; no native/player calls.
import {mediaUrl,validatePoints} from './media-sync.js';
import {validateDraft} from './draft-timing.js';
import {validateTimingPlan} from './explanation-timing.js';
export function validateLesson(data) {
  if(data?.format!=='gts-lesson' || ![1,2,3,4,5,6].includes(data.version) || typeof data.title!=='string' || data.title.length>240)
    throw new Error('Unsupported Lesson Bridge payload.');
  if(data.version===6){
    if(data.recordingMode!=='reference-only'||!data.score||!data.recording||Object.keys(data).some(k=>!['format','version','title','lessonUrl','score','recording','recordingMode'].includes(k))||Object.keys(data.score).some(k=>!['fileName','base64'].includes(k))||Object.keys(data.recording).some(k=>!(data.recording.kind==='local-choice'?['kind']:['url','label']).includes(k)))throw new Error('A reference lesson needs only its score and independent recording, without timing.');
    const resources=validateLesson({format:data.format,version:3,title:data.title,lessonUrl:data.lessonUrl,score:data.score,recording:data.recording});
    return {...resources,recordingMode:'reference-only'};
  }
  if(Object.hasOwn(data,'recordingMode'))throw new Error('Independent reference recording requires a version-6 lesson.');
  const explanationTiming=data.version===4;
  const isDraft=data.version===5;
  if(!isDraft && Object.hasOwn(data,'draftTiming'))throw new Error('Draft timing requires a version-5 lesson.');
  if(isDraft) {
    const allowed=['format','version','title','lessonUrl','score','recording','draftTiming'];
    if(Object.keys(data).some(k=>!allowed.includes(k))||!data.score||!data.recording||!data.draftTiming)throw new Error('A draft lesson needs original score, recording and draftTiming only.');
    const draftTiming=validateDraft(data.draftTiming);
    // Reuse existing strict resource policy without interpreting the draft as a plan.
    if(Object.keys(data.score).some(k=>!['fileName','base64'].includes(k))||Object.keys(data.recording).some(k=>!(data.recording.kind==='local-choice'?['kind','id']:['url','label','id']).includes(k)))throw new Error('Invalid draft resources.');
    if(data.recording.id!==draftTiming.recordingId)throw new Error('Draft recording identity differs.');
    const recording={...data.recording};delete recording.id;
    const resources=validateLesson({format:data.format,version:3,title:data.title,lessonUrl:data.lessonUrl,score:data.score,recording});
    return {...resources,recording:{...resources.recording,id:draftTiming.recordingId},draftTiming};
  }
  if(!explanationTiming && Object.hasOwn(data,'timingPlan'))throw new Error('Explanation timing requires a version-4 lesson.');
  if(explanationTiming && (Object.hasOwn(data,'syncPoints') || !data.score || !data.recording || !data.timingPlan || data.keepRecording===true ||
      Object.keys(data).some(key=>!['format','version','title','lessonUrl','score','recording','timingPlan','keepRecording'].includes(key))))
    throw new Error('A version-4 lesson requires its original score, recording and timingPlan, without legacy syncPoints or recording retention.');
  if(data.version>=2 && data.keepRecording!==undefined && typeof data.keepRecording!=='boolean')throw new Error('Invalid recording retention choice.');
  let score=null;
  if(data.score) {
    const fileName=data.score?.fileName,encoded=data.score?.base64;
    if(explanationTiming && Object.keys(data.score).some(key=>!['fileName','base64'].includes(key)))throw new Error('Invalid original score fields.');
    if(typeof fileName!=='string' || fileName.length>240 || /[\\/\x00-\x1f]/.test(fileName) || !/\.(gp[3-5]?|gpx|xml|musicxml|mxl)$/i.test(fileName) ||
        typeof encoded!=='string' || !encoded.length || encoded.length>16*1024*1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length%4)
      throw new Error('Choose a supported score of at most 12 MB.');
    let binary;try{binary=atob(encoded);}catch{throw new Error('The score data is invalid.');}
    const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
    if(!bytes.length || bytes.length>12*1024*1024)throw new Error('The score is empty or too large.');
    score={fileName,bytes};
  } else if(data.version===1)throw new Error('A version-1 lesson needs a score.');
  const lessonUrl=mediaUrl(data.lessonUrl);
  const timingPlan=explanationTiming?validateTimingPlan(data.timingPlan):null;
  let recording=null;
  if(data.recording?.kind==='local-choice') {
    const fields=explanationTiming?['kind','id']:['kind'];
    if(![3,4].includes(data.version) || data.keepRecording===true || Object.keys(data.recording).some(key=>!fields.includes(key)))throw new Error('Invalid local recording request.');
    recording={kind:'local-choice',...(explanationTiming?{id:data.recording.id}:{})};
  } else if(data.recording) {
    if(data.recording.kind!==undefined)throw new Error('Unsupported recording kind.');
    if(explanationTiming && Object.keys(data.recording).some(key=>!['url','label','id'].includes(key)))throw new Error('Invalid recording fields.');
    recording={url:mediaUrl(data.recording.url),label:String(data.recording.label || data.title).slice(0,240),...(explanationTiming?{id:data.recording.id}:{})};
  }
  if(explanationTiming && recording.id!==timingPlan.recordingId)throw new Error('The recording identity does not match this timing plan.');
  const hasTiming=data.syncPoints!==null && data.syncPoints!==undefined;
  if(data.version===1 && hasTiming && !recording)throw new Error('Timing needs a selected recording.');
  const keepRecording=data.version>=2 && (data.keepRecording===true || (!score && !recording));
  if(data.version>=2 && !score && !recording && !hasTiming)throw new Error('Select a score, recording or timing update.');
  let syncPoints=null,timingIssue=null;
  if(hasTiming) {
    try{syncPoints=validateSoundslice(data.syncPoints);}
    catch(error){timingIssue={timingWarning:error.message,rejectedSyncPoints:rejectedTimingCopy(data.syncPoints)};}
  }
  return {title:data.title,lessonUrl,score,recording,syncPoints,keepRecording,...timingIssue,...(explanationTiming?{timingPlan}:{})};
}

// Verify the exact original bytes before opening review/loading a score. No file
// path, recording bytes or remote resource is needed to establish this binding.
export async function verifyLessonScoreHash(lesson) {
  const binding=lesson.timingPlan??lesson.draftTiming;
  if(!binding)return;
  const digest=await crypto.subtle.digest('SHA-256',lesson.score.bytes);
  const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(hash!==binding.scoreSha256)throw new Error('The timing plan does not match the original score bytes.');
}

// Keep ordinary rejected timing available for manual repair without retaining
// oversized arrays, nested objects or arbitrarily large strings in review state.
function rejectedTimingCopy(data) {
  const scalar=value=>value===null || typeof value==='number' || typeof value==='boolean' || typeof value==='string' && value.length<=64;
  if(!Array.isArray(data) || data.length>4096 || !data.every(point=>scalar(point) ||
      Array.isArray(point) && point.length<=4 && point.every(scalar)))return null;
  return data.map(point=>Array.isArray(point)?point.slice():point);
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

// A file picked in this trainer window, never a path/byte payload from the sender.
export function validateRecordingFile(file) {
  if(!(file instanceof Blob) || typeof file.name!=='string' || !file.name || file.name.length>500 || !file.size)throw new Error('Choose a nonempty audio or video file.');
  if(!/^(audio|video)\//i.test(file.type) && !/\.(mp3|wav|ogg|oga|ogv|m4a|aac|flac|opus|mp4|m4v|webm|mov|avi)$/i.test(file.name))throw new Error('Choose an audio or video file. Browser playback support varies.');
  return file;
}

// Snapshot the timing semantics, not native object identity. MIDI reloads may
// rebuild an equivalent timeline while the same score/recording is loading.
// Snapshot before awaiting so in-place mutations are detected as well.
export function lessonTimelineKey(timeline) {
  if(!timeline || !Number.isFinite(timeline.endTick) || timeline.endTick<=0 || !Number.isFinite(timeline.ticksPerQuarter) || timeline.ticksPerQuarter<=0 ||
    !Array.isArray(timeline.measures) || !timeline.measures.length || !Array.isArray(timeline.tempoMap) || !timeline.tempoMap.length)return null;
  const measures=timeline.measures.map(m=>[m.measureNumber,m.occurrence,m.playbackMeasureIndex,m.startTick,m.endTick]);
  const tempos=timeline.tempoMap.map(t=>[t.tick,t.bpm,t.timeMs]);
  if(measures.some(row=>row.some(value=>!Number.isFinite(value))) || tempos.some(row=>row.some(value=>!Number.isFinite(value))))return null;
  return JSON.stringify([timeline.ticksPerQuarter,timeline.endTick,measures,tempos]);
}
