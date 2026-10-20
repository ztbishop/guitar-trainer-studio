import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildWrongFretMarks,wrongFretGeometry,buildTabErrorTargets} from '../js/tab-feedback.js';
import {buildNotationMarks,noteStatesFromRecords} from '../js/practice-visuals.js';
import {notationFeedbackGeometry} from '../js/notation-feedback.js';
import {WaitSession} from '../js/wait-session.js';
import {buildPolyWrongFretMarks} from '../js/poly-feedback.js';

const event={id:'a',staffIndex:0,notes:[{sourceNoteId:'1',string:2,fret:1,midi:60}]};
const track={staves:[{tuning:[64,59,55,50,45,40],capo:0,transpositionPitch:0}]};
const wrong=(midi,at=1,stringHint=2)=>({eventId:'a',midi,at,stringHint,wrongPitch:true});
const base={track,currentEvent:event,inputMode:'hex-6ch',verified:true};
test('active Hex circles mark pending frets on detected strings, preserve correct tones and release independently',()=>{
  const chord={...event,notes:[{...event.notes[0],id:'n1'},{id:'n2',sourceNoteId:'2',string:3,midi:57,fret:2},
    {id:'n3',sourceNoteId:'3',string:1,midi:64,fret:0}]};
  const options={inputMode:'hex-6ch',liveWrongNotes:[wrong(61),wrong(58,2,3)],noteStates:{n3:'correct'}};
  const marks=buildTabErrorTargets([chord],chord,[],options);
  assert.deepEqual(marks.map(m=>[m.sourceNoteId,m.state]),[['1','wrong'],['2','wrong']]);
  assert.deepEqual(buildTabErrorTargets([chord],chord,[],{...options,liveWrongNotes:[options.liveWrongNotes[1]]}).map(m=>m.sourceNoteId),['2']);
  assert.deepEqual(buildTabErrorTargets([chord],chord,[],{...options,liveWrongNotes:[]}),[]);
  for(const changes of [{inputMode:'single-channel'},{liveWrongNotes:[wrong(61,1,null)]},
    {liveWrongNotes:[{...wrong(61),wrongPitch:false}]},{liveWrongNotes:[wrong(65,1,1)]},
    {liveWrongNotes:[{...wrong(61),eventId:'other'}]}]) {
    assert.deepEqual(buildTabErrorTargets([chord],chord,[],{...options,...changes}),[]);
  }
  const history=[{eventId:'a',completed:true,wrongNotes:[wrong(61)]}];
  assert.ok(buildTabErrorTargets([chord],chord,history,options).every(m=>m.state==='completed-with-errors'));
});
test('active circles respect repeated occurrences and Realtime attributed targets',()=>{
  const repeat={...event,id:'b'};
  const options={inputMode:'hex-6ch',liveWrongNotes:[wrong(61)]};
  assert.deepEqual(buildTabErrorTargets([event,repeat],repeat,[],options),[]);
  assert.deepEqual(buildTabErrorTargets([event,repeat],repeat,[],{...options,mode:'realtime'}),[]);
  const next={...repeat,notes:[{...event.notes[0],sourceNoteId:'2'}]};
  assert.equal(buildTabErrorTargets([event,next],next,[],{...options,mode:'realtime'})[0].sourceNoteId,'1');
});
test('Hex fret detail uses configured channels, valid score pitch mapping and an active wrong note',()=>{
  const liveWrongNotes=[wrong(61)];
  assert.deepEqual(buildWrongFretMarks({...base,liveWrongNotes}),[{kind:'wrong-fret',sourceNoteId:'1',string:2,fret:2,retained:false,eventId:'a'}]);
  for(const changes of [{inputMode:'single-channel'},{liveWrongNotes:[]},
    {history:[{eventId:'a',completed:true}]},{liveWrongNotes:[{...wrong(61),eventId:'old'}]},
    {liveWrongNotes:[{...wrong(61),wrongPitch:false}]},{liveWrongNotes:[wrong(61,1,null)]},
    {track:{staves:[{...track.staves[0],capo:1}]}},{liveWrongNotes:[wrong(20)]}])assert.deepEqual(buildWrongFretMarks({...base,liveWrongNotes,...changes}),[]);
});
test('latest active wrong fret per string, independent release, capo and sounding transposition',()=>{
  const chord={...event,notes:[...event.notes,{sourceNoteId:'2',string:3,fret:2,midi:57}]};
  const live=[wrong(61,1),wrong(62,2),wrong(58,3,3)];
  assert.deepEqual(buildWrongFretMarks({...base,currentEvent:chord,liveWrongNotes:live}).map(n=>[n.string,n.fret]),[[2,3],[3,3]]);
  assert.deepEqual(buildWrongFretMarks({...base,currentEvent:chord,liveWrongNotes:[live[2]]}).map(n=>n.string),[3]);
  assert.equal(buildWrongFretMarks({...base,liveWrongNotes:[wrong(56,1,3)]})[0].string,3);
  const shifted={staves:[{...track.staves[0],capo:2,transpositionPitch:-1}]};
  assert.equal(buildWrongFretMarks({...base,track:shifted,currentEvent:{...event,notes:[{...event.notes[0],midi:63}]},liveWrongNotes:[wrong(64)]})[0].fret,2);
});

