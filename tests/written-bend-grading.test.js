import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {WaitController} from '../js/wait-controller.js';

const modes=['collect','together','realtime'];
const target=(index,notes)=>({id:`target:${index}`,startTick:index*1920,endTick:(index+1)*1920,
  startTimeMs:index*1000,endTimeMs:(index+1)*1000,targetEndTimeMs:(index+1)*1000,stringCount:6,staffIndex:0,
  notes:notes.map((note,i)=>({id:`note:${index}:${i}`,string:i+1,fret:0,
    startTimeMs:index*1000,endTimeMs:(index+1)*1000,...note}))});
const bend=(midi=60,max=62)=>({midi,bendRange:{min:midi,max}});
const input=(midi,at,channel=1)=>({type:'note-on',midi,rawMidi:midi,at,channel,stringHint:channel,velocity:90});
function harness(mode,hex,events,options={}) {
  const settings={hex,chordMode:mode,heldNoteTolerance:'off',filterHexSpikes:false,...options};
  const session=mode==='realtime'?new RealtimeSession(events,settings):new WaitSession(events,settings);
  session.started=true;
  return {session,hit:(index,midi,at=index*1000,channel=1)=>mode==='realtime'
    ?session.noteOn(input(midi,at,channel),at):session.noteOn(index,input(midi,at,channel),at),
    release:(midi,at,channel=1)=>session.noteOff({...input(midi,at,channel),type:'note-off'})};
}

