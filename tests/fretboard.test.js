import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFretboardModel} from '../js/practice-visuals.js';
import {fretboardGeometry,fretX,fretWireX,fretInlayYs} from '../js/fretboard-geometry.js';
import {initFretboard,renderFretboard} from '../js/fretboard-ui.js';
import {profiles,nativeAlphaTab} from './fretboard-fixtures.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';

for(const profile of profiles)test(`${profile.name}: score-defined strings, targets and possible pitch positions without mutation`,()=>{
  const track={staves:[{tuning:profile.tuning,capo:profile.capo,transpositionPitch:0}]};
  const count=profile.tuning.length,highest=profile.tuning[0]+profile.capo,lowest=profile.tuning.at(-1)+profile.capo;
  const currentEvent={staffIndex:0,notes:[{id:'high',string:1,fret:0,midi:highest},{id:'low',string:count,fret:3,midi:lowest+3}]};
  const activeNotes=[{midi:highest},{midi:highest},{midi:lowest+3},{midi:0}];
  const before=JSON.stringify({track,currentEvent,activeNotes});
  const model=buildFretboardModel({track,currentEvent,activeNotes,noteStates:{high:'correct',low:'missed'},lastFeedback:{midi:lowest+3,type:'wrong'}});
  assert.equal(model.stringCount,count);assert.equal(model.supported,true);
  assert.deepEqual(model.targets.map(t=>[t.string,t.fret,t.state]),[[1,0,'correct'],[count,3,'missed']]);
  assert.equal(model.openPitches[0],highest);assert.equal(model.openPitches.at(-1),lowest);
  assert.ok(model.played.some(p=>p.string===count && p.fret===3 && p.state==='wrong'));
  assert.equal(new Set(model.played.map(p=>`${p.string}:${p.fret}`)).size,model.played.length);
  assert.deepEqual(model.unmappedPitches,[0]);
  assert.equal(JSON.stringify({track,currentEvent,activeNotes}),before);
});

test('held accepted chord tones stay green while multiple held wrong pitches stay red until release',()=>{
  const args={track:{staves:[{tuning:[64,59,55,50,45,40]}]},currentEvent:{notes:[{id:'a',string:1,fret:0,midi:64},{id:'b',string:2,fret:0,midi:59}]},noteStates:{a:'correct'},activeNotes:[{midi:64,channel:1},{midi:61,channel:1},{midi:62,channel:1}],liveWrongNotes:[{midi:61,channel:1},{midi:62,channel:1}],lastFeedback:{midi:62,type:'wrong'}};
  const before=JSON.stringify(args),model=buildFretboardModel(args);
  assert.ok(model.played.filter(p=>p.midi===64).every(p=>p.state==='correct'));
  assert.ok(model.played.filter(p=>[61,62].includes(p.midi)).every(p=>p.state==='wrong'));
  assert.ok(!buildFretboardModel({...args,activeNotes:[{midi:64,channel:1}],liveWrongNotes:[]}).played.some(p=>p.state==='wrong'));
  assert.equal(JSON.stringify(args),before);
});

test('six-channel string positions apply only to six-string tablature; other counts explicitly use possible positions',()=>{
  for(const profile of profiles) {
    const track={staves:[{tuning:profile.tuning,capo:0}]};
    const model=buildFretboardModel({track,inputMode:'hex-6ch',activeNotes:[{midi:profile.tuning[0],stringHint:1}]});
    assert.equal(model.stringMapped,profile.tuning.length===6);
    if(model.stringMapped)assert.ok(model.played.every(p=>p.string===1));
    else {assert.match(model.message,/does not map/);assert.match(model.message,/possible pitch positions/);}
  }
});

test('selected staff tuning, capo, sounding transposition and target bounds are respected',()=>{
  const track={staves:[{tuning:[64,59,55,50,45,40]},{tuning:[43,38,33,28],capo:2,transpositionPitch:12}]};
  const model=buildFretboardModel({track,currentEvent:{staffIndex:1,notes:[{id:'valid',string:4,fret:36,midi:54},{id:'outside',string:5,fret:3,midi:30},{id:'negative',string:1,fret:-1,midi:0},{id:'unsupported',string:1,fret:37,midi:70}]},activeNotes:[{midi:18}]});
  assert.deepEqual(model.openPitches,[33,28,23,18]);assert.equal(model.maxFret,36);assert.equal(model.targets.length,1);
  assert.ok(model.played.some(p=>p.string===4 && p.fret===0));assert.match(model.message,/Some target notes/);
  for(const tuning of [[],[NaN],[64.5],[-1],[128],undefined])assert.equal(buildFretboardModel({track:{staves:[{tuning}]}}).supported,false);
  assert.equal(buildFretboardModel({track:{staves:[{tuning:[64],isPercussion:true}]}}).supported,false);
});

test('every fret center lies between narrowing wires, open notes outside the nut, and left-hand reflection preserves geometry',()=>{
  for(let maxFret=24;maxFret<=36;maxFret++)for(let strings=1;strings<=12;strings++) {
    const geometry=fretboardGeometry(maxFret,strings);
    assert.ok(geometry.height>geometry.bottom);assert.ok(geometry.lastY<geometry.bottom);
    assert.ok(fretX(0,maxFret)<fretWireX(0,maxFret));
    let previousWidth=Infinity;
    for(let fret=1;fret<=maxFret;fret++) {
      const lower=fretWireX(fret-1,maxFret),upper=fretWireX(fret,maxFret),center=fretX(fret,maxFret);
      assert.ok(center>lower && center<upper);assert.ok(upper-lower<previousWidth);assert.ok(upper-lower>=19.99);
      previousWidth=upper-lower;
      assert.ok(Math.abs(fretX(fret,maxFret,true)+center-geometry.width)<1e-8);
      assert.ok(Math.abs(fretWireX(fret,maxFret,true)+upper-geometry.width)<1e-8);
    }
  }
});

