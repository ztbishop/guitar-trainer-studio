import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
const old={id:'m1',startTick:0,notes:[{id:'old',midi:48,string:6,fret:8}]};
const next={id:'m2',startTick:960,notes:[{id:'bass',midi:49,string:6,fret:9},{id:'upper',midi:58,string:4,fret:8}]};
const on=(midi=48,at=0,velocity=10,channel=6)=>({type:'note-on',midi,at,velocity,channel,stringHint:channel});
const off=(midi=48,at=35)=>({type:'note-off',midi,at,channel:6});
function setup(options={},event=next,velocity=10){const s=new WaitSession([old,event],{hex:true,...options});s.noteOn(0,on(48,0,velocity));return s;}

test('captured measure-1 soft C3 followed by stronger C3 stays outside measure-2 mistakes',()=>{
  const s=setup();s.noteOff(off());const result=s.noteOn(1,on(48,42,119));
  assert.equal(result.type,'ignored-previous-onset');assert.equal(result.trackingSpike.durationMs,35);
  assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1,'no invented credit');
  assert.equal(s.noteOn(1,on(49,1553,112)).type,'correct');
  s.noteOn(1,on(58,1646,104,4));assert.equal(s.stats().accuracy,100);
  assert.equal(s.feedbackHistory()[1].trackingSpikes[0].previousEventId,'m1');
});
for(const [name,c] of Object.entries({
  loud:{velocity:21},late:{delay:61},'long release gap':{release:10,delay:42},
  'weak retrigger':{followVelocity:19},'changed pitch':{midi:47},'other channel':{channel:5},
  'no release':{release:null},'filter off':{options:{filterHexSpikes:false}},'Poly':{options:{hex:false}},
}))test(`previous-onset tolerance preserves ${name}`,()=>{
  const {velocity=10,release=35,delay=42,followVelocity=119,midi=48,channel=6,options={}}=c;
  const s=setup(options,next,velocity);if(release!==null)s.noteOff(off(48,release));
  assert.equal(s.noteOn(1,on(midi,delay,followVelocity,channel)).type,'wrong');
});

test('real repeated written notes still require and accept the fresh attack',()=>{
  const repeated={...next,notes:[{id:'repeat',midi:48,string:6,fret:8}]};
  const s=setup({},repeated);s.noteOff(off());assert.equal(s.noteOn(1,on(48,42,119)).type,'correct');
  assert.equal(s.stats().correct,2);
});
test('other chord tones do not spoil matching, but the retrigger cannot chain or cross targets',()=>{
  const s=setup();s.noteOff(off());s.noteOn(1,on(58,40,100,4));
  assert.equal(s.noteOn(1,on(48,42,119)).type,'ignored-previous-onset');
  s.noteOff(off(48,45));assert.equal(s.noteOn(1,on(48,50,119)).type,'wrong','one retrigger only');
  const distant=new WaitSession([old,next,{...next,id:'later'}],{hex:true});
  distant.noteOn(0,on());distant.noteOff(off());assert.equal(distant.noteOn(2,on(48,42,119)).type,'wrong');
});
test('pause clears precursors and normal held releases never add an error',()=>{
  let now=0;const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},()=>{},()=>now);
  c.configure([old,next],1920,true);c.start();c.noteOn(on());c.noteOn(off());
  now=36;c.toggle();now=100;c.toggle();
  assert.equal(c.noteOn(on(48,106,119)).type,'wrong');
  const s=setup();s.noteOff(off());assert.equal(s.stats().wrong,0);
});
test('intervening same-channel attack and noncentral bend invalidate precursor tolerance',()=>{
  const s=setup();s.noteOff(off());s.noteOn(1,on(49,40,110));
  assert.equal(s.noteOn(1,on(48,42,119)).type,'wrong');
  const bent=setup();bent.noteOff(off());bent.pitchBend({channel:6,bendValue:683,at:36},36,1);
  assert.equal(bent.noteOn(1,on(48,42,119)).type,'wrong');
});
