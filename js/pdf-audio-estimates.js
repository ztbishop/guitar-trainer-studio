import {SAMPLE_RATE,windowedSpectrum} from './audio-sync-match.js';

const size=1024, hop=110;
function percentile95(values) {
  const sorted=[...values].sort((a,b)=>a-b), position=(sorted.length-1)*0.95;
  const low=Math.floor(position);
  return Math.max(1e-9,sorted[low]+(sorted[Math.ceil(position)]-sorted[low])*(position-low));
}

// The caller supplies audio and two taps. No notes or reference sync map enter this search.
export function audioEstimates(samples,offset,start,end,count) {
  if(!Number.isInteger(count) || count<2 || count>16 || end<=start || end-start>90)return null;
  const transform=windowedSpectrum(size,true);
  const bins=Math.ceil(3000*size/SAMPLE_RATE);
  const history=Array.from({length:3},()=>new Float64Array(bins));
  const power=new Float64Array(bins), bass=[], upper=[], times=[];
  for(let i=0;i*hop+size<=samples.length;i++) {
    const previous=history[i%3];
    transform(samples,i*hop,power);
    let low=0,high=0;
    for(let b=Math.ceil(55*size/SAMPLE_RATE);b<bins;b++) {
      const magnitude=Math.sqrt(power[b]), gain=Math.max(0,magnitude-previous[b]);
      previous[b]=magnitude;
      if(b*SAMPLE_RATE/size<160)low+=gain;
      else high+=gain;
    }
    const t=offset+(i*hop+size/2)/SAMPLE_RATE;
    if(i>=3 && t>=start && t<=end){bass.push(low);upper.push(high);times.push(t);}
  }
  if(times.length<3)return null;
  const lowScale=percentile95(bass), highScale=percentile95(upper);
  const accents=bass.map((v,i)=>v/lowScale+.35*upper[i]/highScale);
  const choices=[start], reward=[0];
  for(let i=1;i<accents.length-1;i++){
    if(accents[i]>accents[i-1] && accents[i]>=accents[i+1]){
      choices.push(times[i]);reward.push(Math.log1p(accents[i]));
    }
  }
  choices.push(end);reward.push(0);
  const last=choices.length-1, pace=(end-start)/count, parents=[];
  let scores=new Float64Array(choices.length).fill(-Infinity);
  scores[0]=0;
  for(let step=1;step<=count;step++) {
    const next=new Float64Array(choices.length).fill(-Infinity), parent=new Int32Array(choices.length);
    for(let j=step===count?last:1;j<=(step===count?last:last-1);j++) {
      for(let k=j-1;k>=0;k--){
        const ratio=(choices[j]-choices[k])/pace;
        if(ratio>2.75)break;
        if(ratio<.4 || !Number.isFinite(scores[k]))continue;
        const score=scores[k]+reward[j]-1.5*Math.log(ratio)**2;
        if(score>next[j]){next[j]=score;parent[j]=k;}
      }
    }
    parents.push(parent);scores=next;
  }
  if(!Number.isFinite(scores[last]))return null;
  const result=[];
  let j=last;
  for(let i=count-1;i>0;i--){j=parents[i][j];result.push(choices[j]);}
  return result.reverse();
}
