// One run belongs to the selected practice loop. A pass ends on the
// player's Finished notification, including continuous synth loops.
export function canTrainSpeed(state) {
  return Boolean(state.playerReady && state.practiceLoop.enabled && state.practiceLoop.range &&
    state.mode==='realtime' && !state.media.preview && !state.media.editing && !state.media.returning);
}

export function createSpeedTraining({start,target,step,every}) {
  if(![start,target,step,every].every(Number.isSafeInteger) || start<25 || target>200 ||
      target<=start || step<1 || step>175 || every<1)return null;
  return {start,target,step,every,completed:0,partial:false};
}

export function finishSpeedTrainingPass(run) {
  if(run.partial)run.partial=false;
  else run.completed++;
  const increments=Math.floor(run.completed/run.every);
  return Math.min(run.target,run.start+increments*run.step)/100;
}
