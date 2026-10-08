// Consumes display data; never decides correctness.
import {midiToNoteName} from './note-utils.js';
import {fretX} from './practice-visuals.js';
let container=null,lastSignature='';
const ns='http://www.w3.org/2000/svg';
function shape(tag,attrs,text) {
  const el=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  if(text!==undefined)el.textContent=text;return el;
}
export function initFretboard(el) {container=el;lastSignature='';}
export function renderFretboard(model) {
  if(!container)return;
  const signature=JSON.stringify(model);if(signature===lastSignature)return;lastSignature=signature;
  container.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Practice fretboard';container.appendChild(heading);
  const description=document.createElement('p');description.className='fretboard-description';description.textContent=model.message;container.appendChild(description);
  if(!model.supported)return;
  const scroll=document.createElement('div');scroll.className='fretboard-scroll';
  const svg=shape('svg',{viewBox:'0 0 1200 215',role:'img','aria-label':`Six-string fretboard, frets 0 to ${model.maxFret}, ${model.leftHanded?'left':'right'}-handed. Blue targets, green correct, red missed or wrong, purple played positions.`});
  for(let fret=0;fret<=model.maxFret;fret++) {
    const x=fretX(fret,model.maxFret,model.leftHanded);
    svg.appendChild(shape('line',{x1:x,y1:28,x2:x,y2:177,class:'fretboard-fret'}));
    svg.appendChild(shape('text',{x,y:18,'text-anchor':'middle',class:'fretboard-label'},String(fret)));
  }
  for(let string=1;string<=6;string++) {
    const y=40+(string-1)*25;
    svg.appendChild(shape('line',{x1:70,y1:y,x2:1130,y2:y,class:'fretboard-string','stroke-width':1+string*0.18}));
    svg.appendChild(shape('text',{x:model.leftHanded?1170:30,y:y+4,'text-anchor':'middle',class:'fretboard-label'},`${string} ${midiToNoteName(model.openPitches[string-1])}`));
  }
  for(const [kind,markers] of [['target',model.targets],['played',model.played]])for(const marker of markers) {
    const x=fretX(marker.fret,model.maxFret,model.leftHanded),y=40+(marker.string-1)*25;
    const group=shape('g',{'data-state':marker.state,class:`fretboard-marker fretboard-marker-${kind}`});
    group.appendChild(shape('title',{},`${kind}: ${midiToNoteName(marker.midi)}, string ${marker.string}, fret ${marker.fret}, ${marker.state}`));
    group.appendChild(shape('circle',{cx:x,cy:y,r:kind==='played'?11:8}));
    if(kind==='target')group.appendChild(shape('text',{x,y:y+3,'text-anchor':'middle'},marker.state==='correct'?'✓':marker.state==='missed'?'×':'T'));
    svg.appendChild(group);
  }
  svg.appendChild(shape('text',{x:600,y:205,'text-anchor':'middle',class:'fretboard-label'},`Fret numbers relative to capo ${model.capo}`));
  scroll.appendChild(svg);container.appendChild(scroll);
  const legend=document.createElement('p');legend.className='practice-visual-legend';legend.textContent='Blue T: target • Green ✓: correct • Red ×: missed / red ring: wrong • Purple ring: played position';container.appendChild(legend);
  if(model.unmappedPitches.length) {const p=document.createElement('p');p.textContent=`Outside displayed positions: ${model.unmappedPitches.map(midiToNoteName).join(', ')}`;container.appendChild(p);}
}