const context=vm.createContext({console,process});
vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const at=context.alphaTab;
function render(profile,scale=1,tex='1.2.4 3.2.4 5.2.4 7.2.4',capo=0,transpose=0) {
  const settings=new at.Settings();settings.core.engine='svg';settings.core.includeNoteBounds=true;
  settings.display.staveProfile=profile;settings.display.scale=scale;
  const parser=new at.importer.AlphaTexImporter();parser.initFromString(tex,settings);
  const score=parser.readScore(),staff=score.tracks[0].staves[0];
  staff.capo=capo;staff.transpositionPitch=transpose;
  const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=1000;renderer.renderScore(score,[0]);
  const notes=staff.bars[0].voices[0].beats.flatMap(b=>b.notes),lookup=new Map(notes.map(n=>[String(n.id),n]));
  return {renderer,notes,lookup,staff,metrics:{profile,scale,tabLineSpacing:settings.display.resources.engravingSettings.tabLineSpacing}};
}
test('Wait MIDI to native tab geometry shows immediate red with green partial tones, then release and completion',()=>{
  for(const profile of [0,1,3,4])for(const scale of [.7,1,1.4]) {
    const h=render(profile,scale,'(1.1 1.2 1.3).4 3.2.4');
    const notes=h.notes.slice(0,3).map(n=>({id:`n${n.id}`,sourceNoteId:String(n.id),string:7-n.string,fret:n.fret,midi:n.realValue}));
    const target={id:'a',notes},s=new WaitSession([target],{hex:true});
    s.noteOn(0,{midi:notes[0].midi,channel:1,stringHint:notes[0].string});
    const bad={midi:notes[1].midi+1,channel:2,stringHint:notes[1].string};s.noteOn(0,bad);
    const geometry=()=>{
      const states=noteStatesFromRecords(s.records,true,{hex:true});
      const marks=[...buildNotationMarks([target],target,states),...buildTabErrorTargets([target],target,s.feedbackHistory(),
        {inputMode:'hex-6ch',liveWrongNotes:[...s.liveWrong.values()],noteStates:states})];
      return notationFeedbackGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics).targets.filter(m=>m.kind==='outline');
    };
    assert.deepEqual(geometry().map(m=>m.state).sort(),['correct','expected','wrong']);
    const red=geometry().find(m=>m.state==='wrong');
    const native=h.renderer.boundsLookup.findBeats(h.notes[1].beat).at(-1).notes.find(b=>String(b.note.id)===notes[1].sourceNoteId).noteHeadBounds;
    assert.equal(red.x,native.x-1.25);assert.equal(red.y,native.y-2.75);
    assert.equal(red.width,native.w+2.5);assert.equal(red.height,native.h+1.5);
    s.noteOff(bad);assert.deepEqual(geometry().map(m=>m.state).sort(),['correct','expected','expected']);
    for(const n of notes.slice(1))s.noteOn(0,{midi:n.midi,channel:n.string,stringHint:n.string});
    assert.deepEqual(geometry().map(m=>m.state).sort(),['completed-with-errors','correct','correct']);
  }
});
test('live single- and double-digit frets remain visible across profiles, zoom and crowded positions',()=>{
  for(const profile of [0,1,3,4])for(const scale of [.7,1,1.4]) {
    const h=render(profile,scale),note=h.notes[0];
    const marks=[{kind:'wrong-fret',sourceNoteId:String(note.id),string:7-note.string,fret:12}];
    const badges=wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics);
    assert.equal(badges.length,1,`profile ${profile}, scale ${scale}`);
    assert.equal(badges[0].fontSize,14*scale);
    const custom=wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,{...h.metrics,tabFontSize:20});
    assert.equal(custom[0].fontSize,20*scale);assert.equal(custom[0].height,24*scale);
    const badge=badges[0];
    const candidates=h.renderer.boundsLookup.findBeats(note.beat);
    const tab=candidates[candidates.length-1],b=tab.notes[0].noteHeadBounds;
    assert.ok(badge.x>b.x+b.w+3*scale);assert.equal(badge.y+badge.height/2,b.y+b.h/2);
    const nextTab=h.renderer.boundsLookup.findBeats(h.notes[1].beat).at(-1);
    const next=nextTab.notes[0].noteHeadBounds,old=next.x;next.x=badge.x;
    assert.equal(wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics).length,1);
    next.x=old;
  }
  const h=render(2),note=h.notes[0];
  assert.deepEqual(wrongFretGeometry([{kind:'wrong-fret',sourceNoteId:String(note.id),string:2,fret:2}],h.lookup,h.renderer.boundsLookup,h.metrics),[]);
});

