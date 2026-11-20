import test from 'node:test';
import assert from 'node:assert/strict';
import {canTrainSpeed,createSpeedTraining,finishSpeedTrainingPass} from '../js/speed-trainer.js';

const settings={start:60,target:100,step:5,every:2};
test('completed loops advance in percentage points, skipping partial passes and capping at the target',()=>{
  const run=createSpeedTraining({...settings,target:68});
  assert.equal(finishSpeedTrainingPass(run),0.6);
  run.partial=true;
  assert.equal(finishSpeedTrainingPass(run),0.6);
  assert.deepEqual(Array.from({length:6},()=>finishSpeedTrainingPass(run)),[0.65,0.65,0.68,0.68,0.68,0.68]);
});
test('training requires a ready Realtime synth practice loop and valid ascending speeds',()=>{
  const state={playerReady:true,mode:'realtime',media:{},practiceLoop:{enabled:true,range:{startTick:0,endTick:960}}};
  assert(canTrainSpeed(state));
  for(const change of [{mode:'wait'},{playerReady:false},{media:{preview:true}},{media:{returning:true}},
    {media:{editing:true}},{practiceLoop:{enabled:false,range:null}}])assert.equal(canTrainSpeed({...state,...change}),false);
  for(const change of [{start:24},{target:201},{target:60},{target:59},{step:0},{every:1.5},{every:0}])
    assert.equal(createSpeedTraining({...settings,...change}),null);
});
