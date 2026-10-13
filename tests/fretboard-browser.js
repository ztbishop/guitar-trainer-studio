import {buildFretboardModel} from '../js/practice-visuals.js';
import {initFretboard,renderFretboard} from '../js/fretboard-ui.js';
const profiles=await (await fetch('./fixtures/fretboard-profiles.json')).json();
const profile=document.getElementById('profile'),feedback=document.getElementById('feedback'),left=document.getElementById('left'),fixture=document.getElementById('fixture'),result=document.getElementById('result');
for(const [i,p] of profiles.entries()){const option=document.createElement('option');option.value=i;option.textContent=p.name;profile.appendChild(option);}
profile.value='4';initFretboard(fixture);
function modelFor(index,state,leftHanded) {
  const data=profiles[index],event=data.events[0],first=event.notes[0],last=event.notes.at(-1),states={};
  let activeNotes=[],lastFeedback=null;
  if(state==='partial') {states[first.id]='correct';activeNotes=[{midi:first.midi},{midi:last.midi+1}];lastFeedback={midi:last.midi+1,type:'wrong'};}
  if(state==='correct') {for(const note of event.notes)states[note.id]='correct';activeNotes=event.notes.map(note=>({midi:note.midi}));lastFeedback={midi:last.midi,type:'correct'};}
  if(state==='missed')for(const note of event.notes)states[note.id]='missed';
  return buildFretboardModel({track:data.track,currentEvent:event,noteStates:states,activeNotes,lastFeedback,leftHanded});
}
function refresh(){renderFretboard(modelFor(Number(profile.value),feedback.value,left.checked));}
for(const control of [profile,feedback,left])control.addEventListener('change',refresh);
document.getElementById('run').addEventListener('click',()=>{
  let cases=0;
  const check=(value,message)=>{if(!value)throw Error(message);};
  try {
    for(let index=0;index<profiles.length;index++)for(const handed of [false,true])for(const state of ['expected','partial','correct','missed']) {
      const model=modelFor(index,state,handed);renderFretboard(model);
      const svg=fixture.querySelector('svg'),scroll=fixture.querySelector('.fretboard-scroll');
      check(fixture.children.length===1 && fixture.firstElementChild===scroll,'Explanatory text remains in neck panel');
      check(svg.querySelectorAll('.fretboard-string').length===model.stringCount,'Incorrect string count');
      check(svg.querySelectorAll('.fretboard-marker-target').length===model.targets.length,'Missing target');
      check(svg.getAttribute('aria-label').includes(`${model.stringCount}-string`),'Incorrect accessible string label');
      check(document.documentElement.scrollWidth<=document.documentElement.clientWidth,'Document overflow');
      const strings=[...svg.querySelectorAll('.fretboard-string')].map(s=>Number(s.getAttribute('y1')));
      if(model.stringCount===6)for(const fret of [12,24]) {
        const ys=[...svg.querySelectorAll(`.fretboard-inlay[data-physical-fret="${fret}"]`)].map(dot=>Number(dot.getAttribute('cy')));
        check(ys.length===2 && ys[0]>strings[1] && ys[0]<strings[2] && ys[1]>strings[3] && ys[1]<strings[4],'Double inlays occupy incorrect string gaps');
      }
      for(const circle of svg.querySelectorAll('.fretboard-marker circle')) {
        check(Number.isFinite(Number(circle.getAttribute('cx'))) && Number.isFinite(Number(circle.getAttribute('cy'))),'Invalid marker coordinate');
        const box=svg.viewBox.baseVal;check(Number(circle.getAttribute('cx'))>0 && Number(circle.getAttribute('cx'))<box.width,'Marker outside neck view');
      }
      if(state==='partial') {
        check(svg.querySelector('.fretboard-marker-played[data-state="correct"]'),'Held accepted pitch lost green');
        check(svg.querySelector('.fretboard-marker-played[data-state="wrong"]'),'Wrong held pitch missing');
      }
      scroll.scrollLeft=Math.min(80,scroll.scrollWidth-scroll.clientWidth);const before=scroll.scrollLeft;
      renderFretboard({...model,played:[]});
      check(!fixture.querySelector('.fretboard-marker-played'),'Released marker remains');
      check(Math.abs(fixture.querySelector('.fretboard-scroll').scrollLeft-before)<1,'Scroll position reset by feedback');
      cases++;
    }
    result.textContent=`PASS: ${cases} real-DOM scenarios (${profiles.length} string profiles × 2 orientations × 4 feedback states), including held correct/wrong notes, release, labels, bounds and horizontal scroll retention.`;
  } catch(error){result.textContent=`FAIL after ${cases} scenarios: ${error.message}`;}
  refresh();
});
refresh();result.textContent='Ready. Run checks at desktop and phone widths.';
