// Usage: node tools/experiments/benchmark-pdf-spacing.mjs [--offset-taps] full.json path/to/id.pcm [...]
// PCM inputs are local 11025 Hz mono float32 recordings named with the lesson ID.
import fs from 'node:fs';
import path from 'node:path';
import {compareAudioEstimates} from '../../js/pdf-audio-estimates.js';
import {SAMPLE_RATE} from '../../js/audio-sync-match.js';
import {measureIntervals} from '../../js/pdf-recording-timing.js';

const args=process.argv.slice(2);
const offsetTaps=args[0]==='--offset-taps';
if(offsetTaps)args.shift();
const [baseline,...files]=args;
const lessons=JSON.parse(fs.readFileSync(baseline));
const points=[];
let markedBreaks=0;
for(const file of files){
  const id=path.basename(file,'.pcm');
  const {visits,gaps}=lessons.find(row=>row.id===id);
  const breaks=gaps.filter(g=>g.kind==='explanation' || /intro|break/i.test(g.label||''));
  const bytes=fs.readFileSync(file);
  const samples=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
  const passages=[];
  function addRun(first,last){
    for(let i=first;i+2<=last;i+=4)passages.push({first:i,last:Math.min(i+4,last),kind:'music'});
  }
  let first=0;
  for(let i=1;i<visits.length;i++){
    if(visits[i].scoreMeasure===visits[i-1].scoreMeasure+1 &&
       Math.abs(visits[i-1].endSeconds-visits[i].startSeconds)<=.08)continue;
    addRun(first,i-1);
    first=i;
  }
  addRun(first,visits.length-1);
  for(const gap of breaks){
    const edge=visits.findIndex(v=>Math.abs(v.endSeconds-gap.startSeconds)<.08);
    const next=visits.findIndex(v=>Math.abs(v.startSeconds-gap.endSeconds)<.08);
    if(edge<0 || next!==edge+1)continue;
    const before=visits[edge],after=visits[next];
    const anchors=[
      {measure:before.scoreMeasure,time:before.startSeconds},
      {measure:before.scoreMeasure,time:gap.startSeconds,end:true},
      {measure:after.scoreMeasure,time:gap.endSeconds},
      {measure:after.scoreMeasure,time:after.endSeconds,end:true}
    ];
    const intervals=measureIntervals(anchors);
    if(intervals.length!==2 || intervals.some(p=>p.start<gap.endSeconds && p.end>gap.startSeconds))
      throw Error('Marked break covered in '+id);
    markedBreaks++;
    if(edge<1 || next+1>=visits.length)continue;
    const from=edge-1,to=next+1;
    if(visits.slice(from+1,to+1).every((v,k)=>v.scoreMeasure===visits[from+k].scoreMeasure+1))
      passages.push({first:from,last:to,kind:'unmarked break'});
  }
  function tap(i){
    const offset=offsetTaps?(Math.floor(i/4)%2===0?.12:-.12):0;
    return Math.max(0,Math.round(visits[i].startSeconds*1000)/1000+offset);
  }
  for(const {first,last,kind} of passages){
    const start=tap(first),end=tap(last);
    if(end-start>90)continue;
    const count=last-first,pace=(end-start)/count;
    const from=Math.max(0,Math.floor((start-.25)*SAMPLE_RATE));
    const clip=samples.subarray(from,Math.ceil((end+.25)*SAMPLE_RATE));
    const prediction=compareAudioEstimates(clip,from/SAMPLE_RATE,start,end,count);
    for(let j=1;j<count;j++){
      const even=start+pace*j,suggested=prediction?.suggested[j-1] ?? even;
      const reference=visits[first+j].startSeconds;
      points.push({id,kind,measure:visits[first+j].scoreMeasure,moved:suggested!==even,
        evenMs:Math.abs(even-reference)*1000,suggestedMs:Math.abs(suggested-reference)*1000,
        insideBreak:breaks.some(g=>suggested>g.startSeconds && suggested<g.endSeconds)});
    }
  }
}
for(const kind of ['music','unmarked break']){
  const starts=points.filter(p=>p.kind===kind),moves=starts.filter(p=>p.moved);
  console.table(moves.map(p=>({id:p.id,measure:p.measure,evenMs:Math.round(p.evenMs),suggestedMs:Math.round(p.suggestedMs)})));
  console.log(kind,{starts:starts.length,moved:moves.length,improved:moves.filter(p=>p.suggestedMs<p.evenMs).length,
    originallyWithin100ms:starts.filter(p=>p.evenMs<=100).length,movedFromWithin100ms:moves.filter(p=>p.evenMs<=100).length,
    insideBreak:starts.filter(p=>p.insideBreak).length});
}
console.log('Marked breaks with a mapped measure on each side:',markedBreaks);
