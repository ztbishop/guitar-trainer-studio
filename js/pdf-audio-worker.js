import {compareAudioEstimates} from './pdf-audio-estimates.js';
self.onmessage=({data})=>{
  const {samples,offset,start,end,count}=data;
  self.postMessage(compareAudioEstimates(samples,offset,start,end,count));
};
