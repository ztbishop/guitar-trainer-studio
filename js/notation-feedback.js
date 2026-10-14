// Pure score-overlay geometry. The host supplies native bounds and engraving metrics.
import {standardBeatForNote} from './practice-visuals.js';
import {tabBeat} from './tab-feedback.js';

const semitones=[0,2,4,5,7,9,11];
const letters=['C','D','E','F','G','A','B'];
const sharpOrder=[3,0,4,1,5,2,6],flatOrder=[6,2,5,1,4,0,3];
const clefTopSteps={1:32,2:30,3:26,4:38}; // alphaTab C3/C4/F4/G2
const ottavaShift={0:-24,1:-12,2:0,3:12,4:24};

export function spellPitch(value,keySignature=0,accidentalMode=0) {
  if(!Number.isInteger(value) || !Number.isInteger(keySignature) || Math.abs(keySignature)>7)return null;
  const keyOffsets=Array(7).fill(0);
  for(const degree of (keySignature<0?flatOrder:sharpOrder).slice(0,Math.abs(keySignature)))keyOffsets[degree]=Math.sign(keySignature);
  const chroma=((value%12)+12)%12;
  const candidates=[];
  for(let degree=0;degree<7;degree++)for(let offset=-2;offset<=2;offset++) {
    if(((semitones[degree]+offset+12)%12)===chroma)candidates.push({degree,offset});
  }
  // Native default spelling: prefer a key-signature tone, then natural/single
  // accidental spelling in the key's sharp/flat direction. Forced score spelling
  // is respected when checking the native anchor, not imposed on played MIDI.
  const forced={1:0,2:0,3:1,4:2,5:-1,6:-2}[accidentalMode];
  const rank=c=>Math.abs(c.offset)*10+(c.offset!==0 && Math.sign(c.offset)!==(keySignature<0?-1:1)?1:0);
  candidates.sort((a,b)=>rank(a)-rank(b));
  const chosen=(forced!==undefined?candidates.find(c=>c.offset===forced):null)
    ??candidates.find(c=>c.offset===keyOffsets[c.degree])??candidates[0];
  const octave=Math.floor((value-semitones[chosen.degree]-chosen.offset)/12)-1;
  const accidental={[-2]:'𝄫',[-1]:'♭',0:'♮',1:'♯',2:'𝄪'}[chosen.offset];
  return {...chosen,octave,diatonic:octave*7+chosen.degree,accidental,
    name:`${letters[chosen.degree]}${chosen.offset===0?'':accidental}${octave}`};
}

export function displayedMidi(midi,note) {
  const bar=note?.beat?.voice?.bar,staff=bar?.staff;
  const beatShift=ottavaShift[note?.beat?.ottava??2],clefShift=ottavaShift[bar?.clefOttava??2];
  if(!Number.isInteger(midi) || beatShift===undefined || clefShift===undefined || !Number.isFinite(staff?.displayTranspositionPitch))return null;
  return midi+beatShift+clefShift-staff.displayTranspositionPitch;
}

function validBounds(b) {return b && [b.x,b.y,b.w,b.h].every(Number.isFinite) && b.w>0 && b.h>0;}

function staffGeometry(note,beat,metrics) {
  const bar=note.beat.voice.bar,staff=bar.staff;
  const topSteps=clefTopSteps[bar.clef];
  if(staff.isPercussion || staff.standardNotationLineCount!==5 || topSteps===undefined)return null;
  const {scale,oneStaffSpace,staffLineThickness}=metrics;
  if(![scale,oneStaffSpace,staffLineThickness].every(Number.isFinite) || scale<=0 || oneStaffSpace<=0 || staffLineThickness<0)return null;
  const space=oneStaffSpace*scale;
  const top=beat.barBounds?.visualBounds?.y-staffLineThickness*scale/2;
  if(!Number.isFinite(top))return null;
  // Verify the projection against actual laid-out noteheads. Fail closed for
  // special note types/layouts whose displayed position differs from this model.
  const anchors=(beat.notes||[]).filter(b=>validBounds(b.noteHeadBounds));
  if(!anchors.length)return null;
  for(const anchor of anchors) {
    const n=anchor.note;
    if(n.isPercussion || n.hasQuarterToneOffset)return null;
    const pitch=spellPitch(n.displayValue,bar.keySignature,n.accidentalMode);
    if(!pitch)return null;
    const predicted=top+(topSteps-pitch.diatonic)*space/2;
    if(Math.abs(predicted-(anchor.noteHeadBounds.y+anchor.noteHeadBounds.h/2))>Math.max(1,space*0.12))return null;
  }
  return {top,space,topSteps};
}

