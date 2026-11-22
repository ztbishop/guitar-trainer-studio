import {matchSingleMeasures,recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {phraseMatches,orderedChoices,refinePassage} from './audio-sync-passages.js';

self.onmessage = ({data}) => {
  try {
    if (data.range) {
      const {first,last,start,end} = data.range;
      self.postMessage({points:refinePassage(data.score,data.features,first,last,start,end)});
      return;
    }
    const features = recordingFeatures(data.samples), duration = data.samples.length/SAMPLE_RATE;
    const singles = matchSingleMeasures(data.bars,features,duration,(done,total) =>
      self.postMessage({phase:'Searching measures',done,total}));
    const matches = phraseMatches(data.score,features,duration,singles,(done,total) =>
      self.postMessage({phase:'Searching three-measure passages',done,total}));
    self.postMessage({matches,choices:orderedChoices(matches),features},[features.buffer]);
  } catch (error) {
    self.postMessage({error:error.message});
  }
};