for(const mode of modes)for(const hex of [false,true]) {
  const name=`${mode} ${hex?'Hex':'Poly'}`;
  test(`${name} defaults to allowing each written bend pitch in its original octave`,()=>{
    for(const midi of [60,61,62]) {
      const h=harness(mode,hex,[target(0,[bend()])]);
      const result=h.hit(0,midi);
      assert.equal(result.type,'correct');assert.equal(result.complete,true);
      assert.deepEqual(result.noteIds,['note:0:0']);assert.equal(result.writtenBendRange,true);
      assert.equal(h.session.stats().correct,1);assert.equal(h.session.stats().wrong,0);
    }
    for(const midi of [59,63,72]) {
      const h=harness(mode,hex,[target(0,[bend()])]);
      assert.equal(h.hit(0,midi).type,'wrong');assert.equal(h.session.stats().correct,0);
    }
  });
  test(`${name} toggle Off and ordinary notes retain their existing pitch requirements`,()=>{
    for(const [notes,options] of [[[bend()],{allowWrittenBendRanges:false}],[[{midi:60}],{}]]) {
      for(const midi of [61,62]) {
        const h=harness(mode,hex,[target(0,notes)],options);
        assert.equal(h.hit(0,midi).type,'wrong');assert.equal(h.session.stats().correct,0);
      }
      assert.equal(harness(mode,hex,[target(0,notes)],options).hit(0,60).type,'correct');
    }
  });
  test(`${name} fractional ranges do not round outward to the next semitone`,()=>{
    const h=harness(mode,hex,[target(0,[bend(60,60.5)])]);
    assert.equal(h.hit(0,61).type,'wrong');assert.equal(h.session.stats().correct,0);
    assert.equal(h.hit(0,60,20).type,'correct');
  });
  test(`${name} a bending chord member leaves every other required pitch intact`,()=>{
    const h=harness(mode,hex,[target(0,[bend(),{midi:64},{midi:67}])]);
    assert.equal(h.hit(0,62,0,1).complete,false);
    assert.equal(h.hit(0,64,20,hex?2:1).complete,false);
    assert.equal(h.session.stats().correct,2);
    assert.equal(h.hit(0,67,40,hex?3:1).complete,true);
    assert.equal(h.session.stats().correct,3);assert.equal(h.session.stats().wrong,0);
  });
  test(`${name} overlapping bend bands reassign earlier evidence rather than depending on attack order`,()=>{
    for(const pitches of [[62,64],[64,62]]) {
      const h=harness(mode,hex,[target(0,[bend(),bend(62,64)])]);
      assert.equal(h.hit(0,pitches[0],0,1).complete,false);
      assert.equal(h.hit(0,pitches[1],20,hex?2:1).complete,true);
      assert.equal(h.session.stats().correct,2);assert.equal(h.session.stats().wrong,0);
    }
  });
  test(`${name} a shared bend endpoint cannot replace an independent unbent chord tone`,()=>{
    const h=harness(mode,hex,[target(0,[bend(),{midi:62}])]);
    assert.equal(h.hit(0,62).complete,false);assert.equal(h.session.stats().correct,1);
    assert.equal(h.hit(0,61,20,hex?2:1).complete,true);assert.equal(h.session.stats().correct,2);
  });
  test(`${name} written-fret range filtering cannot discard an allowed wide bend endpoint`,()=>{
    const events=[target(0,[{...bend(60,72),string:1,fret:1}])];
    const h=harness(mode,hex,events,{filterScoreRange:true,rangeStaves:[{tuning:[59,55,50,45,40,35]}]});
    assert.equal(h.hit(0,72).type,'correct');assert.equal(h.session.stats().correct,1);
  });
  test(`${name} pitch-wheel continuation never supplies a later written attack`,()=>{
    const h=harness(mode,hex,[target(0,[bend()]),target(1,[{midi:62}])]);
    assert.equal(h.hit(0,60).complete,true);
    for(const at of [20,500,1010])h.session.pitchBend({type:'pitch-bend',channel:1,bendValue:1365,at},at,1);
    assert.equal(h.session.stats().correct,1);assert.equal(h.session.stats().wrong,0);
    assert.equal(Boolean(h.session.records[1].slots[0].hit),false);
  });
  test(`${name} a prompt released bend re-key stays with its original note`,()=>{
    // Realtime permits the second note early, exposing accidental credit theft.
    const events=[target(0,[bend()]),{...target(1,[{midi:62}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
    const h=harness(mode,hex,events);
    h.hit(0,60,100);h.release(60,110);
    const result=h.hit(1,62,130);
    assert.equal(result.type,'ignored-bend-continuation');assert.equal(result.eventId,'target:0');
    assert.equal(result.complete,false);assert.equal(result.writtenBendRange,true);
    assert.equal(h.session.stats().correct,1);assert.equal(h.session.stats().wrong,0);
  });
  test(`${name} repeated pitch and a longer release gap remain fresh evidence`,()=>{
    for(const [nextMidi,gap] of [[60,20],[62,61]]) {
      const events=[target(0,[bend()]),{...target(1,[{midi:nextMidi}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
      const h=harness(mode,hex,events);h.hit(0,60,100);h.release(60,110);
      assert.equal(h.hit(1,nextMidi,110+gap).type,'correct');assert.equal(h.session.stats().correct,2);
    }
  });
}

for(const mode of modes)test(`${mode} Hex cannot fill two bend-unison slots with a same-channel replay`,()=>{
  const h=harness(mode,true,[target(0,[bend(),bend()])]);
  h.hit(0,62,0,1);h.release(62,5,1);h.hit(0,62,10,1);
  assert.equal(h.session.stats().correct,1);
  assert.equal(h.hit(0,62,20,2).complete,true);assert.equal(h.session.stats().correct,2);
});

for(const mode of modes)test(`${mode} Hex onset correction recognizes a fractional range without a rounded MIDI change`,()=>{
  const h=harness(mode,true,[target(0,[bend(60,60.5)])],{pitchBendRange:2});
  assert.equal(h.hit(0,61).type,'wrong');
  const result=h.session.pitchBend({type:'pitch-bend',channel:1,bendValue:-2048,at:10},10,0);
  assert.equal(result.type,'pitch-corrected');assert.equal(h.session.stats().correct,1);
  assert.equal(h.session.stats().wrong,0);
});

test('Realtime reset discards bend gesture ownership',()=>{
  const h=harness('realtime',true,[target(0,[bend()])]);h.hit(0,60);h.release(60,10);
  h.session.reset();h.session.started=true;
  assert.equal(h.hit(0,62,20).type,'correct');assert.equal(h.session.stats().correct,1);
});

test('Wait pause and resume discard bend gesture ownership',()=>{
  let now=0;
  const events=[target(0,[bend(),{midi:64}]),target(1,[{midi:65}])];
  const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},()=>{},()=>now);
  c.configure(events,3840,true,false,{allowWrittenBendRanges:true,heldNoteTolerance:'off'});c.start();
  c.noteOn(input(60,0));c.noteOn({...input(60,10),type:'note-off'});
  now=10;c.toggle();now=100;c.toggle();
  const result=c.noteOn(input(62,110));
  assert.notEqual(result?.type,'ignored-bend-continuation');
});

for(const hex of [false,true])test(`Together ${hex?'Hex':'Poly'} expires the old attempt before associating a later re-key`,()=>{
  const h=harness('together',hex,[target(0,[bend(),{midi:64}])]);
  h.hit(0,60,0);h.release(60,210);
  const result=h.hit(0,61,220);
  assert.equal(h.session.stats().retries,1,'expiry must not depend on whether the controller timer ran first');
  assert.equal(result.type,'correct');assert.equal(h.session.stats().correct,1);
});

for(const mode of modes)for(const hex of [false,true])test(`${mode} ${hex?'Hex':'Poly'} vibrato forgives continuation but not a wrong starting pitch`,()=>{
  const events=[target(0,[{midi:60,hasVibrato:true}]),{...target(1,[{midi:61}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
  const wrong=harness(mode,hex,events);assert.equal(wrong.hit(0,61,0).type,'wrong');
  const h=harness(mode,hex,events);assert.equal(h.hit(0,60,100).type,'correct');h.release(60,110);
  assert.equal(h.hit(1,61,130).type,'ignored-bend-continuation');assert.equal(h.session.stats().correct,1);
});

for(const mode of modes)test(`${mode} Poly does not guess a continuation when two released bend sources fit`,()=>{
  const events=[target(0,[bend(60,64),bend(62,65)]),{...target(1,[{midi:63}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
  const h=harness(mode,false,events);h.hit(0,60,100);h.hit(0,62,110);
  h.release(60,120);h.release(62,125);
  assert.equal(h.hit(1,63,140).type,'correct');assert.equal(h.session.stats().correct,3);
});

for(const mode of modes)test(`${mode} Hex associates an unreleased changed pitch with its accepted bend`,()=>{
  const events=[target(0,[bend()]),{...target(1,[{midi:62}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
  const h=harness(mode,true,events);h.hit(0,60,100);
  assert.equal(h.hit(1,62,130).type,'ignored-bend-continuation');assert.equal(h.session.stats().correct,1);
});

for(const mode of modes)test(`${mode} Poly unisons do not widen an unbent member's pitch`,()=>{
  for(const notes of [[bend(),{midi:60}],[{midi:60},bend()]]) {
    const h=harness(mode,false,[target(0,notes)]);
    assert.equal(h.hit(0,62).type,'wrong');assert.equal(h.session.stats().correct,0);
    assert.equal(h.hit(0,60,20).type,'correct');assert.equal(h.session.stats().total,1,'ordinary Poly unison deduplication remains intact');
  }
});

for(const mode of modes)for(const hex of [false,true])test(`${mode} ${hex?'Hex':'Poly'} intervening unrelated input cancels a released bend association`,()=>{
  const events=[target(0,[bend()]),{...target(1,[{midi:61}]),startTimeMs:200,endTimeMs:1200,targetEndTimeMs:1200}];
  const h=harness(mode,hex,events);h.hit(0,60,100);h.release(60,110);
  assert.equal(h.hit(1,70,120).type,'wrong');
  assert.equal(h.hit(1,61,130).type,'correct');assert.equal(h.session.stats().correct,2);
});
