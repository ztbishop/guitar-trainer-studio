import {audioEstimates} from './pdf-audio-estimates.js';
self.onmessage=({data})=>{
  const {samples,offset,start,end,count}=data;
  self.postMessage(audioEstimates(samples,offset,start,end,count));
};
