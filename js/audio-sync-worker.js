import {matchSingleMeasures,recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {phraseMatches,orderedChoices,refinePassage,alternativeStarts} from './audio-sync-passages.js';
import {rhythmicMatches} from './audio-sync-rhythm.js';
import {suggestPrecedingMeasures,suggestInteriorMeasures} from './audio-sync-backward.js';
import {checkContextTakes} from './audio-sync-context.js';

self.onmessage = ({data}) => {
  try {
    if (data.range) {
      const {first,last,start,end} = data.range;
      const points = refinePassage(data.score,data.features,first,last,start,end);
      const alternatives = alternativeStarts(data.score,data.features,first,last,start,points);
      self.postMessage({points,alternatives});
      return;
    }
    const features = recordingFeatures(data.samples), duration = data.samples.length/SAMPLE_RATE;
    const singles = matchSingleMeasures(data.bars,features,duration,(done,total) =>
      self.postMessage({phase:'Searching measures',done,total}));
    let matches = phraseMatches(data.score,features,duration,singles,(done,total) =>
      self.postMessage({phase:'Searching three-measure passages',done,total}));
    const hasPitchMatches = matches.some(row => row.length);
    if (!hasPitchMatches) {
      self.postMessage({phase:'Checking longer riffs',done:0,total:1});
      matches = rhythmicMatches(data.score,features,duration);
    }
    const choices=orderedChoices(matches);
    suggestPrecedingMeasures(data.bars,matches,choices,features);
    suggestInteriorMeasures(data.bars,matches,choices,data.samples,data.score,features);
    if (hasPitchMatches) checkContextTakes(data.score,data.bars,data.samples,duration,singles,matches,choices,
      (phase,done,total)=>self.postMessage({phase,done,total}));
    self.postMessage({matches,choices,features},[features.buffer]);
  } catch (error) {
    self.postMessage({error:error.message});
  }
};
