// Key construction and proportions adapted from Piano Trainer Studio's createKeyboard.
// The keys are a read-only projection of Guitar Trainer's practice session.
import {midiToNoteName} from './note-utils.js';

const blackIndices=[1,3,6,8,10];
const symbols={correct:'✓',wrong:'×',played:'●'};

export function keyboardFeedback(event,noteStates,heldNotes,wrongNotes) {
  const keys=new Map();
  function key(midi) {
    if(!keys.has(midi))keys.set(midi,{midi,target:false,state:'expected'});
    return keys.get(midi);
  }
  for(const note of event?.notes??[]) {
    if(event.isPercussive || note.isDead || note.attack===false || (event.pitches && !event.pitches.includes(note.midi)))continue;
    const marker=key(note.midi);
    marker.target=true;
    if(['correct','completed-with-errors'].includes(noteStates[note.id]))marker.state='correct';
  }
  for(const note of heldNotes) {
    const marker=key(note.midi);
    if(note.credited)marker.state='correct';
    else if(marker.state!=='correct')marker.state='played';
  }
  for(const note of wrongNotes) {
    if(!note.pending)key(note.midi).state='wrong';
  }
  return [...keys.values()].filter(key=>Number.isInteger(key.midi) && key.midi>=0 && key.midi<=127);
}

export function initPracticeKeyboard(board) {
  const nodes=new Map();
  let previous=[],lastFocus='',lastWidth=0;
  function build(first,last) {
    nodes.clear();
    const fragment=document.createDocumentFragment();
    let whites=0;
    for(let midi=first;midi<=last;midi++) {
      const el=document.createElement('div'),black=blackIndices.includes(midi%12);
      el.className='piano-key '+(black?'black':'white');
      el.dataset.midi=midi;
      el.title=midiToNoteName(midi);
      if(!black)whites++;
      const label=document.createElement('span');
      el.append(label);
      fragment.append(el);
      nodes.set(midi,el);
    }
    board.style.setProperty('--white-keys',whites);
    board.replaceChildren(fragment);
    lastFocus='';previous=[];
  }
  return function render(markers) {
    const pitches=markers.map(marker=>marker.midi);
    if(!nodes.size || pitches.some(midi=>!nodes.has(midi))) {
      const first=nodes.has(0) || Math.min(...pitches)<21 ? 0 : 21;
      const last=nodes.has(127) || Math.max(...pitches)>108 ? 127 : 108;
      build(first,last);
    }
    const targets=markers.filter(marker=>marker.target);
    const focus=(targets.length?targets:markers).map(marker=>marker.midi);
    const focusId=focus.join(',');
    const viewport=board.parentElement;
    if(focus.length && (focusId!==lastFocus || viewport.clientWidth!==lastWidth)) {
      const left=nodes.get(Math.min(...focus)).offsetLeft;
      const rightKey=nodes.get(Math.max(...focus)),right=rightKey.offsetLeft+rightKey.offsetWidth;
      if(left<viewport.scrollLeft || right>viewport.scrollLeft+viewport.clientWidth)
        viewport.scrollLeft=(left+right-viewport.clientWidth)/2;
    }
    lastFocus=focusId;lastWidth=viewport.clientWidth;
    if(markers.length===previous.length && markers.every((m,i)=>m.midi===previous[i].midi && m.target===previous[i].target && m.state===previous[i].state))return;
    for(const {midi} of previous) {
      const el=nodes.get(midi);
      delete el.dataset.state;delete el.dataset.target;
      el.firstChild.textContent='';
    }
    for(const {midi,state,target} of markers) {
      const el=nodes.get(midi);
      el.dataset.state=state;
      if(target)el.dataset.target='';
      el.firstChild.textContent=(symbols[state]?symbols[state]+'\n':'')+midiToNoteName(midi);
    }
    board.setAttribute('aria-label',['Practice keyboard',...markers.map(m=>midiToNoteName(m.midi)+' '+m.state)].join(', '));
    previous=markers;
  };
}