test('detected strings project onto native tab lines without changing cursor column',()=>{
  for(const scale of [.7,1,1.4]) {
    const h=render(1,scale,'(1.1 1.2 1.3 1.4 1.5 1.6).4 3.2.4');
    const anchor=h.notes[0];
    const marks=Array.from({length:6},(_,i)=>({kind:'wrong-fret',sourceNoteId:String(anchor.id),string:i+1,fret:2}));
    const badges=wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics);
    assert.equal(badges.length,6);
    for(const badge of badges) {
      const reference=h.notes.find(n=>7-n.string===badge.string);
      const b=h.renderer.boundsLookup.findBeats(reference.beat).at(-1).notes.find(n=>n.note.id===reference.id).noteHeadBounds;
      assert.ok(Math.abs(badge.y+badge.height/2-(b.y+b.h/2))<.001);
      assert.equal(badge.x,badges[0].x);
    }
  }
});
test('fret interpretation agrees with native capo and sounding transposition',()=>{
  for(const [capo,transpose] of [[0,0],[2,0],[0,-2],[2,-1]]) {
    const h=render(1,1,undefined,capo,transpose),note=h.notes[0];
    const currentEvent={id:'a',notes:[{sourceNoteId:String(note.id),midi:note.realValue,string:7-note.string,fret:note.fret}]};
    const marks=buildWrongFretMarks({...base,track:{staves:[h.staff]},currentEvent,liveWrongNotes:[wrong(note.realValue+1)]});
    assert.equal(marks.length,1);assert.equal(marks[0].fret,note.fret+1);
  }
});

test('last retained wrong fret per string survives release/completion; a new occurrence clears shared written feedback',()=>{
  const history=[{eventId:'a',completed:true,wrongNotes:[wrong(61,1),wrong(71,2),wrong(58,3,3)]}];
  const marks=buildWrongFretMarks({...base,history,liveWrongNotes:[]});
  assert.deepEqual(marks.map(n=>[n.string,n.fret,n.retained]),[[2,12,true],[3,3,true]]);
  const next={...event,id:'b'};
  assert.deepEqual(buildWrongFretMarks({...base,events:[event,next],currentEvent:next,history}),[]);
  assert.deepEqual(buildWrongFretMarks({...base,history,inputMode:'single-channel'}),[]);
});
test('Realtime held errors stay live after cursor advancement; release restores retained side feedback',()=>{
  const next={id:'b',notes:[{...event.notes[0],sourceNoteId:'2'}]};
  const history=[{eventId:'a',completed:true,wrongNotes:[wrong(71)]}];
  const args={...base,mode:'realtime',events:[event,next],currentEvent:next,history};
  assert.equal(buildWrongFretMarks({...args,liveWrongNotes:[wrong(71)]})[0].retained,false);
  assert.equal(buildWrongFretMarks({...args,liveWrongNotes:[]})[0].retained,true);
});
test('retained double digits stay beside each detected string across zoom',()=>{
  for(const scale of [.7,1,1.4]) {
    const h=render(1,scale,'(1.1 1.2 1.3 1.4 1.5 1.6).4 3.2.4');
    const note=h.notes[0],marks=Array.from({length:6},(_,i)=>({kind:'wrong-fret',sourceNoteId:String(note.id),string:i+1,fret:12,retained:true}));
    const badges=wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics);
    assert.equal(badges.length,6);
    assert.ok(badges.every(b=>b.fontSize===14*scale && b.retained && b.y+b.height/2===b.targetY));
    assert.equal(new Set(badges.map(b=>b.y)).size,6);
    const live=wrongFretGeometry(marks.map(m=>({...m,retained:false})),h.lookup,h.renderer.boundsLookup,h.metrics);
    for(const [i,badge] of badges.entries()) {
      assert.ok(Math.abs(live[i].x-badge.x-2*scale)<.001);
      assert.deepEqual([badge.y,badge.width,badge.height],[live[i].y,live[i].width,live[i].height]);
    }
  }
});

