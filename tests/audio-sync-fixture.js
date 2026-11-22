// Original four-note phrases, an extra slower demonstration, and a voiced
// interference interval. Timings are independent of the alignment code.
export const sampleRate = 11025;
export const phrases = [[40,43,47,42],[50,45,48,52]];
export const performances = [[0,0.8,0.5],[1,2.8,0.5],[0,7,0.75],[0,12,0.5],[1,14,0.5]];
export function lessonSamples() {
  const pcm = new Float32Array(17*sampleRate);
  for (const [phrase,start,beat] of performances) {
    phrases[phrase].forEach((pitch,i) => {
      const hz = 440 * 2 ** ((pitch-69)/12);
      const onset = Math.round((start+i*beat)*sampleRate);
      for (let n = 0; n < beat*sampleRate; n++) {
        const t = n/sampleRate, phase = 2*Math.PI*hz*t;
        pcm[onset+n] = Math.min(1,t*120)*Math.exp(-2*t)*
          (0.55*Math.sin(phase)+0.19*Math.sin(2*phase)+0.09*Math.sin(3*phase));
      }
    });
  }
  for (let n = 5*sampleRate; n < 6.7*sampleRate; n++) {
    const t = n/sampleRate;
    pcm[n] = 0.25*Math.sin(2*Math.PI*130*t+6*Math.sin(19*t))*Math.sin(11*t)**2;
  }
  return pcm;
}
