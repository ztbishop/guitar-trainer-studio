import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {initMidiRouter,normalizeMidiMessage} from '../js/midi-router.js';
import {WaitSession} from '../js/wait-session.js';
import {startMidiCapture,stopMidiCapture,captureMidiEvent,captureMidiOutcome,midiCaptureReport,captureStatus,captureFeedbackView,markMidiSnapshot,midiCaptureText,initMidiCaptureControls} from '../js/midi-capture.js';
import {buildWrongFretMarks} from '../js/tab-feedback.js';
import {buildPolyWrongFretMarks} from '../js/poly-feedback.js';

test('router capture exposes short wrong attacks and Wait target transitions in Poly and Hex without altering grading',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  try {
    for(const inputMode of ['single-channel','hex-6ch']) {
      let receive;
      const input={id:'fishman',name:'Direct Fishman',addEventListener:(type,fn)=>{receive=fn;},removeEventListener:()=>{}};
      Object.defineProperty(globalThis,'navigator',{configurable:true,value:{requestMIDIAccess:async()=>({inputs:new Map([[input.id,input]])})}});
      AppState.mode='wait';AppState.inputMode=inputMode;AppState.midi.singleChannel='any';AppState.midi.hexChannelBase=1;
      AppState.midi.activeInputId='';AppState.midi.hexChannelReverse=false;AppState.ui.loadedFileName='example.gp3';
      const targets=[60,62].map((midi,i)=>({id:`target-${i}`,measureNumber:1,notes:[{id:`n${i}`,midi,string:2,fret:i+1}]}));
      AppState.expectedEvents=targets;
      const session=new WaitSession(targets,{hex:inputMode==='hex-6ch'});let index=0;
      AppState.waitTrainer={currentEvent:targets[0],phase:'waiting'};
      await initMidiRouter({onMidiEvent:note=>{
        if(note.type==='note-off'){session.noteOff(note);return null;}
        if(note.type!=='note-on')return null;
        const result=session.noteOn(index,note);
        if(result?.complete){index++;AppState.waitTrainer.currentEvent=targets[index]??null;}
        return result;
      }});
      startMidiCapture();const now=performance.now();
      const send=(data,offset)=>receive({data,timeStamp:now+offset});
      send([0x94,60,90],0); // Correct, cursor advances immediately.
      send([0x94,74,18],2); // Short octave error against the new target.
      send([0x84,74,0],5);
      send([0xe4,0,64],6); // Pitch bend never becomes a graded note.
      send([0x94,62,91],20);
      send([0x9f,80,30],21); // Outside Hex range; still useful raw evidence.
      stopMidiCapture();
      const report=midiCaptureReport();
      assert.equal(report.events[0].targetBefore.eventId,'target-0');
      assert.equal(report.events[0].targetAfter.eventId,'target-1');
      assert.equal(report.events[1].grading.type,'wrong');
      assert.equal(report.events[1].grading.target.notes[0].midi,62);
      assert.ok(Math.abs(report.events[1].durationMs-3)<1e-6);assert.equal(report.events[2].noteOnSequence,2);
      assert.deepEqual(report.events[1].raw,[0x94,74,18]);assert.equal(report.events[1].device.name,'Direct Fishman');
      assert.equal(report.events[3].grading,null);
      assert.equal(report.events[5].accepted,inputMode==='single-channel');
      assert.equal(session.feedbackHistory()[1].wrongNotes[0].midi,74);
      const control=new WaitSession(targets,{hex:inputMode==='hex-6ch'});
      control.noteOn(0,{midi:60,channel:5});control.noteOn(1,{midi:74,channel:5});control.noteOn(1,{midi:62,channel:5});
      assert.deepEqual(session.stats(),control.stats());
      report.events[1].raw[0]=0;
      assert.equal(midiCaptureReport().events[1].raw[0],0x94);
      AppState.ui.loadedFileName='changed.gp';assert.equal(midiCaptureReport().score.fileName,'example.gp3');
    }
  } finally {
    stopMidiCapture();
    if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;
  }
});