test('double inlays use symmetric string gaps, including 2–3 and 4–5 on six strings',()=>{
  for(let count=1;count<=12;count++) {
    const {firstY,lastY,stringGap}=fretboardGeometry(24,count),ys=fretInlayYs(count,true);
    assert.equal(ys.length,count<3?1:2);
    assert.ok(ys.every(y=>y>=firstY && y<=lastY));
    if(count>1)assert.ok(ys.every(y=>Math.abs((y-firstY)/stringGap%1-0.5)<1e-8));
    assert.equal(ys[0]+ys.at(-1),firstY+lastY);
    if(count===6)assert.deepEqual(ys,[firstY+1.5*stringGap,firstY+3.5*stringGap]);
  }
});

test('native Guitar Pro import yields every string-count profile and unchanged Wait/Realtime pitch acceptance',()=>{
  const at=nativeAlphaTab(),settings=new at.Settings();
  const score=at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(readFileSync(new URL('./fixtures/fretboard-multistring.gp',import.meta.url))),settings);
  const midi=new at.midi.MidiFile(),generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
  const timeline=buildPlaybackTimeline(generator.tickLookup);
  assert.equal(score.tracks.length,profiles.length);
  for(const [index,profile] of profiles.entries()) {
    const events=getPracticeEvents(timeline,String(index));assert.equal(events.length,4);
    const model=buildFretboardModel({track:score.tracks[index],currentEvent:events[0]});
    assert.equal(model.stringCount,profile.tuning.length);assert.deepEqual([...model.openPitches],profile.tuning.map(p=>p+profile.capo));
    assert.deepEqual(model.targets.map(p=>[p.string,p.fret]),[[1,0],[profile.tuning.length,3]]);
    assert.equal(buildFretboardModel({track:score.tracks[index],currentEvent:events[3]}).maxFret,36);
    const wait=new WaitSession(events),realtime=new RealtimeSession(events);realtime.started=true;
    for(const note of events[0].notes) {wait.noteOn(0,{midi:note.midi,channel:1});realtime.noteOn({midi:note.midi,channel:1,at:0},0);}
    assert.ok(wait.records[0].slots.every(slot=>slot.hit));assert.ok(realtime.records[0].slots.every(slot=>slot.hit));
  }
});

test('SVG renders all strings, capo-aware inlays, separate wire/note coordinates and feedback states in both orientations',()=>{
  const previous=globalThis.document;
  class Element {constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.scrollLeft=0;}appendChild(el){this.children.push(el);return el;}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}querySelector(){return this.children.find(c=>c.className==='fretboard-scroll');}}
  globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
  try {
    for(const profile of profiles)for(const leftHanded of [false,true]) {
      const container=new Element('div'),help=new Element('p');initFretboard(container,help);
      const count=profile.tuning.length;
      const event={notes:[{id:'target',string:count,fret:3,midi:profile.tuning.at(-1)+profile.capo+3}]};
      const model=buildFretboardModel({track:{staves:[profile]},currentEvent:event,activeNotes:[{midi:event.notes[0].midi}],leftHanded,noteStates:{target:'completed-with-errors'}});
      renderFretboard(model);
      const scroll=container.querySelector(),svg=scroll.children[0];
      assert.equal(container.children.length,1);assert.match(help.textContent,/Frets relative to capo/);
      assert.equal(container.attrs['aria-label'],'Practice fretboard');
      assert.equal(scroll.attrs.tabindex,'0');assert.match(svg.attrs['aria-label'],new RegExp(`${count}-string`));
      assert.equal(svg.children.filter(c=>c.attrs.class==='fretboard-string').length,count);
      assert.equal(svg.children.filter(c=>c.attrs.class==='fretboard-nut').length,1);
      assert.equal(svg.children.filter(c=>c.attrs.class==='fretboard-inlay' && c.attrs['data-physical-fret']==='12').length,2-(count===1?1:0));
      assert.deepEqual(svg.children.filter(c=>c.attrs.class==='fretboard-inlay' && c.attrs['data-physical-fret']==='12').map(c=>Number(c.attrs.cy)),fretInlayYs(count,true));
      const target=svg.children.find(c=>c.attrs.class==='fretboard-marker fretboard-marker-target');
      assert.equal(target.attrs['data-state'],'completed-with-errors');assert.equal(target.children.at(-1).textContent,'!');
      assert.ok(!svg.children.filter(c=>c.attrs.class==='fretboard-fret').some(c=>c.attrs.x1===target.children[1].attrs.cx));
      scroll.scrollLeft=80;renderFretboard({...model,played:[]});
      assert.equal(container.querySelector().scrollLeft,80);
      assert.ok(!container.querySelector().children[0].children.some(c=>c.attrs.class==='fretboard-marker fretboard-marker-played'));
      renderFretboard({...model,unmappedPitches:[0]});assert.match(help.textContent,/Outside displayed positions: C-1/);
      renderFretboard({supported:false,message:'No tuning'});assert.equal(container.querySelector(),undefined);
      assert.equal(container.children.length,1);assert.equal(container.children[0].textContent,'No tuning');assert.equal(help.textContent,'No tuning');
    }
  } finally {globalThis.document=previous;}
});
