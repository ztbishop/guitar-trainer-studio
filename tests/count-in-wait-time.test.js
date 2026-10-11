import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitController} from '../js/wait-controller.js';

test('resuming with a count-in excludes pre-roll from the active Together chord window',()=>{
  let now=0,done,state;
  const controller=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){},countIn(tick,callback){done=callback;}},next=>state=next,()=>now);
  controller.configure([{id:'chord',startTick:0,notes:[{id:'a',midi:60},{id:'b',midi:64}]}],3840,false,false,{mode:'together',windowMs:200});
  controller.toggle();now=2000;done(true);
  controller.noteOn({type:'note-on',midi:60,at:now});
  now+=50;controller.toggle();now+=1000;controller.toggle();
  now+=2000;done(true);now+=50;
  controller.noteOn({type:'note-on',midi:64,at:now});
  assert.equal(state.phase,'complete');assert.equal(state.results.correct,2);assert.equal(state.results.retries,0);
});