test('capture is opt-in, bounded, restarts cleanly, and records duplicate held attacks without filtering them',()=>{
  stopMidiCapture();
  const note=normalizeMidiMessage({data:[0x90,60,80],timeStamp:performance.now()});
  assert.equal(captureMidiEvent(note),null);
  startMidiCapture();
  const first=captureMidiEvent(note,{accepted:true}),second=captureMidiEvent({...note,at:note.at+1},{accepted:true});
  assert.equal(second.previousHeldSequence,first.sequence);
  captureMidiOutcome(second,null);
  const release=captureMidiEvent({...note,type:'note-off',at:note.at+100},{accepted:true});
  assert.equal(release.noteOnSequence,first.sequence,'held duration stays anchored to the original onset');
  assert.equal(release.durationMs,100);
  for(let i=2;i<10001;i++)captureMidiEvent(note,{accepted:true});
  assert.equal(captureStatus().count,10000);assert.equal(captureStatus().recording,false);
  assert.equal(captureStatus().reason,'Capture limit reached');
  startMidiCapture();assert.equal(captureStatus().count,0);
  assert.equal(captureMidiEvent(note,{accepted:true}).previousHeldSequence,null);
  stopMidiCapture();assert.equal(captureMidiEvent(note),null);
});

test('report connects a brief MIDI octave attack to retained fret 25 and a screenshot in both modes',()=>{
  for(const inputMode of ['single-channel','hex-6ch']) {
    AppState.mode='wait';AppState.inputMode=inputMode;
    const target={id:'target',measureNumber:2,notes:[{id:'n',sourceNoteId:'1',midi:60,string:2,fret:1}]};
    const track={staves:[{tuning:[64,59,55,50,45,40]}]},session=new WaitSession([target],{hex:inputMode==='hex-6ch'});
    AppState.expectedEvents=[target];AppState.waitTrainer={currentEvent:target};startMidiCapture();
    const publish=()=>{
      const args={track,events:[target],currentEvent:target,history:session.feedbackHistory(),liveWrongNotes:[...session.liveWrong.values()],inputMode,enabled:true};
      const marks=inputMode==='single-channel'?buildPolyWrongFretMarks(args):buildWrongFretMarks(args);
      captureFeedbackView(marks,{currentEvent:target,results:session.stats(),liveWrongNotes:args.liveWrongNotes});return marks;
    };
    const at=performance.now(),bad=normalizeMidiMessage({data:[0x94,84,20],timeStamp:at},{inputMode,hexChannelBase:1});
    const row=captureMidiEvent(bad,{accepted:true});const result=session.noteOn(0,bad);publish();captureMidiOutcome(row,result);
    assert.equal(row.feedbackAfter[0].fret,25);assert.equal(row.feedbackAfter[0].retained,false);
    const release={...bad,type:'note-off',at:at+3};captureMidiEvent(release,{accepted:true});session.noteOff(release);assert.equal(publish().length,0);
    session.noteOn(0,{...bad,midi:60});const marks=publish();assert.equal(marks[0].retained,true);
    markMidiSnapshot();stopMidiCapture();const report=midiCaptureReport();
    assert.equal(report.snapshots[0].view.marks[0].fret,25);assert.equal(report.snapshots[0].view.marks[0].retained,true);
    assert.ok(Math.abs(report.events[0].durationMs-3)<1e-6);
    assert.match(midiCaptureText(),/MIDI 84.*velocity 20.*duration 3.00ms.*wrong/);
    assert.match(midiCaptureText(),/"label": "Screenshot"/);
    assert.match(midiCaptureText(),/"fret": 25/);
  }
});

test('recording controls generate selectable text and use a copy fallback without Chrome logs',async()=>{
  const oldDocument=globalThis.document,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const elements=new Map(['start','stop','mark','copy','save','status','report'].map(id=>['midi-capture-'+id,
    {listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},focus(){this.focused=true;},select(){this.selected=true;}}]));
  try {
    globalThis.document={getElementById:id=>elements.get(id)};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw Error('Unavailable');}}}});
    initMidiCaptureControls(()=>captureFeedbackView([],{currentEvent:null}));
    const el=id=>elements.get('midi-capture-'+id);
    el('start').listeners.click();assert.equal(el('stop').disabled,false);
    el('mark').listeners.click();el('stop').listeners.click();assert.equal(el('start').disabled,false);
    assert.match(el('report').value,/Guitar Trainer MIDI and feedback report/);
    assert.match(el('report').value,/Screenshot/);
    await el('copy').listeners.click();assert.equal(el('report').selected,true);
    assert.match(el('status').textContent,/Ctrl\+C/);
  } finally {
    stopMidiCapture();globalThis.document=oldDocument;
    if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;
  }
});

