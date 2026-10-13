// Score/media alignment data only. No alphaTab, player, MIDI or grading calls.
import {tickToTimeMs} from './score-playback.js';

export const MEDIA_PROFILE_FORMAT='guitar-trainer-media-sync';
export const MEDIA_LAYOUTS=['above','below','left','right'];
const finite=value=>typeof value==='number' && Number.isFinite(value);

export function mediaUrl(value) {
  const url=new URL(String(value).trim());
  if(!['https:','http:'].includes(url.protocol) || url.username || url.password)throw new Error('Use an http(s) media link without an embedded password.');
  return url.href;
}
export function youtubeId(value) {
  const text=String(value).trim();
  if(/^[\w-]{11}$/.test(text))return text;
  const url=new URL(mediaUrl(text));
  let result='';
  if(url.hostname==='youtu.be')result=url.pathname.slice(1).split('/')[0];
  else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(url.hostname))
    result=url.searchParams.get('v') || (/^\/(embed|shorts|live)\//.test(url.pathname)?url.pathname.split('/')[2]:'');
  if(!/^[\w-]{11}$/.test(result))throw new Error('Choose a YouTube video link or its 11-character video ID.');
  return result;
}
export function validateSource(source) {
  if(!source || !['local','url','youtube','embedded'].includes(source.kind))throw new Error('Invalid media source.');
  const result={kind:source.kind,label:String(source.label || 'Recording').slice(0,240)};
  if(source.kind==='url')result.url=mediaUrl(source.url);
  if(source.kind==='youtube')result.videoId=youtubeId(source.videoId);
  if(source.kind==='local') {
    if(typeof source.fileName!=='string' || !source.fileName || !finite(source.size) || source.size<0 || !finite(source.lastModified))throw new Error('Invalid local file details.');
    Object.assign(result,{fileName:source.fileName.slice(0,500),size:source.size,lastModified:source.lastModified});
  }
  return result;
}
export function sourceMatches(a,b) {
  if(!a || !b || a.kind!==b.kind)return false;
  if(a.kind==='local')return a.fileName===b.fileName && a.size===b.size && a.lastModified===b.lastModified;
  if(a.kind==='url')return a.url===b.url;
  if(a.kind==='youtube')return a.videoId===b.videoId;
  return true;
}
export function pointTick(point,timeline) {
  const measure=timeline?.measures.find(m=>m.measureNumber===point.barIndex+1 && m.occurrence===point.barOccurence+1);
  if(!measure)throw new Error('A sync point refers to a measure/repeat that is absent from this score.');
  return measure.startTick+(measure.endTick-measure.startTick)*point.barPosition;
}
export function validatePoints(points,timeline=null,durationMs=null) {
  if(!Array.isArray(points) || points.length>4096)throw new Error('Use at most 4096 sync points.');
  const result=points.map(point=>{
    if(!point || !Number.isInteger(point.barIndex) || point.barIndex<0 || !Number.isInteger(point.barOccurence) || point.barOccurence<0 ||
      !finite(point.barPosition) || point.barPosition<0 || point.barPosition>1 || !finite(point.millisecondOffset) || point.millisecondOffset<0 || point.millisecondOffset>86400000)
      throw new Error('Invalid sync point position or time.');
    if(durationMs>0 && point.millisecondOffset>durationMs+1)throw new Error('A sync time is beyond the recording.');
    return {barIndex:point.barIndex,barOccurence:point.barOccurence,barPosition:point.barPosition,millisecondOffset:point.millisecondOffset};
  });
  if(timeline) {
    result.sort((a,b)=>pointTick(a,timeline)-pointTick(b,timeline));
    for(let i=1;i<result.length;i++) {
      if(pointTick(result[i],timeline)<=pointTick(result[i-1],timeline) || result[i].millisecondOffset<=result[i-1].millisecondOffset)
        throw new Error('Sync points must move forward in both score order and recording time.');
    }
  }
  return result;
}
export function defaultPoints(timeline,durationMs) {
  const first=timeline?.measures[0],last=timeline?.measures.at(-1);
  if(!first || !last || !(durationMs>0))return [];
  return [
    {barIndex:first.measureNumber-1,barOccurence:first.occurrence-1,barPosition:0,millisecondOffset:0},
    {barIndex:last.measureNumber-1,barOccurence:last.occurrence-1,barPosition:1,millisecondOffset:durationMs},
  ];
}
export function tickAtMediaTime(points,timeline,timeMs) {
  const sorted=validatePoints(points,timeline);
  if(sorted.length<2)throw new Error('Add at least a start and end sync point.');
  let i=0;while(i<sorted.length-2 && timeMs>sorted[i+1].millisecondOffset)i++;
  const a=sorted[i],b=sorted[i+1],ratio=(timeMs-a.millisecondOffset)/(b.millisecondOffset-a.millisecondOffset);
  return Math.max(0,Math.min(timeline.endTick,pointTick(a,timeline)+ratio*(pointTick(b,timeline)-pointTick(a,timeline))));
}
export function mediaTimeAtTick(points,timeline,tick) {
  const sorted=validatePoints(points,timeline);
  if(sorted.length<2)throw new Error('Add at least a start and end sync point.');
  let i=0;while(i<sorted.length-2 && tick>pointTick(sorted[i+1],timeline))i++;
  const a=sorted[i],b=sorted[i+1],ratio=(tick-pointTick(a,timeline))/(pointTick(b,timeline)-pointTick(a,timeline));
  return Math.max(0,a.millisecondOffset+ratio*(b.millisecondOffset-a.millisecondOffset));
}
// Initial proportional alignment follows the source tempo map, including repeats.
export function tempoAlignedPoints(timeline,durationMs) {
  const points=defaultPoints(timeline,durationMs);
  if(!points.length)return points;
  let previousTempo=timeline.tempoMap[0]?.bpm;
  for(const segment of timeline.tempoMap.slice(1)) {
    if(segment.bpm===previousTempo)continue;
    previousTempo=segment.bpm;
    const measure=timeline.measures.find(m=>segment.tick>=m.startTick && segment.tick<m.endTick);
    if(measure)points.push({barIndex:measure.measureNumber-1,barOccurence:measure.occurrence-1,
      barPosition:(segment.tick-measure.startTick)/(measure.endTick-measure.startTick),
      millisecondOffset:tickToTimeMs(timeline,segment.tick)/timeline.durationMs*durationMs});
  }
  return validatePoints(points,timeline);
}
export function validateProfile(data) {
  if(!data || typeof data.id!=='string' || !data.id || data.id.length>100 || !/^[a-f0-9]{64}$/.test(data.scoreHash || '') ||
    typeof data.name!=='string' || !data.name.trim() || !finite(data.durationMs) || data.durationMs<=0 || data.durationMs>86400000)
    throw new Error('Invalid sync profile metadata.');
  if(!Array.isArray(data.points) || data.points.length<2)throw new Error('A sync profile needs at least a start and end point.');
  return {id:data.id,scoreHash:data.scoreHash,scoreName:String(data.scoreName || 'Score').slice(0,240),name:data.name.trim().slice(0,240),source:validateSource(data.source),
    durationMs:data.durationMs,points:validatePoints(data.points),layout:MEDIA_LAYOUTS.includes(data.layout)?data.layout:'above'};
}
export function parseProfileExport(data) {
  if(data?.format!==MEDIA_PROFILE_FORMAT || data.version!==1 || !Array.isArray(data.profiles) || data.profiles.length>5000)
    throw new Error('Choose a Guitar Trainer media sync backup (version 1).');
  return data.profiles.map(validateProfile);
}
