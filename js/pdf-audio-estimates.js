import {SAMPLE_RATE,windowedSpectrum} from './audio-sync-match.js';

const size=1024, hop=110;
function percentile95(values) {
  const sorted=[...values].sort((a,b)=>a-b), position=(sorted.length-1)*0.95;
  const low=Math.floor(position);
  return Math.max(1e-9,sorted[low]+(sorted[Math.ceil(position)]-sorted[low])*(position-low));
}

// Compare the attack at a proposed start with other attacks within half a measure.
function localContrast(times,energy,time,pace) {
  const nearby=[];
  let peak=0;
  for(let i=0;i<times.length;i++){
    const distance=Math.abs(times[i]-time);
    if(distance<=.09)peak=Math.max(peak,energy[i]);
    else if(distance>.2 && distance<=pace/2)nearby.push(energy[i]);
  }
  return nearby.length?peak/percentile95(nearby):NaN;
}

// A pair of late accents can skip a shorter run of downbeats after a tap.
// Look for the intervening attack and its continuation, also working back from the end tap.
function competingPulse(tap,first,second,times,bass) {
  const step=(first-tap)/2;
  const continuation=first+step;
  if((second-continuation)/step<.25)return false;
  const radius=Math.min(.18,Math.abs(step)*.08);
  function peak(time) {
    let strength=0;
    for(let i=0;i<times.length;i++)
      if(Math.abs(times[i]-time)<=radius)strength=Math.max(strength,bass[i]);
    return strength;
  }
  const middle=peak(tap+step),later=peak(continuation);
  return middle>0 && middle>=peak(first)/3 && later>0 && later>=peak(second);
}

// A repeating accompaniment can emphasize the same offbeat in every bar.
// Compare the attack envelope with itself one bar and half a bar earlier.
function repeatingBass(bass,firstFrame,lastFrame,barFrames) {
  const attacks=bass.slice(firstFrame,lastFrame).map(Math.sqrt);
  const mean=attacks.reduce((sum,value)=>sum+value,0)/attacks.length;
  const centered=attacks.map(value=>value-mean);
  function correlation(lag) {
    let cross=0,previous=0,current=0;
    for(let i=lag;i<centered.length;i++){
      const a=centered[i-lag],b=centered[i];
      cross+=a*b;previous+=a*a;current+=b*b;
    }
    return cross/Math.sqrt(previous*current);
  }
  for(let percent=95;percent<=105;percent++){
    const period=barFrames*percent/100;
    if(correlation(Math.round(period))>=.5 && correlation(Math.round(period/2))>=.5)return true;
  }
  return false;
}

function reviewStarts(audio,start,end,pace,times,bass,upper) {
  const even=audio.map((_,i)=>start+(i+1)*pace);
  const shifts=audio.map((time,i)=>time-even[i]);
  const clear=audio.map((time,i)=>{
    const distance=Math.abs(shifts[i]);
    return distance>=.09 && distance<=.35*pace &&
      localContrast(times,bass,time,pace)>=3 &&
      localContrast(times,bass,even[i],pace)<.8 && localContrast(times,upper,even[i],pace)<.8;
  });
  function agree(i,j) {
    return clear[i] && clear[j] && shifts[i]*shifts[j]>0 && Math.abs(shifts[i]-shifts[j])<.2*pace;
  }
  const last=audio.length-1;
  const skipFirst=agree(0,1) && shifts[0]>0 && competingPulse(start,audio[0],audio[1],times,bass);
  const skipLast=agree(last,last-1) && shifts[last]<0 && competingPulse(end,audio[last],audio[last-1],times,bass);
  if(skipFirst){clear[0]=false;clear[1]=false;}
  if(skipLast){clear[last]=false;clear[last-1]=false;}
  const suggested=even.slice();
  const barFrames=pace*SAMPLE_RATE/hop;
  for(let i=0;i<last;i++){
    if(!agree(i,i+1))continue;
    // Look at up to four bars around the pair. A distant steady section
    // should not rule out an adjustment within a slowdown.
    const firstBar=Math.max(0,Math.min(i-1,audio.length+1-4));
    if(Math.abs(shifts[i]-shifts[i+1])<=.08*pace &&
       repeatingBass(bass,Math.round(firstBar*barFrames),Math.round((firstBar+4)*barFrames),barFrames))continue;
    suggested[i]=audio[i];suggested[i+1]=audio[i+1];
  }
  return {audio,suggested,hasCompetingPulse:Boolean(skipFirst || skipLast)};
}

// The caller supplies audio and two taps. No notes or reference sync map enter this search.
export function compareAudioEstimates(samples,offset,start,end,count) {
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
  const audio=result.reverse();
  return reviewStarts(audio,start,end,pace,times,bass,upper);
}

export function audioEstimates(samples,offset,start,end,count) {
  return compareAudioEstimates(samples,offset,start,end,count)?.audio ?? null;
}
