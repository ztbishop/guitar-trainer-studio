import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardFeedback} from '../js/practice-keyboard.js';

test('pitch-only keyboard keeps partial chord credit and live errors on their sounding keys',()=>{
  const event={pitches:[38,57],notes:[{id:'bass',midi:38},{id:'upper',midi:57},{id:'tie',midi:52,attack:false}]};
  const states={bass:'correct'};
  assert.deepEqual(keyboardFeedback(event,states,[],[{midi:58},{midi:59,pending:true}]),[
    {midi:38,target:true,state:'correct'},{midi:57,target:true,state:'expected'},{midi:58,target:false,state:'wrong'}
  ]);
  assert.deepEqual(keyboardFeedback(event,{},[{midi:38,credited:false}],[])[0],{midi:38,target:true,state:'played'});
  assert.deepEqual(keyboardFeedback(null,{},[{midi:57,credited:true}],[]),[{midi:57,target:false,state:'correct'}]);
  assert.deepEqual(keyboardFeedback({isPercussive:true,notes:[{midi:60}]},{},[],[]),[]);
});