export function notationFeedbackGeometry(marks,noteLookup,boundsLookup,metrics) {
  const targets=[],wrongNotes=[];
  const tabErrors=new Set(marks.filter(m=>m.kind==='tab-error').map(m=>m.sourceNoteId));
  const polyErrors=new Set(marks.filter(m=>m.kind==='poly-error').map(m=>m.sourceNoteId));
  if(!boundsLookup?.isFinished)return {targets,wrongNotes};
  for(const mark of marks) {
    const note=noteLookup.get(mark.sourceNoteId);if(!note)continue;
    const standard=standardBeatForNote(note,boundsLookup,metrics.profile??0);
    if(mark.kind==='wrong-pitches') {
      if(!standard)continue;
      const bound=standard.notes?.find(b=>String(b.note.id)===mark.sourceNoteId)?.noteHeadBounds;
      const staff=staffGeometry(note,standard,metrics);
      if(!validBounds(bound) || !staff)continue;
      const pitches=[...new Set(mark.pitches)].filter(midi=>Number.isInteger(midi)&&midi>=0&&midi<=127);
      for(const midi of pitches) {
        const pitch=spellPitch(displayedMidi(midi,note),note.beat.voice.bar.keySignature);
        if(!pitch)continue;
        const steps=staff.topSteps-pitch.diatonic;
        const cy=staff.top+steps*staff.space/2;
        const width=metrics.noteHeadWidth*metrics.scale,height=metrics.noteHeadHeight*metrics.scale;
        if(![width,height].every(Number.isFinite) || width<=0 || height<=0)continue;
        // Every mistake stays in this target's cursor column. Same-line pitches
        // may overlap; never move them into earlier or later target positions.
        const cx=bound.x+bound.w/2;
        const ledgerYs=[];
        if(steps<0)for(let step=-2;step>=steps;step-=2)ledgerYs.push(staff.top+step*staff.space/2);
        if(steps>8)for(let step=10;step<=steps;step+=2)ledgerYs.push(staff.top+step*staff.space/2);
        wrongNotes.push({...mark,midi,displayMidi:displayedMidi(midi,note),spelling:pitch.name,accidental:pitch.accidental,
          offset:pitch.offset,cx,cy,rx:width/2,ry:height/2,space:staff.space,
          accidentalX:cx-width/2-staff.space*0.95,ledgerYs,
          label:`${mark.retained?'Earlier mistake':'Played'}: ${pitch.name} • MIDI ${midi}`});
      }
    } else if(!mark.kind || mark.kind==='tab-error' || mark.kind==='poly-error') {
      if(!mark.kind && polyErrors.has(mark.sourceNoteId))continue;
      for(const beat of boundsLookup.findBeats(note.beat)||[]) {
        if(mark.kind==='tab-error' && beat!==tabBeat(note,boundsLookup,metrics.profile??0))continue;
        const b=beat.notes?.find(item=>String(item.note.id)===mark.sourceNoteId)?.noteHeadBounds;
        if(!validBounds(b))continue;
        if(beat===standard) {
          if(mark.kind!=='tab-error')targets.push({...mark,kind:'notehead',cx:b.x+b.w/2,cy:b.y+b.h/2,rx:b.w/2,ry:b.h/2});
        }
        else if(mark.kind==='tab-error' || !tabErrors.has(mark.sourceNoteId) || mark.state==='correct' && mark.active)
          targets.push({...mark,kind:'outline',x:b.x-1.25,y:b.y-2.75,width:b.w+2.5,height:b.h+1.5});
      }
    }
  }
  return {targets,wrongNotes};
}

// Accidental paths in staff-space units; independent of browser text fonts.
export function accidentalPath(offset) {
  if(offset===-1)return 'M 0 -1.6 L 0 0.8 M 0 -0.1 C 1 -0.9 1 0.45 0 0.8';
  if(offset===1)return 'M 0.15 -1.2 L 0.15 1.2 M 0.65 -1.35 L 0.65 1.05 M -0.1 -0.35 L 0.9 -0.55 M -0.1 0.35 L 0.9 0.15';
  if(offset===0)return 'M 0 -1.2 L 0 0.55 L 0.65 0.35 M 0 -0.35 L 0.65 -0.55 L 0.65 1.2';
  if(offset===2)return 'M 0 -0.5 L 0.8 0.5 M 0.8 -0.5 L 0 0.5';
  return 'M -0.3 -1.6 L -0.3 0.8 M -0.3 -0.1 C 0.5 -0.9 0.5 0.45 -0.3 0.8 M 0.45 -1.6 L 0.45 0.8 M 0.45 -0.1 C 1.25 -0.9 1.25 0.45 0.45 0.8';
}