test('completed mistakes leave a target indicator independent of fret-detail availability',()=>{
  const history=[{eventId:'a',completed:true,wrongNotes:[wrong(61)]}];
  assert.equal(buildTabErrorTargets([event],null,history)[0].sourceNoteId,'1');
  const next={...event,id:'b'};
  assert.deepEqual(buildTabErrorTargets([event,next],next,history),[]);
  assert.deepEqual(buildTabErrorTargets([event],event,[{eventId:'a',completed:true,wrongNotes:[{...wrong(60),wrongPitch:false}]}]),[]);
});

test('Hex MIDI immediately produces live and retained Wait fret numbers without any string-check state',async()=>{
  const {normalizeMidiMessage}=await import('../js/midi-router.js');
  const {WaitSession}=await import('../js/wait-session.js');
  const h=render(1,1,'5.4.4'),native=h.notes[0];
  const target={id:'a',notes:[{id:'n',sourceNoteId:String(native.id),midi:native.realValue,string:7-native.string,fret:native.fret}]};
  // This checks strict retained-error projection independently of artifact tolerance.
  const session=new WaitSession([target],{hex:true,filterHexSpikes:false});
  const input=normalizeMidiMessage({data:[0x92,62,100],receivedTime:0},{inputMode:'hex-6ch',hexChannelBase:1});
  assert.equal(input.stringHint,4);session.noteOn(0,input);
  const args={track:{staves:[h.staff]},currentEvent:target,inputMode:'hex-6ch',verified:false};
  const live=buildWrongFretMarks({...args,history:session.feedbackHistory(),liveWrongNotes:[...session.liveWrong.values()]});
  assert.equal(live[0].fret,12);assert.equal(wrongFretGeometry(live,h.lookup,h.renderer.boundsLookup,h.metrics).length,1);
  session.noteOff(input);session.noteOn(0,{...input,midi:native.realValue});
  const retained=buildWrongFretMarks({...args,history:session.feedbackHistory()});
  assert.equal(retained[0].fret,12);assert.equal(retained[0].retained,true);
  assert.equal(wrongFretGeometry(retained,h.lookup,h.renderer.boundsLookup,h.metrics).length,1);
});
test('Realtime Hex fret feedback has no verification prerequisite',async()=>{
  const {RealtimeSession}=await import('../js/realtime-session.js');
  const target={...event,startTimeMs:0};
  const session=new RealtimeSession([target],{hex:true});session.started=true;
  session.noteOn({...wrong(71),channel:5},0);
  const args={...base,verified:false,mode:'realtime'};
  assert.equal(buildWrongFretMarks({...args,liveWrongNotes:[...session.liveWrong.values()]})[0].fret,12);
  session.advance(1000);session.noteOff({midi:71,channel:5});
  assert.equal(buildWrongFretMarks({...args,history:session.feedbackHistory()})[0].retained,true);
});

test('Poly MIDI wrong attacks produce visible inferred double-digit frets at native single-note/chord tab bounds',()=>{
  for(const tex of ['1.2.4','(1.1 1.2).4'])for(const profile of [0,1,3,4])for(const scale of [.7,1,1.4]) {
    const h=render(profile,scale,tex);
    const target={id:'a',notes:h.notes.map(n=>({id:`n${n.id}`,sourceNoteId:String(n.id),string:7-n.string,fret:n.fret,midi:n.realValue}))};
    const s=new WaitSession([target]);if(target.notes.length>1)s.noteOn(0,{midi:target.notes[0].midi,channel:1});
    const last=target.notes.at(-1),wrong={midi:last.midi+11,channel:1};s.noteOn(0,wrong);
    const args=()=>({track:{staves:[h.staff]},events:[target],currentEvent:target,history:s.feedbackHistory(),liveWrongNotes:[...s.liveWrong.values()],enabled:true});
    for(const retained of [false,true]) {
      if(retained){s.noteOff(wrong);s.noteOn(0,{midi:last.midi,channel:1});}
      const marks=buildPolyWrongFretMarks(args()),geometry=wrongFretGeometry(marks,h.lookup,h.renderer.boundsLookup,h.metrics);
      assert.equal(geometry.length,1);assert.equal(geometry[0].fret,12);assert.equal(geometry[0].displayFret,undefined);assert.equal(geometry[0].retained,retained);
      assert.equal(geometry[0].fontSize,14*scale);assert.ok(Math.abs(geometry[0].width-23.2*scale)<.001);assert.equal(geometry[0].inferred,true);
    }
  }
});
