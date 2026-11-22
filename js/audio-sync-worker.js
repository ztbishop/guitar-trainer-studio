import {matchMeasures} from './audio-sync-match.js';

self.onmessage = ({data}) => {
  try {
    const matches = matchMeasures(data.bars,data.samples,(done,total) => {
      self.postMessage({done,total});
    });
    self.postMessage({matches});
  } catch (error) {
    self.postMessage({error:error.message});
  }
};
