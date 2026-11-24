// Run from the repo root with an 11025 Hz float32 excerpt or recording at its original time origin.
// Usage: node tools/experiments/benchmark-pdf-taps.mjs lesson.pcm bridge-baseline/full.json
import fs from 'node:fs';
import {audioEstimates} from '../../js/pdf-audio-estimates.js';
import {SAMPLE_RATE} from '../../js/audio-sync-match.js';

const [pcm,baseline]=process.argv.slice(2);
const bytes=fs.readFileSync(pcm);
const samples=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
const reference=JSON.parse(fs.readFileSync(baseline)).find(r=>r.id==='101209');
const starts=new Map(reference.visits.map(v=>[v.scoreMeasure,v.startSeconds]));
const pins=[[1,5],[5,8],[9,13],[13,16],[25,28],[29,32]];
const predictions=[];
for(const [first,last] of pins){
  const start=starts.get(first),end=starts.get(last);
  const from=Math.max(0,Math.floor((start-.25)*SAMPLE_RATE)),to=Math.ceil((end+.25)*SAMPLE_RATE);
  const estimates=audioEstimates(samples.subarray(from,to),from/SAMPLE_RATE,start,end,last-first);
  estimates.forEach((audio,i)=>predictions.push({measure:first+i+1,audio,even:start+(i+1)*(end-start)/(last-first)}));
}
// Interior reference times are read only for evaluation.
console.table(predictions.map(({measure,audio,even})=>({
  measure,evenErrorMs:Math.round(1000*(even-starts.get(measure))),audioErrorMs:Math.round(1000*(audio-starts.get(measure)))
})));
